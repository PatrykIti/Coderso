# TASK-350-01: Analytics Export Contract and Download Flow
# FileName: TASK-350-01_Analytics_Export_Contract_and_Download_Flow.md

**Priority:** High
**Category:** Analytics + API + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-350
**Status:** To Do

---

## Overview

Fix the Top Content drawer Export action. It currently closes the drawer and
does not trigger a download, route call, generated file, disabled state, or
error path.

## Sub-Tasks

- Define the product scope for Analytics export: Top Content CSV/JSON for the
  selected date range, or disabled/unavailable for now.
- If supported, add a route/client method that exports current top-content rows.
- Wire `TopContentDrawer` Export to a real download with loading and error
  feedback.
- Include the active range and item limit/type in the export request.
- If unsupported, disable or remove Export and add accessible explanatory copy.

## Files To Change

| File | Required change |
|---|---|
| `core/services/analytics/analyticsService.ts` | Add a pure `exportTopContent` or CSV serialization helper if export is implemented. |
| `core/server/validation/analyticsSchemas.ts` | Add strict export query/body schema with format enum and clamped limits. |
| `core/server/routes/analyticsRoutes.ts` | Register export endpoint or explicitly avoid adding one if UI disables export. |
| `core/admin/services/analyticsClient.ts` | Add `exportTopContent` client method returning blob/text payload. |
| `core/admin/ui/analytics/AnalyticsPage.tsx` | Pass selected range/export callback into drawer. |
| `core/admin/ui/analytics/TopContentDrawer.tsx` | Replace close-only Export handler with real export or disabled state. |
| `tests/integration/routes/analytics.test.ts` | Cover export route registration, validation, and response shape. |
| `tests/vitest/admin/analyticsClient.test.ts` | Cover export client serialization. |
| `tests/vitest/ui/analytics.test.tsx` | Assert button download or disabled state. |

## Implementation Pseudocode

```ts
export function serializeTopContentCsv(items: TopContentItem[]) {
  return [
    ["type", "title", "slug", "updatedAt", "score"],
    ...items.map((item) => [item.type, item.title, item.slug ?? "", item.updatedAt, String(item.score)]),
  ].map(csvRow).join("\n");
}

router.get("/analytics/top-content/export", requirePermission("content:read"), async (ctx) => {
  const limit = parseNumber(ctx.query.limit) ?? 50;
  const type = normalizeTopContentType(ctx.query.type);
  validate(topContentExportQuerySchema, { limit, type, format: ctx.query.format ?? "csv" });
  return { fileName, contentType: "text/csv", content: serializeTopContentCsv(await getTopContent(limit, type)) };
});

async function handleExport() {
  setIsExporting(true);
  const file = await exportTopContent({ limit: items.length || 50, rangeDays });
  triggerDownload(file);
}
```

Data flow:

- Analytics page range state -> drawer export callback -> admin client -> route
  -> service helper -> browser download.

Error handling:

- Disable Export while loading/exporting.
- Surface route/client errors inside the drawer without closing it.
- If there are zero rows, either export an empty CSV with headers or disable
  export with "No rows to export"; choose one and test it.

Regression-test shape:

- Route test asserts unknown `format` is rejected.
- Client test asserts query params include selected limit/type/range.
- UI test clicks Export and observes download callback or disabled explanatory
  state.

## Security Contract

- Endpoint visibility: internal admin.
- Auth model: session cookie.
- RBAC: `content:read`.
- CSRF: not required for GET; required if implemented as POST.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: strict format/type enum, clamped limit/range.
- Anti-abuse: no public write.
- Data handling: export only public/admin-visible analytics summary rows, never
  raw access logs, IPs, user agents, secrets, or draft payloads.

## Testing Requirements

- `bun test tests/integration/routes/analytics.test.ts`
- `bun run test:vitest -- tests/vitest/admin/analyticsClient.test.ts tests/vitest/ui/analytics.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Analytics report with export decision and evidence.
- Update user docs if an export format becomes part of the product contract.

## Acceptance Criteria

- Export no longer closes the drawer as its only behavior.
- Export either downloads a deterministic file or is visibly unavailable.
- Error/loading/empty-row states are explicit and tested.
