# TASK-269-01: Form Selection, Editor Modes, and Admin Diagnostics

# FileName: TASK-269-01_Form_Selection_Editor_Modes_and_Admin_Diagnostics.md

**Priority:** High
**Category:** Widgets + Admin UI + Forms + Playwright QA
**Estimated Effort:** Large
**Dependencies:** TASK-269, TASK-256-01
**Status:** To Do

---

## Overview

Make the Form Embed editor useful before a runtime preview is opened.

`REPORT_FORM_EMBED_WIDGET.md` shows that all three Form Embed editor modes render
the same sections, selected forms expose only a name/status badge, draft or
archived forms do not produce a warning, runtime resolver errors are not visible
inside the editor, and no-form/empty-string states are unclear. This leaf fixes
those Form Embed-specific editor diagnostics without changing the shared
page-builder mode update helper owned by TASK-256-01.

## Scope Boundary

This leaf owns only Form Embed editor content and diagnostics:

- distinct Wizard, Visual, and Advanced Form Embed sections;
- selected form summary with status, submission access, layout mode, save
  progress, field count, field type list from `getFormDetailCached()` /
  `listFormFields()`, and resolver error when available;
- no-form CTA copy and disabled-state guidance;
- draft/archived/internal warnings for public page embedding;
- success message and submit label normalization feedback.

This leaf does not own the shared mode switch atomic update helper, generic
color picker behavior, generic clear controls, or Forms route policy.

## Sub-Tasks

- [ ] Split `FormEmbedEditor` into mode-specific renderers while keeping shared
  pure helper components for repeated form-selection and field-summary UI.
- [ ] Keep Wizard focused on selected form, title/description, and beginner-safe
  submit/success copy. Hide advanced style controls from Wizard.
- [ ] Keep Visual focused on layout, visible field labels, selected-form
  preview summary, and styling controls that are not shared TASK-256-02 scope.
- [ ] Add an Advanced view with normalized payload snapshot, selected form
  diagnostics, submission access, runtime resolver error, and read-only runtime
  data summary.
- [ ] Show draft/archived/internal warnings and multi-step/save-progress badges
  from the selected Forms record.
- [ ] Fetch selected form detail through existing `getFormDetailCached()` /
  `listFormFields()` cache helpers when the list record lacks fields, and show
  selected field count and field type summary without mount-force refetch loops.
- [ ] Add no-form CTA and clear feedback when `formId` is empty or references a
  missing form.
- [ ] Surface empty submit label and success message fallback behavior in the
  editor without serializing empty strings as misleading user-facing copy.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Split mode renderers, add diagnostics, selected-form summary, no-form CTA, and normalized payload snapshot. |
| `core/admin/services/formsClient.ts` | Reuse `getFormDetailCached()` / `listFormFields()` detail helpers and cache keys; add fields to list records only if the admin Forms contract is intentionally changed. |
| `core/widgets/core/formEmbed.tsx` | Update normalizer only if editor-visible empty-string behavior needs a data contract change. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover mode-specific sections, selected-form warnings, field summary, no-form CTA, and Advanced diagnostics. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Update only when defaults/normalizer behavior changes. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document final Form Embed editor mode responsibilities. |

## Implementation Pseudocode

```ts
type FormEmbedEditorMode = "wizard" | "visual" | "advanced";

type FormEmbedFormDiagnostics = {
  selected: boolean;
  formId?: string;
  name?: string;
  status?: "draft" | "published" | "archived" | string;
  submissionAccess?: "public" | "internal";
  layoutMode?: "single" | "multi_step";
  saveProgress?: boolean;
  fieldCount: number;
  fieldTypes: string[];
  error?: string;
};

function resolveFormEmbedDiagnostics(
  value: FormEmbedData,
  forms: FormRecord[],
  detail?: FormDetail | null
): FormEmbedFormDiagnostics {
  const normalized = normalizeFormEmbedData(value);
  const selected = forms.find((form) => form.id === normalized.formId) ?? null;
  const resolved = normalized.resolved;
  const fields = detail?.fields ?? resolved?.fields ?? [];
  return {
    selected: Boolean(selected || normalized.formId),
    formId: normalized.formId,
    name: selected?.name ?? resolved?.formName,
    status: selected?.status ?? resolved?.status,
    submissionAccess: selected?.submissionAccess ?? resolved?.submissionAccess,
    layoutMode: selected?.settings?.layoutMode ?? resolved?.settings?.layoutMode ?? "single",
    saveProgress: selected?.settings?.saveProgress ?? resolved?.settings?.saveProgress ?? false,
    fieldCount: fields.length,
    fieldTypes: resolveFieldTypes(fields),
    error: resolved?.error,
  };
}
```

Detail loading shape:

```tsx
function useSelectedFormDetail(formId: string | undefined) {
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  useEffect(() => {
    let active = true;
    const normalizedFormId = formId?.trim();
    if (!normalizedFormId) {
      setDetail(null);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    void getFormDetailCached(normalizedFormId)
      .then((next) => {
        if (!active) return;
        setDetail(next);
        setStatus("loaded");
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [formId]);

  return { detail, status };
}
```

Renderer shape:

```tsx
function FormEmbedWizardEditor(props: WidgetEditorProps<FormEmbedData>) {
  return (
    <FormEmbedEditorShell mode="wizard" {...props}>
      <FormSelection />
      <NoFormCallout />
      <ContentSection compact />
      <FormSummary compact />
    </FormEmbedEditorShell>
  );
}

function FormEmbedVisualEditor(props: WidgetEditorProps<FormEmbedData>) {
  return (
    <FormEmbedEditorShell mode="visual" {...props}>
      <FormSelection />
      <FormSummary />
      <LayoutSection />
      <FieldsSection />
      <StyleSection />
    </FormEmbedEditorShell>
  );
}

function FormEmbedAdvancedEditor(props: WidgetEditorProps<FormEmbedData>) {
  return (
    <FormEmbedEditorShell mode="advanced" {...props}>
      <FormDiagnosticsPanel />
      <NormalizedPayloadSnapshot data={normalizeFormEmbedData(props.value)} />
    </FormEmbedEditorShell>
  );
}
```

Error handling:

- If the selected form is missing from `useForms()`, keep the stored `formId`
  visible and show a missing-form warning instead of silently clearing it.
- If runtime `resolved.error` exists, show the machine-readable error in the
  Advanced diagnostics and a concise editor warning in Wizard/Visual.
- If field metadata is unavailable, show "fields resolve at runtime" rather
  than a false `0 fields` count.
- If detail loading fails, keep the selected form visible and show a diagnostic
  without overwriting the current widget data.
- Empty submit label falls back to `formEmbedDefaults.submitLabel`; empty
  success message should either inherit the resolved form success message or
  show a clear "no inline success message" diagnostic.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: editor updates must continue to write only fields
  allowed by `formEmbedSchema`.
- Anti-abuse: diagnostics may show non-secret submission access and status, but
  must not expose nonce secrets, CAPTCHA secrets, provider keys, raw
  submissions, or privileged internal URLs.
- Secret handling: normalized payload snapshots must redact or omit any future
  secret-like resolved fields before rendering in the browser.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx` when
  normalizer/default behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with Wizard, Visual, and Advanced
  responsibilities after implementation.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows C3, C4, U1, U2,
  U5, U6, U9, U10, and W12 after validation.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard, Visual, and Advanced no longer render the exact same Form Embed
  controls.
- The editor gives truthful selected-form status, access, field-count/type, and
  multi-step diagnostics before opening public preview.
- Resolver errors and missing selected forms are visible to the editor user.
- Empty-string submit/success behavior is explicit and does not create
  misleading public copy.
