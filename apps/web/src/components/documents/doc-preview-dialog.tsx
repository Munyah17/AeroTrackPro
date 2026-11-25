"use client";

import { Download, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocSheet } from "@/components/documents/doc-sheet";
import { docStatusLabel, docTypeConfig, DOC_STATUS_TONES } from "@/lib/documents";
import { downloadDocumentPdf } from "@/lib/documents-pdf";
import { Pill } from "@/components/shared/status";
import type { DocStatus, GeneratedDocument } from "@/hooks/use-platform-data";

interface Props {
  doc: GeneratedDocument | null;
  onClose: () => void;
  onStatus: (id: string, status: DocStatus) => void;
  onEdit: (doc: GeneratedDocument) => void;
  onDelete: (doc: GeneratedDocument) => void;
}

export function DocPreviewDialog({ doc, onClose, onStatus, onEdit, onDelete }: Props) {
  if (!doc) return null;
  const cfg = docTypeConfig(doc.docType);
  const nextStatuses = cfg.statuses.filter((s) => s !== doc.status);

  const handlePrint = () => {
    // Print CSS isolates .print-area — the rest of the page is hidden.
    requestAnimationFrame(() => window.print());
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-[15px]">{cfg.label} · {doc.number}</DialogTitle>
            <Pill tone={DOC_STATUS_TONES[doc.status] ?? "muted"}>{docStatusLabel(doc.status)}</Pill>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={handlePrint}>
              <Printer className="size-3.5" /> Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg"
              onClick={() => {
                downloadDocumentPdf(doc);
                toast.success("PDF downloaded");
              }}
            >
              <Download className="size-3.5" /> PDF
            </Button>
            {doc.status === "draft" && (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => onEdit(doc)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-destructive hover:text-destructive"
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto bg-muted/40 p-4 sm:p-6">
          <DocSheet doc={doc} />
        </div>

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-5 py-3">
            <span className="text-[11.5px] font-medium text-muted-foreground">Move to:</span>
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => onStatus(doc.id, s)}
                className="rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {docStatusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
