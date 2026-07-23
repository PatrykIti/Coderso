# TASK-539-05-L01: Stamp and Render All Page Effects Correctly

# FileName: TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md

**Parent Subtask:** TASK-539-05
**Priority:** High
**Category:** Pages / Public Renderer / Geometry
**Estimated Effort:** Very Large
**Dependencies:** TASK-539-04-L02, TASK-539-03-L05, TASK-539-02-L01, TASK-539-01-L01
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Sole ownership and mandatory split

Own the stable `core/services/pages/pageRendererV2.tsx` facade plus cohesive sibling
modules:

- `pageRendererTypes.ts`
- `pageRendererSectionStyles.ts`
- `pageRendererBlockStyles.ts`
- `pageRendererReplicaIdentity.ts`
- `pageRendererTextBlocks.tsx`
- `pageRendererMediaBlocks.tsx`
- `pageRendererDataBlocks.tsx`
- `pageRendererSvgBlock.tsx`
- `pageRendererLayoutBlocks.tsx`
- `pageRendererTimelineGeometry.ts`
- `pageRendererBlockFrame.tsx`
- `pageRendererSections.tsx`
- `pageRendererDocument.tsx`

The facade explicitly re-exports every pre-task public symbol used by site shell,
runtime, admin canvas, menus, and tests; `export *` is forbidden. Avoid circular
facades: internal modules import their direct owner. Split by responsibility and
extract further cohesive modules if any receipt exceeds 1,000.

`pageRendererReplicaIdentity.ts` is the direct owner of the task-added pure replica
identity types and helpers. It explicitly exports them for focused direct-owner
tests, while internal renderer modules import that direct owner. Do not widen the
stable `pageRendererV2.tsx` facade with these implementation-only symbols.
`pageRendererTimelineGeometry.ts` follows the same direct-owner policy for
`PageTimelineItemGeometry` and `resolvePageTimelineItemGeometry`; renderer modules
and its focused test import that file directly, and the stable facade does not
re-export either task-added symbol.

Also own the cohesive split/updates of:

- `tests/vitest/pages/page-renderer-v2.test.tsx`
- `page-renderer-v2-section-layout.test.tsx`
- `page-renderer-v2-blocks.test.tsx`
- `page-renderer-v2-data-binding.test.tsx`
- `page-renderer-v2-effects.test.tsx`
- `page-renderer-v2-svg.test.tsx`
- `page-renderer-v2-composition.test.tsx`
- `page-renderer-timeline-geometry.test.ts`
- `tests/vitest/pages/task-534-interactivity-render.test.tsx`

Each suite must be independently runnable; shared fixtures may live in a focused
`pageRendererV2TestFixtures.tsx` kept `<=1000`. Read the post-TASK-478 renderer fresh.

## Implementation Pseudocode

1. **Composition predicate and hosts.** Consume
   `PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE`, selector/variables, and resolver from
   TASK-539-04. Reveal CSS writes only reveal opacity/variable. A block under a
   revealing section receives the same host attribute; ambient-orb spans receive it
   too, so their decoration variables use the identical formula. Magnetic alone and
   any section `scrollEffect` independently cause
   `PAGE_COMPOSITION_EFFECTS_CSS` emission. Recurse through slots and use the same
   predicate for main/footer document inputs. Float/drift/pulse/orbit remain on the
   TASK-539-04 decoration channel; do not recreate a drift-only transform vocabulary.

2. **Layer width.** Stamp owner `PAGE_LAYER_WIDTH_ATTRIBUTE="full|auto"` only on an
   existing tilt/layer wrapper; preserve tilt-parent/layer variables and bounded width.

3. **Actual grid-item span.** Extend the internal `PageBlockRenderContext` with its
   owning `section` and the real `includeHiddenBlocks:boolean` chosen by the render
   boundary. The public renderer boundary first normalizes its optional input exactly
   once:

   ```ts
   const includeHiddenBlocks = options.includeHiddenBlocks === true;
   const context: PageBlockRenderContext = {
     // existing fields
     includeHiddenBlocks,
   };
   ```

   Every descendant and placement call receives that boolean; no nested consumer may
   reread/coerce the optional raw option. For each root block, compute exactly once:

   ```ts
   const placement = resolvePageBlockGridPlacement(section, blockPath, {
     includeHiddenBlocks: context.includeHiddenBlocks,
   });
   const hasAnySpan = [block.style, block.responsive?.tablet?.style,
     block.responsive?.mobile?.style]
     .some((style) => style?.colSpan !== undefined || style?.rowSpan !== undefined);
   const spanTarget = hasAnySpan ? placement : "none";
   ```

   Use normalized model data only. For `"block-frame"`, put base span style on the
   frame when a base span exists and put
   `[PAGE_BLOCK_GRID_ITEM_ATTRIBUTE]=block.id` on it whenever `hasAnySpan`, including
   responsive-only spans. For `"section-template-wrapper"`, put the same base
   style/hook policy on the existing timeline/gallery/FAQ/testimonial wrapper and
   suppress both on the inner frame. For `"none"` or no span in any of
   base/tablet/mobile, emit neither. Thread the computed target through existing
   wrapper/frame calls; do not recompute against a different block list, add a
   wrapper, or duplicate the classifier/attribute literal. Nested blocks remain
   `"none"`. Tests pin omitted/`false` as the same visible-root policy and `true` as
   the all-root policy.

4. **Background paint.** After model sanitization, call
   `parseAuthoringCssBackgroundPaint`; emit only `paint.image` to
   `backgroundImage` and only `paint.color` to `backgroundColor`, preserving the
   existing explicit clear/reset semantics and full-bleed paint target.

5. **Canonical gallery.** Import `PageGalleryItemV2`; remove local alias adapters and
   regex mirrors. Read only `src/alt/caption/category`, then defense-recheck nonempty
   URLs and category tokens with owner sanitizers/constants. Invalid material omits
   only that unsafe output; caption-only placeholders remain.

6. **Marquee safety, identity, and accessibility.** Import
   `PAGE_MARQUEE_REPLICA_ATTRIBUTE` from the pure TASK-539-04 owner; do not spell the
   marker locally. Its sibling `PAGE_MARQUEE_REPLICA_SELECTOR` remains the exact
   TASK-539-07 runtime import, so the renderer must not add a second selector.

   First own one exhaustive, recursive, Bun-free safety decision. The map uses
   `satisfies Record<PageBlockType, boolean>` so a future block type cannot silently
   become cloneable. Exactly these five types are unsafe:
   `video`, `form`, `collection`, `filters`, and `embed`. The explicitly safe
   current types are `heading`, `text`, `badge`, `button`, `image`, `gallery`,
   `list`, `card`, `divider`, `spacer`, `statistic`, `icon`, `quote`, `container`,
   `columns`, `group`, `customSvg`, `switcher`, and `scrollHint`.

   ```ts
   function isPageMarqueeReplicaSafeSubtree(
     blocks: readonly PageBlockV2[],
     options: { includeHiddenBlocks: boolean }
   ): boolean {
     const renderedBlocks = options.includeHiddenBlocks
       ? blocks
       : blocks.filter((candidate) => candidate.visibility.visible);
     return renderedBlocks.every((candidate) => {
       if (!PAGE_MARQUEE_REPLICA_SAFE_BY_BLOCK_TYPE[candidate.type]) return false;
       // The outer owner is not passed here. Any descendant-authored marquee would
       // otherwise be cloned recursively and is therefore unsafe for this owner.
       if (candidate.style?.marquee !== undefined) return false;
       return getPageBlockActiveSlotKeys(candidate).every((slotKey) =>
         isPageMarqueeReplicaSafeSubtree(candidate.slots?.[slotKey] ?? [], options)
       );
     });
   }
   ```

   The authored marquee owner is the `group` renderer branch. Do not pass that owner
   group into the predicate: its own `style.marquee` is expected and is not a reason
   to reject cloning. Invoke the predicate only on that outer group's normalized
   active-slot children using the already-normalized render-context boolean. In this
   contract, a “direct unsafe” block means an immediate active-slot child of the
   owner group; “deep unsafe” means a descendant beneath an otherwise safe child.
   `seamless:true` plus a safe child subtree renders one `.cx-marquee-rail` with two
   equal adjacent
   `.cx-marquee-segment` nodes. Any unsafe direct/deep descendant or nested authored
   marquee renders the same one-rail/one-canonical-segment fallback as
   `seamless:false`: no replica marker, namespace, clone render, or secondary
   script/nonce/global-runtime/network-bearing surface. The canonical nested marquee
   still evaluates its own children and may create its own safe replica. This is a
   fail-closed visual degradation, not an error or document rewrite.

   Primary content stays canonical and byte-identical. An approved replica segment
   carries only `[PAGE_MARQUEE_REPLICA_ATTRIBUTE]=""`, `aria-hidden="true"`, and
   the native `inert` property/attribute. Do not blanket-rewrite descendant
   `tabIndex`, do not add `disabled`, and do not mutate visual/form state; `inert`
   owns focus and activation suppression. TASK-539-07 additionally imports the one
   fixed selector and rejects marker-self/ancestors before each of its seven binders.
   Vitest asserts the emitted marker/`aria-hidden`/native `inert` attribute/property
   and the absence of blanket descendant mutations; it does not claim real browser
   focus or activation suppression. TASK-539-08 Playwright owns that interaction
   proof.

   Define one deterministic direct-owner helper/context shape for the allowed safe
   inline subtree. Keep actual DOM/SVG IDs separate from identifier values emitted
   only in renderer data hooks:

   ```ts
   export type PageReplicaIdentitySets = {
     domIds: ReadonlySet<string>;
     hookIdentifiers: ReadonlySet<string>;
   };

   export type PageReplicaIdentityContext = {
     namespace: string;
     domIds: ReadonlySet<string>;
     hookIdentifiers: ReadonlySet<string>;
     inert: true;
   };

   export type PageReplicaIdentityAttributeName =
     | "id"
     | "htmlFor"
     | "aria-labelledby"
     | "aria-describedby"
     | "aria-controls"
     | "href"
     | "xlinkHref"
     | "fill"
     | "stroke"
     | "clipPath"
     | "mask"
     | "filter"
     | "data-page-block-slot-owner"
     | typeof PAGE_BLOCK_ID_ATTRIBUTE
     | typeof PAGE_TILT_PARENT_LAYER_ATTRIBUTE;

   export function encodePageReplicaNamespacePart(value: string): string;

   export function createPageMarqueeReplicaNamespace(
     normalizedOwnerBlockId: string,
     serializedBlockPath: string
   ): string;

   export function collectPageReplicaIdentitySets(
     blocks: readonly PageBlockV2[],
     options: { includeHiddenBlocks: boolean }
   ): PageReplicaIdentitySets;

   export function namespacePageReplicaDomId(
     context: PageReplicaIdentityContext,
     value: string
   ): string;

   export function namespacePageReplicaHookIdentifier(
     context: PageReplicaIdentityContext,
     value: string
   ): string;

   export function namespacePageReplicaIdRef(
     context: PageReplicaIdentityContext,
     value: string
   ): string;

   export function transformPageReplicaIdentityAttribute(
     context: PageReplicaIdentityContext,
     attribute: PageReplicaIdentityAttributeName,
     value: string
   ): string;
   ```

   `encodePageReplicaNamespacePart` maps each Unicode code point, in order, to its
   fixed-width four-character lowercase base-36 value
   (`codePointAt(0).toString(36).padStart(4, "0")`) and concatenates the results.
   Return
   `cx-mrq-${encodePageReplicaNamespacePart(normalizedOwnerBlockId)}-${encodePageReplicaNamespacePart(serializedBlockPath)}`.
   This reversible delimiter-safe mapping stays inside `[a-z0-9-]`; it uses neither a
   lossy slug nor a truncated hash. The normalized model guarantees block-ID
   uniqueness and the serialized path distinguishes nested occurrences.

   Before rendering the replica, inspect the exact normalized safe/rendered subtree
   after the real hidden-block filter. Put in `domIds` only values that the subtree
   will actually emit as an HTML/SVG `id` definition (currently switcher tab/panel
   IDs and sanitized Safe SVG IDs). Put separately in `hookIdentifiers` normalized
   block/slot identifiers that can be emitted only as identifier-bearing data-hook
   values. A hook identifier does not become a DOM ID merely because its bytes
   match one; membership in one set never implies membership in the other.

   Carry one replica context through every nested active-slot renderer. Namespace
   every emitted `id` definition through `domIds` and each identifier-bearing data
   hook through `hookIdentifiers`. The styling-only replica frame still omits Admin
   selection chrome; namespace only hook attributes actually emitted below it.
   Boolean/enumerated hooks such as gallery layout/pressed state remain byte-for-byte.

   `transformPageReplicaIdentityAttribute` is the one pure routing function for all
   identity-bearing renderer/Safe-SVG attributes. For whitespace-separated
   `aria-labelledby`/`aria-describedby`, `aria-controls`, JSX `htmlFor` (rendered
   `for`), local `href`/`xlinkHref` hashes, and every accepted Safe SVG
   `url(#...)` in fill/stroke/clip-path/mask/filter, it rewrites a target only when
   that exact target is in `domIds`. Data-hook attributes use only
   `hookIdentifiers`. Therefore a fragment whose target equals only a block/slot
   hook identifier remains byte-identical. Preserve unresolved references,
   external/non-hash URLs, and values outside the attribute's owning set
   byte-for-byte.

   No current safe real Page renderer branch emits a `<label>`/`htmlFor` pair.
   Prove `htmlFor` routing against the exported pure transformer in the direct-owner
   suite; do not invent production label markup for test convenience. End-to-end
   replica proof must use real switcher HTML IDs/ARIA references, Safe SVG
   IDs/ARIA/hash/`url(#...)` references, and real identifier-bearing data hooks.
   Every rewritten DOM reference resolves within the replica, no reference crosses
   to the primary, and hook-only fragment candidates remain unchanged.

7. **Divider.** Do not change divider production behavior: its gradient-only
   width/alignment branch is already correct. Preserve it and add regression coverage
   only.

8. **Timeline geometry.** Make
   `pageRendererTimelineGeometry.ts` the direct owner of this exact public-to-that-
   module contract:

   ```ts
   export type PageTimelineItemGeometry = {
     paddingClassName: "py-2" | "py-3";
     markerCenterPx: 18 | 22;
     rowGapPx: number;
     axis: {
       top: string;
       bottom: string;
     } | null;
   };

   export function resolvePageTimelineItemGeometry(
     section: PageSectionV2,
     template: ResolvedPageSectionTemplate,
     index: number,
     total: number
   ): PageTimelineItemGeometry;
   ```

   It imports the existing normalized `toPageSectionVariantSpacing` from its direct
   split owner instead of duplicating gap normalization/scaling. Return
   `paddingClassName:"py-2"` and `markerCenterPx:18` only for compact; otherwise
   `"py-3"` and `22`. `rowGapPx` is exactly the normalized helper's gap (`0..120`,
   including the existing compact scaling/minimum behavior). Set `axis:null` for
   horizontal or `total <= 1`. Otherwise return these exact strings:

   ```ts
   const top = index === 0 ? `${markerCenterPx}px` : "0";
   const bottom =
     index === total - 1
       ? `calc(100% - ${markerCenterPx}px)`
       : `calc(-1 * ${rowGapPx}px)`;
   ```

   Thus the first segment begins at the first marker center, interior/last segments
   begin at row top, non-final segments bleed only the negative row gap, and the
   final segment ends at the final marker center. The renderer uses the returned
   padding/axis without recomputing geometry. Horizontal markup stays byte-identical.
   The focused `page-renderer-timeline-geometry.test.ts` imports the type/function
   directly, pins default/compact and `0..120`/compact-scaled gaps, every
   first/interior/final/singleton/horizontal result, and proves the stable facade has
   not widened.

9. **Renderer runtime commentary.** Correct only the stale
   `pageRendererV2.tsx` documentation that says the second emitted effects-runtime
   copy is a “total no-op.” Describe the final TASK-539 contract accurately: each
   emitted copy invokes the reusable per-root controller, which discovers later
   main/footer nodes while binder-specific idempotence prevents duplicate work.
   TASK-539-07 owns the runtime implementation. Do not edit `siteShell.tsx`; its
   existing emission/ownership comment is already accurate.

## Error, identity, and handoff rules

No unsafe content clone. The one-canonical-segment safety fallback is deterministic
and non-mutating. Hooks/styles are present-only. Pin no-effect/no-span/no-background
bytes, magnetic false/unset, reveal absent, non-seamless markup, and unsafe-seamless
fallback markup. In particular, an ordinary block with no base/tablet/mobile span
must not gain the grid-item hook, while a responsive-only span must gain it on the
one legal target. Do not edit runtime clone filtering/magnetic writes here
(TASK-539-07) or responsive span CSS (TASK-539-06).

## Validation and line receipt

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-renderer-v2-section-layout.test.tsx \
  tests/vitest/pages/page-renderer-v2-blocks.test.tsx \
  tests/vitest/pages/page-renderer-v2-data-binding.test.tsx \
  tests/vitest/pages/page-renderer-v2-effects.test.tsx \
  tests/vitest/pages/page-renderer-v2-svg.test.tsx \
  tests/vitest/pages/page-renderer-v2-composition.test.tsx \
  tests/vitest/pages/page-renderer-timeline-geometry.test.ts \
  tests/vitest/pages/task-534-interactivity-render.test.tsx
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

The workflow receipt must enumerate every touched/split source/test at `<=1000`.
Rerun a named failure alone.
