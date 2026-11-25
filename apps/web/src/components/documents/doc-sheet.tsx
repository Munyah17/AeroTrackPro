import { docTypeConfig, docStatusLabel, DOC_STATUS_TONES } from "@/lib/documents";
import { Pill } from "@/components/shared/status";
import { shortDate, usd } from "@/lib/format";
import type { GeneratedDocument } from "@/hooks/use-platform-data";

/**
 * Print-ready business document sheet. Rendered inside the preview dialog;
 * `.print-area` + the print stylesheet in globals.css isolate it when the
 * user hits Print (browser print / Save as PDF).
 */
export function DocSheet({ doc }: { doc: GeneratedDocument }) {
  const cfg = docTypeConfig(doc.docType);
  const Icon = cfg.icon;

  const metaRows: [string, string][] = [
    ["Document No.", doc.number],
    ["Issue Date", shortDate(doc.issueDate)],
    ...(cfg.hasDueDate && doc.dueDate ? [["Due Date", shortDate(doc.dueDate)] as [string, string]] : []),
    ...(cfg.hasPeriod && (doc.periodStart || doc.periodEnd)
      ? [
          [
            "Period",
            `${doc.periodStart ? shortDate(doc.periodStart) : "…"} → ${doc.periodEnd ? shortDate(doc.periodEnd) : "…"}`,
          ] as [string, string],
        ]
      : []),
    ["Status", docStatusLabel(doc.status)],
  ];

  return (
    <div className="print-area mx-auto w-full max-w-[720px] rounded-2xl border border-border bg-white p-8 text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100 sm:p-10">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-neutral-900 pb-5 dark:border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-tight">AeroTrack Pro</div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Business Documents</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[20px] font-bold tracking-tight">{cfg.label}</div>
          <div className="font-mono text-[12px] text-neutral-500">{doc.number}</div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {metaRows.map(([k, v]) => (
          <div key={k}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{k}</div>
            <div className="mt-0.5 text-[12.5px] font-medium">{v}</div>
          </div>
        ))}
      </div>

      {/* Parties + amount */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{cfg.partyLabel}</div>
            <div className="mt-1 text-[14px] font-semibold">{doc.partyName}</div>
            {doc.partyContact && <div className="text-[12px] text-neutral-600 dark:text-neutral-400">{doc.partyContact}</div>}
          </div>
          {cfg.counterpartyLabel && doc.counterpartyName && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{cfg.counterpartyLabel}</div>
              <div className="mt-1 text-[14px] font-semibold">{doc.counterpartyName}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start justify-between rounded-xl border border-neutral-300 p-4 dark:border-neutral-700 sm:items-end">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{cfg.amountLabel}</div>
          <div className="mt-1 text-[26px] font-bold tabular-nums tracking-tight">{usd(doc.amount)}</div>
          <div className="text-[11px] text-neutral-500">{doc.currency}</div>
        </div>
      </div>

      {/* Details */}
      {doc.details && (
        <div className="mt-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{cfg.detailsLabel}</div>
          <div className="mt-1.5 whitespace-pre-wrap rounded-lg bg-neutral-100 p-3.5 text-[12.5px] leading-relaxed dark:bg-neutral-900">
            {doc.details}
          </div>
        </div>
      )}

      {/* Notes */}
      {doc.notes && (
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Notes</div>
          <div className="mt-1 whitespace-pre-wrap text-[12.5px] text-neutral-700 dark:text-neutral-300">{doc.notes}</div>
        </div>
      )}

      {/* Sign-off */}
      <div className="mt-10 grid grid-cols-2 gap-8 border-t border-neutral-300 pt-6 dark:border-neutral-700">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Authorized Signature</div>
          <div className="mt-8 border-b border-neutral-400" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Received By / Date</div>
          <div className="mt-8 border-b border-neutral-400" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-[10.5px] text-neutral-400">
        <span>Generated {shortDate(doc.createdAt)} via AeroTrack Pro</span>
        <Pill tone={DOC_STATUS_TONES[doc.status] ?? "muted"}>{docStatusLabel(doc.status)}</Pill>
      </div>
    </div>
  );
}
