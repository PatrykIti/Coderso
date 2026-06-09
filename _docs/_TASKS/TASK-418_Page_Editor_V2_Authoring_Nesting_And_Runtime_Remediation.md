# TASK-418: Page Editor V2 Authoring Nesting And Runtime Remediation
# FileName: TASK-418_Page_Editor_V2_Authoring_Nesting_And_Runtime_Remediation.md

**Priority:** High
**Category:** Pages / Admin UI / Runtime / Assistant / Templates
**Estimated Effort:** Very Large
**Dependencies:** TASK-417, `_docs/PAGE_MODEL.md`, `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
**Status:** ⏳ To Do

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
- Flexible composition is added through bounded container/slot blocks.
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
a fresh read-only drift pass before any production code changes.

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

- [ ] TASK-418-01: Audit contract and task drift freeze.
- [ ] TASK-418-02: Immediate editor correctness and selection.
- [ ] TASK-418-03: Control registry and floating toolbar parity.
- [ ] TASK-418-04: Canvas preview and WYSIWYG parity.
- [ ] TASK-418-05: Nested container and slot architecture.
- [ ] TASK-418-06: Runtime, assistant, and template parity.
- [ ] TASK-418-07: Validation, docs, changelog, and live smoke closure.

---

## Implementation Order

1. Write the dedicated audit report and rerun read-only drift checks against the
   finalized task family.
2. Fix immediate editor correctness: selected block state, type-safe block
   patching, autosave/save error visibility, and block actions.
3. Add a shared control registry and rebuild toolbar panels from that registry.
4. Make the admin canvas visually honor the same style/layout/visibility rules
   that public runtime uses.
5. Add bounded container/slot blocks and recursive normalization/rendering.
6. Bring runtime, assistant emitters, and Page template contracts into parity.
7. Run targeted validation, real server Playwright smokes, docs/changelog
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

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_GAP_AUDIT.md`
- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if admin/assistant route payloads change.
- `_docs/PREVIEW_SPEC.md` if preview/runtime behavior changes.
- `_docs/ASSISTANT_SITE_BUILDER.md`
- Widget/template docs only if TASK-418 intentionally changes their boundary.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`
