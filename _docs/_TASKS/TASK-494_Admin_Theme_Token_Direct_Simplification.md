# TASK-494: Admin Theme Token-Direct Simplification (Remove Profile Layer)
# FileName: TASK-494_Admin_Theme_Token_Direct_Simplification.md

**Priority:** Medium
**Category:** Admin UI / Theming / Architecture
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05 (admin `AdminThemeTokens` contract + `AdminColorModeToggle`), TASK-479-06 (shell hosting the toggle), TASK-479-25 (Admin UI Theme screen restyle). Must land **after** the TASK-479 admin redesign merges to `feature/visual`.
**Status:** ⏳ To Do
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

> Number note: 494 was the next free board ID when filed (max was TASK-493, concurrent
> 481–493 follow-ups). If a concurrent agent already claimed 494, supersede to the next free ID.

---

## Overview

The TASK-479 admin redesign made the admin theme **token-first**: one
`AdminThemeTokens` contract (`DEFAULT_ADMIN_THEME_TOKENS`, soft/violet) drives the chrome
via `--admin-*` CSS variables, and light/dark is now a **permanent `AdminColorModeToggle`**
(TASK-479-05-L06) injecting a `:root.dark` block. The legacy **profile layer**
(`admin_theme_profiles` + activation, over `admin_theme_templates`) is now redundant
indirection:

- Applying a theme requires creating a template **and** a profile **and** *activating* it;
  the tokens don't take effect until a profile is active.
- A **stale active profile silently overrides** the redesign default — observed live: an old
  `"Light" → "Default"` (blue) profile hid the violet/warm default until it was deactivated.
- Editing the tokens is **not immediately reflected** in the UI (it has to flow through
  profile resolution / activation).

**Goal:** Drive the admin UI **directly from a single editable admin-token set** (+ the dark
toggle), removing the profile-activation layer — so **editing the tokens IS the UI**, with no
profile to create / assign / activate.

- **Goal:** make the admin theme **token-direct** — editing the `AdminThemeTokens` set is the live UI; remove the `admin_theme_profiles` activation layer; light/dark stays the permanent `AdminColorModeToggle`.
- **Owning module/service:** `core/services/adminThemes/*`, `core/server/routes/adminThemeRoutes.ts`, `core/admin/services/adminThemeClient.ts`, `core/admin/ui/themes/*`, `core/db/{schema.ts, seedAdminTheme.ts, seed.ts}`.
- **Source-of-truth docs:** `_docs/THEMES_SPEC.md`, `_docs/DESIGN_TOKENS.md`, `_docs/DATA_MODEL.md`, `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md`, `_docs/RBAC_SPEC.md`, `_docs/ARCHITECTURE.md`, `_docs/CMS_API.md`; the TASK-479-05 token contract (`AdminThemeTokens`, `DEFAULT_ADMIN_THEME_TOKENS`).
- **Out of scope:** the public **site** theme system — see the dedicated "Out of scope" section below.

## Scope

- **Collapse the admin theme model to one editable token set** = the single source of truth
  (falling back to `DEFAULT_ADMIN_THEME_TOKENS`). Light/dark stays the `AdminColorModeToggle` +
  the injected `:root.dark` block already shipped in 479-05 — no per-profile dark sets.
- **Remove the admin profile layer:** retire `admin_theme_profiles` (activation,
  `core/services/adminThemes/adminThemeProfileService.ts`, profile CRUD/activate routes +
  the matching `adminThemeClient` methods). Decide in the audit leaf whether to also retire
  `admin_theme_templates` or keep templates as **named presets** the user *applies into* the
  live token set — but with **no active-profile indirection** either way.
- **Admin UI Theme screen (`core/admin/ui/themes/*`, restyled by 479-25):** edit the live token
  set directly; **Save applies immediately** through the existing cache/cacheBus
  hydrate→revalidate path (no "activate profile" step, no mount-force refetch, dirty-state safe).
- **Routes:** simplify `core/server/routes/adminThemeRoutes.ts` to token **get/save** (drop the
  profile activate/CRUD endpoints) via the centralized `map*Error` boundary.
- **DB (non-destructive):** migrate the currently-active profile's resolved tokens **into** the
  single token record FIRST, then drop `admin_theme_profiles`. Full artifacts (SQL +
  `meta/<idx>_snapshot.json` + `meta/_journal.json`); use the **next free migration index at
  implementation time** (do not hardcode — other agents are active).
- **Owning modules:** `core/services/adminThemes/*` (fold `adminThemeProfileService` into the
  token service / remove), `core/server/routes/adminThemeRoutes.ts`,
  `core/admin/services/adminThemeClient.ts`, `core/admin/ui/themes/*`,
  `core/db/{schema.ts, seedAdminTheme.ts, seed.ts}` (seed becomes "ensure the default token set",
  no profile to activate).

## Out of scope

- The **public SITE theme** system — `theme_profiles`, `theme_routes`, `ThemeRoutesEditor`,
  `_docs/THEMES_SPEC.md` site side. That is a DIFFERENT subsystem; **do not touch it**. This task
  removes only the **ADMIN** theme profile layer (`admin_theme_*`).
- Re-skin/visual work (owned by TASK-479) — this is an architecture/data-model simplification.

## Security Contract (overview)

- **Endpoint visibility:** `internal` (`/admin/api/*`). **Auth:** session cookie.
- **RBAC:** admin token read/write keeps the **existing** admin-theme permission (confirm the
  exact scope against `adminThemeRoutes.ts` — likely `settings:write`). **CSRF:** required on the
  token write. **Rate-limit:** `admin_write` for writes, `admin_read` for reads.
- **Validation:** token writes stay behind `assertAdminThemeTokens` (strict, reject-unknown) —
  the existing 479-05 contract; `normalizeAdminThemeTokens` on read for legacy/back-compat.
- **Anti-abuse:** internal/session-scoped — CSRF on the token write is the anti-abuse control;
  there is no public write, so no nonce/HMAC/CAPTCHA applies.
- **Secret handling:** unchanged — tokens carry no secrets.

## Sub-Tasks

> Planned breakdown — created as physical `TASK-494-NN-*.md` (+ `TASK-494-NN-LNN-*.md`
> executable leaves with implementation pseudocode) when this task is scheduled, in dependency order.

1. **Audit** the current admin profile/template/token flow + read paths
   (`adminThemeProfileService` / `adminThemeTemplateService` / `adminThemeTokenService`,
   `adminThemeRoutes`, `adminThemeClient`, `AdminApp` injection) → decide templates-as-presets vs
   full removal; map every consumer to migrate.
2. **Token-direct service**: single source of truth + read/write; remove profile activation.
3. **DB migration**: backfill active-profile tokens → token record, then drop
   `admin_theme_profiles` (+ artifacts).
4. **Routes + cached client**: drop profile activate/CRUD; preserve the cache contract end-to-end.
5. **Admin UI Theme screen**: edit-tokens-applies-immediately; remove profile activation UI.
6. **Docs + tests + closure**.

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest:** token service (read/write/normalize/legacy-adapter), `adminThemeClient`, the Admin
  UI Theme screen (edit → immediate apply), `AdminApp` token injection (no-profile path + the
  legacy active-profile → token-set backfill).
- **Bun:** `adminThemeRoutes` registration + security (auth/RBAC/CSRF, reject-unknown) and the DB
  migration. Load env first: `set -a && source .env && set +a`.

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` — admin theme = token-direct, no profiles; dark via the permanent toggle.
- `_docs/DESIGN_TOKENS.md` — the admin token-direct flow.
- `_docs/ADMIN_CACHE.md` + `_docs/ADMIN_CACHE_MAP.md` — admin theme token cache; remove profile keys.
- `_docs/DATA_MODEL.md` — drop `admin_theme_profiles`.
- `_docs/_TASKS/README.md` board + statistics; `_docs/_CHANGELOG/` entry on closure.

## Closure Checklist

- [ ] Profile-activation layer removed; admin UI driven by the single token set + dark toggle.
- [ ] **Editing tokens immediately reflects in the admin UI** (no activate step).
- [ ] Non-destructive DB migration (backfill active-profile tokens, then drop) with full artifacts.
- [ ] Routes / cached client / docs synced; **site theme system untouched**.
- [ ] All gates green (lint, types, Vitest, Bun route+security+migration); README board + changelog updated.
