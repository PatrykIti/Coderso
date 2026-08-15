# TASK-491-04-L02: Health UI surface + docs
# FileName: TASK-491-04-L02-Health-UI-And-Docs.md

**Parent Subtask:** TASK-491-04
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** TASK-491-04-L01
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Surface real health in the admin Integrations UI and add a "Test
  connection" action, then update the contract docs. This closes TASK-491.
- **Owning module(s) to create-or-extend:**
  - `core/admin/ui/settings/IntegrationCard.tsx` — render the real
    `health.status` (`unknown | healthy | issue`) alongside the existing
    connected/disconnected pill (new optional `health` prop). Keep the TASK-479
    reskin look; this only binds data to the pill.
  - `core/admin/ui/settings/IntegrationDrawer.tsx` — show `health.status`,
    `lastCheckedAt`, `lastError`, and a "Test connection" button that calls
    `checkIntegration(id)` and refreshes the row.
  - `core/admin/ui/settings/IntegrationsPage.tsx` — wire the "Test connection"
    handler through the existing `IntegrationRecord` state + the
    `integrationsClient.checkIntegration` wrapper (04-L01); follow the existing
    load/update state pattern (no mount-force refetch loops, no dirty-state
    overwrite).
  - `core/admin/services/integrationsClient.ts` — ensure `IntegrationRecord`
    carries `health` (it already comes from the summary) and that
    `checkIntegration` (added in 04-L01) is exported.
  - Docs: `_docs/CMS_API.md` (add the `POST /settings/integrations/:id/check`
    endpoint + per-provider runtime behavior), `_docs/ARCHITECTURE.md` (the
    integration runtime seams: GA head injection, event dispatch hub + emission
    points, Sentry boot init, health evaluation).
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out of scope:** Auto-polling health on an interval; redesigning the cards
  beyond binding real status; the prototype twin under `_docs/_PROTOTYPE/`
  (visual-only, not a runtime surface).

---

## Security Contract

- **Endpoint visibility:** consumes the internal `/admin/api/settings/integrations/:id/check`
  (defined in 04-L01); the UI adds no new endpoint.
- **Auth model:** session (admin) via the existing admin API client.
- **RBAC:** the "Test connection" action requires `settings:write` (enforced
  server-side by 04-L01); hide/disable the action for read-only users per the
  existing settings UI gating.
- **CSRF:** handled by the shared admin API client (existing pattern).
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** UI sends only `:id`; no free-form payload.
- **Anti-abuse:** n/a (internal authenticated action).
- **Secret handling:** the UI renders only the masked summary (`value: null` /
  `configured`) and machine-readable `lastError` codes. Do NOT place any
  integration config, `lastError` details, or status into browser
  cache/localStorage/debug payloads beyond the standard admin cache contract for
  the (already-redacted) summary.

---

## Implementation Pseudocode

```tsx
// IntegrationCard.tsx — add optional health prop + dot
type IntegrationCardProps = {
  /* ...existing... */
  status: IntegrationStatus;
  health?: { status: "unknown" | "healthy" | "issue" };
};
// render a small health dot/label: healthy=green, issue=red, unknown=muted

// IntegrationsPage.tsx — handler
const handleTestConnection = async (id: string) => {
  setCheckingId(id);
  try {
    const { item } = await checkIntegration(id);          // integrationsClient
    setItems((prev) => prev.map((r) => (r.id === id ? item : r))); // replace row, no full refetch
  } catch (error) {
    setDrawerError(isApiClientError(error) ? error.message : "check_failed");
  } finally {
    setCheckingId(null);
  }
};
```

**Data flow:** click "Test connection" → `checkIntegration(id)` →
internal route (04-L01) → returns masked summary with fresh health → replace the
single row in state → card/drawer reflect `healthy/issue/unknown` +
`lastCheckedAt`.

**Error handling:** API errors surface via the existing `isApiClientError`
drawer-error path; the action is idempotent (re-runnable). No mount-force refetch
loop; no dirty-state overwrite of in-flight edits.

**Regression-test shape:**

- UI render: a row with `health.status = "issue"` shows the issue indicator; a
  `"healthy"` row shows healthy; default `"unknown"` shows the neutral state.
- "Test connection" calls `checkIntegration` once and updates only that row;
  an API error shows the drawer error and does not wipe other rows.

---

## Testing Requirements

- Vitest (`tests/vitest/ui-integration/integrationsHealthUi.test.tsx`) — card +
  drawer render real health states and the "Test connection" action calls the
  client and updates the row (render flow → Vitest ui-integration lane).
- Lint + type-check (treat `react-hooks/*` findings as contract issues; no
  synchronous `setState` in effect bodies).
- Docs: verify `_docs/CMS_API.md` and `_docs/ARCHITECTURE.md` describe the new
  endpoint + runtime seams. Do not edit `_docs/_TASKS/README.md` or add changelog
  entries (orchestrator-owned).
