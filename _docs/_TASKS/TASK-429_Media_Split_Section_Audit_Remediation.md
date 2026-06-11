# TASK-429: Media Split Section Audit Remediation
# FileName: TASK-429_Media_Split_Section_Audit_Remediation.md

**Priority:** High
**Category:** Pages / Page Editor V2 / Sections
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-425
**Status:** ⏳ To Do

---

## Overview

Remediate the Media Split findings from
`_docs/AUDIT/media-split-2026-06-10.md`. Premise correction (2026-06-11 drift
audit): non-default Media Split variants ALREADY change the published layout
at HEAD — `pageSectionTemplateColumns` forces two columns (`md:grid-cols-2`)
for any non-default variant, `horizontal` additionally gets `items-center`,
and a per-variant marker class is emitted on the inner content node
(`core/services/pages/pageRendererV2.tsx`; introduced by commit 04069629 as
the closed TASK-418-04-L04 contract). The audit's "marker-only, no layout
effect" observation measured the variant-invariant outer `<section>` node
against a stale build. The genuine gaps this family owns are a real
media-beside-content split presentation with a VISIBLE split-vs-horizontal
distinction on the published front, plus the empty Responsive tab (owned by
TASK-425) and the media/style controls that degrade to native primitives
(shared widgets owned by TASK-421).

---

## Sub-Tasks

- [ ] TASK-429-01: Media Split runtime variant and media-surface contract.
- [ ] TASK-429-01-L01: Make `split`/`horizontal` visibly distinct with a real
      media-beside-content presentation and verify the shared TASK-421
      media/toggle/color/segmented widgets render for Media Split panels.
- [ ] TASK-429-02: Validation, docs, and closure.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- Section runtime/render coverage for Media Split variants.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` live smoke.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

