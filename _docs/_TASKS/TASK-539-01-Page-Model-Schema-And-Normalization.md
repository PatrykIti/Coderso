# TASK-539-01: Page Model, Schema, and Normalization

# FileName: TASK-539-01-Page-Model-Schema-And-Normalization.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / PageDocumentV2 / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-538, TASK-541; TASK-540 fully terminal; TASK-478/TASK-481 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Repair the PageDocumentV2 contract before any renderer, responsive-CSS, or editor
consumer lands: split the current over-limit model and unit suite by cohesive
responsibility, preserve the explicit public facade and runtime identities, add the
strict canonical gallery shape, make the complete responsive style surface
type/schema/normalizer-strict, make responsive layer deltas reachable and
deterministic, and remove effect/divider residue.

Schema version 2, route registration, DDL, dependencies, and product primitives remain
unchanged. Optional values remain present-only.

## Leaves and land order

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-01-L01 | Sole model/module/facade and Page model unit-test writer | ⏳ To Do |
| TASK-539-01-L02 | Existing registered Bun/DB Page route proof only | ⏳ To Do |

Land `TASK-539-01-L01 -> TASK-539-01-L02`.

## Single-writer ownership

- L01 is the sole TASK-539 writer of
  `core/services/pages/pageDocumentV2.ts`, every new module under
  `core/services/pages/pageDocumentV2/`, and the Page model Vitest split named in
  its leaf, including the dedicated
  `tests/vitest/pages/page-document-v2-facade.test.ts` source-manifest and
  reference-identity suite. It performs the source and test split before adding
  behavior.
- L02 edits only `tests/integration/routes/pages.test.ts`. That file is 797 lines
  at the verified repair baseline and must remain at most 1,000 lines.
- L02 adds no unit/helper-only cases. All schema, normalization, stored-read,
  resolution, identity, and no-mutation cases belong to L01.
- Later leaves import the exact facade-owned symbols. They do not duplicate gallery,
  layer-merge, category, or effect rules.
- Neither leaf edits renderers, responsive CSS, editor UI, task/index/changelog files,
  routes, services, migrations, dependencies, or TASK-541 owners/tests.

## Locked model contract

- `pageDocumentV2.ts` remains the stable public import path and contains explicit
  named value/type re-exports only; `export *` is forbidden.
- The grounded pre-task facade surface is exactly 74 explicit type names plus 121
  runtime names. L01 enumerates every baseline name and direct owner. The only
  additions are four types and eight runtime names, so the final facade is exactly
  78 type names plus 129 runtime names; any extra, missing, duplicate, aliased, or
  owner-mismatched export fails the dedicated facade suite.
- Each public runtime value is defined once in its cohesive owner module. Direct owner
  imports and facade imports are reference-identical; no facade wrapper, clone, or
  duplicate constant is allowed.
- Gallery writes accept only required canonical `src`, `alt`, and `caption` strings
  plus optional canonical `category`. `src` is bounded by the exported
  `PAGE_GALLERY_SRC_MAX=2048` and must equal the media sanitizer output byte-for-byte;
  `alt`/`caption` are bounded by 500/2,000 raw characters and must already equal their
  ASCII/Unicode-trimmed form. Empty required strings remain legal. The exact
  `{src:"",alt:"",caption:""}` draft row persists and counts toward the exact
  120-item limit.
- The optional gallery `category` schema is exactly `type:"string"`,
  `minLength:1`, `maxLength:587`, and a canonical token-stack pattern derived from
  the owner `GALLERY_CATEGORY_PATTERN` and `GALLERY_FILTER_CATEGORY_MAX`: 1..12
  owner-valid tokens separated by one ASCII space. JSON Schema proves shape and
  bounds only, so it may accept duplicate tokens; the write normalizer separately
  rejects duplicates and never silently repairs them.
- Unknown gallery keys and legacy aliases on write throw
  `page_document_unknown_field` at the exact nested field path. Wrong shapes, missing
  required fields, unsafe nonempty media URLs, invalid category values, or limit
  overflow throw `page_document_invalid`.
- Stored read alone adapts legacy aliases with pinned precedence:
  `src > url > image > assetUrl`, `alt > title > ""`, and
  `caption > title > label > name > description > ""`. It examines only the first
  120 raw rows, trims before capping `src`/`alt`/`caption`, sanitizes the capped
  source, deduplicates category tokens, rebuilds fresh canonical objects, preserves
  canonical alt-only and all-empty rows, and never mutates caller data.
- Responsive section style is a dedicated `Partial<Omit<...>>` contract. It excludes
  the base-only/structural keys `scrollEffect`, `parallaxIntensity`,
  `surfacePreset`, `composition`, `fullBleed`, `noiseOverlay`, `columnTemplate`,
  and `border`, and adds each excluded member back as optional `never`. Responsive
  block style follows the same pattern and excludes `decoration`, `tilt`,
  `tiltGlare`, `surfacePreset`, `hoverEffect`, `marquee`, `composition`,
  `revealDelay`, and `magnetic`. `style.column` intentionally remains
  schema-valid because editor/preview breakpoint resolution supports it; public CSS
  diagnoses that structural override as `not_css_expressible`.
- Responsive block `layer` permits only `x`, `y`, and `z`. Authored responsive
  `anchor` rejects at its exact path; stored read drops only that key. A responsive
  layer without a normalized base layer rejects on write and drops only the
  unreachable delta on read.
- The exported responsive TypeScript contract is narrow at both section and block
  boundaries: `PageSectionResponsiveStyleV2`,
  `PageBlockResponsiveLayerV2 = Pick<PageBlockLayer, "x"|"y"|"z"> &
  {anchor?:never}`, and `PageBlockResponsiveStyleV2` are owner-defined and used by
  their corresponding override types. The explicit facade re-exports all three.
  Compile-time regressions reject every forbidden responsive style key, reject both
  an object literal carrying `anchor` and a variable typed as the broader
  `PageBlockLayer`, and continue to accept the intended responsive paint/layout,
  typography, span, `column`, and `x/y/z` keys.
- Dedicated responsive JSON schemas expose only the allowed style properties and
  never reuse either complete base-style schema. Dedicated responsive normalizers
  reject each known base-only/structural key on write as `page_document_invalid` at
  its exact field path. Stored read drops only those forbidden keys (and responsive
  `layer.anchor`), preserves every valid sibling, and recursively prunes only newly
  empty layer/style/breakpoint records. Arbitrary unknown responsive keys retain the
  normal strict `page_document_unknown_field` contract.
- Breakpoint resolution copies only own present `x/y/z` keys from the responsive
  layer; it never spreads a broad override. It conditionally owns `style.layer` only
  when the merged layer exists and otherwise deletes/omits that key. Unrelated nested
  style records retain replacement semantics. Explicit responsive
  `textTransform:"none"` survives as a reset while base `"none"` remains omitted.
- Spotlight dependants survive only with `cursorSpotlight:true`; parallax intensity
  in base section style survives only with base `scrollEffect:"parallax"`; noise
  remains independent. Divider `width`/`align` survive only when `gradient===true`.

## Security Contract

- **Visibility/routes:** no route is added or changed. Existing Page mutations remain
  internal under `/admin/api/*`; public Page rendering remains read-only.
- **Auth/RBAC:** existing session-cookie-only authentication and
  `content:write`/`content:publish` RBAC checks remain unchanged; no API-key path is
  added.
- **CSRF/rate limit:** session-backed admin mutations keep CSRF enforcement and the
  existing `admin_write` bucket.
- **Validation:** PageDocumentV2 remains the strict reject-unknown persistence
  boundary. Nested gallery paths retain machine-readable errors; media/category
  values use positive validation.
- **Anti-abuse:** no public write is introduced, so nonce/HMAC and captcha do not
  apply.

## Acceptance

- Every resulting touched production/test file is at most 1,000 physical lines.
- Existing public imports compile unchanged and representative facade/owner values
  pass reference-identity tests. The dedicated facade suite type-imports all exact
  78 type names, statically proves the complete sorted type/value owner maps, pins
  `Object.keys` to the exact 129 runtime names, and proves every runtime export is
  reference-identical to its direct owner.
- Canonical gallery rows, including the empty draft sentinel, round-trip exactly.
- Strict write errors and stored-read compatibility follow the locked matrix above.
- Category schema/write boundaries cover empty/invalid values, token lengths 48/49,
  token counts 12/13, total lengths 587/588, and duplicate-token behavior without
  claiming that JSON Schema alone enforces uniqueness.
- Present-key layer merge/reset, own-key identity, responsive-anchor/base-layer
  reachability, effect cleanup, divider cleanup, and input immutability are covered
  in the L01 unit lane.
- Compile-time, JSON-schema, write-normalizer, and stored-read tables cover every
  section/block forbidden responsive key. Each write failure pins the exact path;
  each stored-read case proves sibling preservation and empty-record pruning, so no
  base-only/structural field survives as a dead silent responsive setting.
- L02 proves the existing route mapper and DB no-write behavior without promising a
  `details.path` for `page_document_invalid`, which the current mapper does not expose.

## Aggregate validation

Run both leaf gates, including
`tests/vitest/pages/page-document-v2-facade.test.ts` in L01's exact Vitest command
and the implementation workflow's baseline-to-final family line check. No skipped DB
route assertion counts as proof.
