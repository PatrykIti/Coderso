# TASK-286-04: Stack Variant Miniatures and Empty Slot Guidance

# FileName: TASK-286-04_Stack_Variant_Miniatures_and_Empty_Slot_Guidance.md

**Priority:** Low
**Category:** Widgets + Admin UI + Runtime Render + UX Polish
**Estimated Effort:** Medium
**Dependencies:** TASK-256-05-02, TASK-286
**Status:** Done (2026-05-22)

---

## Overview

Add Stack-specific visual guidance for the lower-priority UX findings in
`REPORT_STACK_WIDGET.md`:

- ISSUE-10: variant cards show text only and do not visually communicate
  vertical, horizontal, or responsive flow;
- ISSUE-09: empty Stack output is static and does not guide authors toward
  adding content.

This leaf must keep admin guidance out of public runtime output. If TASK-256-03
has not provided an admin-safe render context for placeholders, the empty Stack
action should live in editor/sidebar guidance instead of `StackBlock`.

## Scope Boundary

This leaf does not change slot persistence, repeatable-slot management,
page-builder insert mechanics, or public placeholder policy. Those are shared
slot/page-builder contracts.

Do not add a public "Add widget" CTA, browser-side mutation action, or hidden
admin instruction to `StackBlock` unless the renderer has an explicit admin
preview context from TASK-256-03.

## Sub-Tasks

- [x] Add a small Stack variant miniature renderer for Vertical, Horizontal,
  and Responsive cards.
- [x] Keep miniatures implemented with local, deterministic JSX/CSS classes or
  an existing icon library if already available in the editor surface.
- [x] Add accessible labels or hidden text so miniatures do not replace the text
  labels.
- [x] Add Stack-local empty-slot guidance in the editor/sidebar using the
  existing `content` slot language.
- [x] If an admin-only render context exists after TASK-256-03, add a neutral
  Stack empty preview with a non-mutating hint; otherwise keep public
  `StackBlock` placeholder safe and document why no CTA was added there.
- [x] Add tests for variant miniature rendering and placeholder/guidance copy.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/StackEditors.tsx` | Add variant miniatures and admin-safe empty-slot guidance. |
| `core/widgets/core/stack.tsx` | Change empty placeholder only if TASK-256-03 exposes an admin-safe context; otherwise leave public placeholder neutral. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | Assert miniature labels and empty guidance copy. |
| `tests/vitest/widgets/stack.test.tsx` | Assert public placeholder remains safe or admin-context placeholder is gated correctly. |
| `_docs/_WIDGETS/STACK.md` | Document miniatures and empty-state behavior. |

## Implementation Pseudocode

```tsx
function StackVariantMiniature({ variant }: { variant: StackVariantId }) {
  if (variant === "responsive") {
    return (
      <div aria-hidden="true" data-stack-variant-miniature="responsive" className="grid gap-1">
        <div className="grid gap-1 rounded-md border bg-muted/30 p-2">
          <span className="h-2 w-full rounded bg-primary/50" />
          <span className="h-2 w-full rounded bg-primary/50" />
          <span className="h-2 w-full rounded bg-primary/50" />
        </div>
        <div className="grid grid-flow-col gap-1 rounded-md border bg-muted/30 p-2">
          <span className="h-2 w-6 rounded bg-primary/50" />
          <span className="h-2 w-6 rounded bg-primary/50" />
          <span className="h-2 w-6 rounded bg-primary/50" />
        </div>
      </div>
    );
  }

  const bars =
    variant === "horizontal"
      ? ["w-6 h-2", "w-6 h-2", "w-6 h-2"]
      : ["w-full h-2", "w-full h-2", "w-full h-2"];

  return (
    <div
      aria-hidden="true"
      data-stack-variant-miniature={variant}
      className={cn(
        "grid rounded-md border bg-muted/30 p-2",
        variant === "horizontal" ? "grid-flow-col gap-1" : "gap-1"
      )}
    >
      {bars.map((className, index) => (
        <span key={index} className={cn("rounded bg-primary/50", className)} />
      ))}
    </div>
  );
}

function VariantCards(...) {
  return variantOptions.map((option) => (
    <button ...>
      <StackVariantMiniature variant={option.id} />
      <span>{option.label}</span>
      <span>{option.description}</span>
    </button>
  ));
}
```

Admin-safe empty guidance:

```tsx
function StackEmptyGuidance() {
  return (
    <p className="text-xs text-muted-foreground">
      Add child widgets to the content slot from the page builder insert controls.
    </p>
  );
}
```

If TASK-256-03 exposes a render context:

```tsx
if (contentBlocks.length === 0 && renderContext === "admin-preview") {
  return <StackAdminEmptyPreview />;
}

return <StackPublicEmptyPlaceholder />;
```

Error handling:

- Missing or unknown variant values fall back to the Vertical miniature via
  `resolveStackVariant`.
- Public runtime must not expose admin-only copy or clickable mutation controls.
- Miniatures must remain decorative and not replace semantic labels.

## Regression Test Shape

- `tests/vitest/ui/stack-editor-wave.test.tsx`
  - Assert the Visual variant cards render one deterministic miniature each for
    `vertical`, `horizontal`, and `responsive`.
  - Assert the responsive miniature communicates both mobile stacked flow and
    tablet/desktop row flow, not a duplicate of the vertical card.
  - Assert accessible text labels remain present alongside decorative
    miniatures.
  - Assert admin-safe empty-slot guidance copy remains visible in Wizard/Visual
    editor surfaces.
- `tests/vitest/widgets/stack.test.tsx`
  - If runtime placeholder behavior changes, assert admin-preview-only guidance
    is gated and the public runtime still renders neutral non-mutating copy.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged unless the placeholder behavior adds data
  fields, which should be avoided.
- Anti-abuse: no public mutation CTA, unsafe inline handlers, arbitrary SVG from
  user data, or admin-only instructions in public output.
- Secret handling: no secrets or privileged settings are introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` when this leaf is implemented and
  verified
- `_docs/_TASKS/TASK-286-04_Stack_Variant_Miniatures_and_Empty_Slot_Guidance.md`
  status updates during execution
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Stack variant cards include visual miniatures for Vertical, Horizontal, and
  Responsive variants.
- The Responsive miniature visually communicates both stacked mobile flow and
  row-based tablet/desktop flow.
- Miniatures are decorative and do not remove accessible text labels.
- Empty Stack guidance is available in an admin-safe surface.
- Public Stack output does not leak admin-only instructions or mutation actions.
- Tests prove the editor miniatures and placeholder safety behavior.


## Completion Notes (2026-05-22)

- Visual variant cards now render deterministic miniatures for `vertical`, `horizontal`, and `responsive`, including a responsive preview that shows stacked mobile flow and row-based larger breakpoints.
- Editor surfaces now explain how to add child widgets to the `content` slot while public runtime stays on the neutral `Empty stack.` placeholder.
