# TASK-479-29-L01: Auth Shell & Login Restyle
# FileName: TASK-479-29-L01-Auth-Shell-And-Login-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-29

---

## Overview

Port the prototype's centered auth layout onto the real `AuthShell`, then restyle
the login page card to match the prototype: small violet logo chip + product
heading, social (SSO) buttons in a 2-up grid, an "or continue with email" divider,
soft `rounded-2xl` field inputs, "remember me" row, and a full-width violet primary
submit. The real login keeps **all** of its logic — bot-protection mount effect,
reCAPTCHA-gated submit, `login()` call, base-path redirect, general + per-field
error rendering, and the remember toggle.

- **Goal:** `core/admin/ui/layouts/AuthShell.tsx` renders the prototype centered
  chrome (warm canvas, violet glow backdrop, dotted texture, top-right
  `ThemeToggle`, `rounded-2xl` logo chip, product heading, quiet version footer),
  and `core/admin/ui/auth/LoginPage.tsx` matches
  `_docs/_PROTOTYPE/src/pages/auth/LoginPage.tsx` while preserving submit + CSRF +
  error states + canonical redirects.
- **Owning module/service:** `core/admin/ui/layouts/AuthShell.tsx`,
  `core/admin/ui/auth/LoginPage.tsx`, `core/admin/ui/auth/SsoButtons.tsx`;
  shared `ThemeToggle` + restyled shadcn `Card`/`Input`/`Button`/`Checkbox` from
  TASK-479-06.
- **Source-of-truth docs:**
  - Prototype shell: `_docs/_PROTOTYPE/src/components/shell/AuthShell.tsx`,
    `_docs/_PROTOTYPE/src/components/shell/ThemeToggle.tsx`
  - Prototype login: `_docs/_PROTOTYPE/src/pages/auth/LoginPage.tsx`
  - Auth contract: `_docs/AUTH_SPEC.md` (Login, Sessions, CSRF)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No `authClient`/`apiClient`/`recaptcha.ts`/`adminPaths` changes.
  No self-serve sign-up CTA (drop the prototype's mock "Create one"). No wiring of
  the SSO buttons to real OAuth (presentational, unchanged). The split
  `AuthBrandPanel` gradient column is replaced by the centered layout — see the
  AuthShell section below for its disposition. `OtpInput`, `PasswordStrengthList`,
  `ResetPasswordPage`, `SetPasswordPage` are handled in L02; tests in L03.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Specifically:

- Keep the `getAuthBotProtection()` → `setBotConfig` → `preloadRecaptcha(siteKey)`
  mount effect verbatim (active-flag cleanup pattern; no sync setState loop).
- Keep `handleSubmit`: `event.preventDefault()` → optional
  `executeRecaptcha(siteKey, "login")` → `login({ email, password, captchaToken })`
  → on success `window.location.assign(withAdminBasePath(resolveAdminBasePath(), "/"))`
  → on error `isApiClientError` → `setError` + `setFieldErrors(toFieldErrors(err))`.
- CSRF is enforced inside `authClient`; do not add/remove it in the view.
- "Forgot password?" href stays `withAdminBasePath(resolveAdminBasePath(), "/reset")`.

---

## Implementation Pseudocode

### `AuthShell.tsx` — centered prototype chrome, backward-compatible props

```tsx
// core/admin/ui/layouts/AuthShell.tsx
// Ports _docs/_PROTOTYPE/src/components/shell/AuthShell.tsx (centered single column).
// KEEP the existing prop API (brand?/mobileBrand?/footer?/className?/contentClassName?)
// so other callers + the existing auth-shell test don't break, but the DEFAULT
// (no brand) now renders the prototype centered layout instead of the split panel.
import type { ReactNode } from "react";
import { Hexagon } from "lucide-react";
import { ThemeToggle } from "@/ui/shell/ThemeToggle"; // shared from TASK-479-06
import { cn } from "@/lib/utils";

export function AuthShell({ brand, mobileBrand, children, footer, className, contentClassName }: AuthShellProps) {
  // Legacy split-panel path: if a caller still passes `brand`, keep prior behavior
  // (kept only for back-compat; auth pages stop passing it).
  if (brand) { /* ...existing split-panel markup unchanged... */ }

  // New default = prototype centered layout.
  return (
    <div className={cn("relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10", className)}>
      <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" />               {/* dotted texture token */}
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" /> {/* violet glow */}
      <div className="absolute right-5 top-5"><ThemeToggle /></div>                                 {/* dark toggle (479-06) */}
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          {mobileBrand ?? (
            <>
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
                <Hexagon className="size-6 fill-current" />
              </span>
              <h1 className="font-display text-xl font-semibold">Coderso</h1>   {/* product name, NOT a workspace switcher */}
            </>
          )}
        </div>
        <div className={cn("w-full", contentClassName)}>{children}</div>
        {/* Self-hosted: footer is a quiet product/version label — NO plans/trial/SaaS links. */}
        {footer ?? <p className="mt-6 text-center text-xs text-muted-foreground">Coderso CMS · v{APP_VERSION}</p>}
      </div>
    </div>
  );
}
```

> AuthShell disposition: the gradient `AuthBrandPanel` split column is no longer
> used by the auth pages. Leave `AuthBrandPanel.tsx` in place but unreferenced
> (or delete it if no other importer — grep first); the centered layout replaces
> it. `APP_VERSION` comes from the existing build/version constant the admin
> already exposes (do not invent a new endpoint; if none exists, render a static
> "Coderso CMS" label and file a tiny follow-up for the version wire-up).

### `LoginPage.tsx` — restyle the card body, keep state + handlers verbatim

```tsx
// core/admin/ui/auth/LoginPage.tsx
// UNCHANGED: useState block (email/password/remember/loading/error/fieldErrors/botConfig),
// the bot-protection useEffect, and handleSubmit. Only the returned JSX changes.
// Drop brand/mobileBrand/footer props passed to AuthShell (centered default).
return (
  <AuthShell>
    <Card className="p-7 shadow-card">                              {/* rounded-2xl from token restyle (479-05/06) */}
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to Coderso</p>  {/* de-SaaS: "workspace" → product */}
      </div>

      <SsoButtons />                                                {/* existing component, restyled grid (Google/GitHub) */}

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>   {/* SAME handler */}
        {error ? (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
        ) : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com"
                 value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />
          {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
        </Field>
        <Field label="Password" htmlFor="password"
               labelRight={<a className="text-xs font-medium text-primary hover:underline"
                              href={withAdminBasePath(resolveAdminBasePath(), "/reset")}>Forgot password?</a>}>
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••"
                 value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(fieldErrors.password)} />
          {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
        </Field>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(c) => setRemember(Boolean(c))} /> Keep me signed in
        </label>
        <Button className="w-full" size="lg" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {/* NO "Don't have an account / Create one" CTA — admin accounts are invite-only (AUTH_SPEC). */}
    </Card>
  </AuthShell>
);
```

**Data flow:** unchanged — mount effect loads bot config → user submits → optional
reCAPTCHA token → `login()` (CSRF inside `authClient`) → base-path redirect on
success; `isApiClientError` → general `error` + per-field `fieldErrors`.

**Error handling:** preserve the destructive `Alert` for the general error and the
`text-destructive` per-field messages with `aria-invalid` on inputs; preserve the
"reCAPTCHA enabled but missing site key" guard and the disabled/loading button copy.

**Regression-test shape (delivered in L03):** render `LoginPage` via `renderAdminUi`
and assert "Welcome back" + "Sign in" copy and the SSO/divider markup; assert the
"Forgot password?" href resolves through `withAdminBasePath` (no raw `/admin/reset`);
assert no "Create one"/"Sign up" copy is present.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/auth-shell.test.tsx tests/vitest/ui/login.test.tsx tests/vitest/ui/login-alerts.test.tsx`
- Keep `tests/vitest/authUi/loginForm.test.tsx` green (login flow unchanged).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-29-L01`.
- If `AuthBrandPanel.tsx` is removed, note it in the changelog; if the auth look is
  documented under `_docs/UI/admin_panel/`, update the centered-card description.
- If a static version label is used pending a real version wire-up, file the
  follow-up and reference it in the changelog entry.
