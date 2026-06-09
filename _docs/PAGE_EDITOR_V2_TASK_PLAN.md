# Pages Editor V2 Task Plan

This file is a reading index for the TASK-417 task family. The source of truth
for execution remains `_docs/_TASKS/TASK-417*`.

## Decisions

- Pages move to `schemaVersion: 2` with root `sections[]` and atomic blocks.
- Stored legacy/versionless Page `blocks[]` rows reset to an empty v2 Page
  document on revision snapshot, autosave snapshot, no-payload publish,
  duplicate, restore, public render, preview, and admin read paths. Fresh
  admin/API writes reject legacy/versionless payloads with
  `page_document_invalid`.
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
- [`TASK-417-07-L03`](./_docs/_TASKS/TASK-417-07-L03-Live-Server-And-Playwright-Smokes.md):
  Live Server And Playwright Smokes

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
- Implementation pre-audit against HEAD
  `e1709ed1b762208c1a721f9cc1cab1fd2e45ee5b` found no hard task drift, but
  required the current refinements: separate Pages v2 template boundary,
  explicit stored-read reset paths, repository-style Page error mapping, broader
  affected-suite validation, Page-only `page.widget.patch` retirement, and live
  `coderso-dev-core-host` plus `playwright-cli` smoke evidence.

The audits agreed that implementation must not begin until TASK-417 has a
source-of-truth contract, physical children/leaves, explicit legacy data
disposition, assistant cutover, non-Page widget boundary guard, route Security
Contracts, validation lanes, live browser smoke coverage, and a clean final
drift pass.

## Implementation Closeout

TASK-417 is implemented as a clean-break Pages rewrite:

- Pages data is now `schemaVersion: 2` with root `sections[]`.
- Sections own atomic blocks such as `heading`, `text`, `button`, `image`,
  `list`, `card`, `divider`, and `spacer`.
- Fresh Page writes reject legacy `blocks[]`; stored legacy/versionless rows
  reset to an empty v2 document on read/render/snapshot paths.
- Public Pages render through `core/site/pageRuntimeV2.tsx` and expose
  `data-page-v2`, `data-page-section`, and `data-page-block` markers.
- Widget-template, detail-page, and custom-screen surfaces still use the legacy
  `WidgetBlock[]` builder/runtime boundary.
- The admin Pages editor is canvas-first: no Pages left/right widget panels,
  command palette, layers, floating section toolbar, Page settings, history,
  preview, save, and publish.
- Assistant Page actions and blueprints now emit/persist sections. `page.widget.patch`
  is retired for Pages and preserved only as shared widget-block behavior for
  widget-template/custom-screen surfaces.
- Solution Kits and Advanced site-kit runtime overrides now emit Pages v2
  section documents, so installed kit Pages do not reset to empty v2 documents.
- Pages v2 data is no longer used to derive legacy widget-template install
  seeds; explicit kit template blueprints remain supported for widget-template
  installs.

## Validation Summary

- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- Page/admin Vitest: 5 files, 17 tests passed.
- Assistant Vitest: 15 files, 285 tests passed across the two targeted groups.
- Page service/routes/runtime Bun suite: 34 tests passed.
- Assistant executor/full-service public runtime Bun suite: 74 tests passed.
- Assistant executor site-kit smoke: 73 tests passed.
- Solution Kit catalog/manifest/template seed Bun suite: 3 files, 9 tests
  passed.
- Solution Kit installer/site-builder Bun suite: 2 files, 9 tests passed.
- Advanced site-builder Vitest suite: 3 files, 17 tests passed.
- Assistant route permission suite: 28 tests passed.
- Detail-page/widget-template boundary suites: routes/widget preview 11 tests
  passed; detail runtime passed in isolation after a combined DB-fixture
  interference run; widget-template/custom-screen UI 4 files, 33 tests passed.
- `bun run gates:coderso`: functional, UX, performance, security, and
  reliability gates passed.
- `bun run scan:security`: Semgrep, Bun audit, Trivy, and Gitleaks clean.
- `bun run scan:security:strict`: Semgrep, Bun audit, Trivy, and Gitleaks clean.
- Security maintenance: root dev-only `concurrently` was upgraded to `10.0.3`
  so Bun audit no longer pulls vulnerable `shell-quote@1.8.3`.
- `coderso-dev-core-host` + `playwright-cli`: admin create/edit/save/publish
  and public v2 runtime smoke passed for `/task-417-playwright-smoke`.

## Template Follow-Up

TASK-417 intentionally leaves widget-template and custom-screen editors on the
legacy `WidgetBlock[]` builder, because those are non-Page surfaces and still
own reusable widget/template composition. The next task can now decide whether
the old Advanced > Widgets area becomes a Page Templates / reusable sections
surface, but that should be a separate contract instead of hidden inside the
Pages runtime rewrite.
