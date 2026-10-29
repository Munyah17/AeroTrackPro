"use client";

import { useRef } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ImageField({
  label,
  hint,
  value,
  maxBytes,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  maxBytes: number;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > maxBytes) {
      toast.error(`Use an image under ${Math.round(maxBytes / 1024)} KB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-24 min-w-0 flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-border px-3 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {value ? (
            <img src={value} alt="" className="max-h-16 max-w-full object-contain" />
          ) : (
            <>
              <UploadCloud className="size-5" />
              <span className="text-center text-[12px] font-medium">{hint}</span>
            </>
          )}
        </button>
        {value && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        className="sr-only"
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
