import type { ListingQueryRecord, ListingSource } from "@/services/listingsClient";

import { listingSourceOptions } from "./defaults";

/**
 * TASK-479-16-L01: shared presentation helpers for the Listings card grid +
 * editor. `sourceLabel` reuses the canonical `listingSourceOptions` labels (no
 * re-hardcoded source strings); `summarizeListingQuery` derives a readable mono
 * summary line from the REAL `ListingQueryRecord` model (source + first filter +
 * primary sort) — it never invents a layout/template binding that the query
 * payload does not have. Pure + defensive so it can be reused by the editor
 * (L02) and unit-asserted (L04).
 */
export const sourceLabel = (value: ListingSource): string =>
  listingSourceOptions.find((option) => option.value === value)?.label ?? value;

const formatFilterValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "")).join(", ");
  }
  return String(value);
};

export function summarizeListingQuery(record: ListingQueryRecord): string {
  const { query } = record;
  let summary = sourceLabel(query.source);

  const firstFilter = query.filters[0];
  if (firstFilter) {
    const value = formatFilterValue(firstFilter.value);
    summary += ` where ${firstFilter.field} ${firstFilter.op}${value ? ` ${value}` : ""}`;
  }

  const firstSort = query.sort[0];
  if (firstSort) {
    summary += `, sort by ${firstSort.field}`;
  }

  return summary;
}
