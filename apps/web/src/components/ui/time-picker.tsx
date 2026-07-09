"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimePickerProps {
  value?: string; // HH:mm format
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hour, setHour] = React.useState<number>(
    value ? parseInt(value.split(":")[0] || "12") : 12,
  );
  const [minute, setMinute] = React.useState<number>(
    value ? parseInt(value.split(":")[1] || "0") : 0,
  );
  const [period, setPeriod] = React.useState<"AM" | "PM">(
    value ? (parseInt(value.split(":")[0] || "0") >= 12 ? "PM" : "AM") : "AM",
  );

  const hourRef = React.useRef<HTMLButtonElement>(null);
  const minuteRef = React.useRef<HTMLButtonElement>(null);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    let h = hour;
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const formatted = `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onChange?.(formatted);
    setOpen(false);
  };

  const formatTime = () => {
    if (!value) return placeholder;
    const [h, m] = value.split(":");
    const hour24 = parseInt(h || "0");
    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${m} ${period}`;
  };

  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        hourRef.current?.scrollIntoView({ block: "nearest" });
        minuteRef.current?.scrollIntoView({ block: "nearest" });
      }, 0);
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-start rounded-xl text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <Clock className="mr-2 size-4" />
        {formatTime()}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-2 p-3">
          {/* Hours */}
          <div className="flex flex-col">
            <div className="mb-1 text-center text-[11px] font-medium text-muted-foreground">Hour</div>
            <div className="h-[180px] w-16 overflow-y-auto rounded-lg border scrollbar-thin">
              {hours.map((h) => (
                <button
                  key={h}
                  ref={h === hour ? hourRef : undefined}
                  type="button"
                  onClick={() => setHour(h)}
                  className={cn(
                    "flex h-9 w-full items-center justify-center text-sm transition-colors hover:bg-accent",
                    h === hour && "bg-primary text-primary-foreground",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div className="flex flex-col">
            <div className="mb-1 text-center text-[11px] font-medium text-muted-foreground">Minute</div>
            <div className="h-[180px] w-16 overflow-y-auto rounded-lg border scrollbar-thin">
              {minutes.map((m) => (
                <button
                  key={m}
                  ref={m === minute ? minuteRef : undefined}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={cn(
                    "flex h-9 w-full items-center justify-center text-sm transition-colors hover:bg-accent",
                    m === minute && "bg-primary text-primary-foreground",
                  )}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col">
            <div className="mb-1 text-center text-[11px] font-medium text-muted-foreground">Period</div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setPeriod("AM")}
                className={cn(
                  "flex h-9 w-16 items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent",
                  period === "AM" && "bg-primary text-primary-foreground",
                )}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setPeriod("PM")}
                className={cn(
                  "flex h-9 w-16 items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent",
                  period === "PM" && "bg-primary text-primary-foreground",
                )}
              >
                PM
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-border p-2">
          <Button onClick={handleConfirm} className="w-full rounded-lg" size="sm">
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
