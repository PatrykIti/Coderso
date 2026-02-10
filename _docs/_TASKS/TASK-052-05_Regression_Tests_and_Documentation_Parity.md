# TASK-052-05: Regression Tests and Documentation Parity
# FileName: TASK-052-05_Regression_Tests_and_Documentation_Parity.md

**Priority:** Medium  
**Category:** QA + Docs  
**Estimated Effort:** Medium  
**Dependencies:** TASK-052-01, TASK-052-02, TASK-052-03, TASK-052-04  
**Status:** Done (2026-02-10)  

---

## Overview

Finalize TASK-052 with regression safety and documentation consistency.
This task is the gate before marking TASK-052 as Done.

---

## Scope

1. Add/refresh focused unit and integration tests for new runtime behavior.
2. Ensure existing preview and renderer contracts are not broken.
3. Update core docs so they match implementation exactly.
4. Update task board and changelog entries after completion.

---

## Regression Matrix

### Runtime pages
- template key applied in public route
- template key applied in preview route
- fallback shell when template missing

### Navigation
- `manual` source unaffected
- `menu` source unaffected (including fallback)
- `pages` source reflects `showInNav`

### Admin UI
- dynamic template options load
- selected key persists and round-trips
- navigation source option has correct copy and behavior

---

## Pseudocode

```ts
// regression assertions
expect(renderedHtml).toContain('data-template="page-landing"');
expect(renderedHtml).toContain('href="/about"'); // from showInNav pages source
expect(renderedHtml).not.toContain('href="/hidden-page"'); // showInNav=false
```

```ts
// docs parity check (manual process gate)
assertDocContains("PAGE_MODEL.md", "settings.template runtime behavior");
assertDocContains("WIDGETS.md", "navigation linksSource=pages");
assertDocContains("CMS_API.md", "GET /pages/template-options");
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `tests/unit/site/publicRenderer.test.tsx` | extend | page template runtime assertions |
| `tests/unit/site/publicSite.test.tsx` | add/extend | preview parity + template fallback |
| `tests/unit/widgets/navigation.test.tsx` | extend | pages source + showInNav filtering |
| `tests/integration/routes/pages.test.ts` | extend | template options endpoint wired |
| `tests/unit/ui/page-editor.test.tsx` | extend | dynamic template options flow |
| `_docs/PAGE_MODEL.md` | update | runtime semantics for `template` and `showInNav` |
| `_docs/WIDGETS.md` | update | navigation source matrix |
| `_docs/PREVIEW_SPEC.md` | update | page template aware preview flow |
| `_docs/CMS_API.md` | update | endpoint + payload contract |
| `_docs/CMS_SPEC.md` | update | high-level behavior parity |
| `_docs/_TASKS/README.md` | update | move tasks to Done when complete |
| `_docs/_CHANGELOG/*.md` | add | one or more entries for TASK-052 completion |

---

## Acceptance Criteria

1. All TASK-052 functional changes are covered by tests.
2. Docs reflect actual implementation behavior with no stale contracts.
3. Board status and changelog are consistent with completed subtasks.

---

## Testing Requirements

- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun test tests/unit/site/publicSite.test.tsx`
- `bun test tests/unit/widgets/navigation.test.tsx`
- `bun test tests/integration/routes/pages.test.ts`
- `bun --cwd core lint && bun --cwd core lint:types`
