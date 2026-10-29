/**
 * Zero-dependency report exporters.
 *  - CSV   : UTF-8 BOM so Excel opens it correctly.
 *  - Excel : SpreadsheetML 2003 XML saved as .xls — native Excel format.
 *  - Word  : HTML-in-.doc — opens in Word/LibreOffice/Google Docs.
 *  - PDF   : minimal hand-rolled PDF (Helvetica, paged table).
 */

export interface ReportTable {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  columns: string[];
  rows: (string | number | null | undefined)[][];
}

const cellStr = (v: string | number | null | undefined) =>
  v == null ? "" : String(v);

/* ------------------------------------------------------------------ */
/*  Download helper                                                    */
/* ------------------------------------------------------------------ */

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/* ------------------------------------------------------------------ */
/*  CSV                                                                */
/* ------------------------------------------------------------------ */

export function exportCsv(t: ReportTable): Blob {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [
    esc(t.title),
    ...(t.subtitle ? [esc(t.subtitle)] : []),
    `Generated: ${esc(t.generatedAt.toLocaleString())}`,
    "",
    t.columns.map(esc).join(","),
    ...t.rows.map((r) => r.map((c) => esc(cellStr(c))).join(",")),
  ];
  return new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

/* ------------------------------------------------------------------ */
/*  Excel (SpreadsheetML 2003)                                         */
/* ------------------------------------------------------------------ */

export function exportExcel(t: ReportTable): Blob {
  const xesc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cell = (v: string | number | null | undefined, header = false) => {
    const s = cellStr(v);
    const num = typeof v === "number" && Number.isFinite(v);
    return `<Cell${header ? ' ss:StyleID="h"' : ""}><Data ss:Type="${num ? "Number" : "String"}">${xesc(s)}</Data></Cell>`;
  };
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/></Style>
  <Style ss:ID="t"><Font ss:Bold="1" ss:Size="14"/></Style>
 </Styles>
 <Worksheet ss:Name="${xesc(t.title.slice(0, 28))}">
  <Table>
   ${t.columns.map(() => `<Column ss:Width="110"/>`).join("\n   ")}
   <Row><Cell ss:StyleID="t"><Data ss:Type="String">${xesc(t.title)}</Data></Cell></Row>
   ${t.subtitle ? `<Row><Cell><Data ss:Type="String">${xesc(t.subtitle)}</Data></Cell></Row>` : ""}
   <Row><Cell><Data ss:Type="String">Generated: ${xesc(t.generatedAt.toLocaleString())}</Data></Cell></Row>
   <Row/>
   <Row>${t.columns.map((c) => cell(c, true)).join("")}</Row>
   ${t.rows.map((r) => `<Row>${r.map((c) => cell(c)).join("")}</Row>`).join("\n   ")}
  </Table>
 </Worksheet>
</Workbook>`;
  return new Blob([xml], { type: "application/vnd.ms-excel" });
}

/* ------------------------------------------------------------------ */
/*  Word (HTML .doc)                                                   */
/* ------------------------------------------------------------------ */

export function exportWord(t: ReportTable): Blob {
  const hesc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const th = t.columns.map((c) => `<th>${hesc(c)}</th>`).join("");
  const trs = t.rows
    .map((r) => `<tr>${r.map((c) => `<td>${hesc(cellStr(c))}</td>`).join("")}</tr>`)
    .join("\n");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${hesc(t.title)}</title>
<style>
 body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
 h1 { font-size: 16pt; margin-bottom: 2pt; }
 .meta { color: #666; font-size: 9pt; margin-bottom: 12pt; }
 table { border-collapse: collapse; width: 100%; }
 th, td { border: 1px solid #999; padding: 3pt 5pt; text-align: left; font-size: 9pt; }
 th { background: #e8e8e8; font-weight: bold; }
</style></head>
<body>
 <h1>${hesc(t.title)}</h1>
 <p class="meta">${t.subtitle ? hesc(t.subtitle) + " · " : ""}Generated ${hesc(t.generatedAt.toLocaleString())}</p>
 <table><thead><tr>${th}</tr></thead><tbody>
${trs}
 </tbody></table>
</body></html>`;
  return new Blob([html], { type: "application/msword" });
}

/* ------------------------------------------------------------------ */
/*  PDF (hand-rolled, paged table)                                     */
/* ------------------------------------------------------------------ */

const PDF_W = 595; // A4 width pt
const PDF_H = 842; // A4 height pt
const PDF_MARGIN = 36;
const PDF_ROW_H = 14;
const PDF_HEAD_H = 16;

function pdfEscape(s: string) {
  return s
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** Column widths proportional to content, capped so the table fits the page. */
function pdfColWidths(t: ReportTable): number[] {
  const usable = PDF_W - PDF_MARGIN * 2;
  const natural = t.columns.map((c, i) => {
    let max = c.length;
    for (const r of t.rows.slice(0, 200)) {
      const len = cellStr(r[i]).length;
      if (len > max) max = len;
    }
    return Math.max(40, Math.min(170, max * 4.6 + 10));
  });
  const total = natural.reduce((s, w) => s + w, 0) || 1;
  const scale = Math.min(1, usable / total);
  return natural.map((w) => w * scale);
}

function pdfText(x: number, y: number, s: string, font: string, size: number, clipW: number) {
  // crude clip: truncate to fit the column width
  const maxChars = Math.floor(clipW / (size * 0.5));
  const str = s.length > maxChars ? s.slice(0, Math.max(0, maxChars - 1)) + "…" : s;
  return `BT /${font} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(str)}) Tj ET`;
}

export function exportPdf(t: ReportTable): Blob {
  const widths = pdfColWidths(t);
  const top = PDF_H - PDF_MARGIN - 40; // leave room for title block
  const bottom = PDF_MARGIN + 10;
  const rowsPerPage = Math.floor((top - bottom - PDF_HEAD_H) / PDF_ROW_H) || 1;
  const pageCount = Math.max(1, Math.ceil(t.rows.length / rowsPerPage));

  const chunks: string[] = [];
  for (let p = 0; p < pageCount; p++) {
    let y = PDF_H - PDF_MARGIN;
    const ops: string[] = [];
    ops.push(pdfText(PDF_MARGIN, y, t.title, "F2", 14, PDF_W - 2 * PDF_MARGIN));
    y -= 13;
    const meta = `${t.subtitle ? t.subtitle + "  ·  " : ""}Generated ${t.generatedAt.toLocaleString()}`;
    ops.push(pdfText(PDF_MARGIN, y, meta, "F1", 8, PDF_W - 2 * PDF_MARGIN));
    y = top;
    // header
    let x = PDF_MARGIN;
    ops.push(`${PDF_MARGIN} ${(y - 2).toFixed(1)} m ${(PDF_W - PDF_MARGIN).toFixed(1)} ${(y - 2).toFixed(1)} l S`);
    for (let i = 0; i < t.columns.length; i++) {
      ops.push(pdfText(x, y - 11, t.columns[i], "F2", 7.5, widths[i]));
      x += widths[i];
    }
    y -= PDF_HEAD_H;
    // rows
    const slice = t.rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
    for (const row of slice) {
      x = PDF_MARGIN;
      for (let i = 0; i < t.columns.length; i++) {
        ops.push(pdfText(x, y - 10, cellStr(row[i]), "F1", 7.5, widths[i]));
        x += widths[i];
      }
      y -= PDF_ROW_H;
    }
    // footer
    ops.push(pdfText(PDF_MARGIN, bottom - 4, `Page ${p + 1} of ${pageCount}`, "F1", 7, 200));
    ops.push(pdfText(PDF_W - PDF_MARGIN - 60, bottom - 4, "AeroTrack Pro", "F1", 7, 80));
    chunks.push(ops.join("\n"));
  }

  // Assemble PDF objects
  const objects: string[] = [];
  const pageObjStart = 3; // 1=Catalog, 2=Pages, then per page {Page, Contents}
  const pageIds = Array.from({ length: pageCount }, (_, i) => pageObjStart + i * 2);
  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  chunks.forEach((content, i) => {
    objects[pageObjStart + i * 2 - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] ` +
      `/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> ` +
      `/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> ` +
      `/Contents ${pageObjStart + i * 2 + 1} 0 R >>`;
    objects[pageObjStart + i * 2] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets[i] = pdf.length;
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
