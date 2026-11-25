"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  docFormToInsert,
  docToForm,
  docTypeConfig,
  emptyDocForm,
  type DocFieldValues,
} from "@/lib/documents";
import type { DocType, GeneratedDocument } from "@/hooks/use-platform-data";
import type { Database } from "@aerotrack/shared";

type Insert = Database["public"]["Tables"]["generated_documents"]["Insert"];
type Update = Database["public"]["Tables"]["generated_documents"]["Update"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docType: DocType;
  /** When set, the dialog edits this document instead of creating. */
  editing?: GeneratedDocument | null;
  saving: boolean;
  onSubmit: (values: Insert | Update, isEdit: boolean) => void;
}

export function DocFormDialog({ open, onOpenChange, docType, editing, saving, onSubmit }: Props) {
  const cfg = docTypeConfig(docType);
  const [form, setForm] = useState<DocFieldValues>(emptyDocForm);

  useEffect(() => {
    if (open) setForm(editing ? docToForm(editing) : emptyDocForm());
  }, [open, editing]);

  const set = <K extends keyof DocFieldValues>(k: K, v: DocFieldValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.partyName.trim()) return;
    if (editing) {
      onSubmit(
        {
          party_name: form.partyName.trim(),
          party_contact: form.partyContact.trim() || null,
          counterparty_name: cfg.counterpartyLabel ? form.counterpartyName.trim() || null : null,
          amount: Number(form.amount) || 0,
          due_date: cfg.hasDueDate ? form.dueDate || null : null,
          period_start: cfg.hasPeriod ? form.periodStart || null : null,
          period_end: cfg.hasPeriod ? form.periodEnd || null : null,
          details: form.details.trim() || null,
          notes: form.notes.trim() || null,
        },
        true,
      );
    } else {
      onSubmit(docFormToInsert(cfg, form), false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${cfg.label}` : `New ${cfg.label}`}</DialogTitle>
          <DialogDescription>{cfg.description}. Saved documents get a permanent number.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="doc-party">{cfg.partyLabel} *</Label>
            <Input
              id="doc-party"
              value={form.partyName}
              onChange={(e) => set("partyName", e.target.value)}
              placeholder={cfg.partyPlaceholder}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-contact">{cfg.contactLabel} (optional)</Label>
            <Input
              id="doc-contact"
              value={form.partyContact}
              onChange={(e) => set("partyContact", e.target.value)}
              placeholder="email, phone or address"
            />
          </div>
          {cfg.counterpartyLabel && (
            <div className="grid gap-1.5">
              <Label htmlFor="doc-counter">{cfg.counterpartyLabel}</Label>
              <Input
                id="doc-counter"
                value={form.counterpartyName}
                onChange={(e) => set("counterpartyName", e.target.value)}
                placeholder={cfg.counterpartyPlaceholder}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="doc-amount">{cfg.amountLabel}</Label>
              <Input
                id="doc-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-issue">Issue Date</Label>
              <Input
                id="doc-issue"
                type="date"
                value={form.issueDate}
                onChange={(e) => set("issueDate", e.target.value)}
              />
            </div>
          </div>
          {cfg.hasDueDate && (
            <div className="grid gap-1.5">
              <Label htmlFor="doc-due">Due Date</Label>
              <Input
                id="doc-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
          )}
          {cfg.hasPeriod && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="doc-pstart">Period Start</Label>
                <Input
                  id="doc-pstart"
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => set("periodStart", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="doc-pend">Period End</Label>
                <Input
                  id="doc-pend"
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => set("periodEnd", e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="doc-details">{cfg.detailsLabel}</Label>
            <Textarea
              id="doc-details"
              value={form.details}
              onChange={(e) => set("details", e.target.value)}
              placeholder={cfg.detailsPlaceholder}
              rows={4}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-notes">Notes (optional)</Label>
            <Textarea
              id="doc-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Terms, references, internal remarks…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.partyName.trim()} className="gap-2">
            <Plus className="size-4" /> {saving ? "Saving…" : editing ? "Save Changes" : "Create Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
