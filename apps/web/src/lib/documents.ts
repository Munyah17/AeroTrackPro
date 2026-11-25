import {
  ArrowLeftRight,
  ClipboardCheck,
  FileText,
  HandCoins,
  Layers,
  Receipt,
  ScrollText,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@aerotrack/shared";
import type { DocStatus, DocType, GeneratedDocument } from "@/hooks/use-platform-data";

export interface DocTypeConfig {
  key: DocType;
  label: string;
  plural: string;
  description: string;
  icon: LucideIcon;
  /** Label for the primary party field (bill-to, consignor, etc.). */
  partyLabel: string;
  partyPlaceholder: string;
  /** Label for the optional contact line under the party. */
  contactLabel: string;
  /** Label for the second party, or null when the doc has only one party. */
  counterpartyLabel: string | null;
  counterpartyPlaceholder: string;
  /** Whether the form shows a due date. */
  hasDueDate: boolean;
  /** Whether the form shows a period (statement-style docs). */
  hasPeriod: boolean;
  /** Field hint shown above the details textarea. */
  detailsLabel: string;
  detailsPlaceholder: string;
  amountLabel: string;
  /** Statuses this doc type can move through, in workflow order. */
  statuses: DocStatus[];
  /** Status shown on a freshly created draft. */
  initialStatus: DocStatus;
}

export const DOC_TYPES: DocTypeConfig[] = [
  {
    key: "invoice",
    label: "Invoice",
    plural: "Invoices",
    description: "Bill a client for services or goods supplied",
    icon: FileText,
    partyLabel: "Bill To",
    partyPlaceholder: "e.g. Delta Beverages Ltd",
    contactLabel: "Billing contact / email",
    counterpartyLabel: null,
    counterpartyPlaceholder: "",
    hasDueDate: true,
    hasPeriod: false,
    detailsLabel: "Description",
    detailsPlaceholder: "What is being billed — services, devices, subscription period…",
    amountLabel: "Total (USD)",
    statuses: ["draft", "sent", "paid", "void"],
    initialStatus: "draft",
  },
  {
    key: "receipt",
    label: "Receipt",
    plural: "Receipts",
    description: "Acknowledge payment received from a client",
    icon: Receipt,
    partyLabel: "Received From",
    partyPlaceholder: "e.g. Delta Beverages Ltd",
    contactLabel: "Payer contact / email",
    counterpartyLabel: null,
    counterpartyPlaceholder: "",
    hasDueDate: false,
    hasPeriod: false,
    detailsLabel: "Payment For",
    detailsPlaceholder: "What the payment covers — invoice ref, period, items…",
    amountLabel: "Amount Received (USD)",
    statuses: ["draft", "issued", "void"],
    initialStatus: "draft",
  },
  {
    key: "statement",
    label: "Statement",
    plural: "Statements",
    description: "Account statement for a client over a period",
    icon: ScrollText,
    partyLabel: "Account Holder",
    partyPlaceholder: "e.g. Delta Beverages Ltd",
    contactLabel: "Account contact / email",
    counterpartyLabel: null,
    counterpartyPlaceholder: "",
    hasDueDate: false,
    hasPeriod: true,
    detailsLabel: "Summary",
    detailsPlaceholder: "Opening balance, charges, payments, closing balance…",
    amountLabel: "Closing Balance (USD)",
    statuses: ["draft", "issued", "void"],
    initialStatus: "draft",
  },
  {
    key: "boq",
    label: "BOQ",
    plural: "BOQs",
    description: "Bill of Quantities — itemised work breakdown",
    icon: ClipboardCheck,
    partyLabel: "Client / Project",
    partyPlaceholder: "e.g. Harare Warehouse Fit-out",
    contactLabel: "Client contact",
    counterpartyLabel: null,
    counterpartyPlaceholder: "",
    hasDueDate: true,
    hasPeriod: false,
    detailsLabel: "Items / Quantities",
    detailsPlaceholder: "One line per item: description, qty, unit, rate…",
    amountLabel: "Total (USD)",
    statuses: ["draft", "issued", "accepted", "void"],
    initialStatus: "draft",
  },
  {
    key: "bom",
    label: "BOM",
    plural: "BOMs",
    description: "Bill of Materials — components for a build",
    icon: Layers,
    partyLabel: "Project / Item",
    partyPlaceholder: "e.g. Tracker Installation Kit v2",
    contactLabel: "Requested by",
    counterpartyLabel: null,
    counterpartyPlaceholder: "",
    hasDueDate: false,
    hasPeriod: false,
    detailsLabel: "Components",
    detailsPlaceholder: "One line per component: part, spec, qty…",
    amountLabel: "Total Cost (USD)",
    statuses: ["draft", "issued", "void"],
    initialStatus: "draft",
  },
  {
    key: "waybill",
    label: "Waybill",
    plural: "Waybills",
    description: "Goods dispatch document — consignor to consignee",
    icon: Truck,
    partyLabel: "Consignor (From)",
    partyPlaceholder: "e.g. AeroTrack Pro Stores",
    contactLabel: "Consignor contact",
    counterpartyLabel: "Consignee (To)",
    counterpartyPlaceholder: "e.g. Client warehouse, Harare",
    hasDueDate: false,
    hasPeriod: false,
    detailsLabel: "Goods Description",
    detailsPlaceholder: "Items, quantities, packaging, serials…",
    amountLabel: "Declared Value (USD)",
    statuses: ["draft", "in_transit", "delivered", "void"],
    initialStatus: "draft",
  },
  {
    key: "checkout",
    label: "Checkout Doc",
    plural: "Checkout Docs",
    description: "Record equipment or stock checked out to a person",
    icon: HandCoins,
    partyLabel: "Collected By",
    partyPlaceholder: "e.g. T. Moyo — Field Technician",
    contactLabel: "Phone / email",
    counterpartyLabel: "Department / Site",
    counterpartyPlaceholder: "e.g. Bulawayo Depot",
    hasDueDate: true,
    hasPeriod: false,
    detailsLabel: "Items Checked Out",
    detailsPlaceholder: "Serial numbers, models, accessories…",
    amountLabel: "Replacement Value (USD)",
    statuses: ["draft", "completed", "void"],
    initialStatus: "draft",
  },
  {
    key: "transfer",
    label: "Transfer Doc",
    plural: "Transfer Docs",
    description: "Move stock or assets between locations",
    icon: ArrowLeftRight,
    partyLabel: "From (Source)",
    partyPlaceholder: "e.g. Main Warehouse, Harare",
    contactLabel: "Released by",
    counterpartyLabel: "To (Destination)",
    counterpartyPlaceholder: "e.g. Bulawayo Depot",
    hasDueDate: false,
    hasPeriod: false,
    detailsLabel: "Items Transferred",
    detailsPlaceholder: "Items, quantities, condition…",
    amountLabel: "Total Value (USD)",
    statuses: ["draft", "pending", "completed", "cancelled"],
    initialStatus: "draft",
  },
];

export const docTypeConfig = (key: DocType): DocTypeConfig =>
  DOC_TYPES.find((d) => d.key === key) ?? DOC_TYPES[0]!;

export const docStatusLabel = (status: DocStatus): string =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const DOC_STATUS_TONES: Record<DocStatus, "muted" | "info" | "success" | "danger" | "warning"> = {
  draft: "muted",
  sent: "info",
  issued: "info",
  paid: "success",
  completed: "success",
  delivered: "success",
  accepted: "success",
  in_transit: "warning",
  pending: "warning",
  void: "danger",
  cancelled: "danger",
};

export interface DocFieldValues {
  partyName: string;
  partyContact: string;
  counterpartyName: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  periodStart: string;
  periodEnd: string;
  details: string;
  notes: string;
}

export const emptyDocForm = (): DocFieldValues => ({
  partyName: "",
  partyContact: "",
  counterpartyName: "",
  amount: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  periodStart: "",
  periodEnd: "",
  details: "",
  notes: "",
});

export const docToForm = (d: GeneratedDocument): DocFieldValues => ({
  partyName: d.partyName,
  partyContact: d.partyContact ?? "",
  counterpartyName: d.counterpartyName ?? "",
  amount: String(d.amount),
  issueDate: d.issueDate,
  dueDate: d.dueDate ?? "",
  periodStart: d.periodStart ?? "",
  periodEnd: d.periodEnd ?? "",
  details: d.details ?? "",
  notes: d.notes ?? "",
});

export const docFormToInsert = (
  cfg: DocTypeConfig,
  f: DocFieldValues,
): Database["public"]["Tables"]["generated_documents"]["Insert"] => ({
  doc_type: cfg.key,
  party_name: f.partyName.trim(),
  party_contact: f.partyContact.trim() || null,
  counterparty_name: cfg.counterpartyLabel ? f.counterpartyName.trim() || null : null,
  amount: Number(f.amount) || 0,
  issue_date: f.issueDate || undefined,
  due_date: cfg.hasDueDate ? f.dueDate || null : null,
  period_start: cfg.hasPeriod ? f.periodStart || null : null,
  period_end: cfg.hasPeriod ? f.periodEnd || null : null,
  details: f.details.trim() || null,
  notes: f.notes.trim() || null,
  status: cfg.initialStatus,
});
