# TASK-418: Page Editor V2 Authoring Nesting And Runtime Remediation
# FileName: TASK-418_Page_Editor_V2_Authoring_Nesting_And_Runtime_Remediation.md

**Priority:** High
**Category:** Pages / Admin UI / Runtime / Assistant / Templates
**Estimated Effort:** Very Large
**Dependencies:** TASK-417, `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`, `_docs/PAGE_MODEL.md`, `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-10

---

## Overview

Remediate the TASK-417 Pages v2 implementation so it becomes a real
section-first, atomic-block page builder instead of a mostly section-only
canvas. The current implementation has material drift from the redesign spec:
blocks are inserted with defaults but cannot be selected and edited correctly,
the floating toolbar is incomplete, the admin canvas is not WYSIWYG enough, the
public runtime still renders several block types as placeholders, and the v2
document model does not yet support controlled nesting.

The accepted architecture for this family is:

- Pages remain `schemaVersion: 2` documents with top-level `sections[]`.
- Sections remain top-level page bands; do not implement arbitrary
  section-in-section nesting.
- Flexible composition is added through bounded container/slot blocks. This
  task family is the product decision that accepts controlled nesting; any
  parallel TASK-419 files with the same scope must be superseded or folded into
  TASK-418 before implementation.
- Widget pages are not restored for Pages. Legacy widget-template,
  custom-screen, and detail-page widget surfaces remain separate until their
  own follow-up task changes them.

Read-only consultation was run before this task family was created:

- Claude CLI with `--permission-mode plan --effort xhigh --tools Read,Grep,Bash`
  against HEAD `a9b95209`.
- Three subagent audits focused on UI/UX, runtime/data contract, and
  implementation planning.

The audits agreed on the same material findings: no selected block model,
toolbar content patching targets the first block, generic patching can write
invalid props, canvas styling does not reflect much of the document contract,
background/responsive/visibility controls are incomplete, public renderers are
not complete for insertable blocks, assistant/template emitters can drift from
runtime support, and nesting requires a deliberate recursive contract.

Because this task file is created after those audits, implementation must rerun
a fresh read-only drift pass before any production code changes. A refinement
pass after commit `00bdce7` found contract drift around audit filename,
TASK-419 duplication, dependency order, single-renderer strength, section
type/variant ownership, and Playwright coverage; the fixes are folded into this
TASK-418 contract.

---

## Security Contract

- **Endpoint visibility:** Pages admin writes remain internal under
  `/admin/api/pages*`; assistant execute/dry-run routes remain internal admin
  routes; public Pages rendering and preview remain public read-only paths.
- **Auth model:** existing admin session for admin and assistant mutation
  routes; no auth for published public page reads; preview token required for
  preview reads.
- **RBAC:** existing `content:read`, `content:write`, and `content:publish`
  checks for Pages; existing assistant permissions and availability gates for
  assistant execution.
- **CSRF:** existing admin CSRF protection applies to all internal writes.
- **Rate-limit bucket:** existing admin bucket for Pages writes and existing
  assistant/provider buckets for assistant routes; existing public/preview
  bucket behavior for read-only rendering.
- **Validation:** all Page documents must normalize through the Pages v2 owner,
  reject unknown fields on fresh writes, and enforce depth/capability limits for
  nested blocks.
- **Anti-abuse controls:** no public write endpoint is introduced; preview
  keeps token TTL and hashed-token storage; browser cache/localStorage/debug
  payloads must not expose secrets or privileged settings.

---

## Sub-Tasks

- [x] TASK-418-01: Audit contract and task drift freeze.
- [x] TASK-418-02: Immediate editor correctness and selection.
- [x] TASK-418-03: Control registry and floating toolbar parity.
- [x] TASK-418-04: Canvas preview and WYSIWYG parity.
- [x] TASK-418-05: Nested container and slot architecture.
- [x] TASK-418-06: Runtime, assistant, and template parity.
- [x] TASK-418-07: Validation, docs, changelog, and live smoke closure.

---

## Implementation Order

1. Write the dedicated audit report and rerun read-only drift checks against the
   finalized task family.
2. Implement the block style and block-responsive model substrate before UI work
   depends on those fields.
3. Fix immediate editor correctness: selected block state, type-safe block
   patching, autosave/save error visibility, and block actions.
4. Add a shared control registry and rebuild toolbar panels from that registry.
5. Replace divergent canvas/runtime markup with one shared section/block renderer
   consumed by admin canvas, preview, and public frontend.
6. Add bounded container/slot blocks and recursive normalization/rendering.
7. Bring section type/variant layout templates, block renderers, assistant
   emitters, and Page template contracts into parity.
8. Run targeted validation, real server Playwright smokes, docs/changelog
   closeout, and final read-only drift audit.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest suites for Page document helpers, admin PageEditor, control
  registry, selection/layers, and assistant pure schemas/policies.
- Targeted Bun suites for Pages routes, public runtime, preview, publish, and
  assistant executor flows.
- `coderso-dev-core-host` plus `playwright-cli` real admin and public runtime
  smoke after each user-testable implementation area.
- `bun run gates:coderso` during final closure.
- `bun run precommit` before the manual commit.

---

## Registry Follow-Up Boundary

`TASK-418-03` established the shared control registry and block-control toolbar
wiring. `TASK-418-04-L02` must finish section-toolbar adoption for remaining
registry-owned section fields such as `justify`, `shadow`, and `authOnly` while
making section visual feedback honest in the canvas.

## Current Progress

`TASK-418-04` is complete: shared renderer extraction, section/block canvas
feedback, hidden-state parity, and section type/variant templates are done.
`TASK-418-05` is complete: bounded layout slots, admin nested authoring, and
recursive public/preview rendering with nested responsive cascade are in place.
`TASK-418-06` is complete: public runtime block parity, assistant
surface/schema parity, Page template boundaries, and scoped collection/form/embed
public runtime binding are done. Page templates resolve through a Page v2
contract helper, while non-Page widget-template/custom-screen/detail-page
surfaces remain legacy `WidgetBlock[]` until their own follow-up tasks. `TASK-420`
tracks the Page Templates rewrite/removal of the obsolete widget-template path,
and `TASK-421` tracks the floating inspector UX redesign. `TASK-418-07`
completed validation, live Playwright CLI smoke, docs/changelog/board updates,
and final drift closure.

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`
- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if admin/assistant route payloads change.
- `_docs/PREVIEW_SPEC.md` if preview/runtime behavior changes.
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md` if embed/form public security policy changes.
- Widget/template docs only if TASK-418 intentionally changes their boundary.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`
