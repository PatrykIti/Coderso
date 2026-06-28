# TASK-483-03: Front-End Tracking Snippet
# FileName: TASK-483-03-Front-End-Tracking-Snippet.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Public Site
**Estimated Effort:** Medium
**Dependencies:** TASK-483-02
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

Inject a privacy-respecting tracking snippet on the published site so real
pageviews/sessions reach the TASK-483-02 collector. The snippet is minimal,
honors Do-Not-Track / consent, carries the rotating beacon nonce, and uses
`navigator.sendBeacon` with a small JSON payload. It is delivered as a static
script served via `Bun.file` and referenced from the public document head.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-03-L01 | Tracking Snippet Asset And Payload Builder | Medium | ⏳ To Do |
| TASK-483-03-L02 | Public Site Injection And Snippet Delivery Route | Medium | ⏳ To Do |

## Dependencies

- TASK-483-02 (collector endpoint + nonce issuance). L02 depends on L01.

## Testing Requirements

- **Vitest** for L01 (snippet/payload builder string output, DNT guard) and the
  injected-HTML assertions in L02 (`renderDocument` uses `renderToString`, which
  is Bun-free → `tests/vitest/ui-integration/*`).
- **Bun** for L02 snippet delivery via `Bun.file` and the
  `handlePublicRequest` serving smoke (`tests/integration/routes/*`).
