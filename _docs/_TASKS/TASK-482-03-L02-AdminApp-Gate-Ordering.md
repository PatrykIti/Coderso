# TASK-482-03-L02: `AdminApp` install-gate ordering + post-create handoff
# FileName: TASK-482-03-L02-AdminApp-Gate-Ordering.md

**Parent Subtask:** TASK-482-03
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-03-L01, TASK-482-01-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
    to `shouldShowSetupWizard` (line 234-243) for unit-testing.
  - Insert the installer early-return **before** the
    `isProtected && authState !== "authenticated"` loading branch (line
    1076-1083) and the `useEffect` that redirects unauthenticated → `/login`
    (line 1059-1067). The redirect effect must also no-op while
    `installState === "available"`.
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
if (installState === "checking") return <Loading />;            // before login redirect
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
// ...existing: loading branch (1076), setup wizard (1085), routes
```

And the redirect `useEffect` (1059-1067) guards with
`if (installState === "available") return;` before `window.location.assign(.../login)`.

- **Data flow:** mount → fetch install status → render installer | fall through.
- **Error handling:** status fetch failure ⇒ `installState = "disabled"`.
- **Regression-test shape:** `shouldShowInstaller` truth table; with mocked
  status `available` + unauthenticated ⇒ installer renders and **no** `/login`
  redirect fires; status `disabled` ⇒ normal login redirect; status `available`
  + authenticated (edge) ⇒ installer hidden.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/adminApp-installer-gate.test.tsx` (render
  ordering, redirect suppression) plus a pure unit test for
  `shouldShowInstaller` in `tests/vitest/admin/` (truth table; asserts it gates
  ahead of redirect/loading).
- Cases: fresh install renders installer, no login bounce; disabled ⇒ login
  redirect; failed status fetch ⇒ login redirect (fail-safe).
- No migration artifacts.
