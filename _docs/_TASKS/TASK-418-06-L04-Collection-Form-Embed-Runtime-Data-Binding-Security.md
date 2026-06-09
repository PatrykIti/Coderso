# TASK-418-06-L04: Collection Form Embed Runtime Data Binding Security
# FileName: TASK-418-06-L04-Collection-Form-Embed-Runtime-Data-Binding-Security.md

**Parent Subtask:** TASK-418-06
**Priority:** High
**Category:** Pages / Runtime / Security
**Estimated Effort:** Large
**Dependencies:** TASK-418-06-L01, TASK-418-02-L04
**Status:** ⏳ To Do

---

## Overview

Implement or explicitly gate the security-sensitive public runtime binding for
`collection`, `form`, and `embed` Page blocks. These block types cannot become
insertable or assistant-emittable until public rendering proves scoped reads,
safe fallbacks, sanitizer behavior, and no anonymous leakage for protected
content.

---

## Implementation Pseudocode

```ts
type PageRuntimeDataBindingDeps = {
  resolvePublishedCollectionItems: (query: CollectionQuery) => Promise<CollectionResult>;
  resolvePublishedForm: (formId: string) => Promise<PublishedForm | null>;
  sanitizeEmbedHtml: (html: string) => SanitizedHtml;
  isPubliclyVisible: (resource: RuntimeResource, context: PageRuntimeContext) => boolean;
};

async function resolveDataBoundPageBlock(block, context, deps) {
  if (block.type === "collection") {
    const result = await deps.resolvePublishedCollectionItems(buildCollectionQuery(block.props));
    return filterVisibleResources(result.items, context, deps.isPubliclyVisible);
  }
  if (block.type === "form") {
    const form = await deps.resolvePublishedForm(readText(block.props.formId));
    return form && deps.isPubliclyVisible(form, context) ? form : null;
  }
  if (block.type === "embed") {
    return deps.sanitizeEmbedHtml(readText(block.props.html));
  }
  return null;
}

function assertDataBoundBlockCapability(blockType, capability) {
  if (["collection", "form", "embed"].includes(blockType)) {
    assert(capability.runtimeRenderer === "real");
    assert(capability.publicDataBinding === "scoped-read-only");
  }
}
```

Expected data flow:

- Capability metadata keeps `collection`, `form`, and `embed` hidden from
  inserter/assistant until this leaf lands.
- Runtime data resolvers read only published/authorized resources.
- Public rendering receives sanitized, bounded DTOs rather than raw database
  records or unsafe HTML.
- Preview can use draft context only through existing preview-token boundaries.

Error handling:

- Missing collection/form resources render bounded empty states without leaking
  identifiers or internal errors.
- Unauthorized or `authOnly` resources are omitted for anonymous users.
- Unsafe embed URLs/HTML are rejected or sanitized before render.

Regression-test shape:

- Anonymous public render cannot see protected/auth-only collection entries.
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

The abstract `deps` above map to EXISTING runtime helpers — bind to these instead
of building new primitives (keeps the resolver Bun-free via injected `deps`, per
`AGENTS.md`; mirror the `ContentListListingRuntimeDeps` pattern at
`core/services/content/contentListResolver.ts:67-83`):

- **collection** → reuse `resolveContentListRuntimeData`
  (`core/services/content/contentListResolver.ts:858-961`). On the public path
  pass `preview:false` so `matchStatusScope` (`:260-270`) yields
  `status === "published" && Boolean(publishedAt)` and `includeDrafts:false` is
  forced (`:582-592`). Do NOT reimplement listing/legacy modes, status scoping,
  or image resolution.
- **form** → reuse `resolveFormRuntimeData(formId, { preview })`
  (`core/services/forms/formRuntimeResolver.ts:46-123`), exactly as the
  `form-embed`/`contact`/`newsletter` widgets already do
  (`core/server/publicSite.tsx:403-483`). It fail-closes: `form_unpublished`
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

**Enforcement gap this leaf MUST close (verified):** the runtime currently honors
only `block.visibility.visible` (`core/site/pageRuntimeV2.tsx:156`) and
`section.visibility.visible` (`:264`) and **ignores `authOnly`, `startsAt`,
`endsAt`** (`core/services/pages/pageDocumentV2.ts:118-122,131`). Because public
render is anonymous, the binding/gating pass MUST treat `authOnly:true` as
not-authorized and **omit the section/block entirely (no markup, no resolver
call, no fetch)**, and evaluate `startsAt`/`endsAt` against the render clock —
**before** any data fetch, so auth-only collections never query the DB on the
public path. Published-page gating already lives at `publicSite.tsx:1465-1467`
with the `public_read` bucket (`:1250-1257`); preview keeps the existing
`previewService.validatePreviewToken` boundary and may pass `preview:true`.
Failure mode = **fail-closed inert** (empty, styled-neutral, no leaked
error/stack/internal ids); never serialize raw entry `data`, secrets, or
provider keys (preserve `_docs/SECURITY_SPEC.md` redaction).

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
