# TASK-482-05-L01: Add `site.timezone` (+ optional branding/logo) settings key
# FileName: TASK-482-05-L01-Timezone-Settings-Key.md

**Parent Subtask:** TASK-482-05
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
  - Add a `normalizeTimezoneValue` and branch it into the `normalizeSettingValue`
    dispatch (alongside the `site.name`/`site.locale` string branch ~line 319).
  - For the logo id reuse `normalizeOptionalIdValue` (the same helper used for
    `site.homepageId` et al., lines 100-104 / 342).
- **Source-of-truth docs:** `_docs/SETTINGS.md`, `_docs/CMS_SPEC.md`,
  `_docs/CMS_API.md`, `_docs/DATA_MODEL.md`.
- **Out-of-scope:** the Basic step UI (05-L02); any timezone-aware rendering
  elsewhere (display formatting is a separate concern).

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
  `normalizeSettingValue` (reject-unknown is already enforced by
  `resolveSettingKey` → `settings_key_invalid`). `normalizeTimezoneValue` must
  reject non-strings and unknown zones with `settings_value_invalid`.
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

// in normalizeSettingValue(key, value):
if (key === "site.timezone") return normalizeTimezoneValue(value);
if (key === "site.branding.logoId") return normalizeOptionalIdValue(value);
```

- **Data flow:** PATCH body → `resolveSettingKey` (allowlist) →
  `normalizeSettingValue` → persisted in the `settings` KV table.
- **Error handling:** invalid zone ⇒ `settings_value_invalid` (mapped by
  `mapSettingsRouteError` to 400); unknown key ⇒ `settings_key_invalid` (400).
- **Regression-test shape:** `setSetting("site.timezone", "Europe/Warsaw")`
  round-trips; `"Mars/Phobos"` and `42` throw `settings_value_invalid`; the key
  appears in `listSettings()` with default `"UTC"` on a fresh DB.

## Testing Requirements

- **Lane (service):** Vitest —
  `tests/vitest/admin/settingsTimezone.test.ts` (or extend an existing settings
  service test). Cases: valid IANA zone accepted; invalid/non-string rejected;
  default present; optional logo id round-trips.
- **Lane (route):** Bun route-integration — extend
  `tests/integration/routes/settings.test.ts`: `PATCH /settings` with
  `{ "site.timezone": "Europe/Warsaw" }` ⇒ 200 + value persisted; invalid zone
  ⇒ 400 `settings_value_invalid`; unknown key still ⇒ 400.
- **DB note:** **No migration artifacts required** — `settings` is a generic KV
  table (`settings(key, value)` in `core/db/schema.ts` line 373); new keys are
  rows, not columns.
