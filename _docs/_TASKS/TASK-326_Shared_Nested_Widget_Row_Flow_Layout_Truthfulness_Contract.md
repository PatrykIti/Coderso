# TASK-326: Shared Nested Widget Row-Flow Layout Truthfulness Contract

# FileName: TASK-326_Shared_Nested_Widget_Row_Flow_Layout_Truthfulness_Contract.md

**Priority:** Medium
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-284-04
**Status:** To Do

---

## Overview

Introduce a shared rendering/layout contract for widgets nested inside
row-flow layout owners so child widgets can render truthfully without the
default full-width `WidgetRenderer` section/container shell.

`TASK-284-04` deferred horizontal Spacer support to this task because the
current renderer wraps every widget as a block-level shell. A Spacer-local
`width` control would therefore not behave like an honest inline or row-flow
gap until the shared nested render surface is fixed first.

## Scope Boundary

In scope:

- audit the current nested widget owners that place widgets inside row-flow
  or inline-like contexts;
- define a shared nested render-surface contract for row-flow child widgets;
- implement shared renderer support so approved owners can opt into a
  truthful nested item shell instead of the default full-width block shell;
- add runtime/admin tests and docs for the shared behavior.

Out of scope:

- Chakra-style flex filler behavior or parent mutation primitives;
- a blanket removal of top-level `section`/container shells for all widgets;
- one-off Spacer-only hacks that bypass the shared renderer;
- arbitrary CSS/class passthrough for width, grow, or order semantics.

## Sub-Tasks

- [ ] Audit current nested widget owners such as Stack, Split Layout, Grid
  Columns, and other slot/container surfaces to classify where row-flow
  child rendering is truthful.
- [ ] Extend the shared widget render context with an explicit nested
  row-flow-item surface instead of inferring it from ad-hoc class names.
- [ ] Update `WidgetRenderer` so approved nested row-flow contexts can
  render a lightweight child shell while preserving current top-level
  `section` and container semantics elsewhere.
- [ ] Update the row-flow layout owners to opt into the new shared surface
  only where their child contracts stay truthful.
- [ ] Add regression coverage for renderer output, nested layout widgets,
  and any reopened horizontal Spacer consumer.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Add the shared nested row-flow render-surface context shape. |
| `core/widgets/renderers/widgetRenderer.tsx` | Branch between the default block shell and the nested row-flow child shell. |
| `core/widgets/core/stack.tsx` | Opt into the shared nested row-flow child surface only where Stack truly owns row flow. |
| `core/widgets/core/splitLayout.tsx` | Re-audit nested child rendering and adopt the new surface only where truthful. |
| `core/widgets/core/gridColumns.tsx` | Re-audit nested child rendering and adopt the new surface only where truthful. |
| `tests/vitest/widgets/renderer.test.tsx` | Add public render-shape coverage for the nested row-flow child shell. |
| Layout-owner Vitest suites for Stack/Split Layout/Grid Columns | Add coverage proving the new child shell is used only in approved nested contexts. |
| `_docs/_WIDGETS/STACK.md` and other affected layout docs | Document the shared nested row-flow rendering boundary for layout owners. |
| `_docs/_WIDGETS/SPACER.md` | Revisit only if the shared task later reopens honest horizontal Spacer support. |

## Implementation Pseudocode

```ts
type NestedRenderSurface = "default-block" | "row-flow-item";

type WidgetRenderContext = {
  mode: WidgetRenderMode;
  previewDevice?: DeviceTarget;
  nestedSurface?: NestedRenderSurface;
};

function WidgetRenderer({ block, renderContext }: WidgetRendererProps) {
  const surface = renderContext?.nestedSurface ?? "default-block";
  const normalized = normalizeWidgetBlock(block);
  const WidgetComponent = getWidget(normalized.type).render;

  if (surface === "row-flow-item") {
    return (
      <div data-widget-surface="row-flow-item">
        <WidgetComponent
          data={normalized.data}
          variant={normalized.variant}
          renderContext={renderContext}
        />
      </div>
    );
  }

  return (
    <section>
      <div className={wrapperClass}>
        <WidgetComponent
          data={normalized.data}
          variant={normalized.variant}
          renderContext={renderContext}
        />
      </div>
    </section>
  );
}

function buildNestedRowFlowContext(
  renderContext: WidgetRenderContext | undefined
): WidgetRenderContext {
  return {
    ...(renderContext ?? { mode: "public" }),
    nestedSurface: "row-flow-item",
  };
}
```

Data flow:

1. Row-flow layout owners opt into the new shared nested child surface.
2. `WidgetRenderer` preserves the current top-level block shell by default.
3. Only approved nested row-flow contexts render the lightweight child
   shell.
4. Spacer or any future inline-gap primitive can reopen horizontal support
   only after this shared contract lands.

Error handling:

- Unknown or unsupported nested surfaces fall back to the default block
  shell.
- Owners must not opt into the row-flow child surface for grid/pane/stack
  contexts that still rely on top-level section spacing semantics.
- The shared contract must not introduce raw width/grow/order payloads or
  parent layout mutation.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new shared render-context flags stay
  in-process only and do not widen persisted widget payload schemas unless a
  separate schema owner explicitly adopts them.
- Anti-abuse: do not introduce raw CSS strings, layout-mutating parent
  selectors, inline scripts, or arbitrary class passthrough as part of the
  new nested render surface.
- Secret handling: no secrets in nested render markers, docs, or
  diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- Relevant row-flow layout-owner Vitest suites after the audit identifies
  the approved owners.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Root `bun run lint`
- `bun run gates:coderso` if the shared render shape affects release-gated
  widget behavior.

## Documentation Updates Required

- Update the affected layout widget docs with the new nested row-flow
  rendering boundary.
- Update `_docs/_WIDGETS/SPACER.md` only if this task reopens horizontal
  Spacer support.
- Add a changelog entry when the shared contract lands.

## Changelog Policy

- Add a leaf-specific changelog entry when this task moves to `Done`.

## Acceptance Criteria

- Shared row-flow nested widget contexts render through an explicit truthful
  child shell instead of the default full-width block shell.
- Existing top-level widget rendering remains unchanged by default.
- The contract is owned by shared renderer/layout code, not by one-off
  Spacer hacks.
- Any future horizontal Spacer support can point to this landed shared owner
  instead of redefining nested rendering locally.
