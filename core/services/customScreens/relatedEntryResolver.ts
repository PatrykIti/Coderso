// TASK-498-03 B3.1 — related-entry resolver.
//
// Resolves a relation field's stored target-entry IDs (`ID[]` for a multiple relation,
// a bare `ID` string for a single relation) into `RelatedEntrySummary[]` for the
// `related-list` runtime block. The read is injected (`readEntries`) so the resolver
// stays a pure, host-testable function; the ADMIN hosts inject the PLAIN existing
// entries-read `listEntriesCached(target)` — a read against the existing entries
// endpoint + its existing session auth/RBAC, NOT a new route (see the Security Contract
// in TASK-498-03). The adapter returns the WHOLE target-type list; this resolver does
// the FILTER (to the requested ids) + ORDER (the relation's STORED id order).

import { readBindingPathValue } from "../utils/bindingPath";

export type RelatedEntrySummary = {
  id: string;
  title: string;
  status?: string;
  /** value of `displayField`, stringified for the row (activity "action" / card body). */
  displayValue?: string;
  /** row.updatedAt (top-level on EntrySummary) — the activity variant's "time" source. */
  updatedAt?: string;
};

/**
 * Shallow, per-block equality for a precomputed `relatedEntries` map. Host precompute
 * effects MUST diff-guard `setRelatedEntries` with this — only set state when the resolved
 * map actually changed — otherwise resolve → setState → re-render → resolve loops unbounded.
 */
export const relatedEntriesMapEqual = (
  a: Record<string, RelatedEntrySummary[]>,
  b: Record<string, RelatedEntrySummary[]>
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = a[key];
    const bv = b[key];
    if (!bv || av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i += 1) {
      const x = av[i];
      const y = bv[i];
      if (
        x.id !== y.id ||
        x.title !== y.title ||
        x.status !== y.status ||
        x.displayValue !== y.displayValue ||
        x.updatedAt !== y.updatedAt
      ) {
        return false;
      }
    }
  }
  return true;
};

const stringify = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value))
    return value
      .map((item) => stringify(item))
      .filter(Boolean)
      .join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export async function resolveRelatedEntries(input: {
  /** relation value on the current entry: ID[] (multiple), bare ID string (single), or null/empty. */
  ids: string[] | string | null | undefined;
  /** content-type slug — DERIVED BY THE HOST from the bound relation field's relation.target. */
  target: string;
  /** optional schema field to surface per row. */
  displayField?: string;
  /** clamp rows. */
  limit?: number;
  /** injected read = the EXISTING admin entries read (PLAIN listEntriesCached(target), no id arg). */
  readEntries: (target: string) => Promise<Array<Record<string, unknown>>>;
}): Promise<RelatedEntrySummary[]> {
  // 1. COERCE the relation value to an ID[] FIRST. A single relation arrives as a bare
  //    string id, not an array (FieldRenderer.tsx:100-104 coerces the same way).
  const ids = (Array.isArray(input.ids) ? input.ids : input.ids == null ? [] : [input.ids])
    .map(String)
    .filter((id) => id.length > 0);
  if (!input.target || ids.length === 0) return [];
  const limited = ids.slice(0, Math.max(0, input.limit ?? ids.length));
  // 2. FETCH the whole target list, INDEX by id, then walk `limited` to PRESERVE the
  //    relation's stored order + filter out non-linked rows (do NOT rows.map(...)).
  const rows = await input.readEntries(input.target);
  const byId = new Map(rows.map((row) => [String(row.id ?? ""), row]));
  return limited
    .map((id) => byId.get(id))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((row) => {
      // displayField is usually a SCHEMA field → resolve against row.data; fall back to the
      // top-level summary (so a system field like `title`/`status` still resolves).
      const scope = (row.data && typeof row.data === "object" ? row.data : row) as Record<
        string,
        unknown
      >;
      return {
        id: String(row.id ?? ""),
        title: String(row.title ?? row.name ?? row.id ?? ""),
        status: typeof row.status === "string" ? row.status : undefined,
        displayValue: input.displayField
          ? stringify(
              readBindingPathValue(scope, input.displayField) ??
                readBindingPathValue(row, input.displayField)
            )
          : undefined,
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
      };
    });
}
