# TASK-479-29-L02: 2FA, Reset & Set Password Restyle
# FileName: TASK-479-29-L02-TwoFactor-Reset-SetPassword-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-479-29-L01
**Status:** ✅ Done (2026-06-29)
**Parent Subtask:** TASK-479-29

---

## Overview

Restyle the remaining auth pages to the prototype centered-card look: the
two-factor page (segmented code inputs), the password-reset request page (single
email field), and the set-new-password page (strength meter + requirement
checklist). All three keep their existing flows and validation — OTP / recovery
verification, reCAPTCHA-gated reset request, token-resolution + confirm, password
match check, show/hide toggles, and base-path redirects.

- **Goal:** `core/admin/ui/auth/{TwoFactorPage,ResetPasswordPage,SetPasswordPage}.tsx`
  (and `OtpInput`, `PasswordStrengthList`, `InfoBanner`) match
  `_docs/_PROTOTYPE/src/pages/auth/{TwoFactorPage,ResetPasswordPage,SetPasswordPage}.tsx`
  while preserving every flow + validation.
- **Owning module/service:** `core/admin/ui/auth/TwoFactorPage.tsx`,
  `core/admin/ui/auth/ResetPasswordPage.tsx`,
  `core/admin/ui/auth/SetPasswordPage.tsx`, `core/admin/ui/auth/OtpInput.tsx`,
  `core/admin/ui/auth/PasswordStrengthList.tsx`, `core/admin/ui/auth/InfoBanner.tsx`;
  centered `AuthShell` from L01; restyled `Card`/`Input`/`Button`/`Progress` from
  TASK-479-06.
- **Source-of-truth docs:**
  - Prototype pages: `_docs/_PROTOTYPE/src/pages/auth/{TwoFactorPage,ResetPasswordPage,SetPasswordPage}.tsx`
  - Prototype primitives: `_docs/_PROTOTYPE/src/components/ui/{input,progress,card,label}.tsx`
  - Auth contract: `_docs/AUTH_SPEC.md` (Password reset, token codes, MFA/OTP wiring)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No `authClient` changes (`verifyOtp`, `requestPasswordReset`,
  `confirmPasswordReset`, `getAuthBotProtection`). No change to the reset
  token-code mapping or the password-rule predicates. The real 2FA page's QR-setup
  + `RecoveryCodesPanel` (MFA-v2 wiring) is retained — restyle it inside the
  centered card; do not delete the recovery/QR affordance just because the slim
  prototype omits it. AuthShell + login are L01; tests are L03.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Specifically:

- **2FA:** keep `verifyOtp(useRecovery ? { recoveryCode } : { code: otp })`, the
  `useRecovery` toggle, and the `withAdminBasePath(basePath, "/")` redirect.
- **Reset request:** keep the `getAuthBotProtection` mount effect and the
  `executeRecaptcha(siteKey, "reset")` → `requestPasswordReset({ email, captchaToken })`
  submit; preserve the privacy-preserving success state (no account-existence leak).
- **Set password:** keep `resolveToken(token)` (URL `?token=`), the password-match
  guard, `confirmPasswordReset({ token, password })`, the delayed
  `withAdminBasePath(basePath, "/login")` redirect, and the stable token-error
  codes (`set_password_token_invalid|expired|used`).
- CSRF is enforced inside `authClient`; do not add/remove it in the views.

---

## Implementation Pseudocode

### `TwoFactorPage.tsx` + `OtpInput.tsx` — restyle, keep verify flow

```tsx
// core/admin/ui/auth/TwoFactorPage.tsx
// UNCHANGED: useState (otp/recoveryCode/useRecovery/loading/error), handleVerify, redirect.
// Restyle to centered card; keep QR-setup section + RecoveryCodesPanel (MFA-v2 wiring).
return (
  <AuthShell>
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h2 className="font-display text-xl font-semibold">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">Secure your account with an authenticator app.</p>
      </div>
      {error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert> : null}
      {useRecovery
        ? <Input placeholder="Enter recovery code" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} />
        : <OtpInput value={otp} onChange={setOtp} />}          {/* restyled segmented inputs */}
      {/* KEEP the verbatim button copy — "Two-factor authentication" + "Verify & Enable" are
          asserted by BOTH tests/vitest/authUi/twoFactorForm.test.tsx and tests/vitest/ui/two-factor.test.tsx;
          this page is the real MFA *enable/setup* flow (QR + recovery codes), NOT a slim login challenge,
          so do NOT rename to "Verify" (a copy change would break those green suites). */}
      <Button className="w-full" size="lg" onClick={handleVerify} disabled={loading}>
        {loading ? "Verifying..." : useRecovery ? "Verify recovery code" : "Verify & Enable"}
      </Button>
      <Button variant="ghost" onClick={() => setUseRecovery((v) => !v)}>
        {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
      </Button>
      {/* Retain QR-setup section + <RecoveryCodesPanel/> inside the card (restyled, collapsible). */}
    </Card>
  </AuthShell>
);
```

```tsx
// core/admin/ui/auth/OtpInput.tsx — restyle each cell to the prototype look:
//   h-14 w-12 (was h-12 w-10), text-center text-lg, rounded-xl, focus ring-2 ring-ring.
// KEEP the controlled value/onChange contract, the [0-9]? guard, padEnd packing,
// maxLength=1, inputMode="numeric", and the rendered count (6) so otp-input.test passes.
```

### `ResetPasswordPage.tsx` — restyle, keep bot-protection + request flow

```tsx
// core/admin/ui/auth/ResetPasswordPage.tsx
// UNCHANGED: bot-protection useEffect, handleSubmit (executeRecaptcha "reset" → requestPasswordReset),
// success/error state. Restyle InfoBanner + form into the centered card.
return (
  <AuthShell>
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Reset password</h2>   {/* KEEP copy: "Reset password" + "Send reset link" + the /admin/login back-link are asserted by tests/vitest/ui/reset-password.test.tsx — do NOT rename to "Reset your password" */}
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we’ll send a reset link.</p>
      </div>
      {success
        ? <InfoBanner title="Reset link sent" description="Check your inbox for a secure reset link." />
        : null}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert> : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button className="w-full" size="lg" type="submit" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
      </form>
      <p className="mt-5 text-center">
        <a className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
           href={withAdminBasePath(basePath, "/login")}><ArrowLeft className="size-4" /> Back to sign in</a>
      </p>
    </Card>
  </AuthShell>
);
```

### `SetPasswordPage.tsx` + `PasswordStrengthList.tsx` — restyle, keep validation

```tsx
// core/admin/ui/auth/SetPasswordPage.tsx
// UNCHANGED: resolveToken, rules useMemo (length>=8, hasNumber, hasSpecial),
// handleSubmit (token guard, match guard, confirmPasswordReset, delayed redirect),
// show/hide toggles. Restyle into the centered card; add the prototype Progress meter.
const score = rules.filter((r) => r.met).length;                 // derive from EXISTING rules — no new logic
const strength = score >= 3 ? { value: 100, tone: "success", label: "Strong" }
               : score === 2 ? { value: 66, tone: "warning", label: "Medium" }
               : { value: 33, tone: "destructive", label: "Weak" };
return (
  <AuthShell>
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Set new password</h2>   {/* KEEP copy: "Set new password" + the "Password strength" header (from PasswordStrengthList) + the /admin/login back-link are asserted by tests/vitest/ui/set-password.test.tsx — do NOT rename to "Create a new password" */}
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? <Alert variant="destructive">…{error}…</Alert> : null}
        {success ? <Alert>Password updated successfully.</Alert> : null}
        <PasswordField id="new-password" label="New password" value={password} onChange={setPassword}
                       show={showPassword} onToggle={() => setShowPassword((p) => !p)} />
        <div className="flex items-center gap-3">
          <Progress value={strength.value} tone={strength.tone} className="flex-1" />   {/* restyled primitive (479-06) */}
          <span className="text-sm text-muted-foreground">{strength.label}</span>
        </div>
        <PasswordStrengthList rules={rules} />                   {/* restyled checklist: violet/success check chips */}
        <PasswordField id="confirm-password" label="Confirm password" value={confirm} onChange={setConfirm}
                       show={showConfirm} onToggle={() => setShowConfirm((p) => !p)} />
        <Button className="w-full" size="lg" type="submit" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>   {/* keep verbatim button copy (visual restyle only) */}
      </form>
    </Card>
  </AuthShell>
);
```

**Data flow:** unchanged per page — OTP/recovery verify → redirect; reset email →
reCAPTCHA → `requestPasswordReset` → success banner; set password → token+match
guards → `confirmPasswordReset` → delayed login redirect. The strength meter is
**derived render-time** from the existing `rules` (no extra state, no setState in
effects — ESLint 9 react-hooks safe).

**Error handling:** preserve all destructive `Alert`s, the token-missing /
passwords-do-not-match guard messages, the reCAPTCHA site-key guard, and the
stable reset token-error copy. `PasswordStrengthList` keeps its `rules` prop shape.

**Regression-test shape (delivered in L03):** render each page via `renderAdminUi`
and assert the **preserved** headings/copy ("Two-factor authentication" +
"Verify &amp; Enable"; "Reset password" + "Send reset link"; "Set new password" +
"Password strength" + "Update password"); assert `OtpInput` still renders 6
`data-slot="input"` cells; assert the set-password checklist labels ("At least 8
characters", "At least 1 number"); assert the "Back to login" link renders the
canonical `/admin/login` that `withAdminBasePath` emits (assert the href is
**present**, not absent — `resolveAdminBasePath()` resolves to `/admin` so a
`not.toContain('/admin/login')` is unsatisfiable and contradicts the existing
green `tests/vitest/ui/reset-password.test.tsx` / `set-password.test.tsx`).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/otp-input.test.tsx tests/vitest/ui/reset-password.test.tsx`
- Keep `tests/vitest/authUi/twoFactorForm.test.tsx` green (verify flow unchanged).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-29-L02`.
- If the 2FA/reset/set-password look is documented under `_docs/UI/admin_panel/`,
  update it. `_docs/AUTH_SPEC.md` stays unchanged (no flow/contract change).
