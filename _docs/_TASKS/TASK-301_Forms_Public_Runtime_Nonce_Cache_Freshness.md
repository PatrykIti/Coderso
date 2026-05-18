# TASK-301: Forms Public Runtime Nonce Cache Freshness

# FileName: TASK-301_Forms_Public_Runtime_Nonce_Cache_Freshness.md

**Priority:** High
**Category:** Forms + Runtime + Site Cache + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-261-02-03, TASK-269-05, TASK-276-02
**Status:** To Do

---

## Overview

Repair the shared public runtime cache policy for widgets that hydrate
Forms-backed `submissionNonce` values at render time.

`TASK-261-02-03` confirmed that `publicSite.tsx` can now hydrate Contact with a
real Forms runtime bridge, but the final HTML is still cached by public path.
That means Forms-backed widgets can serve stale `__nl_form_nonce` values after
cache reuse, which is a shared Forms/runtime/site-cache problem rather than a
Contact-local bug. This task owns the shared fix.

## Scope Boundary

This task owns:

- public page cache policy for runtime-hydrated Forms widgets that inject
  `submissionNonce`
- shared nonce freshness behavior for Form Embed, Contact, and any future
  Forms-backed public widget that reuses `resolveFormRuntimeData()`
- focused runtime tests that prove cached public HTML does not reuse expired or
  stale nonce markup

This task does not own:

- Contact-, Newsletter-, or Form Embed-specific editor UX
- public route payload validation, CAPTCHA policy, or action routing changes
- widget-local field mapping or section-layout behavior

## Sub-Tasks

- [ ] Audit every current public widget/runtime owner that serializes
  `resolved.submissionNonce` into cached HTML.
- [ ] Choose a single shared cache strategy:
  - bypass site HTML caching when a page contains Forms runtime nonce data, or
  - strip nonce-bearing widgets from cached HTML and inject fresh runtime data
    per request through an approved shared seam.
- [ ] Keep the solution shared across Form Embed, Contact, and future
  Forms-backed public widgets; do not add widget-local cache exceptions.
- [ ] Add runtime coverage that proves cached pages do not reuse stale nonce
  markup.
- [ ] Re-run route/security suites only if the shared nonce/access contract
  changes beyond cache freshness.

## Files to Change

| File | Required change |
|---|---|
| `core/server/publicSite.tsx` | Apply the shared cache policy for pages that hydrate Forms runtime nonce data. |
| `core/site/cache/siteCache.ts` | Update cache keys/bypass rules only if the shared solution requires cache-level awareness. |
| `core/widgets/core/formEmbed.tsx` | Consume the shared result only if runtime metadata shape changes. |
| `core/widgets/core/contact.tsx` | Consume the shared result only if runtime metadata shape changes. |
| `core/widgets/core/newsletter.tsx` | Touch only if this widget reuses the shared nonce-bearing Forms runtime seam. |
| `tests/integration/runtime/pages-runtime.test.ts` | Add shared cache/nonces runtime proof. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Re-run/update if widget runtime metadata shape changes. |
| `tests/vitest/widgets/contact.test.tsx` | Re-run/update if widget runtime metadata shape changes. |
| `tests/security/codersoSecurityGate.test.ts` | Re-run/update if nonce lifecycle or access semantics change. |

## Implementation Pseudocode

```ts
function pageUsesFormsRuntimeNonce(blocks: WidgetBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type === "form-embed") return Boolean(block.data?.resolved?.submissionNonce);
    if (block.type === "contact") return Boolean(block.data?.resolved?.submissionNonce);
    if (block.type === "newsletter") return Boolean(block.data?.resolved?.submissionNonce);
    return false;
  });
}

async function resolvePublicPageResponse(page: PublicPageData, request: Request) {
  const hydratedBlocks = await hydrateRuntimeBlocks(page.blocks, request);
  if (pageUsesFormsRuntimeNonce(hydratedBlocks)) {
    return renderWithoutSiteHtmlCache(hydratedBlocks);
  }
  return renderWithNormalSiteHtmlCache(hydratedBlocks);
}
```

Error handling:

- If the shared fix cannot keep nonce freshness for a cached page, fail closed
  by bypassing HTML cache for that request path rather than serving stale
  nonce-bearing markup.
- Do not move nonce generation into widget JSON or browser storage.
- Preserve existing public route/security contracts; this task changes freshness,
  not permission semantics.

## Security Contract

This task affects shared public-write hardening through runtime cache behavior.

- Endpoint visibility: unchanged; existing `POST /forms/:id/submissions`
  remains the public write path.
- Auth model: unchanged; public mode keeps nonce/CAPTCHA/access evaluation,
  internal mode remains session/API-key scoped.
- CSRF: unchanged; public Forms writes continue to use the existing HMAC nonce
  instead of CSRF.
- Rate-limit bucket: unchanged; the shared Forms public-write bucket remains in
  place.
- Reject-unknown validation: unchanged unless route payload shape changes, which
  this task should avoid.
- Anti-abuse: nonce freshness must improve without exposing nonce secrets or
  moving security policy into widget-local data.

## Testing Requirements

- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx` when
  runtime widget metadata changes
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx` when runtime
  widget metadata changes
- `bun test tests/security/codersoSecurityGate.test.ts` when nonce/access
  behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when complete
- widget source-of-truth docs only if the shared runtime contract seen by users
  changes

## Changelog Policy

- Add a changelog entry before moving this task to `Done`.

## Acceptance Criteria

- Public pages do not serve stale `submissionNonce` values from cached HTML for
  Forms-backed widgets.
- The fix is shared across current Forms-backed public widgets, not patched
  widget-by-widget.
- Runtime/security proof demonstrates the new cache policy under the real
  public render path.
