"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Cpu, Radio, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";

const PROTOCOLS = [
  { value: "GT06", label: "GT06 (Jimi, WanWay, Seeworld, GF-07/09)" },
  { value: "H02", label: "H02 (SinoTrack ST-901/902/905/906)" },
  { value: "GPS103", label: "GPS103 (Coban TK103B/303G/403A)" },
  { value: "Eelink", label: "Eelink" },
  { value: "Queclink", label: "Queclink @Track (GL300)" },
  { value: "Meitrack", label: "Meitrack (T366)" },
  { value: "Topflytech", label: "Topflytech (TLW2-12B)" },
  { value: "VT200", label: "VT200 (ThinkRace)" },
];

export default function OnboardDevicePage() {
  const [step, setStep] = useState<"info" | "config" | "verify">("info");
  const [protocol, setProtocol] = useState("GT06");
  const [imei, setImei] = useState("");
  const [deviceName, setDeviceName] = useState("");

  const handleNext = () => {
    if (step === "info" && imei && deviceName) {
      setStep("config");
    } else if (step === "config") {
      setStep("verify");
    }
  };

  const handleBack = () => {
    if (step === "config") setStep("info");
    else if (step === "verify") setStep("config");
  };

  return (
    <PageContainer className="max-w-[700px]">
      <PageHeader
        title="Add Device"
        subtitle="Bind a GPS tracker to your fleet"
        actions={
          step === "info" ? undefined : (
            <Button render={<Link href="/devices" />} variant="outline" className="gap-2 rounded-xl">
              <ArrowLeft className="size-4" /> Back to Devices
            </Button>
          )
        }
      />

      {/* Step indicator */}
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

      {/* Step 1: Device Info */}
      {step === "info" && (
        <Panel className="p-6">
          <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
            <Smartphone className="size-5 text-primary" /> Device Information
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Device Protocol</Label>
              <Select value={protocol} onValueChange={(v) => v && setProtocol(v)}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PROTOCOLS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11.5px] text-muted-foreground">
                Check your device manual or packaging for the protocol type.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="imei" className="text-[13px] font-medium">
                IMEI Number
              </Label>
              <Input
                id="imei"
                placeholder="e.g. 864123456789012"
                value={imei}
                onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
                className="h-11 rounded-xl font-mono"
              />
              <p className="text-[11.5px] text-muted-foreground">
                15-digit code printed on the device or SIM card. Type *#06# on device phone to display.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium">
                Device Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Tracker-Unit-01"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <Button
              onClick={handleNext}
              disabled={!imei || !deviceName}
              className="mt-6 h-11 w-full rounded-xl shadow-card"
            >
              Next: Configure Device
            </Button>
          </div>
        </Panel>
      )}

      {/* Step 2: Device Configuration */}
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
                  <span className="font-semibold">Port:</span>{" "}
                  {PROTOCOLS.find((p) => p.value === protocol)?.value === "GT06"
                    ? "5023"
                    : PROTOCOLS.find((p) => p.value === protocol)?.value === "H02"
                      ? "5013"
                      : PROTOCOLS.find((p) => p.value === protocol)?.value === "GPS103"
                        ? "5001"
                        : "5000"}
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  Configuration method depends on device model — check device manual or use SMS commands.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-medium">SMS Configuration (if supported)</Label>
              <div className="rounded-lg border bg-muted/50 p-3 font-mono text-[11px]">
                <div>For {protocol} devices:</div>
                <div className="mt-2 text-muted-foreground">
                  Send SMS to device: <span className="font-semibold text-foreground">SERVER,0,gps.aerotrack.app,5023,0#</span>
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

      {/* Step 3: Verification */}
      {step === "verify" && (
        <Panel className="p-6">
          <h3 className="mb-5 flex items-center gap-2 text-[16px] font-semibold">
            <Cpu className="size-5 text-primary" /> Verify Connection
          </h3>
          <div className="space-y-4">
            <div className="space-y-2.5">
              {[
                { label: "Device configured", done: true },
                { label: "Sent test location", done: true },
                { label: "Waiting for connection", done: false },
              ].map((check, i) => (
                <div key={i} className="flex items-center gap-3">
                  {check.done ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}
                  <span className="text-[13px] font-medium">{check.label}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border-l-4 border-l-warning bg-warning/5 p-4">
              <p className="text-[12px] leading-relaxed text-warning-foreground">
                <span className="font-semibold">Troubleshooting:</span> If the device does not connect within 5 minutes,
                check that your device has network connectivity (cellular or WiFi), the server address is correct, and
                the device is powered on.
              </p>
            </div>

            <Button
              render={<Link href="/devices" />}
              className="h-11 w-full rounded-xl shadow-card"
            >
              View Device Details
            </Button>
          </div>
        </Panel>
      )}
    </PageContainer>
  );
}
