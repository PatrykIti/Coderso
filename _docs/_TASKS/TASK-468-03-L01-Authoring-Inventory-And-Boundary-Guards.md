# TASK-468-03-L01: Authoring Inventory And Boundary Guards
# FileName: TASK-468-03-L01-Authoring-Inventory-And-Boundary-Guards.md

**Parent Subtask:** TASK-468-03
**Priority:** High
**Category:** Admin UI / Authoring Architecture
**Estimated Effort:** Medium
**Dependencies:** TASK-468-02-L01
**Status:** ⏳ To Do

---

## Overview

Inventory the Page Editor modules that can become neutral authoring primitives
and freeze explicit boundaries before extraction. This task must identify which
pieces are reusable chrome and which remain Page-document-specific adapters.

## Sub-Tasks

- [ ] Map Page Editor canvas, selection, toolbar, layers, command, and inspector
  modules with file-level ownership notes.
- [ ] Mark imports that currently bind reusable chrome to Page v2 documents,
  page services, routes, cache keys, or publish preview state.
- [ ] Add or update boundary guard checks so neutral authoring modules cannot
  import Page-only or Custom Screen service modules.
- [ ] Record the accepted extraction plan in TASK-468-03 before implementation.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/**` | Inventory reusable versus Page-only modules. |
| `scripts/check-admin-boundary.*` or equivalent boundary config | Add neutral authoring import guard coverage if available. |
| `_docs/_TASKS/TASK-468-03-Neutral-Authoring-Shell-Extraction-For-Screen-Canvas-Reuse.md` | Record accepted extraction boundaries and drift notes. |

## Implementation Pseudocode

```ts
type AuthoringInventoryRow = {
  file: string;
  reusableParts: string[];
  pageOnlyImports: string[];
  extractionTarget: "neutral" | "page-adapter" | "keep-page-only";
};

function classifyAuthoringFile(file: SourceFile): AuthoringInventoryRow {
  const imports = readImports(file);
  return {
    file: file.path,
    reusableParts: detectReusableAuthoringParts(file),
    pageOnlyImports: imports.filter(isPageOnlyImport),
    extractionTarget: decideExtractionTarget(file, imports),
  };
}
```

Data flow:

- Read Page Editor source files and existing admin boundary rules.
- Produce a small implementation map in the task file, not a new runtime API.
- Boundary guards run after extraction tasks to prevent new reverse coupling.

Error handling:

- If a module cannot be safely classified, keep it Page-only and split follow-up
  work instead of extracting it speculatively.
- If no boundary checker exists for this path, add the smallest repo-native
  check or document the exact existing command gap.

Regression-test shape:

```ts
test("neutral authoring modules do not import page services", () => {
  expect(checkImports("core/admin/ui/authoring")).not.toContain(
    "core/admin/ui/pages/editor/services"
  );
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** inventory must not include secrets, tokens, or raw entry
  payloads.

## Testing Requirements

- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-468-03-Neutral-Authoring-Shell-Extraction-For-Screen-Canvas-Reuse.md`

## Acceptance Criteria

1. The extraction boundary is documented before code moves.
2. Neutral candidates do not require Page services or Page route contracts.
3. Boundary checks cover `core/admin/ui/authoring/**` or an explicit command gap
   is recorded for the next leaf.
