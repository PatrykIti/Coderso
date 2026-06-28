# TASK-479-29-L03: Auth Tests
# FileName: TASK-479-29-L03-Auth-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Auth / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-29-L01, TASK-479-29-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-29

---

## Overview

Update and extend the Vitest render suites for the auth screens so the restyle
from L01/L02 is locked in without re-asserting prototype mock markup. Tests run in
the Bun-free admin Vitest lane via the existing `renderAdminUi` server-render
helper. They assert the new centered-card chrome, preserved auth copy, canonical
admin-path links, and the absence of de-SaaS chrome (no sign-up CTA) — while the
existing auth-flow suites under `tests/vitest/authUi/` (login/2FA behavior) stay
green untouched.

- **Goal:** Render-test coverage that fails if the auth restyle regresses
  (missing centered chrome / lost or renamed copy / a back-link that no longer
  resolves through `withAdminBasePath` / reintroduced sign-up CTA) and that updates
  the one existing assumption that changes (`auth-shell.test.tsx` no longer requires
  a `brand` split panel). Note: the canonical hrefs the helper emits ARE
  `/admin/...` strings (`resolveAdminBasePath()` → `/admin`), so assert their
  **presence**, never their absence.
- **Owning module/service:** the existing suites
  `tests/vitest/ui/{auth-shell,login,reset-password,otp-input,set-password,two-factor}.test.tsx`
  — **all already exist on disk** (including `set-password.test.tsx` and
  `two-factor.test.tsx`), so this leaf **extends/updates** them; it does NOT create
  net-new files. (`login-alerts.test.tsx` is a Settings page — `LoginAlertsPage` —
  not an auth screen; do NOT modify it here, it is owned by group 28.)
- **Source-of-truth docs:**
  - Render helper: `tests/utils/adminRouterRender.tsx` (`renderAdminUi`; `.tsx`, not `.ts`)
  - Existing patterns: `tests/vitest/ui/{login,auth-shell,otp-input,reset-password,set-password,two-factor}.test.tsx`
  - Targets under test: `core/admin/ui/auth/*`, `core/admin/ui/layouts/AuthShell.tsx`
  - `_docs/TESTING_STRATEGY.md` (Vitest lane; do NOT move runtime tests here)
- **Out of scope:** No new behavior tests for the auth flow itself (CSRF /
  reCAPTCHA / `login` / `verifyOtp` are covered by `tests/vitest/authUi/*` and
  service tests — keep those as-is). No e2e/runtime coverage migration.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Tests assert that auth links continue to
resolve through `withAdminBasePath` and that no token/secret copy leaks into
rendered markup.

---

## Implementation Pseudocode

### Update existing suites (markup changed)

```tsx
// tests/vitest/ui/auth-shell.test.tsx — the centered default no longer needs `brand`.
test("AuthShell renders centered chrome + content", () => {
  const html = renderAdminUi(<AuthShell><div>Content</div></AuthShell>);
  expect(html).toContain("Content");
  expect(html).toContain("Coderso");          // logo/product heading in centered layout
});
// (Optional) keep a back-compat case asserting `brand` still renders when passed.
```

```tsx
// tests/vitest/ui/login.test.tsx — extend the existing copy assertions.
test("LoginPage renders restyled login card", () => {
  const html = renderAdminUi(<LoginPage />);
  expect(html).toContain("Welcome back");
  expect(html).toContain("Sign in");
  expect(html).toContain("or continue with email");      // new divider
  expect(html).not.toMatch(/Create one|Sign up/i);       // de-SaaS: no self-serve CTA
  // withAdminBasePath emits the LITERAL "/admin/reset" (resolveAdminBasePath() → "/admin"
  // under SSR); assert the canonical href is PRESENT — a not.toContain here is
  // unsatisfiable and contradicts the green tests/vitest/authUi/loginForm.test.tsx.
  expect(html).toContain('href="/admin/reset"');         // canonical forgot-password link
});
```

### Update the existing two-factor / set-password / reset suites

> `two-factor.test.tsx` and `set-password.test.tsx` **already exist** on disk — these
> are edits to the current assertions, not new files. Keep the **preserved** copy the
> green suites assert (this is a visual restyle; copy is unchanged).

```tsx
// tests/vitest/ui/two-factor.test.tsx — already exists; extend assertions.
import { renderAdminUi } from "../../utils/adminRouterRender";
import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";
test("TwoFactorPage renders centered card + OTP cells", () => {
  const html = renderAdminUi(<TwoFactorPage />);
  expect(html).toContain("Two-factor authentication");
  expect((html.match(/data-slot="input"/g) ?? []).length).toBeGreaterThanOrEqual(6); // segmented OTP
  expect(html).toContain("Verify &amp; Enable");        // preserved button copy (also asserted by authUi/twoFactorForm.test.tsx)
});
```

```tsx
// tests/vitest/ui/set-password.test.tsx — already exists; extend assertions.
import { renderAdminUi } from "../../utils/adminRouterRender";
import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";
test("SetPasswordPage renders strength meter + checklist", () => {
  const html = renderAdminUi(<SetPasswordPage token="t" />);
  expect(html).toContain("Set new password");           // preserved heading (NOT "Create a new password")
  expect(html).toContain("Password strength");          // PasswordStrengthList header preserved
  expect(html).toContain("At least 8 characters");      // PasswordStrengthList rule labels preserved
  expect(html).toContain("At least 1 number");
  expect(html).toContain("Update password");            // preserved submit copy (NOT "Set password")
});
```

```tsx
// reset-password.test.tsx — already exists; keep existing assertions, add the back-link check.
test("ResetPasswordPage keeps copy and canonical back link", () => {
  const html = renderAdminUi(<ResetPasswordPage />);
  expect(html).toContain("Reset password");             // preserved heading (NOT "Reset your password")
  expect(html).toContain("/admin/login");               // canonical back link withAdminBasePath emits (present, NOT absent)
});
```

**Data flow:** each test server-renders the target page/component through
`renderAdminUi` and asserts on the returned HTML string (no DOM events; behavior
covered elsewhere). The set-password test passes a `token` prop so `resolveToken`
does not depend on `window.location`.

**Error handling:** these are pure render assertions; if `renderAdminUi` throws on
a missing provider, wire the same provider setup the existing `tests/vitest/ui/*`
auth suites use (they already render these pages without extra context).

**Regression-test shape:** snapshot-free string assertions targeting stable copy
and the canonical-link/no-SaaS-CTA invariants (assert the `/admin/...` hrefs are
**present**, since `withAdminBasePath` emits those literal strings), so a future
prototype-literal regression (lost/renamed copy, reintroduced sign-up CTA) fails
fast.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/auth-shell.test.tsx tests/vitest/ui/login.test.tsx tests/vitest/ui/login-alerts.test.tsx tests/vitest/ui/reset-password.test.tsx tests/vitest/ui/otp-input.test.tsx tests/vitest/ui/two-factor.test.tsx tests/vitest/ui/set-password.test.tsx`
  (`login-alerts.test.tsx` is run **defensively** as a regression guard — it is a
  Settings page owned by group 28 and is NOT modified by this leaf.)
- Keep `tests/vitest/authUi/loginForm.test.tsx` and
  `tests/vitest/authUi/twoFactorForm.test.tsx` green (auth flow unchanged).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-29-L03`.
- If any new suite path is added, ensure it matches the Vitest lane conventions in
  `_docs/TESTING_STRATEGY.md`.
