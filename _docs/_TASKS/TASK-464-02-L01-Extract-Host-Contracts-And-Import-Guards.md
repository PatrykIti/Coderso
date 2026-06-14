# TASK-464-02-L01: Extract Host Contracts And Import Guards
# FileName: TASK-464-02-L01-Extract-Host-Contracts-And-Import-Guards.md

**Parent Subtask:** TASK-464-02
**Priority:** High
**Category:** Pages / Admin UI / Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-464-01-L02
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Move `PageEditorHost*` types and host-mode contracts out of `PageEditor.tsx`
into a browser-safe contract module. Keep Pages, Page Templates, and Menu
Design behavior identical.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [x] Create a browser-safe host contract module.
- [x] Move `PageEditorHost`, host preview/publish/revision/settings types, and
      host extension slots into that module.
- [x] Update Page Editor, Page Template Editor, `MenuAppearancePanel.tsx`, Menu
      Design, and tests to import from the new owner.
- [x] Extend import-boundary guard coverage if needed.

---

## Implementation Pseudocode

```ts
// core/admin/ui/pages/editorHostContract.ts
export type PageEditorHost = {
  mode: "page" | "page-template" | "menu";
  loadDetail(id: string): Promise<PageDetail | null>;
  saveDocument(id: string, document: PageDocumentV2): Promise<PageDetail>;
  preview?: (id: string) => Promise<PageEditorHostPreviewResponse>;
  appearancePanel?: PageEditorHostAppearancePanel;
  canvasChrome?: (props: PageEditorHostCanvasChromeProps) => ReactNode;
};
```

Expected data flow:

- Only type/contract ownership moves.
- Runtime host callbacks remain injected by existing host pages.
- No API client moves into reusable modules.

Error handling:

- Existing host error mapping stays in `PageEditor`.

Regression-test shape:

- Import tests or boundary guard proves the contract module is browser-safe.
- Existing host UI tests remain green.

---

## Security Contract

- Contract module must not import admin clients, server routes, DB, runtime
  loaders, provider SDKs, storage adapters, or secrets.
- No route changes.

---

## Testing Requirements

- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
