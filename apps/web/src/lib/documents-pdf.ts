import { jsPDF } from "jspdf";
import { docTypeConfig, docStatusLabel } from "@/lib/documents";
import { shortDate, usd } from "@/lib/format";
import type { GeneratedDocument } from "@/hooks/use-platform-data";

const PAGE_W = 595; // A4 portrait, points
const PAGE_H = 842;
const M = 48; // margin
const INK: [number, number, number] = [30, 30, 40];
const MUTED: [number, number, number] = [110, 110, 125];
const FAINT: [number, number, number] = [190, 190, 200];
const PRIMARY: [number, number, number] = [30, 64, 255];

const fmtDate = (d: string | null | undefined) => (d ? shortDate(d) : "—");

function label(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(text.toUpperCase(), x, y);
}

function value(doc: jsPDF, text: string, x: number, y: number, size = 10, bold = true) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  doc.text(text, x, y);
}

/** Render a business document to an A4 PDF and trigger a download. */
export function downloadDocumentPdf(docData: GeneratedDocument) {
  const cfg = docTypeConfig(docData.docType);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;

  /* Letterhead */
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(M, y, 34, 34, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(cfg.label.slice(0, 2).toUpperCase(), M + 17, y + 22, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text("AeroTrack Pro", M + 44, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("BUSINESS DOCUMENTS", M + 44, y + 27);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(cfg.label.toUpperCase(), PAGE_W - M, y + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(docData.number, PAGE_W - M, y + 24, { align: "right" });

  y += 52;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.4);
  doc.line(M, y, PAGE_W - M, y);
  y += 18;

  /* Meta strip */
  const meta: [string, string][] = [
    ["Document No.", docData.number],
    ["Issue Date", fmtDate(docData.issueDate)],
    ...(cfg.hasDueDate ? [["Due Date", fmtDate(docData.dueDate)] as [string, string]] : []),
    ...(cfg.hasPeriod
      ? [["Period", `${fmtDate(docData.periodStart)} → ${fmtDate(docData.periodEnd)}`] as [string, string]]
      : []),
    ["Status", docStatusLabel(docData.status)],
  ];
  const colW = (PAGE_W - M * 2) / meta.length;
  meta.forEach(([k, v], i) => {
    const x = M + i * colW;
    label(doc, k, x, y);
    value(doc, v, x, y + 13, 9.5);
  });
  y += 30;

  /* Parties + amount */
  const leftW = (PAGE_W - M * 2) * 0.58;
  const rightX = M + leftW + 20;
  const rightW = PAGE_W - M - rightX;

  label(doc, cfg.partyLabel.toUpperCase(), M, y);
  value(doc, docData.partyName, M, y + 14, 12);
  let py = y + 14;
  if (docData.partyContact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(docData.partyContact, leftW);
    doc.text(lines, M, py + 14);
    py += 14 + (lines as string[]).length * 11;
  }
  if (cfg.counterpartyLabel && docData.counterpartyName) {
    label(doc, cfg.counterpartyLabel.toUpperCase(), M, py + 10);
    value(doc, docData.counterpartyName, M, py + 24, 11);
    py += 34;
  }

  /* Amount box */
  const boxH = 74;
  doc.setDrawColor(...FAINT);
  doc.setFillColor(246, 247, 251);
  doc.roundedRect(rightX, y - 6, rightW, boxH, 6, 6, "FD");
  label(doc, cfg.amountLabel.toUpperCase(), rightX + 12, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(usd(docData.amount), rightX + rightW - 12, y + 34, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(docData.currency, rightX + rightW - 12, y + 50, { align: "right" });

  y = Math.max(py + 16, y - 6 + boxH + 18);

  /* Details */
  if (docData.details) {
    if (y > PAGE_H - 220) {
      doc.addPage();
      y = M;
    }
    label(doc, cfg.detailsLabel.toUpperCase(), M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(docData.details, PAGE_W - M * 2) as string[];
    doc.text(lines, M, y + 15);
    y += 15 + lines.length * 13 + 14;
  }

  /* Notes */
  if (docData.notes) {
    if (y > PAGE_H - 160) {
      doc.addPage();
      y = M;
    }
    label(doc, "NOTES", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(docData.notes, PAGE_W - M * 2) as string[];
    doc.text(lines, M, y + 15);
    y += 15 + lines.length * 13 + 14;
  }

  /* Sign-off */
  const sigY = Math.min(y + 60, PAGE_H - 130);
  doc.setDrawColor(...FAINT);
  doc.line(M, sigY, M + 220, sigY);
  doc.line(PAGE_W - M - 220, sigY, PAGE_W - M, sigY);
  label(doc, "AUTHORIZED SIGNATURE", M, sigY + 12);
  label(doc, "RECEIVED BY / DATE", PAGE_W - M - 220, sigY + 12);

  /* Footer */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...FAINT);
  doc.text(`Generated ${shortDate(docData.createdAt)} via AeroTrack Pro`, M, PAGE_H - M + 10);
  doc.text(docData.number, PAGE_W - M, PAGE_H - M + 10, { align: "right" });

  doc.save(`${docData.number}.pdf`);
}
