"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BatteryCharging,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  Laptop,
  Play,
  Radio,
  Search,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@aerotrack/shared";
import { DEVICE_MODELS, type DeviceModel, type ProtocolKey } from "@aerotrack/protocols";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

/** Wire protocol → listener port (Traccar conventions, matches apps/ingest). */
const PROTOCOL_INFO: Record<string, { label: string; port: number }> = {
  gt06: { label: "GT06", port: 5023 },
  h02: { label: "H02", port: 5013 },
  gps103: { label: "GPS103", port: 5001 },
  eelink: { label: "Eelink", port: 5064 },
  queclink: { label: "Queclink", port: 5004 },
  meitrack: { label: "Meitrack", port: 5020 },
  topflytech: { label: "Topflytech", port: 5049 },
  vt200: { label: "VT200", port: 5045 },
  teltonika: { label: "Teltonika", port: 5027 },
  jt808: { label: "JT808", port: 5015 },
  watch: { label: "Watch / 365GPS", port: 5093 },
};

const ALL_PROTOCOLS = Object.entries(PROTOCOL_INFO).map(([value, info]) => ({
  value,
  label: `${info.label} (port ${info.port})`,
}));

/* Brands/models the business sees most — surfaced first in the picker. */
const PRIORITY_VENDORS = ["SinoTrack", "Concox", "Kingwo", "Seeworld", "Teltonika"];
const PRIORITY_MODEL_IDS = ["concox-gt02", "probe-fuel-probe", "gf07", "gf09"];

function deviceSortScore(m: DeviceModel): number {
  const vendorIdx = PRIORITY_VENDORS.indexOf(m.vendor);
  if (vendorIdx >= 0) return vendorIdx * 1000;
  const modelIdx = PRIORITY_MODEL_IDS.indexOf(m.id);
  if (modelIdx >= 0) return 5000 + modelIdx;
  return 9000;
}

const SORTED_MODELS = [...DEVICE_MODELS].sort((a, b) => {
  const d = deviceSortScore(a) - deviceSortScore(b);
  return d !== 0 ? d : `${a.vendor} ${a.model}`.localeCompare(`${b.vendor} ${b.model}`);
});

type TrackerKind = "phone" | "laptop";

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateDeviceId(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return `AT-${s}`;
}

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface CreatedTracker {
  kind: TrackerKind;
  deviceId: string;
  token: string;
  name: string;
  /** Hidden hardware module bound as the asset's second tracker. */
  module?: { imei: string; protocolKey: string };
}

export default function OnboardDevicePage() {
  const [type, setType] = useState<TrackerKind | "hardware" | null>(null);

  // Hardware wizard state
  const [step, setStep] = useState<"info" | "config" | "verify">("info");
  const [protocolKey, setProtocolKey] = useState<ProtocolKey>("gt06");
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);
  const [otherMode, setOtherMode] = useState(false);
  const [imei, setImei] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [plate, setPlate] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Software tracker state
  const [softName, setSoftName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedTracker | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Double tracking — hidden hardware module inside the laptop
  const [addModule, setAddModule] = useState(false);
  const [moduleImei, setModuleImei] = useState("");
  const [moduleProtocol, setModuleProtocol] = useState<ProtocolKey>("gt06");

  const pickModel = (m: DeviceModel) => {
    setSelectedModel(m);
    setOtherMode(false);
    setProtocolKey(m.protocol);
    /* Never pre-fill the label from the manufacturer/model — the user names
       the vehicle/asset themselves (reg number, "Toyota Dyna Farm", ...). */
  };

  const pickOther = () => {
    setSelectedModel(null);
    setOtherMode(true);
  };

  const handleNext = () => {
    if (step === "info" && imei.length >= 8 && deviceName) setStep("config");
    else if (step === "config") setStep("verify");
  };

  const handleBack = () => {
    if (step === "config") setStep("info");
    else if (step === "verify") setStep("config");
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  const createSoftwareTracker = async (kind: TrackerKind) => {
    if (!softName.trim()) return toast.error("Enter a name for this tracker");
    setCreating(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to add a tracker");

      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (meErr || !me) throw new Error("Could not resolve your organization");

      const deviceId = generateDeviceId();
      const token = generateToken();

      const { data: device, error: deviceErr } = await supabase
        .from("devices")
        .insert({
          tenant_id: me.tenant_id,
          imei: deviceId,
          protocol: kind === "phone" ? "osmand" : "laptop-agent",
          device_model: kind === "phone" ? "traccar-client-phone" : "aerotrack-laptop-agent",
          name: softName.trim(),
          ingest_token: token,
          status: "active",
          connection_status: "unknown",
        } as Database["public"]["Tables"]["devices"]["Insert"])
        .select("id")
        .single();
      if (deviceErr || !device) throw new Error(deviceErr?.message ?? "Failed to create device");

      const { data: vehicle, error: vehicleErr } = await supabase
        .from("vehicles")
        .insert({
          tenant_id: me.tenant_id,
          device_id: device.id,
          plate: deviceId,
          name: softName.trim(),
          kind: kind === "phone" ? "phone" : "laptop",
          make: kind === "phone" ? "Traccar" : "AeroTrack",
          model: kind === "phone" ? "Client App" : "Laptop Agent",
          color: "#1E40FF",
          status: "active",
        } as Database["public"]["Tables"]["vehicles"]["Insert"])
        .select("id")
        .single();
      if (vehicleErr || !vehicle) throw new Error(vehicleErr?.message ?? "Failed to create asset");

      /* Double tracking: a concealed hardware module reports on the TCP
         ingest as the asset's SECOND device — either source updates the
         same marker. */
      let hwModule: CreatedTracker["module"];
      if (kind === "laptop" && addModule && moduleImei.trim()) {
        const { data: mod, error: modErr } = await supabase
          .from("devices")
          .insert({
            tenant_id: me.tenant_id,
            imei: moduleImei.trim(),
            protocol: moduleProtocol,
            device_model: "laptop-module",
            name: `${softName.trim()} (module)`,
            status: "active",
            connection_status: "unknown",
          } as Database["public"]["Tables"]["devices"]["Insert"])
          .select("id")
          .single();
        if (modErr || !mod) throw new Error(modErr?.message ?? "Failed to register module");

        const { error: bindErr } = await supabase
          .from("vehicles")
          .update({ secondary_device_id: mod.id })
          .eq("id", vehicle.id);
        if (bindErr) throw new Error(bindErr.message);

        hwModule = { imei: moduleImei.trim(), protocolKey: moduleProtocol };
      }

      setCreated({ kind, deviceId, token, name: softName.trim(), module: hwModule });
      toast.success(`${kind === "phone" ? "Phone" : "Laptop"} tracker created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tracker");
    } finally {
      setCreating(false);
    }
  };

  /** Persist the hardware tracker + its vehicle/asset row. The custom label
      the user typed becomes BOTH devices.name and vehicles.name — the fleet
      UI shows that label, never the manufacturer model. */
  const registerHardware = async () => {
    if (!imei || !deviceName.trim()) return;
    setRegistering(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to register a tracker");

      const { data: me, error: meErr } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("auth_id", user.id)
        .maybeSingle();
      if (meErr || !me) throw new Error("Could not resolve your organization");

      const protocol = otherMode ? protocolKey : (selectedModel?.protocol ?? protocolKey);
      const label = deviceName.trim();

      const { data: device, error: deviceErr } = await supabase
        .from("devices")
        .insert({
          tenant_id: me.tenant_id,
          imei,
          protocol,
          device_model: selectedModel?.id ?? "custom",
          name: label,
          status: "active",
          connection_status: "unknown",
        } as Database["public"]["Tables"]["devices"]["Insert"])
        .select("id")
        .single();
      if (deviceErr || !device) throw new Error(deviceErr?.message ?? "Failed to create device");

      const { error: vehicleErr } = await supabase.from("vehicles").insert({
        tenant_id: me.tenant_id,
        device_id: device.id,
        plate: plate.trim() || label,
        name: label,
        kind: selectedModel?.category === "asset" ? "equipment" : "car",
        make: selectedModel?.vendor ?? "",
        model: selectedModel?.model ?? "",
        color: "#1E40FF",
        status: "active",
      } as Database["public"]["Tables"]["vehicles"]["Insert"]);
      if (vehicleErr) throw new Error(vehicleErr.message);

      setRegistered(true);
      toast.success("Tracker registered — configure the device, then it appears on Live Tracking");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register tracker");
    } finally {
      setRegistering(false);
    }
  };

  const serverUrl = created
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/osmand?key=${created.token}`
    : "";

  /* ---------------- Type picker ---------------- */
  if (!type) {
    return (
      <PageContainer className="max-w-[760px]">
        <PageHeader title="Add Tracker" subtitle="Choose what you want to track" />
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              {
                kind: "phone" as const,
                icon: Smartphone,
                title: "Phone",
                desc: "Turn any Android or iOS phone into a GPS tracker with the free Traccar Client app. No SIM, no hardware.",
                tag: "Free · 2 min setup",
              },
              {
                kind: "laptop" as const,
                icon: Laptop,
                title: "Laptop",
                desc: "Track company laptops with the AeroTrack desktop agent — location and battery on a schedule.",
                tag: "Free · agent",
              },
              {
                kind: "hardware" as const,
                icon: Radio,
                title: "Hardware tracker",
                desc: "Bind a physical GPS tracker (GT06, H02, GPS103 and more) to a vehicle or asset.",
                tag: "SIM required",
              },
            ]
          ).map((opt) => (
            <button
              key={opt.kind}
              onClick={() => setType(opt.kind)}
              className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-card-hover"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <opt.icon className="size-5" />
              </div>
              <div>
                <div className="text-[15px] font-semibold">{opt.title}</div>
                <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{opt.desc}</div>
              </div>
              <div className="mt-auto text-[11px] font-semibold uppercase tracking-wide text-primary">{opt.tag}</div>
            </button>
          ))}
        </div>
      </PageContainer>
    );
  }

  /* ---------------- Phone / laptop flows ---------------- */
  if (type === "phone" || type === "laptop") {
    const isPhone = type === "phone";
    return (
      <PageContainer className="max-w-[700px]">
        <PageHeader
          title={isPhone ? "Add Phone Tracker" : "Add Laptop Tracker"}
          subtitle={
            isPhone
              ? "Track a phone with the Traccar Client app"
              : "Track a laptop with the AeroTrack desktop agent"
          }
          actions={
            <Button render={<Link href="/devices" />} variant="outline" className="gap-2 rounded-xl">
              <ArrowLeft className="size-4" /> Back to Devices
            </Button>
          }
        />

        {!created ? (
          <Panel className="p-6">
            <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
              {isPhone ? (
                <Smartphone className="size-5 text-primary" />
              ) : (
                <Laptop className="size-5 text-primary" />
              )}
              Tracker Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="soft-name" className="text-[13px] font-medium">
                  {isPhone ? "Phone / person name" : "Laptop / asset name"}
                </Label>
                <Input
                  id="soft-name"
                  placeholder={isPhone ? "e.g. Tendai's Phone" : "e.g. Sales Laptop 03"}
                  value={softName}
                  onChange={(e) => setSoftName(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11.5px] text-muted-foreground">
                  {isPhone
                    ? "Shown on the map and in alerts so you know whose phone this is."
                    : "Shown on the map and in alerts so you know which laptop this is."}
                </p>
              </div>

              {!isPhone && (
                <div className="rounded-xl border border-border/60 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={addModule}
                      onChange={(e) => setAddModule(e.target.checked)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="text-[13px] font-semibold">Hidden GPS module</span>{" "}
                      <span className="text-[12px] font-normal text-muted-foreground">(optional — recommended)</span>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                        Double tracking: a small SIM GPS module concealed inside the laptop keeps reporting even if the
                        OS is wiped or the agent is removed. The agent and the module feed the same asset on the map.
                      </p>
                    </span>
                  </label>
                  {addModule && (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="module-imei" className="text-[13px] font-medium">
                          Module IMEI / tracker ID
                        </Label>
                        <Input
                          id="module-imei"
                          placeholder="Printed on the module board (8–15 digits)"
                          value={moduleImei}
                          onChange={(e) => setModuleImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
                          className="h-11 rounded-xl font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[13px] font-medium">Module protocol</Label>
                        <Select value={moduleProtocol} onValueChange={(v) => v && setModuleProtocol(v as ProtocolKey)}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {ALL_PROTOCOLS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          Most bare self-assembly boards speak GT06 — check the module&apos;s listing.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => createSoftwareTracker(type)}
                disabled={creating || !softName.trim() || (!isPhone && addModule && moduleImei.trim().length < 8)}
                className="mt-6 h-11 w-full rounded-xl shadow-card"
              >
                {creating ? "Creating…" : `Create ${isPhone ? "Phone" : "Laptop"} Tracker`}
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="space-y-4">
            <Panel className="p-6">
              <h3 className="mb-1 flex items-center gap-2 text-[16px] font-semibold">
                <CheckCircle2 className="size-5 text-success" /> Tracker created
              </h3>
              <p className="mb-5 text-[13px] text-muted-foreground">
                {created.name} is registered. Finish setup on the device below — positions appear on{" "}
                <Link href="/tracking" className="font-medium text-primary underline-offset-2 hover:underline">
                  Live Tracking
                </Link>{" "}
                within a minute of the first report.
              </p>

              <div className="space-y-3">
                <SetupRow
                  label="Device ID"
                  value={created.deviceId}
                  copied={copied === "id"}
                  onCopy={() => copy("id", created.deviceId)}
                />
                <SetupRow
                  label="Server URL"
                  value={serverUrl}
                  copied={copied === "url"}
                  onCopy={() => copy("url", serverUrl)}
                  mono
                />
                {isPhone && (
                  <SetupRow
                    label="Ingest token"
                    value={created.token}
                    copied={copied === "token"}
                    onCopy={() => copy("token", created.token)}
                    mono
                    hint="Already embedded in the Server URL — keep it private."
                  />
                )}
              </div>
            </Panel>

            {isPhone ? (
              <PhoneSetupGuide deviceId={created.deviceId} serverUrl={serverUrl} />
            ) : (
              <>
                <LaptopSetupGuide deviceId={created.deviceId} serverUrl={serverUrl} />
                {created.module && <ModuleSetupGuide module={created.module} />}
              </>
            )}

            <Button render={<Link href="/tracking" />} className="h-11 w-full rounded-xl shadow-card">
              Go to Live Tracking
            </Button>
          </div>
        )}
      </PageContainer>
    );
  }

  /* ---------------- Hardware wizard (existing flow) ---------------- */
  return (
    <PageContainer className="max-w-[700px]">
      <PageHeader
        title="Add Hardware Tracker"
        subtitle="Bind a GPS tracker to your fleet"
        actions={
          <Button render={<Link href="/devices" />} variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="size-4" /> Back to Devices
          </Button>
        }
      />

      <div className="mb-6 flex gap-2">
        {(["info", "config", "verify"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full font-semibold text-[13px] ${
                step === s
                  ? "bg-primary text-white"
                  : (["info", "config"].includes(s) && step === "verify") || (s === "info" && step === "config")
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step === s ? (i + 1) : ["info", "config"].includes(s) && step === "verify" ? "✓" : i + 1}
            </div>
            {i < 2 && <div className="h-0.5 w-12 bg-muted" />}
          </div>
        ))}
      </div>

      {step === "info" && (
        <Panel className="p-6">
          <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
            <Smartphone className="size-5 text-primary" /> Device Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Device</Label>
              {selectedModel && !otherMode ? (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">
                      {selectedModel.vendor} {selectedModel.model}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {PROTOCOL_INFO[selectedModel.protocol]?.label ?? selectedModel.protocol} · port{" "}
                      {PROTOCOL_INFO[selectedModel.protocol]?.port ?? "—"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg text-[12px]"
                    onClick={() => setSelectedModel(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-between rounded-xl font-normal"
                      />
                    }
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Search className="size-4" />
                      {otherMode ? "Other device — pick protocol below" : "Search device brand or model…"}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </PopoverTrigger>
                  <PopoverContent className="w-[420px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Type to search — e.g. Sinotrack, GT02, GF-09…" />
                      <CommandList className="max-h-72">
                        <CommandEmpty>No matching device — choose “Other” below.</CommandEmpty>
                        <CommandGroup heading="Popular">
                          {SORTED_MODELS.map((m) => (
                            <CommandItem
                              key={m.id}
                              value={`${m.vendor} ${m.model} ${m.description}`}
                              onSelect={() => pickModel(m)}
                              className="flex-col items-start gap-0.5 py-2"
                            >
                              <span className="text-[13px] font-medium">
                                {m.vendor} {m.model}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {PROTOCOL_INFO[m.protocol]?.label ?? m.protocol} · port{" "}
                                {PROTOCOL_INFO[m.protocol]?.port ?? "—"}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup>
                          <CommandItem
                            value="other device not listed custom protocol"
                            onSelect={pickOther}
                            className="text-primary"
                          >
                            Other — my device is not listed
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {otherMode && (
                <Select value={protocolKey} onValueChange={(v) => v && setProtocolKey(v as ProtocolKey)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ALL_PROTOCOLS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[11.5px] text-muted-foreground">
                Pick your tracker from the list — we configure the right protocol and port automatically.
                Can&apos;t find it? Choose &quot;Other&quot;.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imei" className="text-[13px] font-medium">
                IMEI Number
              </Label>
              <Input
                id="imei"
                placeholder="e.g. 864123456789012 or 3009270720"
                value={imei}
                onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
                className="h-11 rounded-xl font-mono"
              />
              <p className="text-[11.5px] text-muted-foreground">
                Tracker ID / IMEI printed on the device or SIM card (8–15 digits). This is how the
                tracker identifies itself to our servers — it is not shown as the vehicle name.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium">
                Vehicle / asset name
              </Label>
              <Input
                id="name"
                placeholder="e.g. ABP9876 or Toyota Dyna Farm"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11.5px] text-muted-foreground">
                Your own label — shown on the map, vehicle list and alerts. This is NOT the tracker
                model; it can be a registration number, driver name or asset description.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plate" className="text-[13px] font-medium">
                Plate / reg number <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="plate"
                placeholder="e.g. ABP9876"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={imei.length < 8 || !deviceName.trim()}
              className="mt-6 h-11 w-full rounded-xl shadow-card"
            >
              Next: Configure Device
            </Button>
          </div>
        </Panel>
      )}

      {step === "config" && (
        <Panel className="p-6">
          <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
            <Radio className="size-5 text-primary" /> Server Configuration
          </h3>
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-[13px] font-medium text-blue-900 dark:text-blue-100">
                Configure your device to connect to AeroTrack Pro servers:
              </p>
              <div className="mt-3 space-y-2 font-mono text-[12px] text-blue-800 dark:text-blue-200">
                <div>
                  <span className="font-semibold">Server IP:</span> {process.env.NEXT_PUBLIC_DEVICE_SERVER_IP || "gps.aerotrack.app"}
                </div>
                <div>
                  <span className="font-semibold">Port:</span> {PROTOCOL_INFO[protocolKey]?.port ?? "5000"}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  Configuration method depends on device model — check device manual or use SMS commands.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium">SMS Configuration (if supported)</Label>
              <div className="rounded-lg border bg-muted/50 p-3 font-mono text-[11px]">
                <div>For {PROTOCOL_INFO[protocolKey]?.label ?? protocolKey} devices:</div>
                <div className="mt-2 text-muted-foreground">
                  Send SMS to device: <span className="font-semibold text-foreground">SERVER,0,gps.aerotrack.app,{PROTOCOL_INFO[protocolKey]?.port ?? 5023},0#</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleBack} variant="outline" className="h-11 flex-1 rounded-xl">
                Back
              </Button>
              <Button onClick={handleNext} className="h-11 flex-1 rounded-xl shadow-card">
                Next: Verify Connection
              </Button>
            </div>
          </div>
        </Panel>
      )}

      {step === "verify" && (
        <Panel className="p-6">
          <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
            <Cpu className="size-5 text-primary" /> Register Tracker
          </h3>

          {registered ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
                <CheckCircle2 className="size-5 shrink-0 text-success" />
                <div>
                  <div className="text-[13.5px] font-semibold">{deviceName.trim()} is registered</div>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    Configure the tracker with the server details below. Positions appear on{" "}
                    <Link href="/tracking" className="font-medium text-primary underline-offset-2 hover:underline">
                      Live Tracking
                    </Link>{" "}
                    within a minute of the first report.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <p className="text-[13px] font-medium text-blue-900 dark:text-blue-100">
                  Configure your device to connect to AeroTrack Pro servers:
                </p>
                <div className="mt-3 space-y-2 font-mono text-[12px] text-blue-800 dark:text-blue-200">
                  <div><span className="font-semibold">Server IP:</span> {process.env.NEXT_PUBLIC_DEVICE_SERVER_IP || "gps.aerotrack.app"}</div>
                  <div><span className="font-semibold">Port:</span> {PROTOCOL_INFO[protocolKey]?.port ?? "5000"}</div>
                  <div><span className="font-semibold">Tracker ID:</span> {imei}</div>
                </div>
              </div>
              <Button render={<Link href="/tracking" />} className="h-11 w-full rounded-xl shadow-card">
                Go to Live Tracking
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 rounded-xl border border-border/60 p-4 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Label</span>
                  <span className="font-semibold">{deviceName.trim()}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Tracker ID</span>
                  <span className="font-mono text-[12px]">{imei}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Device</span>
                  <span className="font-medium">
                    {selectedModel ? `${selectedModel.vendor} ${selectedModel.model}` : "Other device"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Protocol / port</span>
                  <span className="font-medium">
                    {PROTOCOL_INFO[protocolKey]?.label ?? protocolKey} · {PROTOCOL_INFO[protocolKey]?.port ?? "—"}
                  </span>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Registering saves the tracker and its vehicle/asset under your label{" "}
                <span className="font-semibold text-foreground">{deviceName.trim()}</span>. After that,
                point the device at our server (see the configuration step) and it will report here.
              </p>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="h-11 flex-1 rounded-xl">
                  Back
                </Button>
                <Button
                  onClick={registerHardware}
                  disabled={registering}
                  className="h-11 flex-1 rounded-xl shadow-card"
                >
                  {registering ? "Registering…" : "Register Device"}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}
    </PageContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Setup guides                                                        */
/* ------------------------------------------------------------------ */

function SetupRow({
  label,
  value,
  copied,
  onCopy,
  mono,
  hint,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[12px] font-semibold text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded-lg border bg-muted/50 px-3 py-2 text-[12px] ${
            mono ? "font-mono" : "font-semibold"
          }`}
        >
          {value}
        </code>
        <Button variant="outline" size="sm" onClick={onCopy} className="h-9 shrink-0 gap-1.5 rounded-lg">
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PhoneSetupGuide({ deviceId, serverUrl }: { deviceId: string; serverUrl: string }) {
  const steps = [
    {
      icon: Download,
      title: "Install Traccar Client",
      body: "Get the free app from the Play Store (Android) or App Store (iOS). It is open source and works offline-first.",
    },
    {
      icon: Play,
      title: "Enter server settings",
      body: `Open the app → Settings (gear icon) → set Server URL to the URL above and Device identifier to ${deviceId}. Leave other fields as-is.`,
    },
    {
      icon: CheckCircle2,
      title: "Start tracking",
      body: "Toggle the service ON in the app. Positions upload every few minutes and appear on Live Tracking.",
    },
    {
      icon: BatteryCharging,
      title: "Keep it running (Android)",
      body: "Disable battery optimization for Traccar Client (Settings → Apps → Traccar Client → Battery → Unrestricted) so Android doesn't pause it in the background.",
    },
  ];

  const concealSteps = [
    {
      title: "Android — disguise it",
      body: "Set the notification channel importance to Low (Settings → Apps → Traccar Client → Notifications → foreground service → Low) so no icon sits in the status bar. Rename the app via your launcher if supported, and keep the icon in the app drawer, not the home screen.",
    },
    {
      title: "Android — hide the evidence",
      body: "Turn off lock-screen notifications (Settings → Notifications → Lock screen → hide sensitive content). Note: Android 10+ no longer allows removing the launcher icon, and the persistent foreground notification is mandatory — it can only be minimized, not removed.",
    },
    {
      title: "iOS — limited by Apple",
      body: "iOS cannot hide an installed app: it always appears in Settings, the App Library and the location indicator. Maximum discretion is removing it from the Home Screen (long-press → Remove App → Remove from Home Screen) and setting Traccar Client to \"Always\" location so it reports in the background.",
    },
  ];

  return (
    <>
    <Panel className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
        <Smartphone className="size-5 text-primary" /> Set up the phone
      </h3>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <s.icon className="size-4" />
            </div>
            <div>
              <div className="text-[13.5px] font-semibold">
                {i + 1}. {s.title}
              </div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[12px] leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <span className="font-semibold">Recommended app settings:</span> Location accuracy = High, Distance filter = 50 m,
        Interval = 300 s, Stationary heartbeat = 900 s. The Server URL already contains your private ingest token — do not
        share it.
      </div>
    </Panel>
      <Panel className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
          <Smartphone className="size-5 text-primary" /> Make it discreet
        </h3>
        <ol className="space-y-4">
          {concealSteps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <span className="text-[13px] font-bold">{i + 1}</span>
              </div>
              <div>
                <div className="text-[13.5px] font-semibold">{s.title}</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}

function LaptopSetupGuide({ deviceId, serverUrl }: { deviceId: string; serverUrl: string }) {
  return (
    <Panel className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
        <Laptop className="size-5 text-primary" /> Set up the laptop
      </h3>
      <ol className="space-y-4">
        <li className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Download className="size-4" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">1. Get the agent script</div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Download <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">laptop-agent.py</code> from the{" "}
              <Link href="/docs" className="font-medium text-primary underline-offset-2 hover:underline">
                docs
              </Link>{" "}
              page (or ask your AeroTrack contact). It uses only the Python standard library — no install needed beyond
              Python 3.8+.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Play className="size-4" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">2. Run it once to test</div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Open a terminal on the laptop and run:
            </p>
            <code className="mt-2 block truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono text-[11.5px]">
              {`python laptop-agent.py --url "${serverUrl}" --id ${deviceId}`}
            </code>
          </div>
        </li>
        <li className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 className="size-4" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">3. Run at login</div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Add the same command to Task Scheduler (Windows), launchd (macOS) or cron (Linux) so it reports every 10
              minutes while the laptop is on.
            </p>
          </div>
        </li>
      </ol>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <span className="font-semibold">Accuracy note:</span> laptops have no GPS, so the agent reports IP/Wi-Fi
        geolocation — accurate to city level (~10 km), not street level. Use it for theft recovery and &quot;is this
        laptop online / where roughly&quot; rather than precise routing.
      </div>
    </Panel>
  );
}

/**
 * Setup guide for the hidden hardware module — the second tracker in a
 * laptop's double-tracking pair. The module talks to the TCP ingest server
 * (not the OsmAnd endpoint) so it needs its own server/port/SMS config.
 */
function ModuleSetupGuide({ module }: { module: { imei: string; protocolKey: string } }) {
  const proto = PROTOCOL_INFO[module.protocolKey] ?? { label: module.protocolKey, port: 5000 };
  const serverIp = process.env.NEXT_PUBLIC_DEVICE_SERVER_IP || "gps.aerotrack.app";
  const steps = [
    {
      title: "Choose the build",
      body: "Use the self-assembly module as-is (board + battery + SIM slot), or re-house it in a custom shell to fit the laptop's free space — the antenna end always points toward the lid edge, away from shielding metal.",
    },
    {
      title: "SIM & server",
      body: `Fit a data SIM, then point the module at ${serverIp} port ${proto.port} (${proto.label}). Via SMS on GT06-style boards: SERVER,0,${serverIp},${proto.port},0# — check the module's manual for its exact command set.`,
    },
    {
      title: "Power it",
      body: "Wire the module's input to a 5V source that stays live with the laptop — a spare USB port's power pins or the charging circuit — or run it on its own battery for a fully independent tracker that survives shutdown.",
    },
    {
      title: "Conceal & verify",
      body: `Secure the board inside the chassis (tape/foam, away from hinges and speakers). The module reports as tracker ID ${module.imei} — its positions update the same asset as the agent on Live Tracking.`,
    },
  ];

  return (
    <Panel className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-[16px] font-semibold">
        <Radio className="size-5 text-primary" /> Set up the hidden module
      </h3>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="text-[13px] font-bold">{i + 1}</span>
            </div>
            <div>
              <div className="text-[13.5px] font-semibold">{s.title}</div>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-xl border border-success/30 bg-success/5 p-3.5 text-[12px] leading-relaxed">
        <span className="font-semibold">Double tracking:</span> the agent and the module are independent — OS wiped,
        module keeps reporting; module loses signal, agent keeps reporting. One asset, one marker, two sources.
      </div>
    </Panel>
  );
}
