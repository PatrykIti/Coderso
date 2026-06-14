# TASK-468-03: Neutral Authoring Shell Extraction For Screen Canvas Reuse
# FileName: TASK-468-03-Neutral-Authoring-Shell-Extraction-For-Screen-Canvas-Reuse.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Admin UI / Page Editor Reuse / Authoring
**Estimated Effort:** Large
**Dependencies:** TASK-468-02, TASK-464
**Status:** ⏳ To Do

---

## Overview

Extract neutral authoring chrome from the Page Editor modules so Custom Screens
can reuse the professional canvas, layers, toolbar, and command patterns without
importing Page v2 document services or Page-specific mutation state.

## Sub-Tasks

- [ ] TASK-468-03-L01: Authoring Inventory And Boundary Guards.
- [ ] TASK-468-03-L02: Neutral Canvas Frame And Selection Primitives.
- [ ] TASK-468-03-L03: Neutral Toolbar Layers And Command Shell.
- [ ] TASK-468-03-L04: Page Adapter Parity Validation.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/*` | Extract only neutral UI primitives; keep Page adapters in place. |
| `core/admin/ui/authoring/*` | New neutral authoring primitives. |
| `core/admin/ui/custom-screens/*` | Consume neutral primitives through screen adapters in later tasks. |
| Page Editor tests | Guard existing Page canvas, toolbar, layers, and command palette behavior. |
| Import-boundary tests | Prove `custom-screens` code does not import `pageDocumentV2`, `pageEditorState`, or Page mutation services. |

## Implementation Pseudocode

```tsx
export type AuthoringCanvasSection<TSection, TBlock> = {
  id: string;
  label: string;
  data: TSection;
  blocks: TBlock[];
};

export type AuthoringCanvasAdapter<TSection, TBlock> = {
  getSectionId(section: TSection): string;
  getSectionLabel(section: TSection): string;
  getBlockId(block: TBlock): string;
  getBlockLabel(block: TBlock): string;
  renderSectionChrome(props: AuthoringSectionChromeProps<TSection, TBlock>): ReactNode;
  renderBlockChrome(props: AuthoringBlockChromeProps<TSection, TBlock>): ReactNode;
};

export function AuthoringCanvas<TSection, TBlock>({
  sections,
  adapter,
  selection,
  onSelect,
  onMove,
  onInsert,
}: AuthoringCanvasProps<TSection, TBlock>) {
  return sections.map((section) => (
    <AuthoringSectionFrame key={adapter.getSectionId(section)} section={section}>
      {section.blocks.map((block) => adapter.renderBlockChrome({ section, block, selection, onSelect }))}
    </AuthoringSectionFrame>
  ));
}
```

Data flow:

- Page Editor passes a Page adapter that maps `PageSectionV2`/`PageBlockV2` to
  neutral authoring props.
- Custom Screens later pass a Screen adapter that maps
  `ScreenSectionV1`/`ScreenBlockV1`.
- Shared primitives own only UI layout, hit targets, drag affordances, keyboard
  focus, and shell composition.

Error handling:

- Shared primitives do not normalize documents.
- Adapters must provide stable ids and labels; missing ids fail in the adapter
  test lane.
- Shared components must not catch or hide domain validation errors.

Regression-test shape:

```ts
test("custom screen authoring adapter does not import page document services", () => {
  const source = readFile("core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx");
  expect(source).not.toContain("pageDocumentV2");
  expect(source).not.toContain("pageEditorState");
});

test("page editor still renders existing authoring canvas chrome", () => {
  render(<PageAuthoringCanvas fixture={pageFixture} />);
  expect(screen.getByLabelText("Page layers")).toBeInTheDocument();
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** no schema ownership moves into UI primitives.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** authoring primitives must not log document payloads or
  raw entry values.

## Testing Requirements

- Focused Vitest/UI tests for Page Editor canvas, toolbar, layers, and command
  palette reuse.
- Import-boundary/source tests for Page-vs-Screen ownership.
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` for neutral authoring ownership.
- Parent task/changelog on family closure.

## Acceptance Criteria

1. Neutral authoring primitives are reusable without Page v2 service imports.
2. Page Editor behavior remains stable through adapters.
3. Screens can consume the neutral canvas in TASK-468-04 without duplicating the
   Page monolith.
4. Import-boundary tests enforce the ownership split.
