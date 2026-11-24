import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BatteryCharging, Download, Laptop, Play, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tracker setup docs — AeroTrack Pro",
  description: "Set up phone and laptop trackers with AeroTrack Pro.",
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-[760px] px-4 py-10 sm:py-14">
        <Button
          render={<Link href="/" />}
          variant="ghost"
          className="mb-6 gap-2 rounded-xl"
        >
          <ArrowLeft className="size-4" /> Back
        </Button>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tracker setup docs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to get a phone or laptop reporting to AeroTrack Pro.
        </p>

        {/* Laptop agent */}
        <section className="mt-8 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Laptop className="size-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold">Laptop tracker — agent script</h2>
              <p className="text-[12.5px] text-muted-foreground">
                Python standard library only — no pip install, Python 3.8+.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-4">
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">1</div>
              <div>
                <div className="text-[13.5px] font-semibold">Download the agent</div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Save <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">laptop-agent.py</code> to the laptop.
                </p>
                <Button
                  render={<a href="/laptop-agent.py" download />}
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-1.5 rounded-lg"
                >
                  <Download className="size-3.5" /> Download laptop-agent.py
                </Button>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">2</div>
              <div>
                <div className="text-[13.5px] font-semibold">Run it once to test</div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Open a terminal on the laptop and run it with your tracker&apos;s ingest URL and ID
                  (both shown on the tracker&apos;s setup screen in the app):
                </p>
                <code className="mt-2 block truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono text-[11.5px]">
                  {`python laptop-agent.py --url "${siteUrl}/api/ingest/osmand?key=YOUR_TOKEN" --id AT-XXXXXXXX`}
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">3</div>
              <div>
                <div className="text-[13.5px] font-semibold">Run at login</div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  Add the same command to Task Scheduler (Windows, &quot;At log on&quot;), launchd (macOS)
                  or cron (Linux) so it reports every 10 minutes while the laptop is on.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <BatteryCharging className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold">Accuracy note:</span> laptops have no GPS, so the agent
              reports IP/Wi-Fi geolocation — accurate to city level (~10 km), not street level. Use it
              for theft recovery and &quot;is this laptop online / where roughly&quot;.
            </span>
          </div>
        </section>

        {/* Phone tracker */}
        <section className="mt-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold">Phone tracker — Traccar Client</h2>
              <p className="text-[12.5px] text-muted-foreground">
                Free open-source app for Android and iOS — no SIM, no hardware.
              </p>
            </div>
          </div>
          <ol className="mt-5 space-y-4">
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">1</div>
              <div>
                <div className="text-[13.5px] font-semibold">Install Traccar Client</div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Play Store (Android) or App Store (iOS).
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">2</div>
              <div>
                <div className="text-[13.5px] font-semibold">Enter server settings</div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Settings (gear) → Server URL = your tracker&apos;s ingest URL, Device identifier =
                  your tracker ID. Leave other fields as-is.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-bold text-primary">3</div>
              <div>
                <div className="text-[13.5px] font-semibold">Start tracking</div>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Toggle the service ON. Positions upload every few minutes and appear on Live
                  Tracking. On Android, set battery optimization to Unrestricted so it keeps running.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <p className="mt-6 flex items-center gap-2 text-[12.5px] text-muted-foreground">
          <Play className="size-3.5" /> Trackers are managed under{" "}
          <Link href="/devices/trackers" className="font-medium text-primary hover:underline">
            Devices → App Trackers
          </Link>{" "}
          in the app.
        </p>
      </div>
    </div>
  );
}
