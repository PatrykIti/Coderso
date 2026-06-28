# TASK-486: Popups: Public Runtime Delivery & Trigger/Targeting Engine
# FileName: TASK-486_Popups_Public_Runtime_Delivery.md

**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Large
**Dependencies:** TASK-054-12 (popups admin CRUD + publish, DONE — admin-only)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

Popups authored in the admin are **never shown to visitors**. The engagement
suite (TASK-054-12) shipped a complete admin CRUD + publish flow for popups —
trigger types (`time_delay`, `scroll_depth`, `exit_intent`, `cta_click`),
path/audience targeting, frequency/cooldown strategies, placement/overlay
settings — but closed **admin-only**: there is **zero public runtime**. Grep
confirms the public stack (`core/server/publicSite.tsx`, `core/site/*`,
`core/widgets/*`) contains **no popup references**, and every `/popups` route is
gated behind `popups:read` / `popups:write` (no anonymous read path). The
TASK-054-12 umbrella envisioned `resolvePopup({ page, userSegment, trigger,
frequencyRules })` + `enqueueClientPopup(popup)` but never implemented it.

This task closes that gap: it delivers published, targeted popups to anonymous
public visitors via a secure public-read endpoint plus a client runtime engine
that detects triggers, honours targeting + frequency/cooldown, and renders the
popup on the live site.

---

## Scope

### In scope

- A **public read endpoint** (`GET /api/popups`) that returns only
  **published** popups whose targeting matches the current request, with
  **server-side targeting evaluation** (path include/exclude + audience resolved
  from session, never trusted from the client), a sanitized PII-free DTO,
  anonymous read, and `public_read` rate limiting.
- A **client runtime engine** (pure, testable TS): trigger detection
  (time/scroll/exit-intent/cta), client-side path/audience guard, and
  frequency/cooldown gating via browser storage.
- A **render component** that builds the popup DOM (placement, overlay,
  dismiss, CTA with safe-href sanitization) and a **global runtime injection**
  wired into the public-site response boundary so popups load on every public
  page/entry/template.
- Tests in the correct lanes + source-of-truth doc updates.

### Out of scope

- Server-side impression/dismissal tracking or analytics writes (frequency is
  enforced client-side via storage). **Any** future public write MUST add the
  nonce + HMAC anti-abuse contract used by forms/booking (see Notes).
- A/B testing, scheduling windows, or consent-management integration.
- New admin CRUD/editor work (already shipped by TASK-054-12).
- New popup content/template authoring features.

### What TASK-479 reskin already covers vs what this task adds

- **TASK-479 (admin reskin)** restyles the popup **editor** UI only
  (`TASK-479-20-L02-Popup-Editor-Restyle`) — it does not add any public
  runtime. This task adds the **entire public delivery path** (endpoint +
  runtime + render); it touches no admin styling.

---

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-486-01 | Public read endpoint + server-side targeting eval | Medium | ⏳ To Do |
| TASK-486-02 | Client runtime engine (triggers, targeting, frequency) | Medium | ⏳ To Do |
| TASK-486-03 | Render component + publicSite wiring | Medium | ⏳ To Do |
| TASK-486-04 | Tests (Bun route + Vitest engine/render) & docs | Medium | ⏳ To Do |

---

## Testing Requirements

- **Bun lane** (`tests/integration/routes/*`, `tests/security/*`) for the public
  `/api/popups` route, Bun.serve delivery, RBAC/visibility, rate-limit bucket,
  no-PII payload, and the served-HTML runtime injection.
- **Vitest lane** (`tests/vitest/*`, `tests/vitest/ui-integration/*`) for the
  pure engine logic (trigger thresholds, frequency/cooldown gate, targeting
  match) and the render component (placement/overlay/dismiss/CTA-safe-href).
- Existing gates stay green: `bun run lint`, `bun run typecheck`,
  `bun test`, `bun run test:vitest`.

---

## Documentation Updates Required

- `_docs/CMS_API.md` — add the public `GET /api/popups` endpoint (query, DTO
  shape, visibility, rate-limit) under the engagement section and correct the
  "v1 engagement routes are internal-only (no public routes)" note.
- `_docs/SECURITY_SPEC.md` — add the popups `public_read` row, the no-PII
  output contract, and the forward guard that any future popup write uses the
  `public_write` nonce+HMAC+CAPTCHA contract.
- `_docs/ARCHITECTURE.md` — record the popup public-runtime delivery path
  (endpoint → injected runtime → render) alongside the existing public-site
  runtime resolvers.

---

## Notes

- **No DB change.** This feature is read-only against the existing `popups`
  table (`core/db/schema.ts` ~L1158) and its `popups_status_idx`; no migration
  artifacts are required. Any leaf that later adds a write MUST ship full
  migration artifacts (SQL + `meta/*_snapshot.json` + `meta/_journal.json`).
- **Anti-abuse forward guard.** The public surface is intentionally a single
  idempotent `GET`. If impression/dismissal tracking is ever added, it becomes a
  `public_write` and MUST reuse the shared nonce+HMAC evaluators
  (`core/services/forms/submissionNonce.ts`,
  `core/services/booking/bookingSubmissionNonce.ts`) + optional reCAPTCHA per
  `_docs/SECURITY_SPEC.md`.
- **Schema ownership.** All popup schemas/normalizers stay in
  `core/services/popups/*` and `core/server/validation/popupSchemas.ts`; the new
  public DTO/query schema is owned by the popups service/validation modules and
  routes only re-export — never re-declare.
- Implement in dependency order: 01 → 02 → 03 → 04.
