# TASK-539-08-L01: Nine-Flow Page Parity Suite and Closure

# FileName: TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md

**Parent Subtask:** TASK-539-08
**Priority:** High
**Category:** Pages / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-539-01 through TASK-539-07
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create in this leaf only)

---

## Sole-writer scope

May edit only:

- create `tests/integration/runtime/task-539-page-parity-runtime.test.ts`;
- `_docs/PAGE_MODEL.md`;
- `_docs/SECURITY_SPEC.md`;
- `_docs/CMS_SPEC.md`;
- `docs/develop/content-and-widgets.md`;
- `docs/guide/screens/page-editor-preview-settings-and-history.md`;
- TASK-539 descendant/parent statuses, only the TASK-539 board row/statistics delta,
  changelog 1251, and only its changelog-index row;
- screenshots `_docs/_workflows/_smoke/task-539-*`.

Read but never edit:

- `tests/integration/runtime/pages-runtime.test.ts` (legacy 2,000+ line suite);
- `tests/integration/runtime/site-shell-runtime.test.ts`.

Do not edit production source, another task family, workflow code, or shared-index
bytes outside the exact TASK-539/changelog-1251 deltas. Read both indexes fresh
immediately before closure. There is no TASK-545 prerequisite, exception, manifest,
or evidence-path substitution.

The live concurrent TASK-548 stream is an explicit collision guard. Forbidden paths
are `_docs/_TASKS/TASK-548*.md`, `_docs/_workflows/task-548-*.mjs`,
`_docs/_CHANGELOG/1261-*`, the changelog-1261 index row, and the TASK-548 board
row/statistics bytes. The literal shared future-writer paths
`_docs/SECURITY_SPEC.md` and
`docs/guide/screens/page-editor-preview-settings-and-history.md` require a strict
handoff: this TASK-539 leaf lands both edits before TASK-548-07-L01 and
TASK-548-06-L01 begin. The task-board dependency note is reciprocal authority for
`TASK-539-08-L01 → TASK-548-06-L01/TASK-548-07-L01`. Read both exact status fields
fresh immediately before editing and fail unless both are `⏳ To Do`; no worktree
isolation or conditional handback overrides this order. Record the two landed
shared-file hashes in TASK-539 closeout. TASK-548 then reads those bytes and owns its
own Guide compiler/report/coverage and security-closeout sequence. Never edit the
guide after either TASK-548 writer starts. Preserve all foreign TASK-548 bytes. Copy
its exact then-current source/test ownership paths into every TASK-539 dispatch and
recompute board statistics from all physical task files; never apply a stale
hard-coded TASK-539 delta.

## Start and runtime-suite pseudocode

Fail closed unless TASK-540 and every descendant are terminal and a new start audit
passes against the current post-TASK-540 HEAD plus full status/diff. Before any
TASK-539 source edit, the implementation workflow must already exist and pin that
baseline; a later commit does not narrow line-gate scope.

The new Bun suite:

```text
create uniquely prefixed Page through registered Page handlers
create the published footer template and shell settings as uniquely owned
  direct-service fixtures, following the existing site-shell runtime harness
exercise actual registered Page write/publish and public runtime paths
assert strict canonical gallery and unknown nested key behavior
assert public HTML/CSS hooks, responsive rules, parsed paint, and static runtime
assert main/footer each carry the required selector/style/script contract
assert unsafe marquee form/listing descendants use one canonical segment and
  produce exactly one nonce/script/listing-runtime surface
never copy assertions into pages-runtime.test.ts
finally restore owned settings and delete only rows/files created by this suite
```

Use collision-safe IDs/slugs and guarded cleanup; never truncate or delete a whole
table. Assert unsafe data is absent without writing an actionable exploit transcript.
The existing Page and site-shell runtime suites run read-only as regression consumers.

## Security Contract

- **Visibility/auth:** all exercised mutation routes are internal
  `/admin/api/*` routes authenticated only by the existing session cookie; there is
  no TASK-539 API-key mode.
- **RBAC:** create, update, and autosave require `content:write`; publish requires
  `content:publish`.
- **CSRF/rate limit:** every session-backed write in the harness sends the real
  `X-CSRF-Token` shape and remains in the `admin_write` bucket. The test must not
  bypass middleware to claim route coverage.
- **Validation:** the PageDocumentV2 boundary strictly rejects unknown fields and
  the suite proves rejection/no persistence through the registered route.
- **Anti-abuse:** public Page render is read-only and TASK-539 adds no public write,
  so no new nonce/signature/HMAC or captcha policy applies. Existing form nonces and
  scripts must occur exactly once when an unsafe marquee subtree degrades to one
  segment.
- **Fixture boundary:** the footer template and shell settings are test setup/cleanup
  through `createPageTemplate` and `setSetting`, matching the existing
  `site-shell-runtime.test.ts` fixture pattern; they are not claimed as HTTP route
  coverage. If an implementer instead exercises registered handlers, page-template
  create/update requires `content:write`, settings PATCH requires `settings:write`,
  both remain session-cookie/CSRF/`admin_write` protected, and their strict schemas
  must run. Cleanup deletes/restores only suite-owned state.

## Exact targeted gates

Run every command from leaves 01–07 and this exact aggregate inventory. A named failure
is rerun once alone before classification.

```bash
bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/pages/page-document-v2-tree-and-capabilities.test.ts tests/vitest/pages/page-document-v2-listing-and-settings.test.ts tests/vitest/pages/page-document-v2-style-contracts.test.ts tests/vitest/pages/page-document-v2-block-roundtrip.test.ts tests/vitest/pages/task-534-interactivity-model.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/services/css-color-consumer-parity.test.ts
bun run test:vitest -- tests/vitest/pages/page-block-grid-placement.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-registry-capabilities.test.ts tests/vitest/pages/page-editor-control-registry-effects.test.ts tests/vitest/pages/page-editor-control-registry-responsive.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-media-url-control.test.tsx tests/vitest/ui/page-editor-gallery-items-control.test.tsx tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx tests/vitest/ui/page-editor-v2-controls-flow.test.tsx tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx tests/vitest/ui/page-editor-v2-layout-flow.test.tsx tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx tests/vitest/ui/page-editor-v2-settings-flow.test.tsx tests/vitest/pages/task-539-page-editor-controls.test.ts tests/vitest/ui/task-539-page-editor-flow.test.tsx
bun run test:vitest -- tests/vitest/pages/page-composition-effects.test.ts tests/vitest/pages/task-534-interactivity-css.test.ts tests/vitest/pages/task-539-transform-composition.test.ts
bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-renderer-v2-section-layout.test.tsx tests/vitest/pages/page-renderer-v2-blocks.test.tsx tests/vitest/pages/page-renderer-v2-data-binding.test.tsx tests/vitest/pages/page-renderer-v2-effects.test.tsx tests/vitest/pages/page-renderer-v2-svg.test.tsx tests/vitest/pages/page-renderer-v2-composition.test.tsx tests/vitest/pages/task-534-interactivity-render.test.tsx tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx
bun run test:vitest -- tests/vitest/pages/page-responsive-css.test.ts tests/vitest/pages/page-responsive-css-section.test.ts tests/vitest/pages/page-responsive-css-block.test.ts tests/vitest/pages/page-responsive-css-security.test.ts tests/vitest/pages/task-539-responsive-css-parity.test.ts
bun run test:vitest -- tests/vitest/pages/pageEffectsRuntime.test.ts tests/vitest/content/sectionScrollEffect.test.tsx tests/vitest/content/cursorSpotlight.test.tsx tests/vitest/content/task-534-interactivity-runtime.test.tsx tests/vitest/pages/task-539-page-effects-runtime-rescan.test.tsx
```

## Exact aggregate gates

Run in this order after targeted suites are green:

```bash
node --check _docs/_workflows/task-539-fix.mjs
node --check _docs/_workflows/task-539-implement.mjs
node _docs/_workflows/task-539-implement.mjs --self-test-file-line-limit
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun --cwd core build:site
bun run check:admin-boundary
bun run check:admin-bundle
set -a && source .env && set +a
bun --eval 'import { canConnect, hasTable } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); const menus = reachable && await hasTable("menus"); const pageTemplates = reachable && await hasTable("page_templates"); process.stdout.write(JSON.stringify({ configured, reachable, requiredTables: { menus, page_templates: pageTemplates } })); if (!reachable || !menus || !pageTemplates) process.exit(1); process.exit(0)'
bun test --timeout=15000 tests/integration/routes/pages.test.ts
bun test --timeout=15000 tests/integration/runtime/task-539-page-parity-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/pages-runtime.test.ts
bun test --timeout=15000 tests/integration/runtime/site-shell-runtime.test.ts
bun run test
bun run test:coverage
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

The preflight checks the exact additional table predicates that
`site-shell-runtime.test.ts` uses to select `test` rather than `test.skip`. Do not
close on an unreachable DB, either missing required table, a skipped required case,
truncated command, missing workflow result, line count above 1,000, or unavailable
strict scanner. Require the final named-suite receipts to report zero skipped required
cases. Recover, rerun, and record the final result. Attribute a broad-suite failure
only after its named file confirms it in isolation.

## Fresh post-audit

After tests and docs are final, run about five independent, read-only lenses
sequentially on the same final working tree:

1. scope/finding fidelity, start gate, land order, TASK-535 remains closed;
2. schema/error strictness, legacy reads, present-only and byte identity;
3. parsed-paint/raw-style security, selector escaping, placement parity;
4. renderer transform/marquee/timeline plus main/footer controller and reduced motion;
5. test integrity, line receipts, docs/task/changelog graph, collision boundaries.

Every agent must return a result and every finding needs `file:line` evidence; a
missing result is not a pass. Fix verified HIGH/MEDIUM findings in their sole-owner
leaf, rerun its exact gate, then restart fresh lenses. A LOW may be deferred only by
linking a deduplicated, execution-ready TASK-9999 leaf and recording exact proof of
both zero user-visible/UI/UX/accessibility effect and zero data/security/privacy/auth/
RBAC/API/persistence/migration/performance/reliability/test-integrity impact. Otherwise
fix it before closure.

## Nine real browser flows

Restart the server (no hot reload), verify admin and public front respond, then use one
task-scoped `playwright-cli` session such as `-s=wf539smoke`. Execute these nine
distinct real flows:

1. **Maximum-depth and placement parity.** Build legal depth-4 nested layout plus
   root frame, timeline/gallery/FAQ/testimonial wrapper, default media-split,
   non-default media-split, nested, and per-column placement classes. Author/reset
   all `x/y/z`, spans, custom font size, and `textTransform:none`; assert computed
   grid placement/typography/layer geometry in desktop/tablet/mobile editor and front.
2. **Gallery lifecycle.** Insert three media items with alt/caption/category tokens,
   use every gallery control, save draft, reopen, publish, and filter on front by
   pointer/keyboard; assert persistence, bounds, hidden state, pressed state, and ARIA.
3. **Composed transforms.** Combine section reveal, independent decoration/orbs,
   hover, tilt, magnetic, and layer placement; assert every computed channel changes
   independently, fine-pointer move/leave resets, wrapper width, and click path.
4. **Marquee identity/accessibility.** Exercise seamless true/false and a seamless
   group containing deeply nested form/listing plus a nested authored marquee.
   Replica-safe content has one rail, two adjacent segments/no gap/no wrap, a replica
   that is `aria-hidden` and `inert`, locally namespaced IDs/data hooks with no
   duplicate ID, and reduced-motion stop. Trigger the four hook families that real
   block content can own—switcher, gallery, tilt, and magnetic—and prove only primary
   nodes bind/respond with one-action cardinality. Attempt programmatic focus,
   pointer click, and keyboard activation on normally focusable replica descendants;
   native `inert` must keep focus outside the replica and produce zero replica
   activation/listener effect. Exercise reveal/parallax on real
   section wrappers and spotlight on the real Page root separately; their defensive
   replica-marker cases remain runtime-suite fixed DOM, not fabricated product
   markup. Each unsafe subtree deterministically has one
   canonical segment, no replica marker/namespace, and exactly one form nonce,
   executable form script, listing runtime surface, and nested marquee instance.
5. **Full-bleed paint.** Author responsive gradient layers plus final color, radius,
   shadow, and glow; assert viewport-wide outer paint, capped content, exact computed
   image/color split, no double-tone box, and invalid paint absent.
6. **Main/footer rescans.** Exercise main-script→footer-script and
   footer-script→main-script parser orders with different effects. Assert both roots
   bind exactly once, later nodes respond, globals do not multiply,
   `--spotlight-x`/`--spotlight-y` update on the correct
   `[data-page-spotlight]` root and visibly move that root's overlay, and magnetic
   custom properties update then reset on pointer leave.
7. **Reduced-motion functionality.** Enable reduced motion and prove switcher and
   gallery pointer/keyboard/roving/ARIA/hidden behavior remains functional while
   reveal/parallax/spotlight/tilt/magnetic stay neutral and content remains visible.
8. **Timeline and divider geometry.** Exercise default, compact, multi-item, and
   single-item timelines plus gradient/non-gradient divider gating. Assert connector
   endpoints at the exact `22px` default/`18px` compact marker centers, non-final
   row-gap bleed, no single-item connector, and visible divider length/alignment/tone.
9. **Narrow canvas and themes.** At 320, 390, and 480 px open/close the inspector,
   select and edit controls in both light and dark Admin themes, and assert positive
   usable canvas width, reachable controls, no rail-induced zero width, clipping, or
   horizontal trap. At 640px and one `lg` viewport, assert computed right padding is
   exactly 300px while the selected inspector is open despite the retained `lg:p-8`;
   closing restores the ordinary computed `p-6 lg:p-8` padding. The narrow overlay
   may cover content by design, but it must be closable and reopenable without
   trapping the editor.

Assert visible effects through computed styles, bounding boxes, DOM/ARIA/data state,
focus, and actual hit targets—not control presence or CSS-string presence. Preflight
admin/front before the flows, cover save→reopen and publish→front parity, collect at
least one `task-539-*` screenshot per flow (and both themes for flow 9), and require
zero console errors in every scenario. Record scenario ID, viewport/theme, visible
assertions, console result, and screenshot path in TASK-539 closeout evidence.

## Documentation and atomic closure

Update all five named docs with the strict gallery/legacy-read behavior, shared
placement classification, responsive typography/spans/layers, parsed paint/full bleed,
transform variables/marquee/timeline, controller rescans, reduced motion, present-only
identity, and user-visible editing/publish workflow. Do not describe task internals in
the user guide.

Create
`_docs/_CHANGELOG/1251-{YYYY-MM-DD}-task-539-page-v2-post-audit-remediation-ii.md`
using the actual closure date and live changelog convention. Record exact validation
results, line receipt, audits, nine-flow evidence, screenshots, and owner commit scope
without secrets. Its Tasks field/index coverage must enumerate TASK-539, all 8 direct
children, and all 18 physical leaves, including TASK-539-03-L05, before any family
status is closed.

Only after every required receipt is green: mark leaves terminal, then child tasks,
then TASK-539; update only its board row and recompute statistics from physical files;
add only changelog 1251/index rows. No direct child may remain open. Do not commit as an
agent.
