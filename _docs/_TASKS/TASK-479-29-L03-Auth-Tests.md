# TASK-479-29-L03: Auth Tests
# FileName: TASK-479-29-L03-Auth-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Auth / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-29-L01, TASK-479-29-L02
**Status:** ⏳ To Do

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
  (missing centered chrome / lost copy / raw `/admin/...` hrefs / reintroduced
  sign-up CTA) and that updates the one existing assumption that changes
  (`auth-shell.test.tsx` no longer requires a `brand` split panel).
- **Owning module/service:** `tests/vitest/ui/{auth-shell,login,login-alerts,reset-password,otp-input}.test.tsx`
  plus a new `tests/vitest/ui/set-password.test.tsx` and
  `tests/vitest/ui/two-factor.test.tsx`.
- **Source-of-truth docs:**
  - Render helper: `tests/utils/adminRouterRender.ts` (`renderAdminUi`)
  - Existing patterns: `tests/vitest/ui/{login,auth-shell,otp-input,reset-password}.test.tsx`
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
  expect(html).not.toContain('href="/admin/reset"');     // forgot-password routed via withAdminBasePath
});
```

### New suites

```tsx
// tests/vitest/ui/two-factor.test.tsx
import { renderAdminUi } from "../../utils/adminRouterRender";
import { TwoFactorPage } from "../../../core/admin/ui/auth/TwoFactorPage";
test("TwoFactorPage renders centered card + OTP cells", () => {
  const html = renderAdminUi(<TwoFactorPage />);
  expect(html).toContain("Two-factor authentication");
  expect((html.match(/data-slot="input"/g) ?? []).length).toBeGreaterThanOrEqual(6); // segmented OTP
  expect(html).toMatch(/Verify/);
});
```

```tsx
// tests/vitest/ui/set-password.test.tsx
import { renderAdminUi } from "../../utils/adminRouterRender";
import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";
test("SetPasswordPage renders strength meter + checklist", () => {
  const html = renderAdminUi(<SetPasswordPage token="t" />);
  expect(html).toContain("Create a new password");
  expect(html).toContain("At least 8 characters");      // PasswordStrengthList rule labels preserved
  expect(html).toContain("At least 1 number");
  expect(html).toMatch(/Set password/);
});
```

```tsx
// reset-password.test.tsx — keep existing assertions; add the back-link check.
test("ResetPasswordPage routes back-to-sign-in via withAdminBasePath", () => {
  const html = renderAdminUi(<ResetPasswordPage />);
  expect(html).toContain("Reset your password");
  expect(html).not.toContain('href="/admin/login"');    // resolved through basePath helper
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
and the canonical-link/no-SaaS-CTA invariants, so a future prototype-literal
regression (raw href, reintroduced sign-up) fails fast.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/auth-shell.test.tsx tests/vitest/ui/login.test.tsx tests/vitest/ui/login-alerts.test.tsx tests/vitest/ui/reset-password.test.tsx tests/vitest/ui/otp-input.test.tsx tests/vitest/ui/two-factor.test.tsx tests/vitest/ui/set-password.test.tsx`
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
