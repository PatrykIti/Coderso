# TASK-276-04: Newsletter Editor Mode Ownership and Variant Guidance

# FileName: TASK-276-04_Newsletter_Editor_Mode_Ownership_and_Variant_Guidance.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-276, TASK-276-01, TASK-276-02, TASK-276-03
**Status:** To Do

---

## Overview

Tighten Newsletter editor mode ownership and user guidance after the renderer
and transport contracts are stable.

The widget definition sets `editorCapabilities.visualOwnsVariantSelection:
true`, but the Wizard editor still renders its own variant selector. The report
also confirms that Minimal hides description without editor feedback, the
mobile behavior of inline/minimal is unclear, consent-required lacks semantic
help text, and there is no controlled preview of the success state.

## Scope Boundary

This leaf owns:

- Newsletter-specific Wizard vs Visual variant ownership decision.
- Minimal-variant description visibility guidance.
- Mobile behavior copy in variant cards.
- Consent-required explanatory copy.
- Preview success-state toggle or read-only preview affordance wired to the
  final state model from TASK-276-02.
- Editor tests for sparse values and missing handlers.

This leaf does not own:

- Shared atomic block patch helper implementation from TASK-256-01.
- Generic panel mode architecture for unrelated widgets.
- Renderer state implementation from TASK-276-01/02.
- Broad visual style controls from TASK-276-06.

## Sub-Tasks

- [ ] Decide and document whether Newsletter Wizard should remove the variant
  selector or render it as a guided shortcut that delegates to the shared
  Visual owner without duplicating state semantics.
- [ ] If the Wizard selector remains, require TASK-256-01 atomic patch support
  or prove the selector changes only variant without data races.
- [ ] Add Minimal description warning in Wizard and Visual when `variant` is
  `minimal`.
- [ ] Add mobile behavior note to the three Newsletter variant cards.
- [ ] Add consent-required help text near the required switch.
- [ ] Add a preview success-state control after TASK-276-02 defines hidden
  success status behavior.
- [ ] Keep sparse/default editor rendering stable when `onVariantChange` is
  absent.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Adjust Wizard variant ownership, Minimal warning, mobile variant card copy, consent help, and success preview control. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover mode ownership, Minimal warning, mobile copy, consent help, and preview success control. |
| `tests/vitest/widgets/newsletter.test.tsx` | Update SSR editor smoke assertions. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Run/update only if shared Visual ownership behavior changes. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document final editor mode responsibilities. |

## Implementation Pseudocode

```tsx
function MinimalDescriptionNotice({ variant }: { variant: string }) {
  if (resolveNewsletterVariant(variant) !== "minimal") return null;
  return (
    <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
      Description is saved but not displayed by the Minimal variant.
    </p>
  );
}

function NewsletterWizardEditor(props: WidgetEditorProps<NewsletterData>) {
  const variant = resolveNewsletterVariant(props.variant);
  return (
    <div>
      {/* Either remove variant Select or render a read-only summary with a Visual tab handoff. */}
      <MinimalDescriptionNotice variant={variant} />
      {/* first-run copy controls */}
    </div>
  );
}
```

Success preview shape:

```tsx
type NewsletterPreviewState = "form" | "success";

function NewsletterVisualEditor(...) {
  const [previewState, setPreviewState] = useState<NewsletterPreviewState>("form");
  return (
    <SegmentedControl
      value={previewState}
      onChange={setPreviewState}
      options={[{ id: "form", label: "Form" }, { id: "success", label: "Success" }]}
    />
  );
}
```

Error handling:

- If `onVariantChange` is missing, variant controls must be disabled, read-only,
  or no-op without mutating local state.
- Minimal warning must not delete or rewrite saved description text.
- Preview success state must not persist a fake submitted state into widget data
  unless TASK-276-02 deliberately adds a preview-only field and tests it.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin editing.
- Reject-unknown validation: unchanged unless a preview-only schema field is
  explicitly added; prefer local UI state for preview controls.
- Anti-abuse: editor guidance must not expose or configure nonce/CAPTCHA
  secrets.
- Secret handling: no provider secrets, tokens, raw submissions, or private
  integration data in editor diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  Visual owner behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows BUG-04, UX-02, UX-05,
  UX-06, and UX-07 after validation.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Newsletter has one truthful variant ownership model consistent with
  `visualOwnsVariantSelection`.
- Minimal variant warns that description is saved but hidden.
- Variant cards explain mobile stacking behavior.
- Consent-required copy states that unchecked consent blocks submission.
- Success preview is explicit and does not make success copy visible by default.
