"use client";

import { useMemo, useState } from "react";
import { Eye, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { useGeneratedDocuments, type DocStatus, type DocType, type GeneratedDocument } from "@/hooks/use-platform-data";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, Panel } from "@/components/shared/page";
import { Pill } from "@/components/shared/status";
import { DOC_TYPES, docStatusLabel, docTypeConfig, DOC_STATUS_TONES } from "@/lib/documents";
import { DocFormDialog } from "@/components/documents/doc-form-dialog";
import { DocPreviewDialog } from "@/components/documents/doc-preview-dialog";
import { shortDate, usd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Database } from "@aerotrack/shared";

type Insert = Database["public"]["Tables"]["generated_documents"]["Insert"];
type Update = Database["public"]["Tables"]["generated_documents"]["Update"];

export default function AdminDocumentsPage() {
  const { rows: documents, live, loading, insert, update, remove } = useGeneratedDocuments();
  const [typeFilter, setTypeFilter] = useState<"all" | DocType>("all");
  const [composer, setComposer] = useState<{ open: boolean; docType: DocType; editing: GeneratedDocument | null }>({
    open: false,
    docType: "invoice",
    editing: null,
  });
  const [preview, setPreview] = useState<GeneratedDocument | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () => documents.filter((d) => typeFilter === "all" || d.docType === typeFilter),
    [documents, typeFilter],
  );

  const counts = useMemo(() => {
    const m = new Map<DocType, number>();
    for (const d of documents) m.set(d.docType, (m.get(d.docType) ?? 0) + 1);
    return m;
  }, [documents]);

  const openCreate = (docType: DocType) =>
    setComposer({ open: true, docType, editing: null });

  const openEdit = (doc: GeneratedDocument) => {
    setPreview(null);
    setComposer({ open: true, docType: doc.docType, editing: doc });
  };

  const handleCreate = async (values: Insert) => {
    setSaving(true);
    const ok = await insert(values);
    setSaving(false);
    if (!ok) return toast.error("Could not save document — check your connection");
    toast.success("Document created");
    setComposer({ open: false, docType: composer.docType, editing: null });
  };

  const handleEditSubmit = async (doc: GeneratedDocument, values: Update) => {
    setSaving(true);
    const ok = await update(doc.id, values);
    setSaving(false);
    if (!ok) return toast.error("Could not update document");
    toast.success("Document updated");
    setComposer({ open: false, docType: composer.docType, editing: null });
  };

  const handleStatus = async (id: string, status: DocStatus) => {
    const ok = await update(id, { status });
    if (ok) {
      toast.success(`Marked as ${docStatusLabel(status).toLowerCase()}`);
      setPreview((p) => (p && p.id === id ? { ...p, status } : p));
    } else toast.error("Could not update status");
  };

  const handleDelete = async (doc: GeneratedDocument) => {
    const ok = await remove(doc.id);
    if (ok) {
      toast.success(`Deleted ${doc.number}`);
      setPreview(null);
    } else toast.error("Could not delete document");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Documents"
        subtitle="Generate invoices, receipts, statements, BOQs, BOMs, waybills and transfer docs — saved with permanent numbers"
      />

      {/* Document type launcher */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DOC_TYPES.map((t) => {
          const Icon = t.icon;
          const count = counts.get(t.key) ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => openCreate(t.key)}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-card transition-all hover:border-primary/40 hover:shadow-float"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </div>
                <FilePlus2 className="size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold">{t.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{t.description}</div>
              </div>
              <div className="mt-auto pt-1 text-[11px] font-medium text-muted-foreground">
                {count > 0 ? `${count} saved` : "None yet"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Document register */}
      <Panel className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-4">
          <h3 className="text-[15px] font-semibold">All Documents</h3>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                typeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              All
            </button>
            {DOC_TYPES.filter((t) => (counts.get(t.key) ?? 0) > 0 || typeFilter === t.key).map((t) => (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                  typeFilter === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {t.plural}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Party</th>
                <th className="px-3 py-3 font-medium">Counterparty</th>
                <th className="px-3 py-3 font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Issued</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((d) => {
                const cfg = docTypeConfig(d.docType);
                return (
                  <tr key={d.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => setPreview(d)}>
                    <td className="px-5 py-3 font-mono text-[12.5px] font-semibold">{d.number}</td>
                    <td className="px-3 py-3">
                      <Pill tone="primary">{cfg.label}</Pill>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{d.partyName}</div>
                      {d.partyContact && <div className="text-[11.5px] text-muted-foreground">{d.partyContact}</div>}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{d.counterpartyName ?? "—"}</td>
                    <td className="px-3 py-3 tabular-nums font-semibold">{usd(d.amount)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{shortDate(d.issueDate)}</td>
                    <td className="px-3 py-3">
                      <Pill tone={DOC_STATUS_TONES[d.status] ?? "muted"}>{docStatusLabel(d.status)}</Pill>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreview(d);
                        }}
                      >
                        <Eye className="size-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    {loading
                      ? "Loading documents…"
                      : live
                        ? "No documents yet — pick a type above to create your first one."
                        : "Documents are unavailable — sign in as a platform admin."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <DocFormDialog
        open={composer.open}
        onOpenChange={(o) => setComposer((c) => ({ ...c, open: o }))}
        docType={composer.docType}
        editing={composer.editing}
        saving={saving}
        onSubmit={(values, isEdit) => {
          if (isEdit && composer.editing) void handleEditSubmit(composer.editing, values as Update);
          else void handleCreate(values as Insert);
        }}
      />

      <DocPreviewDialog
        doc={preview}
        onClose={() => setPreview(null)}
        onStatus={(id, status) => void handleStatus(id, status)}
        onEdit={openEdit}
        onDelete={(d) => void handleDelete(d)}
      />
    </PageContainer>
  );
}
