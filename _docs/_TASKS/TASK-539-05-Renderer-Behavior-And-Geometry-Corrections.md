# TASK-539-05: Renderer Behavior and Geometry Corrections

# FileName: TASK-539-05-Renderer-Behavior-And-Geometry-Corrections.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Public Renderer / Geometry
**Estimated Effort:** Very Large
**Dependencies:** TASK-539-04-L02; TASK-478 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Goal

Split the oversized renderer behind an explicit stable facade and make it consume the
landed canonical gallery, paint parser, transform host, and shared grid-placement
contracts. Correct marquee identity/accessibility, timeline endpoints, composition
emission, background channels, and orb/reveal hosts without changing no-effect bytes.

## Leaves and ownership

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-539-05-L01 | Sole renderer/source split and source-owner test split/updates | ⏳ To Do |
| 2 | TASK-539-05-L02 | New additive TASK-539 renderer proof suite only | ⏳ To Do |

L01 is the sole TASK-539 writer of the renderer facade/modules and existing renderer
suites, including the exhaustive
`tests/vitest/pages/page-renderer-v2-facade.test.tsx` manifest/reference-identity
suite. L02 creates one task-specific suite only and does not duplicate that facade
manifest. No `siteShell.tsx`, runtime,
responsive CSS, editor, model, sanitizer, task index, or changelog edit belongs here.
The stale renderer comment that calls the second effects-runtime copy a “total
no-op” is part of L01's renderer-only correction; `siteShell.tsx` already has
accurate ownership wording and remains untouched.

TASK-547 already split the renderer source: `pageRendererV2.tsx` is now 920 lines
(down from the pre-split 4,003) and the landed support modules are
`pageRendererV2Contract.ts`, `pageSectionRenderStyles.ts`,
`pageBlockRenderStyles.ts`, `pageSectionRendererV2.tsx`,
`pageStaticBlockRenderers.tsx`, `pageDataBlockRenderers.tsx`,
`pageLayoutBlockRenderer.tsx`, and `pageDocumentRenderState.ts`.
`page-renderer-v2.test.tsx` remains 5,696 lines and still requires its cohesive
split. Re-ground L01 against the landed modules; the split must leave every
human-authored source/test file independently reviewable and `<=1000`.

## Security Contract

Public rendering remains read-only. Canonical gallery URLs/categories and parsed
background components are revalidated at render. Clone namespaces use fixed,
deterministic trusted prefixes. DOM/SVG ID definitions and data-hook identifiers are
collected in separate sets; IDREF/hash/SVG references rewrite only targets backed by
a locally emitted DOM/SVG `id`, never a value that exists only as a data hook. A
recursive fail-closed predicate forbids a replica for `video`, `form`,
`collection`, `filters`, or `embed` descendants and for nested authored marquees, so
scripts, nonces, global listing/form binders, live embeds/video, and nested replica
namespaces are never duplicated. An unsafe authored `seamless:true` value degrades
only to one canonical segment; no raw HTML/style/script or secondary network/runtime
surface is added. No route, auth, RBAC, CSRF, rate-limit, nonce/HMAC, or captcha
change applies.

## Acceptance

- Explicit facade imports stay stable; every split file is `<=1000`.
- Magnetic/reveal/decoration/orb hosts use the one transform formula and composition
  predicate.
- Spans target only L05-classified real grid items under the renderer's actual
  hidden-block policy; responsive-only spans receive the shared hook too.
- Gallery and backgrounds fail closed at render.
- Authored seamless marquee on the outer `group` renderer has one rail/two equal
  isolated segments only when that group's exact normalized active child subtree is
  recursively replica-safe. The owner group itself is not safety-tested; “direct”
  means its immediate active-slot child. An unsafe direct or deeply nested
  `video`/`form`/`collection`/`filters`/`embed`, or a nested authored marquee, yields
  one deterministic canonical segment with no marker/namespace and
  exactly one script/nonce/global-runtime/network-bearing surface. The safe replica
  imports the owner marker, is `aria-hidden` + `inert`, and namespaces local
  DOM/SVG IDs, matching local references, and identifier-bearing data hooks through
  their separate eligibility sets; a hook-only matching fragment stays unchanged.
  Two direct-owner styling-only aliases retain the canonical original block ID on
  the approved replica's block frame and hoisted tilt/layer wrapper, respectively,
  so responsive CSS can style both segments without restoring canonical
  selection/runtime hooks. They are outside both identity sets and all identity
  transformation, and primary/non-seamless/unsafe output emits neither. The outer
  authored marquee group's legal root grid target is one canonical node outside both
  segments; all duplicated descendants are nested, resolve placement `"none"`, and
  emit no grid hook/alias/span CSS.
  The primary stays unchanged. Non-seamless also has one canonical segment. Vitest
  pins native inert markup/property; TASK-539-08 Playwright proves actual focus and
  activation suppression.
- `pageRendererTimelineGeometry.ts` directly owns
  `PageTimelineItemGeometry`/`resolvePageTimelineItemGeometry`; neither widens the
  stable facade. A single/horizontal timeline item has `axis:null`. Multi-item
  default/compact rows return exact `py-3`/22px and `py-2`/18px geometry, normalized
  `0..120` row gap with existing compact scaling, exact first/later tops and
  non-final/final bottoms, and bridge only real row gaps.
- Divider source remains unchanged and is regression-tested only.
- The stable renderer facade keeps the grounded 12-type plus 29-runtime-value
  manifest. Its L01-owned suite parses the landed explicit facade: it proves the
  exact 12-name type-owner map (owned by `pageRendererV2Contract.ts`) with no extras
  or duplicates, accepts the landed layout where the six composition-root
  components are declared directly and the support-module names come from explicit
  named re-export clauses, rejects default/namespace/export-star forms and
  duplicates, proves exact runtime keys and direct-owner reference identity, and
  keeps task-added replica/timeline internals absent.
- No-effect/no-span/no-background markup stays byte-identical.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-renderer-v2-facade.test.tsx \
  tests/vitest/pages/page-renderer-v2.test.tsx \
  tests/vitest/pages/page-renderer-v2-section-layout.test.tsx \
  tests/vitest/pages/page-renderer-v2-blocks.test.tsx \
  tests/vitest/pages/page-renderer-v2-data-binding.test.tsx \
  tests/vitest/pages/page-renderer-v2-effects.test.tsx \
  tests/vitest/pages/page-renderer-v2-svg.test.tsx \
  tests/vitest/pages/page-renderer-v2-composition.test.tsx \
  tests/vitest/pages/page-renderer-timeline-geometry.test.ts \
  tests/vitest/pages/task-534-interactivity-render.test.tsx \
  tests/vitest/pages/task-539-renderer-effects-and-geometry.test.tsx
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```
