import type { ContentField } from "../content-types/SchemaBuilder";
import type { EntryStatus } from "./EntryMetadataPanel";

export type EntryChecklistItem = {
  id: string;
  label: string;
  status: "complete" | "warning" | "info";
  detail?: string;
};

export type EntryChecklist = {
  items: EntryChecklistItem[];
  missingRequiredFields: Array<{ name: string; label: string }>;
  blockingIssues: string[];
};

const isValueFilled = (field: ContentField, value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    if ("id" in value && typeof (value as { id?: unknown }).id === "string") {
      return Boolean((value as { id?: string }).id?.trim());
    }
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  if (field.type === "boolean") return true;
  return false;
};

const formatMissingList = (labels: string[]) => {
  if (labels.length === 0) return "";
  const shown = labels.slice(0, 3);
  const suffix = labels.length > 3 ? ` +${labels.length - 3} more` : "";
  return `${shown.join(", ")}${suffix}`;
};

export function buildEntryChecklist(options: {
  title: string;
  slug: string;
  status: EntryStatus;
  scheduledAt: string;
  fields: ContentField[];
  values: Record<string, unknown>;
}): EntryChecklist {
  const { title, slug, status, scheduledAt, fields, values } = options;
  const titleMissing = !title.trim();
  const slugMissing = !slug.trim();
  const requiredFields = fields.filter((field) => field.required);
  const missingRequiredFields = requiredFields
    .filter((field) => !isValueFilled(field, values[field.name]))
    .map((field) => ({ name: field.name, label: field.label || field.name }));

  let scheduleIssue: string | null = null;
  if (status === "scheduled") {
    if (!scheduledAt.trim()) {
      scheduleIssue = "Schedule date is required for scheduled entries.";
    } else {
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        scheduleIssue = "Schedule date must be a valid ISO timestamp.";
      }
    }
  }

  const missingLabels = missingRequiredFields.map((field) => field.label);
  const requiredDetail = missingLabels.length
    ? `Missing: ${formatMissingList(missingLabels)}`
    : undefined;

  const items: EntryChecklistItem[] = [
    {
      id: "title",
      label: "Title added",
      status: titleMissing ? "warning" : "complete",
    },
    {
      id: "slug",
      label: "Slug added",
      status: slugMissing ? "warning" : "complete",
    },
    {
      id: "required",
      label:
        missingRequiredFields.length > 0
          ? "Required fields missing"
          : "Required fields filled",
      status: missingRequiredFields.length > 0 ? "warning" : "complete",
      detail: requiredDetail,
    },
    {
      id: "schedule",
      label: status === "scheduled" ? "Schedule date set" : "Schedule date (optional)",
      status:
        status === "scheduled"
          ? scheduleIssue
            ? "warning"
            : "complete"
          : "info",
      detail:
        status === "scheduled"
          ? scheduleIssue ?? ""
          : "Only required when scheduling.",
    },
  ];

  const blockingIssues: string[] = [];
  if (titleMissing) blockingIssues.push("Add a title.");
  if (slugMissing) blockingIssues.push("Add a slug.");
  if (missingRequiredFields.length > 0) {
    blockingIssues.push(`Fill required fields: ${formatMissingList(missingLabels)}.`);
  }
  if (scheduleIssue) blockingIssues.push(scheduleIssue);

  return {
    items,
    missingRequiredFields,
    blockingIssues,
  };
}
