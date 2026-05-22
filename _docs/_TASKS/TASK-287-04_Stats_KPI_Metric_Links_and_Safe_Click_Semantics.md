# TASK-287-04: Stats KPI Metric Links and Safe Click Semantics

# FileName: TASK-287-04_Stats_KPI_Metric_Links_and_Safe_Click_Semantics.md

**Priority:** Medium
**Category:** Widgets + Stats KPI + Runtime Render + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-06-02, TASK-287, TASK-287-01
**Status:** To Do

---

## Overview

Add optional per-metric links for Stats KPI cards using the shared safe-href
contract already present in the current branch. A metric may link to an
internal path or safe external URL, with explicit label/copy and safe
target/rel behavior routed through `resolveWidgetLinkAttrs`. This leaf must not
create a public write endpoint or arbitrary action system.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:71` - W9, no CTA/link per metric.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:261` - per-metric CTA is a
  medium-priority report item.
- `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md:12` - dashboard actions rejected;
  Stats KPI links should stay marketing/navigation-only, not operational
  actions.
- `core/widgets/core/statsKpi.tsx:10-32,299-360,414-461` - current item model,
  card output, and variant rendering owners.
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:435-525` - current repeated
  metric editor owner.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/statsKpi.tsx` | Extend item schema/defaults/normalizer and card renderer for optional `link.href`, `link.label`, and target policy using the finalized shared safe-link helper. |
| `core/widgets/core/widgetSafeHref.ts` | No shared-helper change is expected here. Reuse the current `resolveWidgetLinkAttrs` export instead of duplicating target/rel logic in `statsKpi.tsx`. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Add Visual controls for metric link URL, optional link label, and safe target choice after the safe-href owner exists. |
| `tests/vitest/widgets/statsKpi.test.tsx` | Cover safe internal/external link rendering, blocked unsafe hrefs, non-linked card compatibility, and target/rel behavior only when the TASK-256-06-02 shared helper provides it. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Cover metric link editor controls and persistence shape. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run or update if Stats KPI needs a new safe-href mode. |
| `tests/unit/widgets/validator.test.ts` | Add schema accept/reject coverage for link fields. |
| `_docs/_WIDGETS/STATS_KPI.md` | Document per-metric link behavior and safe URL rules. |
| `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | Mark W9 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type StatsKpiItemLink = {
  href?: string;
  label?: string;
  openInNewTab?: boolean;
};

function normalizeStatsKpiItemLink(input: StatsKpiItem["link"]): StatsKpiItemLink | undefined {
  if (!input || typeof input !== "object") return undefined;
  const href = normalizeOptionalText(input.href);
  if (!href) return undefined;
  return {
    href,
    label: normalizeOptionalText(input.label),
    openInNewTab: Boolean(input.openInNewTab),
  };
}

function StatsKpiCard({ item }: { item: StatsKpiItem }) {
  const linkAttrs = resolveWidgetLinkAttrs(item.link?.href, {
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
    openInNewTab: item.link?.openInNewTab,
  });
  return linkAttrs
    ? <a {...linkAttrs}>{cardContent}</a>
    : <article>{cardContent}</article>;
}
```

Data flow:

- Editor writes item link data under the item, not under global style.
- Normalizer keeps links optional and omits empty URL payloads.
- Renderer routes link output through `resolveWidgetLinkAttrs`, which already
  combines URL normalization with safe target/rel attributes for internal and
  external links.
- Unsafe links leave the metric rendered as a non-clickable card and expose a
  deterministic test marker or diagnostics string if the existing helper
  supports one.

Error handling:

- Unsafe protocols such as `javascript:` must never render as clickable links.
- Missing link label falls back to the metric label/value for accessible text
  after TASK-256 accessibility labels are in place.
- Opening in a new tab must emit safe `rel` attributes through the shared
  helper and must not add local target/rel logic in `statsKpi.tsx`.
- Do not add button-like actions, form submissions, analytics mutations, or
  public write behavior to Stats KPI metrics.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: link fields must be schema-bound with
  `additionalProperties: false`.
- Anti-abuse: use the existing safe-href helper for URL normalization and the
  TASK-256-06-02 helper for target/rel when available. Reject or omit unsafe
  hrefs; do not allow raw HTML, scripts, inline handlers, or arbitrary
  protocols.
- Secret handling: do not store secrets, signed URLs, private tokens, or provider
  keys in metric link fields, DOM markers, diagnostics, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with W9 evidence or deferral
  notes.
- `_docs/_TASKS/TASK-287-04_Stats_KPI_Metric_Links_and_Safe_Click_Semantics.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Metrics can be linked through schema-owned, optional, safe link fields.
- Unsafe URLs do not render clickable output.
- External links use safe target/rel behavior from the shared helper rather
  than reimplementing it inside Stats KPI.
- Stats KPI remains a presentational/read-navigation widget, not an action or
  public-write widget.
