# TASK-038-07 - Form Submission Access Modes (Public vs Internal)

## Goal
Add a per‑form submission access mode so forms can be **Public** (default) or **Internal** (requires auth/API key). This keeps public UX WordPress‑like while enabling internal pages to lock submissions behind credentials.

## Why
- Security‑first default: public forms remain protected by global reCAPTCHA when enabled.
- Internal pages need a safe path without exposing public write endpoints to the open internet.
- WordPress‑like UX: simple per‑form toggle, clear warnings and helper text.

## Non‑Goals
- No new end‑user authentication system for public site.
- No embedding API keys in public widgets.
- No CAPTCHA provider beyond reCAPTCHA v3.

---

## Subtasks

### 038-07-1 — Data Model (forms access mode)
**Files**
- `core/db/schema.ts`
- `core/db/migrations/0036_forms_submission_access.sql`
- `core/db/migrations/meta/0036_snapshot.json`
- `core/db/migrations/meta/_journal.json`

**Changes**
- Add column `submission_access` to `forms` with allowed values:
  - `public` (default)
  - `internal`

**Pseudocode**
```sql
ALTER TABLE forms ADD COLUMN submission_access text NOT NULL DEFAULT 'public';
```

---

### 038-07-2 — Forms Service + Validation
**Files**
- `core/services/forms/formsService.ts`
- `core/server/validation/formSchemas.ts`

**Changes**
- Add `submissionAccess` to `FormCreateInput` + `FormUpdateInput`.
- Validate allowed values (`public`, `internal`).
- Normalize in create/update.

**Pseudocode**
```ts
const allowedAccess = new Set(["public", "internal"]);
normalizeAccess(value, fallback) => allowedAccess.has(value) ? value : throw;

createForm({ submissionAccess }): insert into forms.submissionAccess
updateForm({ submissionAccess }): update forms.submissionAccess
```

---

### 038-07-3 — API Keys: add `forms.submit` scope
**Files**
- `core/admin/ui/settings/apiKeyScopes.ts`
- `core/services/security/apiKeyAuth.ts` (or new helper)

**Changes**
- Add a new scope option: `forms.submit`.
- Add helper to assert a scope on validated API key.

**Pseudocode**
```ts
export function requireApiKeyScope(apiKey, scope) {
  if (!apiKey?.scopes?.includes(scope)) throw new ApiError("forbidden");
}
```

---

### 038-07-4 — Forms Route Guard (Public vs Internal)
**Files**
- `core/server/routes/formsRoutes.ts`
- `core/services/security/apiKeyAuth.ts`
- `core/services/security/apiKeysService.ts` (usage tracking already exists)

**Behavior**
- For `submissionAccess === "public"`:
  - Continue to allow public submit.
  - If bot protection enabled → require `captchaToken` and enforce.
- For `submissionAccess === "internal"`:
  - Require **admin session** with `forms:write` **OR** **API key** with `forms.submit`.
  - Skip bot protection (optional; keep off by default).
  - Reject anonymous submissions with `auth_required` / `forbidden`.

**Pseudocode**
```ts
router.post("/forms/:id/submissions", async (ctx) => {
  const form = await getForm(ctx.params.id);
  if (!form) throw new Error("form_not_found");

  if (form.submissionAccess === "internal") {
    const apiKey = await authenticateApiKey(ctx.headers?.authorization);
    const authed = Boolean(ctx.user) || Boolean(apiKey);

    if (!authed) throw new ApiError("auth_required", "Auth required", 401);

    if (apiKey) requireApiKeyScope(apiKey, "forms.submit");
    if (ctx.user) await requirePermission("forms:write")(ctx);

    return submitForm(...);
  }

  // public path
  const security = await getSecuritySettings();
  await enforceBotProtection({ token: body.captchaToken, action: "public_write", ...});
  return submitForm(...);
});
```

---

### 038-07-5 — Admin UI (Form Settings)
**Files**
- `core/admin/ui/forms/FormSettingsPanel.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx`

**Changes**
- Add **Submission access** select:
  - `Public` (default)
  - `Internal (requires auth or API key)`
- Helper text:
  - Public: “Uses reCAPTCHA if enabled in Security Settings.”
  - Internal: “Requires admin session or API key; do not embed in public pages.”

**Pseudocode**
```tsx
<Select value={submissionAccess}>
  <SelectItem value="public">Public (recommended)</SelectItem>
  <SelectItem value="internal">Internal (auth or API key)</SelectItem>
</Select>
```

---

### 038-07-6 — Widget + Runtime UX (Warnings)
**Files**
- `core/widgets/core/formEmbed.tsx`
- `core/server/publicSite.tsx`
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`

**Changes**
- Runtime resolver should include `submissionAccess` so the widget can render a warning for internal forms.
- In the Form Embed editor:
  - Show badge `Internal` when the selected form is internal.
  - Warning text: “Internal forms require auth/API key and won’t work on public pages.”

**Pseudocode**
```ts
resolved: { submissionAccess }

if (submissionAccess === "internal") {
  render warning state (admin preview)
}
```

---

### 038-07-7 — Docs
**Files**
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-submission-access.md`

**Notes**
- Add `submissionAccess` to forms API payloads.
- Document internal form behavior and security implications.

---

### 038-07-8 — Tests
**Files**
- `tests/unit/forms/formsService.test.ts`
- `tests/integration/routes/forms.test.ts`
- `tests/unit/widgets/formEmbed.test.tsx`

**Coverage**
- Create/update form with `submissionAccess`.
- Public submission enforces CAPTCHA when enabled.
- Internal submission requires admin session or API key with `forms.submit`.
- Widget warning for internal forms.

---

## Open Questions
1. For **internal** submissions: should we accept only API key (recommended) or admin session as well? (Default in task: **either**.)
2. Should internal forms bypass rate limiting entirely or keep a high limit? (Default: keep limit.)
3. Do you want internal forms hidden from the public Form Embed picker by default, or just warned?

