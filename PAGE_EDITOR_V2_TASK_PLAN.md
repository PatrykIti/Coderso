# Pages Editor V2 Task Plan

This file is a reading index for the TASK-417 task family. The source of truth
for execution remains `_docs/_TASKS/TASK-417*`.

## Decisions

- Pages move to `schemaVersion: 2` with root `sections[]` and atomic blocks.
- Stored legacy/versionless Page `blocks[]` rows reset to an empty v2 Page
  document on read/render/restore/duplicate. Fresh admin/API writes reject
  legacy/versionless payloads with `page_document_invalid`.
- There is no Pages v1 public renderer after the family closes.
- Widgets remain valid for non-Page surfaces: detail pages, custom screens, and
  widget templates.
- Assistant page-building is cut over in this family so it emits v2 sections.

## Task Tree

- [`TASK-417`](./_docs/_TASKS/TASK-417_Pages_Sections_Atomic_Blocks_Rewrite.md):
  Pages Sections Atomic Blocks Rewrite
- [`TASK-417-01`](./_docs/_TASKS/TASK-417-01-Source-Of-Truth-Contract-And-Drift-Freeze.md):
  Source Of Truth Contract And Drift Freeze
- [`TASK-417-01-L01`](./_docs/_TASKS/TASK-417-01-L01-Page-Model-V2-Normative-Docs.md):
  Page Model V2 Normative Docs
- [`TASK-417-01-L02`](./_docs/_TASKS/TASK-417-01-L02-Task-Contract-Drift-Audit-Loop.md):
  Task Contract Drift Audit Loop
- [`TASK-417-02`](./_docs/_TASKS/TASK-417-02-Pages-V2-Document-Domain-And-Schema.md):
  Pages V2 Document Domain And Schema
- [`TASK-417-02-L01`](./_docs/_TASKS/TASK-417-02-L01-Document-Types-Defaults-And-Atomic-Catalog.md):
  Document Types Defaults And Atomic Catalog
- [`TASK-417-02-L02`](./_docs/_TASKS/TASK-417-02-L02-Normalization-Responsive-Cascade-And-Legacy-Reset.md):
  Normalization Responsive Cascade And Legacy Reset
- [`TASK-417-02-L03`](./_docs/_TASKS/TASK-417-02-L03-Admin-Api-Validation-And-Page-Error-Mapping.md):
  Admin API Validation And Page Error Mapping
- [`TASK-417-03`](./_docs/_TASKS/TASK-417-03-Pages-Service-Lifecycle-And-Data-Disposition.md):
  Pages Service Lifecycle And Data Disposition
- [`TASK-417-03-L01`](./_docs/_TASKS/TASK-417-03-L01-Create-Update-Autosave-Publish-And-Revisions-V2.md):
  Create Update Autosave Publish And Revisions V2
- [`TASK-417-03-L02`](./_docs/_TASKS/TASK-417-03-L02-Existing-Page-Rows-Clean-Slate-Reset.md):
  Existing Page Rows Clean Slate Reset
- [`TASK-417-04`](./_docs/_TASKS/TASK-417-04-Public-Runtime-And-Preview-V2.md):
  Public Runtime And Preview V2
- [`TASK-417-04-L01`](./_docs/_TASKS/TASK-417-04-L01-Pages-V2-Renderer-And-Template-Props.md):
  Pages V2 Renderer And Template Props
- [`TASK-417-04-L02`](./_docs/_TASKS/TASK-417-04-L02-Public-Site-Preview-And-Cache-Parity.md):
  Public Site Preview And Cache Parity
- [`TASK-417-04-L03`](./_docs/_TASKS/TASK-417-04-L03-Admin-Preview-Token-Issuer-And-Ssrf-Guards.md):
  Admin Preview Token Issuer And SSRF Guards
- [`TASK-417-04-L04`](./_docs/_TASKS/TASK-417-04-L04-Non-Page-Widget-Boundary-Guards.md):
  Non Page Widget Boundary Guards
- [`TASK-417-05`](./_docs/_TASKS/TASK-417-05-Admin-Pages-Editor-V2-Canvas.md):
  Admin Pages Editor V2 Canvas
- [`TASK-417-05-L01`](./_docs/_TASKS/TASK-417-05-L01-Editor-State-Reducer-And-Canvas-Selection.md):
  Editor State Reducer And Canvas Selection
- [`TASK-417-05-L02`](./_docs/_TASKS/TASK-417-05-L02-Command-Palette-Layers-And-Floating-Toolbar.md):
  Command Palette Layers And Floating Toolbar
- [`TASK-417-05-L03`](./_docs/_TASKS/TASK-417-05-L03-Responsive-Overrides-Save-Preview-History.md):
  Responsive Overrides Save Preview History
- [`TASK-417-06`](./_docs/_TASKS/TASK-417-06-Assistant-Pages-V2-Cutover.md):
  Assistant Pages V2 Cutover
- [`TASK-417-06-L01`](./_docs/_TASKS/TASK-417-06-L01-Active-Surface-And-Action-Schemas-Sections.md):
  Active Surface And Action Schemas Sections
- [`TASK-417-06-L02`](./_docs/_TASKS/TASK-417-06-L02-Blueprint-Emitters-Executor-And-Policy-Cutover.md):
  Blueprint Emitters Executor And Policy Cutover
- [`TASK-417-07`](./_docs/_TASKS/TASK-417-07-Validation-Docs-Changelog-And-Closure.md):
  Validation Docs Changelog And Closure
- [`TASK-417-07-L01`](./_docs/_TASKS/TASK-417-07-L01-Targeted-Validation-Lanes-And-Gates.md):
  Targeted Validation Lanes And Gates
- [`TASK-417-07-L02`](./_docs/_TASKS/TASK-417-07-L02-Docs-Changelog-Board-And-Final-Drift.md):
  Docs Changelog Board And Final Drift

## Audits Used

- Initial read-only audits: Claude, Epicurus, and Bacon against clean HEAD
  `d0dd7352644c849bb3cd4d84abbe53a55b4f4f62`.
- Refinement audits: Lovelace, Averroes, Claude, Nietzsche, and Schrodinger
  checked the TASK-417 draft against AGENTS.md, product/runtime constraints,
  README board state, and the dirty task-contract diff.
- Final Claude long-pass report:
  `/home/coder/.claude/plans/final-fresh-read-only-drift-enumerated-locket.md`.
  It found no unresolved HIGH or MEDIUM drift and two LOW naming/error-taxonomy
  nits, both fixed in the current task contract.

The audits agreed that implementation must not begin until TASK-417 has a
source-of-truth contract, physical children/leaves, explicit legacy data
disposition, assistant cutover, non-Page widget boundary guard, route Security
Contracts, validation lanes, and a clean final drift pass.
