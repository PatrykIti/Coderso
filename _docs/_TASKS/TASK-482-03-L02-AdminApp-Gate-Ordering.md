# TASK-482-03-L02: `AdminApp` install-gate ordering + post-create handoff
# FileName: TASK-482-03-L02-AdminApp-Gate-Ordering.md

**Parent Subtask:** TASK-482-03
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-03-L01, TASK-482-01-L02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Wire `InstallerWizard` into `AdminApp.tsx` so a fresh install shows
  the installer **before** any redirect to `/login`. Add an install-status
  bootstrap, a pure `shouldShowInstaller` predicate (sibling to the existing
  `shouldShowSetupWizard`), and order the early-return branches correctly. On
  successful create, hand off to `/login` (or, if 02-L02 issued a session,
  continue into the authenticated app / Phase-2 wizard).
- **Owning module(s) to extend:** `core/admin/app/AdminApp.tsx`:
  - Add an `installState` (`"checking" | "available" | "disabled"`) populated
    from `GET /auth/install/status`, gated on `isAdminPath` and run for **both**
    authenticated and unauthenticated states (the status endpoint is public).
  - Export `shouldShowInstaller({ isAdminPath, installState, authState })` next
    to `shouldShowSetupWizard` (line 237-246 at HEAD fbe93dae) for unit-testing.
  - Insert the installer early-return **before** the
    `isProtected && authState !== "authenticated"` loading branch (line
    1091-1098) and the `useEffect` that redirects unauthenticated → `/login`
    (line 1074-1082 — identify it by shape: the effect calling
    `window.location.assign(withAdminBasePath(adminBasePath, "/login"))`; do
    NOT confuse it with the canonical-path `history.replaceState` effect that
    now sits just above it at 1062-1072). The redirect effect must no-op while
    the install status is unresolved or available (see pseudocode: guard with
    `installState !== "disabled"`).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/ADMIN_NAVIGATION.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out-of-scope:** the installer form (03-L01); finalize/`setup.completed` (08).

## Security Contract

- **Endpoint visibility (gate ordering is the security control):** the installer
  must render for unauthenticated visitors **only** when
  `installState === "available"` (DB has zero users). Once disabled, the gate
  must fall through to the normal login redirect with **no** way to re-open the
  installer client-side (the server self-disables regardless, but the client
  must not flash the form).
- **Auth model:** the install-status fetch is public and unauthenticated; it must
  run even when `authState === "unauthenticated"` (the current settings/theme
  effects are gated on `authenticated` — the install fetch must not be).
- **RBAC permission(s):** none.
- **CSRF:** N/A (status is a GET; create handled by 03-L01).
- **Rate-limit bucket:** server `auth` bucket on the status fetch.
- **Validation:** none client-side beyond the `available` boolean.
- **Anti-abuse:** treat a failed/uncertain status fetch as **not available**
  (fail toward the normal login flow), so a transient error cannot expose the
  installer on a populated DB.
- **Secret/PII handling:** none — status carries only `{ available }`.

## Implementation Pseudocode

```ts
export const shouldShowInstaller = (input: {
  isAdminPath: boolean;
  installState: "checking" | "available" | "disabled";
  authState: "checking" | "authenticated" | "unauthenticated";
}) =>
  input.isAdminPath &&
  input.installState === "available" &&
  input.authState !== "authenticated"; // installer is a pre-login surface
```

Render ordering in `AdminApp` (top of the render, before existing branches):

```tsx
if (installState === "checking") return <Loading />; // render-side only — does NOT stop the
                                                      // redirect effect; the effect guard below is mandatory
if (showInstaller) {
  return (
    <AdminBasePathProvider value={adminBasePath}>
      <AdminThemeTokensStyle css={tokenCss} />
      <InstallerWizard onInstalled={() => {
        setInstallState("disabled");
        // Handoff: navigate to /login (default). If a session cookie was set,
        // re-run resolveAuthBootstrap() instead and fall through to Phase 2.
        window.location.assign(withAdminBasePath(adminBasePath, "/login"));
      }} />
    </AdminBasePathProvider>
  );
}
// ...existing: loading branch (1091-1098), setup wizard (computed 1084, rendered 1100), routes
```

And the redirect `useEffect` (1074-1082 — the one calling
`window.location.assign(withAdminBasePath(adminBasePath, "/login"))`) guards its
unauthenticated branch with `installState !== "disabled"`, i.e. it suppresses
the `/login` redirect during **both** `"checking"` and `"available"`:

```ts
useEffect(() => {
  if (typeof window === "undefined") return;
  if (authState === "unauthenticated" && isProtected) {
    if (installState !== "disabled") return; // "checking" | "available": no bounce
    window.location.assign(withAdminBasePath(adminBasePath, "/login"));
  }
  // ...existing authenticated && isPublic branch unchanged
}, [adminBasePath, authState, canonicalRelativePath, installState, isProtected, isPublic]);
```

Why not `installState === "available"` alone: auth bootstrap and the install
status fetch run concurrently; if `authState` resolves `"unauthenticated"`
while the status is still `"checking"`, guarding only on `"available"` lets the
effect fire a full-page `/login` bounce on a fresh install (the exact bug this
leaf prevents), and makes the "no `/login` redirect fires" regression test
timing-dependent. The fail-closed error path (fetch failure ⇒ `"disabled"`)
keeps a populated install delayed by at most one status roundtrip.

- **Data flow:** mount → fetch install status → render installer | fall through.
- **Error handling:** status fetch failure ⇒ `installState = "disabled"`.
- **Regression-test shape:** `shouldShowInstaller` truth table; with mocked
  status `available` + unauthenticated ⇒ installer renders and **no** `/login`
  redirect fires; `authState` resolving `"unauthenticated"` while status is
  still `"checking"` (delayed status mock) ⇒ **no** redirect fires either
  (guards the race); status `disabled` ⇒ normal login redirect; status
  `available` + authenticated (edge) ⇒ installer hidden.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/adminApp-installer-gate.test.tsx` (render
  ordering, redirect suppression) plus a pure unit test for
  `shouldShowInstaller` in `tests/vitest/admin/` (truth table; asserts it gates
  ahead of redirect/loading).
- Cases: fresh install renders installer, no login bounce; auth resolves
  unauthenticated while status still `"checking"` ⇒ no bounce (race guard);
  disabled ⇒ login redirect; failed status fetch ⇒ login redirect (fail-safe).
- Tests are mock-based (mocked install-status/auth clients; no shared remote DB
  access, no `users`/settings mutation) per the Coordination Pins in
  TASK-482-03.
- No migration artifacts.
- Coordination pins: see TASK-482-03-Installer-UI-And-Gate-Ordering.md
  §Coordination Pins — changelog `1220` belongs to the 482-09 closure only
  (1219/1221/1222 reserved); this leaf never edits `_docs/_TASKS/README.md` or
  `_docs/_CHANGELOG/*` and stays clear of the TASK-483/484 forbidden paths.
