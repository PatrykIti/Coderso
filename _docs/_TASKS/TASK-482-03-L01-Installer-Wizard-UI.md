# TASK-482-03-L01: `InstallerWizard.tsx` create-first-admin UI
# FileName: TASK-482-03-L01-Installer-Wizard-UI.md

**Parent Subtask:** TASK-482-03
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A pre-login screen that collects the first admin's name, email,
  password (+ confirm) with live password-strength feedback, and submits to
  `POST /auth/install/admin`. On success it triggers the handoff defined in
  03-L02. Visually reuses the auth shell so it matches the login experience.
- **Owning module(s) to create:**
  - `core/admin/ui/setup/InstallerWizard.tsx` (new).
  - `core/admin/ui/setup/installerValidation.ts` (new) — owns client-side field
    validation (mirrors the server `installAdminSchema`; password min length,
    email shape, confirm match) so the rules live in one place.
  - A thin client in `core/admin/.../adminApiClient` (reuse the existing api
    client used by login) for `getInstallStatus()` and `createInstallAdmin()`.
  - Reuse the centered `core/admin/ui/layouts/AuthShell.tsx` (exported `AuthShell`)
    — after 479-29 its default (no `brand` prop) is the centered layout that
    replaces the removed `AuthBrandPanel` split column — and
    `core/admin/ui/auth/PasswordStrengthList.tsx` (exported `PasswordStrengthList`).
- **Source-of-truth docs:** `_docs/AUTH_SPEC.md`, `_docs/UI/` admin UI guides,
  `_docs/SECURITY_SPEC.md` (password guidance).
- **Out-of-scope:** the `AdminApp` gating + handoff (03-L02); server logic (02);
  visual token polish owned by TASK-479-29 (consume its primitives where present,
  but do not block on the redesign).

## Security Contract

- **Endpoint visibility:** client component calling the **public**
  `/auth/install/*` endpoints (see 01-L02 / 02-L02 for the server boundary).
- **Auth model:** none client-side; the screen renders only when
  `getInstallStatus().available === true`.
- **RBAC permission(s):** none.
- **CSRF:** none — the target write is the session-less, CSRF-exempt install
  route. The client must **not** attempt to attach a CSRF token (there is no
  session to mint one).
- **Rate-limit bucket:** server-enforced `auth`; the UI should surface a 429 as a
  friendly "too many attempts" message.
- **Validation:** `installerValidation.ts` (`.strict`-equivalent — only the three
  fields + confirm). Block submit on invalid; never send a 4th field.
- **Anti-abuse:** if `getInstallStatus()` returns `available:false` (someone else
  installed), redirect to `/login` instead of showing the form.
- **Secret/PII handling:** password lives only in component state; never persist
  to localStorage / theme cache / logs. Clear on unmount.

## Implementation Pseudocode

```tsx
export function InstallerWizard({ onInstalled }: { onInstalled: (user: InstalledUser) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fieldErrors = validateInstaller(form); // installerValidation.ts
  const strengthRules = evaluatePasswordRules(form.password); // feeds PasswordStrengthList

  const submit = async () => {
    const v = validateInstaller(form);
    if (v) return setError(v);
    setSaving(true);
    try {
      const { user } = await createInstallAdmin({ name, email, password }); // omit confirm
      onInstalled(user); // 03-L02 handoff
    } catch (e) {
      setError(mapInstallClientError(e)); // install_unavailable → "Already installed, please log in"
    } finally { setSaving(false); }
  };

  return (
    <AuthShell> {/* centered default after 479-29; compose inline like LoginPage.tsx */}
      {/* name, email, password, confirm inputs */}
      <PasswordStrengthList rules={strengthRules} />
      {/* submit button disabled while saving / invalid */}
    </AuthShell>
  );
}
```

- **Data flow:** mount → (parent already checked status) → form → `createInstallAdmin`
  → `onInstalled`.
- **Error handling:** map domain codes from the route (`install_unavailable`,
  `install_admin_invalid`, 429) to human copy.
- **Regression-test shape:** render → fill valid form → submit → install client
  called once with exactly `{name,email,password}` → `onInstalled` fired;
  mismatch confirm blocks submit; `install_unavailable` shows the
  "already installed" path.

## Testing Requirements

- **Lane:** Vitest ui-integration render flow —
  `tests/vitest/ui-integration/installerWizard.test.tsx`.
- Cases: field validation (empty/short password, email shape, confirm match);
  password-strength list reflects input; successful submit invokes the install
  client with no extra fields; server error mapping; `available:false` path.
- No migration artifacts.
