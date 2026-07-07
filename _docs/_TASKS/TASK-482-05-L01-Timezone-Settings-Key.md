# TASK-482-05-L01: Add `site.timezone` (+ optional branding/logo) settings key
# FileName: TASK-482-05-L01-Timezone-Settings-Key.md

**Parent Subtask:** TASK-482-05
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Add `site.timezone` (an IANA time-zone string, default `"UTC"`) to
  the settings allowlist with a dedicated normalizer + validation, and optionally
  `site.branding.logoId` (nullable media/asset id) for the branding step. These
  keys are owned by the settings **service** (routes only re-export
  `resolveSettingKey`), so they are accepted by every settings write path
  automatically.
- **Owning module(s) to extend:** `core/services/settings/settingsService.ts`:
  - Add the keys to `DEFAULT_SETTINGS` (lines 48-82) — `"site.timezone": "UTC"`
    and (optional) `"site.branding.logoId": null as string | null`. This grows
    `ALLOWED_KEYS` (line 89) and `SettingKey` automatically.
  - Add a `normalizeTimezoneValue` and branch it into the `validateSettingValue`
    dispatch (module-private, **not exported**; line 318 — alongside the
    `site.name`/`site.locale` string branch at line 319).
  - For the logo id reuse `normalizeOptionalIdValue` (definition line 301; the
    same helper used for `site.homepageId` et al. via `isOptionalIdSettingKey`,
    lines 100-104, dispatched at line 342).
- **Coordination note (logo persistence ownership):**
  `core/admin/ui/settings/LogoUploadCard.tsx` (lines 8-15) explicitly marks
  **TASK-359-04** as the owner of logo/favicon persistence and keeps the
  settings-screen upload controls as deliberate no-ops. The optional
  `site.branding.logoId` key therefore lands **only with explicit orchestrator
  coordination with TASK-359-04** on the key shape (so the wizard and the
  settings screen agree where the logo lives). Absent that sign-off, skip the
  key here and ship `site.timezone` alone — do not silently invent a second,
  competing logo-persistence mechanism.
- **Source-of-truth docs:** `_docs/SETTINGS.md`, `_docs/CMS_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`.
- **Out-of-scope:** the Basic step UI (05-L02); any timezone-aware rendering
  elsewhere (display formatting is a separate concern).

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf never touches them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Security Contract

- **Endpoint visibility:** internal — written via the existing
  `/admin/api/*` settings routes (`PATCH /settings`, `PATCH /settings/:key`),
  not a new endpoint.
- **Auth model:** session + RBAC (unchanged; inherited from `settingsRoutes.ts`).
- **RBAC permission(s):** `settings:read` (GET) / `settings:write` (PATCH) — no
  change; the new keys ride the existing guards.
- **CSRF:** enforced on the existing settings PATCH writes (internal mutation) —
  unchanged.
- **Rate-limit bucket:** `admin_write` (default for `/settings` PATCH) —
  unchanged.
- **Validation schema-owner module:** the **service** owns value validation via
  `validateSettingValue` (module-private in `settingsService.ts`, line 318;
  reject-unknown is already enforced by `resolveSettingKey` →
  `settings_key_invalid`). `normalizeTimezoneValue` must reject non-strings and
  unknown zones with `settings_value_invalid`.
- **Anti-abuse:** N/A (authenticated internal write).
- **Secret/PII handling:** timezone and logo id are non-secret; no redaction
  needed. No PII.

## Implementation Pseudocode

```ts
// DEFAULT_SETTINGS additions
"site.timezone": "UTC",
"site.branding.logoId": null as string | null, // optional

// validator — prefer Intl over a hardcoded list
const normalizeTimezoneValue = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("settings_value_invalid");
  const tz = value.trim();
  if (!tz) throw new Error("settings_value_invalid");
  try {
    // Throws RangeError for an invalid IANA zone.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error("settings_value_invalid");
  }
  return tz;
};

// in validateSettingValue(key, value) — module-private, settingsService.ts:318
// (export normalizeTimezoneValue itself if a Bun-free Vitest unit test is wanted):
if (key === "site.timezone") return normalizeTimezoneValue(value);
if (key === "site.branding.logoId") return normalizeOptionalIdValue(value);
```

- **Data flow:** PATCH body → `resolveSettingKey` (allowlist) →
  `validateSettingValue` → persisted in the `settings` KV table.
- **Error handling:** invalid zone ⇒ `settings_value_invalid` (mapped by
  `mapSettingsRouteError` to 400); unknown key ⇒ `settings_key_invalid` (400).
- **Regression-test shape** (shared REMOTE test DB — never assume a fresh DB;
  follow the self-restoring pattern already in
  `tests/unit/settings/settingsService.test.ts` lines 28-63):
  `setSetting("site.timezone", "Europe/Warsaw")` round-trips via `getSetting`;
  `"Mars/Phobos"` and `42` throw `settings_value_invalid`; then
  `deleteSetting("site.timezone")` and assert `getSetting`/`listSettings()`
  reports the default `"UTC"` **after** the delete (order-independent across
  parallel streams). Add `site.timezone` (and `site.branding.logoId` if it
  lands) to the suite's `cleanupKeys` array so `afterAll` restores the shared
  settings rows.

## Testing Requirements

- **Lane (service, Bun):** extend `tests/unit/settings/settingsService.test.ts`
  (bun:test, DB-backed via `testIfDb`, self-restoring `cleanupKeys` +
  `afterAll` `deleteSetting`). Cases: valid IANA zone accepted +
  `setSetting`/`getSetting` round-trip; invalid/non-string rejected with
  `settings_value_invalid`; default `"UTC"` reported after `deleteSetting`;
  optional logo id round-trips (if the key lands, see coordination note).
  Extend the `cleanupKeys` array with `site.timezone` (and
  `site.branding.logoId`). Rationale: `setSetting`/`listSettings` hit the real
  Postgres — per `_docs/TESTING_STRATEGY.md` that is the Bun lane; Vitest owns
  only Bun-free pure-domain logic.
- **Lane (pure normalizer, Vitest — optional):** only if
  `normalizeTimezoneValue` is exported from `settingsService.ts` (the
  `validateSettingValue` dispatch is module-private), a Vitest unit test may
  cover the zone-string edge cases without a DB. Otherwise skip this lane and
  rely on the Bun service suite.
- **Lane (route wiring, Bun):** extend
  `tests/integration/routes/settings.test.ts` — note this is a **fake-router
  wiring/error-mapping suite** (`makeRouter`/`runRoute`; no HTTP server, no
  status-code or persistence assertions). Assert: the PATCH handler run via
  `runRoute` propagates `settings_value_invalid` for an invalid zone and
  `settings_key_invalid` for an unknown key, and `mapSettingsRouteError` maps
  both to 400 `ApiError`s. Persistence assertions live in the Bun service
  suite above, not here.
- **DB note:** **No migration artifacts required** — `settings` is a generic KV
  table (`settings(key, value)` in `core/db/schema.ts` line 373); new keys are
  rows, not columns.
