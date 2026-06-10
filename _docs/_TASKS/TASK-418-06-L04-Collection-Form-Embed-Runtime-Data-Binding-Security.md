# TASK-418-06-L04: Collection Form Embed Runtime Data Binding Security
# FileName: TASK-418-06-L04-Collection-Form-Embed-Runtime-Data-Binding-Security.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Runtime / Security
**Estimated Effort:** Large
**Dependencies:** TASK-418-06-L01, TASK-418-02-L04
**Status:** ✅ Done
**Started:** 2026-06-10
**Completed:** 2026-06-10

---

## Overview

Implement the security-sensitive public runtime binding for `collection`,
`form`, and `embed` Page blocks. These block types must gain real public
runtime rendering and scoped read-only data binding, but they stay hidden from
the editor inserter and assistant emission until a later controls/product leaf
explicitly exposes them.

---

## Implementation Pseudocode

```ts
type PageRuntimeDataBindingDeps = {
  resolveContentListRuntimeData: typeof import("../content/contentListResolver").resolveContentListRuntimeData;
  resolveFormRuntimeData: typeof import("../forms/formRuntimeResolver").resolveFormRuntimeData;
  now: () => Date;
};

async function preparePageV2RuntimeDocument(document, context, deps) {
  const visibleDocument = pruneAnonymousPublicSections(document, {
    preview: context.preview,
    now: deps.now()
  });
  const runtimeDataByBlockId = await resolvePageDataBoundBlocks(visibleDocument, {
    preview: context.preview,
    contentRoutes: context.contentRoutes,
    runtimeSearchParams: context.runtimeSearchParams,
    deps
  });
  return { document: visibleDocument, runtimeDataByBlockId };
}

function pruneAnonymousPublicSections(document, context) {
  return {
    ...document,
    sections: document.sections.filter((section) => {
      if (!section.visibility.visible) return false;
      if (!context.preview && section.visibility.authOnly) return false;
      if (!context.preview && isOutsideSchedule(section.visibility, context.now)) return false;
      return true;
    })
  };
}

async function resolvePageDataBoundBlocks(document, context) {
  for (const block of walkVisibleBlocks(document.sections)) {
    if (block.type === "collection") {
      runtimeDataByBlockId[block.id] = await resolveCollectionBlock(block, context);
    } else if (block.type === "form") {
      runtimeDataByBlockId[block.id] = await resolveFormBlock(block, context);
    } else if (block.type === "embed") {
      runtimeDataByBlockId[block.id] = resolveEmbedBlock(block);
    }
  }
  return runtimeDataByBlockId;
}

function assertDataBoundBlockCapability(blockType, capability) {
  if (["collection", "form", "embed"].includes(blockType)) {
    assert(capability.runtimeRenderer === "real");
    assert(capability.publicDataBinding === "scoped-read-only");
    assert(capability.editorInsertable === false);
    assert(capability.assistantEmittable === false);
  }
}
```

Expected data flow:

- Capability metadata flips `collection`, `form`, and `embed` to
  `runtimeRenderer:"real"` while preserving their existing
  `publicDataBinding:"scoped-read-only"` and keeping `editorInsertable:false`
  and `assistantEmittable:false`. Update stale non-insertable reason strings so
  they no longer claim runtime binding is pending.
- Public Page v2 rendering gains an async data-resolution seam before the sync
  React renderer; `renderPublicPageV2RuntimeHtml` should receive a normalized
  document plus bounded `runtimeDataByBlockId` DTOs rather than doing DB reads.
- Runtime data resolvers read only published/authorized resources.
- Public rendering receives sanitized, bounded DTOs rather than raw database
  records or unsafe HTML.
- Preview can render scheduled/auth-only sections and use draft context only
  through existing preview-token boundaries.

Error handling:

- Missing collection/form resources render bounded empty states without leaking
  identifiers or internal errors.
- Unauthorized or `authOnly` sections are omitted for anonymous users before any
  data-bound block resolver runs.
- Unsafe embed URLs/HTML are rejected or sanitized before render.

Regression-test shape:

- Anonymous public render cannot see protected/auth-only sections or collection
  output from those sections, and resolver spies prove no fetch happens.
- Missing form id renders a safe fallback and no stack trace.
- Unsafe embed HTML/URLs are rejected or sanitized.
- Capability tests fail if these blocks are insertable/emittable without real
  scoped public binding.

---

## Security Contract

- **Endpoint visibility:** no new public write endpoint. Public page rendering
  remains read-only; any form submission still uses the existing public forms
  route family and its own protections.
- **Auth model:** public read context for published pages; preview token context
  for draft preview; admin session is not available in public rendering.
- **RBAC:** public render may only read published/authorized resources. Protected
  content and `authOnly` resources must not leak to anonymous users.
- **CSRF:** not applicable to read-only public rendering; embedded form
  submission must preserve the existing forms CSRF/nonce/captcha contract.
- **Rate-limit bucket:** existing public render and forms buckets; no bypass for
  embed/form/collection blocks.
- **Validation:** strict reject-unknown Page block props; data-binding DTOs are
  schema-normalized before render.
- **Anti-abuse controls:** bounded query limits, unsafe URL/HTML rejection,
  sanitizer enforcement, no raw errors, no public mutation through embed or
  collection rendering.

---

## Concrete Reuse Map And Enforcement Gap (Merged From TASK-419 Audit)

The async runtime pre-pass must bind to EXISTING runtime helpers instead of
building new primitives:

- **collection** → reuse `resolveContentListRuntimeData`
  (`core/services/content/contentListResolver.ts:858-961`). On the public path
  pass `preview:false` so `matchStatusScope` (`:260-270`) yields
  `status === "published" && Boolean(publishedAt)` and `includeDrafts:false` is
  forced (`:582-592`). Do NOT reimplement listing/legacy modes, status scoping,
  or image resolution.
- **form** → reuse `resolveFormRuntimeData(formId, { preview })`
  (`core/services/forms/formRuntimeResolver.ts:46-123`). It fail-closes:
  `form_unpublished`
  (`:69-87`) and `public_submission_disabled` (`:91-106`) — surface these as a
  safe inert state and never leak field definitions for a non-public form. Reuse
  its `submissionNonce`/`botProtection` projection; introduce no new write route.
- **embed** → sanitize `embed.html` via `sanitizeHtmlWithPolicy` +
  `dangerousHtmlContentTagSet`
  (`core/services/posts/editor/postRichTextHtmlUtils.ts:12-19,162`); validate
  `embed.url` as `http:`/`https:` only and resolve providers via the existing
  `parseYoutubeVideoId`/`toYoutubeEmbedUrl` helpers
  (`core/services/posts/shared/videoEmbed.ts:2,19-51`); render an `<iframe>` only
  for allowlisted hosts, reusing the hardened attribute set from
  `core/services/posts/.../postBlockRuntimeRenderer.tsx:537-545`
  (`referrerPolicy="strict-origin-when-cross-origin"`, scoped `allow`,
  `loading="lazy"`). Inject sanitized HTML via `dangerouslySetInnerHTML` ONLY
  after policy sanitization.

**Enforcement gap this leaf MUST close (verified):** the runtime currently uses
a sync path: `renderPublicPageV2RuntimeHtml`
(`core/site/renderPublicPage.tsx:296`) → `DefaultRuntimePageShellV2`
(`core/site/pageRuntimeV2.tsx:12`) → `renderPageBlockContent`
(`core/services/pages/pageRendererV2.tsx:611-736`). It emits inert collection,
form, and embed states at `pageRendererV2.tsx:720-730` and honors only
`visibility.visible` in the renderer (`pageRendererV2.tsx:619,739,769,804,837`).
`PageSectionVisibilityV2` owns `authOnly`, `startsAt`, and `endsAt`
(`core/services/pages/pageDocumentV2.ts:139-145`), while `PageBlockVisibilityV2`
only has `visible` (`pageDocumentV2.ts:168-170`). Therefore L04 must implement
section-level public gating only; do not extend block visibility in this leaf.

Because public render is anonymous, the async pre-pass MUST treat
`section.visibility.authOnly === true` as not-authorized and omit the section
entirely (no markup, no resolver call, no fetch), and evaluate
`startsAt`/`endsAt` against the render clock before any data fetch. Preview keeps
the existing `previewService.validatePreviewToken` boundary and may pass
`preview:true`. Failure mode = **fail-closed inert** (empty, styled-neutral, no
leaked error/stack/internal ids); never serialize raw entry `data`, secrets, or
provider keys.

`ContentListBlock` may be reused for collection markup as a deliberate shared
runtime UI dependency, or wrapped by a small Page-owned adapter if the
implementation needs a stricter layer boundary. In either case, block props are
mapped through `normalizeContentListData` into `ContentListData`:
`queryId` selects listing mode, `templateId` is the optional listing template,
absent `queryId` falls back to legacy `contentTypeId` mode, and public rendering
keeps `statusScope:"published"`.

Embed has two safe output paths:

- provider iframe for allowlisted providers such as YouTube, built from
  `toYoutubeEmbedUrl` and hardened iframe attributes;
- sanitized inline HTML through a local `sanitizeHtmlWithPolicy` policy. Because
  `_docs/SECURITY_SPEC.md` currently forbids public `dangerouslySetInnerHTML`,
  this leaf must either update that policy with the sanitized exception or avoid
  inline HTML rendering.

Public Page HTML cacheability must be fixed at the real V2 site:
`renderPublicPageHtmlInternal` currently returns `cacheable:true`
unconditionally (`core/server/publicSite.tsx:805`) and accepts but does not pass
`runtimeSearchParams` through the V2 render call (`publicSite.tsx:767,791-804`).
L04 must thread `runtimeSearchParams` into the V2 pre-pass and either reuse the
existing `blocksAllowSiteHtmlCache` gate used by legacy runtime pages
(`publicSite.tsx:1121`) or add an equivalent Page v2 cache decision. If any
bound block depends on runtime search params, form nonce/captcha projection, or
schedule gating, public cache must be disabled or keyed safely for that render.

---

## Testing Requirements

- Bun public runtime tests for published-only collection binding and anonymous
  no-leak behavior.
- Bun/Vitest sanitizer tests for embed block payloads, depending on current
  ownership of the sanitizer module.
- Route/security tests for form embed submission boundaries if form rendering
  changes the public route contract.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
- `_docs/SECURITY_SPEC.md` if embed/form public security policy changes.
- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`

---

## Completion Notes

- Added the Page v2 async runtime pre-pass in
  `pageRuntimeDataBinding.ts`, wired it through `publicSite.tsx`, and kept
  `renderPublicPageV2RuntimeHtml` synchronous by passing a normalized document
  plus bounded `runtimeDataByBlockId` DTOs.
- Public render now prunes invisible, scheduled-out, and anonymous
  `authOnly` sections before any data-bound resolver is called; preview keeps
  those sections behind the existing preview-token boundary.
- `collection` blocks map Page props to `ContentListData`, keep public
  `statusScope: "published"`, fail closed on missing/invalid resolver input,
  and disable public HTML cache for dynamic output.
- `form` blocks reuse `resolveFormRuntimeData`, preserve nonce/captcha/internal
  submission boundaries, and render bounded unavailable states without exposing
  invalid ids.
- `embed` blocks render only hardened YouTube provider iframes or sanitized
  inline markup through `sanitizePageEmbedHtml`; `_docs/SECURITY_SPEC.md`
  records that narrow Pages embed exception.
- `collection`, `form`, and `embed` capabilities are now
  `runtimeRenderer: "real"` and `publicDataBinding: "scoped-read-only"` while
  remaining not editor-insertable and not assistant-emittable.
- Created follow-up TASK-421 for the floating inspector redesign requested
  during this work; it stays separate from this security/runtime leaf.

## Validation

- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pages/page-runtime-data-binding.test.ts tests/vitest/pages/page-document-v2.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pages/page-runtime-data-binding.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-runtime-capabilities.test.ts tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-template-boundary.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `set -a && { [ ! -f ../.env ] || . ../.env; } && set +a && bun --cwd core lint`
- `set -a && { [ ! -f ../.env ] || . ../.env; } && set +a && bun --cwd core lint:types`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && coderso-dev-core-host`
- `playwright-cli -s=task418-l04-public-runtime open http://127.0.0.1:3000/task-418-l04-smoke-15c5b816`
- `playwright-cli -s=task418-l04-public-runtime run-code --filename .tmp/task-418-l04-public-runtime-smoke.js`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun run gates:coderso`

## Audit Notes

- Claude read-only pre-implementation audit with `--effort xhigh` found real
  drift in the original L04 contract: missing async seam, stale references,
  public visibility gaps, resolver/cache gaps, and embed sanitizer policy
  ambiguity. The task contract was corrected before implementation.
- A fresh Claude read-only follow-up on HEAD
  `99c0fbcd68ce0d5199f6fd88fe49699e7f6e03f8` verified the corrected contract
  and TASK-421 task split before source edits resumed.
