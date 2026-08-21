# TASK-539-05-L02: Prove Renderer Effects and Geometry

# FileName: TASK-539-05-L02-Prove-Renderer-Effects-And-Geometry.md

**Parent Subtask:** TASK-539-05
**Priority:** High
**Category:** Pages / Vitest / Renderer Proof
**Estimated Effort:** Large
**Dependencies:** TASK-539-05-L01
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Additive-only ownership

Create only
`tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx` and
`tests/vitest/pages/task-539-renderer-replica-identity.test.tsx` (split by
cohesive responsibility so the prettier-canonical output stays `<=1000` lines
per file; the effects/geometry/placement/gallery/background/divider/timeline
proof owns the contract-named file, the marquee-replica identity proof owns the
replica file, and each stays independently runnable).
L01 source and all split/existing renderer suites are read-only here.

## Implementation Pseudocode

- Magnetic-only and reveal-only documents emit the shared transform CSS/host;
  false/unset/no-effect bytes remain exact. Repeat predicate proof through footer
  renderer input.
- Combined reveal/decoration/hover/tilt/magnetic/layer preserves every
  hook/variable; float/drift/pulse/orbit block and ambient-orb hosts use the one
  formula, while radiate preserves box-shadow and layer anchor remains `translate`.
- L05 placement: default root frame and template wrappers carry the one legal
  attribute/span target; nested/per-column/non-default-media-split carry neither.
  Cover base-only span, responsive-only span, and no span, plus the hidden assigned
  sibling under omitted/`false`/`true` `includeHiddenBlocks`. Prove the renderer
  normalizes the optional input once, omitted equals `false`, descendants receive
  the boolean unchanged, and at most one hook is stamped.
- Canonical gallery only, defense-rechecked URLs/categories, caption placeholder,
  accessible filter state, and no alias interpretation.
- Background image/color separation covers one/stacked gradients, final color,
  full bleed, clears, and invalid fail-closed values; color never enters
  `background-image`.
- Safe `seamless:true` has one rail/two equal segments. Use safe direct and deeply
  nested inline content beneath the authored outer `group`, including switcher,
  gallery, button, Safe SVG,
  container/columns/group slots, and two normalization-collision candidates. The
  primary keeps exact canonical identifiers/bytes. The replica imports the exact
  owner marker, carries `aria-hidden` and native `inert`, adds no blanket descendant
  `tabIndex` or `disabled` mutation. Vitest asserts the marker plus emitted
  `aria-hidden`/native `inert` markup/property only; TASK-539-08 Playwright owns real
  browser focus and activation suppression.
- Pin deterministic owner-ID + serialized-path namespaces, exact four-lowercase-
  base36-digits-per-Unicode-code-point encoding for ASCII and Unicode, delimiter
  safety, and reversibility. Direct-import the explicitly exported pure identity
  helpers from `pageRendererReplicaIdentity.ts`; do not import them through the
  stable renderer facade. Its focused unit table covers `htmlFor`/rendered `for`
  because no current safe real renderer emits label markup.
- End-to-end markup uses real switcher and Safe SVG output to cover HTML/SVG `id`,
  every emitted `aria-labelledby`/`aria-describedby` token, `aria-controls`, local
  `href`/`xlinkHref`, every accepted fill/stroke/clip-path/mask/filter `url(#...)`,
  and real identifier-bearing block/slot hooks. Assert the collected `domIds` and
  `hookIdentifiers` are separate: IDREF/hash/SVG references rewrite only targets
  backed by an emitted DOM/SVG `id`, while data-hook values namespace only through
  `hookIdentifiers`. A fragment equal only to a hook identifier stays
  byte-identical. Every rewritten DOM reference resolves inside that replica and
  never the primary; unresolved/external references and boolean/enumerated hooks
  remain byte-identical.
- Direct-import `PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE` and
  `PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE` from
  `pageRendererReplicaIdentity.ts`. An approved replica stamps the block-frame alias
  on its corresponding block frame, the tilt/layer alias only on the hoisted
  tilt/layer wrapper. Each value remains the canonical normalized original block ID
  even while selection/runtime hook identifiers are namespaced. Assert the aliases
  are absent from `domIds`, `hookIdentifiers`, identity-transformer routing, primary
  markup, non-seamless output, unsafe fallback output, and every non-owning replica
  node. Prove the authored outer marquee group's legal root grid target remains one
  singular canonical frame outside both segments. Every duplicated active-slot
  descendant preserves a nested path, resolves TASK-539-03-L05 placement `"none"`,
  and emits no `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE`, replica grid alias, inline span, or
  responsive span target.
- For each exact unsafe type (`video`, `form`, `collection`, `filters`, `embed`),
  cover both an immediate active-slot child (“direct”) and deep active-slot nesting
  under an authored `seamless:true` outer group. Do not test or implement an
  erroneous safety check against the outer group owner itself. Each case has one
  rail/one canonical segment, no replica marker/namespace, and
  exactly one corresponding form/listing/script/nonce/global-runtime/network-bearing
  surface. No cloned form script/nonce, listing/filter hook, iframe/embed, or video
  source may exist.
- Put an authored marquee below another authored seamless marquee. The outer owner
  falls back to one canonical segment; the nested canonical owner independently
  emits two segments only for its safe children. Two nested/sibling owners get unique
  path namespaces and no cross-owner ID reference. `seamless:false` has one segment
  and no marker/namespace.
- Divider width/alignment regression remains gradient-only without changing source.
- Direct-import `PageTimelineItemGeometry` and
  `resolvePageTimelineItemGeometry(section,template,index,total)` from
  `pageRendererTimelineGeometry.ts`, never the stable facade. Pin
  `paddingClassName:"py-3"`/marker center `22` by default and
  `"py-2"`/`18` for compact, with `rowGapPx` exactly from normalized
  `toPageSectionVariantSpacing` across `0..120` and its existing compact scaling.
  A vertical singleton has `axis:null`. Multi-item rows pin first `top` to
  `${markerCenterPx}px`, every later `top` to `"0"`, every non-final `bottom` to
  `calc(-1 * ${rowGapPx}px)`, and final `bottom` to
  `calc(100% - ${markerCenterPx}px)`. Horizontal returns `axis:null` and its markup
  stays exact.
- Stable facade exports remain the exact pre-task surface; replica-identity and
  timeline-geometry internals are explicitly exported only by their direct owners.
  The L01-owned `page-renderer-v2-facade.test.tsx` is the sole exhaustive 12-type /
  29-runtime-value manifest and reference-identity proof; this additive L02 suite
  checks only that its direct-imported task-added replica/timeline symbols are absent
  from the facade and does not duplicate or own that manifest. Pin all split
  suite/module line receipts.

DOM structure proof supplements TASK-539-08 computed geometry and TASK-539-07 real
runtime clone-ignore/movement proof. Native `inert` behavior is accepted only from
the TASK-539-08 real-browser focus/activation smoke, not from Vitest/JSDOM.

## Security Contract

The suite renders public read-only normalized documents only. It proves fail-closed
replica suppression for all script/nonce, global binder, and live-network block
types, exact local-reference rewriting, and inert replica markup/property. Real
interaction suppression is proved by TASK-539-08 Playwright. It adds no
route or public write; auth, RBAC, CSRF, rate limit, API-key, nonce/HMAC, and captcha
contracts are unchanged.

## Validation and line receipt

```bash
bun run test:vitest -- tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx tests/vitest/pages/task-539-renderer-replica-identity.test.tsx
bun --cwd core lint:types
bun --cwd core lint
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
wc -l tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx tests/vitest/pages/task-539-renderer-replica-identity.test.tsx
git diff --check
```

Each new suite must be independently runnable and `<=1000`. Rerun once on failure.
