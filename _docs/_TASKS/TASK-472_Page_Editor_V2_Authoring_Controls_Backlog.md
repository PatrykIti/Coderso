# TASK-472: Page Editor V2 Authoring Controls Backlog
# FileName: TASK-472_Page_Editor_V2_Authoring_Controls_Backlog.md

**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-471 (shares `pageRendererV2.tsx` + control registry +
inline-marks model)
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Business Goal (umbrella)

A backlog of power-user authoring controls for the Page Editor V2, surfaced during
the TASK-471 discovery. These close the gap between "schema supports it" and "an
author can do it from the panel/canvas", and add the editing-session baselines
(undo/redo, copy/paste) that authors expect. Sibling to TASK-471 (which delivers
the site owner's four priority capabilities); this umbrella collects the
next-most-valuable improvements.

Each item is a **technical subtask** (one per topic); the executable work lives in
the leaves under each subtask. This file stays business-level.

### Value delivered

- **Faster, complete styling** — every block-style field that exists is reachable
  from the panel (margins, border width/style, background gradient/image).
- **Confident editing** — undo/redo and copy/paste across pages.
- **On-brand by default** — bind colors to site design tokens, not raw hex.
- **Richer text** — full inline formatting (bold/italic/link/highlight) on a
  fragment, completing the TASK-471-03 color marks.

---

## Topic Subtasks

| ID | Topic | Priority | Effort | Leaves |
|----|-------|----------|--------|--------|
| TASK-472-01 | Block Style Control Completeness | High | Small | L01 margins, L02 border |
| TASK-472-02 | Block Background Authoring | Medium | Medium | L01 gradient, L02 bg-image |
| TASK-472-03 | Editing Session History And Clipboard | Medium | Medium | L01 undo/redo, L02 copy/paste |
| TASK-472-04 | Design-Token Color Binding | Medium | Medium | L01 |
| TASK-472-05 | Inline Rich-Text Formatting Marks | Medium | Medium | L01 |
| TASK-472-06 | Validation, Docs, And Closure | Medium | Small | L01 |

### Dependency order / notes

- **472-01** are the cheapest quick-wins (start here).
- **472-05** depends on **TASK-471-03** (extends its marks model); land after it.
- **472-04** complements TASK-471-03/04 color sinks.
- **472-03** coordinates with **TASK-454** (dirty/autosave).
- 472-01/02/05 share `pageRendererV2.tsx` with TASK-471 — sequence to avoid churn.

---

## Shared constraints (apply to every leaf)

Same as TASK-471: schema-first / reject-unknown / normalize; color & URL safety
(`isSafeAuthoringCssColor`, `sanitizeAuthoringLinkHref`, media-URL policy);
renderer parity; controls through the registry adapter; **untrusted input**
(clipboard, pasted fragments) is fully re-normalized before use.

Implementation note: Page Editor V2 remains sections/blocks only. TASK-472
renamed/extracted the historical link helper to the neutral Page/authoring
`normalizeAuthoringSafeHref` owner before adding link marks. Page code must not
import widget-core modules for canvas behavior.

## Security Contract (umbrella)

No new API endpoints; all changes ride the existing admin pages save/draft routes
and clipboard (local). Per-leaf Security Contracts apply where new validated input
or new sinks are introduced (background gradient/media, clipboard paste, token
color allowlist, link/highlight marks).

## Documentation Updates Required (rolled up by 472-06)

`_docs/PAGE_MODEL.md`, `_docs/DESIGN_TOKENS.md`, `_docs/SECURITY_SPEC.md`,
editor docs, `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/`.
