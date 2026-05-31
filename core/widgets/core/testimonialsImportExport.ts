import type { TestimonialItem } from "./testimonials";
import {
  isValidTestimonialsAvatarUrl,
  normalizeTestimonialsItems,
  sanitizeTestimonialsQuoteHtml,
  testimonialsItemMax,
} from "./testimonials";

export type TestimonialsImportFormat = "json" | "csv";

export type TestimonialsImportIssue = {
  row: number;
  field?: string;
  message: string;
};

export class TestimonialsImportError extends Error {
  issues: TestimonialsImportIssue[];

  constructor(message: string, issues: TestimonialsImportIssue[]) {
    super(message);
    this.name = "TestimonialsImportError";
    this.issues = issues;
  }
}

type TestimonialsImportRow = {
  id?: unknown;
  quote?: unknown;
  quoteHtml?: unknown;
  author?: unknown;
  role?: unknown;
  avatar?: unknown;
  rating?: unknown;
  sourceLabel?: unknown;
};

const testimonialsImportFieldOrder = [
  "id",
  "quote",
  "quoteHtml",
  "author",
  "role",
  "avatar",
  "rating",
  "sourceLabel",
] as const;

const testimonialsImportFieldSet = new Set<string>(testimonialsImportFieldOrder);
const csvFormulaPattern = /^[=+\-@]/;

const optionalText = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const requiredText = (
  value: unknown,
  row: number,
  field: "quote" | "author",
  issues: TestimonialsImportIssue[]
) => {
  const trimmed = optionalText(value);
  if (trimmed) return trimmed;
  issues.push({ row, field, message: `${field} is required.` });
  return undefined;
};

const normalizeImportRating = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(5, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(5, Math.max(0, Math.round(parsed)));
    }
  }
  return 5;
};

const escapeCsvValue = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const guarded = csvFormulaPattern.test(normalized.trimStart()) ? `'${normalized}` : normalized;
  return `"${guarded.replaceAll('"', '""')}"`;
};

function detectFormat(input: string): TestimonialsImportFormat {
  const trimmed = input.trimStart();
  return trimmed.startsWith("[") || trimmed.startsWith("{") ? "json" : "csv";
}

function parseCsv(input: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell);
    currentCell = "";
  };

  const pushRow = () => {
    if (currentRow.length === 1 && currentRow[0] === "" && rows.length === 0) {
      currentRow = [];
      return;
    }
    rows.push(currentRow);
    currentRow = [];
  };

  const normalized = input.replace(/^\ufeff/, "");
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index] ?? "";
    const next = normalized[index + 1] ?? "";

    if (character === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && character === "\n") {
      pushCell();
      pushRow();
      continue;
    }

    if (!inQuotes && character === "\r") {
      continue;
    }

    currentCell += character;
  }

  pushCell();
  if (currentRow.length > 0) pushRow();

  if (rows.length === 0) return [];

  const [headerRow, ...valueRows] = rows;
  const headers = (headerRow ?? []).map((header) => header.trim());

  return valueRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, columnIndex) => {
        record[header] = row[columnIndex] ?? "";
      });
      return record;
    });
}

function parseJsonRows(input: string): TestimonialsImportRow[] {
  const parsed = JSON.parse(input) as unknown;
  if (Array.isArray(parsed)) return parsed as TestimonialsImportRow[];
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { testimonials?: unknown }).testimonials)
  ) {
    return (parsed as { testimonials: TestimonialsImportRow[] }).testimonials;
  }
  throw new TestimonialsImportError(
    "JSON import must be an array or an object with testimonials.",
    [{ row: 0, message: "Unsupported JSON shape." }]
  );
}

function validateKnownFields(
  row: TestimonialsImportRow,
  rowNumber: number,
  issues: TestimonialsImportIssue[]
) {
  for (const key of Object.keys(row)) {
    if (!testimonialsImportFieldSet.has(key)) {
      issues.push({ row: rowNumber, field: key, message: `Unknown field ${key}.` });
    }
  }
}

function normalizeImportRow(
  row: TestimonialsImportRow,
  rowNumber: number,
  issues: TestimonialsImportIssue[]
): TestimonialItem | null {
  validateKnownFields(row, rowNumber, issues);

  const quoteHtml = sanitizeTestimonialsQuoteHtml(optionalText(row.quoteHtml));
  const quote = optionalText(row.quote);
  const author = requiredText(row.author, rowNumber, "author", issues);
  const avatar = optionalText(row.avatar);

  if (avatar && !isValidTestimonialsAvatarUrl(avatar)) {
    issues.push({
      row: rowNumber,
      field: "avatar",
      message: "Avatar must use a relative path or a full http/https URL.",
    });
  }

  if (!quote && !quoteHtml) {
    issues.push({
      row: rowNumber,
      field: "quote",
      message: "quote or quoteHtml is required.",
    });
  }

  if (!author) return null;

  return {
    id: optionalText(row.id),
    quote: quote ?? undefined,
    quoteHtml,
    author,
    role: optionalText(row.role),
    avatar,
    rating: normalizeImportRating(row.rating),
    sourceLabel: optionalText(row.sourceLabel),
  };
}

export function parseTestimonialsImport(input: string): {
  format: TestimonialsImportFormat;
  items: TestimonialItem[];
} {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new TestimonialsImportError("Import content is empty.", [
      { row: 0, message: "Paste JSON or CSV content before importing." },
    ]);
  }

  const format = detectFormat(trimmed);
  const issues: TestimonialsImportIssue[] = [];
  let rawRows: TestimonialsImportRow[] = [];

  if (format === "json") {
    try {
      rawRows = parseJsonRows(trimmed);
    } catch (error) {
      if (error instanceof TestimonialsImportError) throw error;
      throw new TestimonialsImportError("JSON import could not be parsed.", [
        { row: 0, message: "Invalid JSON payload." },
      ]);
    }
  } else {
    rawRows = parseCsv(trimmed);
  }

  const normalizedRows = rawRows
    .map((row, index) => normalizeImportRow(row, index + 1, issues))
    .filter((row): row is TestimonialItem => row !== null);

  if (normalizedRows.length < 2) {
    issues.push({
      row: 0,
      field: "testimonials",
      message: "Import requires at least 2 testimonials.",
    });
  }

  if (issues.length > 0) {
    throw new TestimonialsImportError("Import contains invalid testimonial rows.", issues);
  }

  const limitedRows = normalizedRows.slice(0, testimonialsItemMax);
  return {
    format,
    items: normalizeTestimonialsItems(limitedRows, limitedRows.length),
  };
}

function serializeRow(item: TestimonialItem) {
  return {
    id: optionalText(item.id) ?? "",
    quote: optionalText(item.quote) ?? "",
    quoteHtml: sanitizeTestimonialsQuoteHtml(optionalText(item.quoteHtml)) ?? "",
    author: optionalText(item.author) ?? "",
    role: optionalText(item.role) ?? "",
    avatar: optionalText(item.avatar) ?? "",
    rating: String(
      typeof item.rating === "number" ? Math.min(5, Math.max(0, Math.round(item.rating))) : 5
    ),
    sourceLabel: optionalText(item.sourceLabel) ?? "",
  };
}

export function serializeTestimonialsExport(
  items: TestimonialItem[],
  format: TestimonialsImportFormat
): string {
  const rows = items.slice(0, testimonialsItemMax).map(serializeRow);

  if (format === "json") {
    return JSON.stringify(rows, null, 2);
  }

  const header = testimonialsImportFieldOrder.join(",");
  const valueRows = rows.map((row) =>
    testimonialsImportFieldOrder.map((field) => escapeCsvValue(row[field] ?? "")).join(",")
  );
  return [header, ...valueRows].join("\n");
}
