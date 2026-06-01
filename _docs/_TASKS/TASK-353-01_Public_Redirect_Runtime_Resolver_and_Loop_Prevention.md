# TASK-353-01: Public Redirect Runtime Resolver and Loop Prevention
# FileName: TASK-353-01_Public_Redirect_Runtime_Resolver_and_Loop_Prevention.md

**Priority:** High
**Category:** Redirects + Public Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-353
**Status:** To Do

---

## Overview

Make enabled admin redirects execute on public requests. The report created a
301 redirect row, but requesting the public source path returned 404 and stayed
on the source URL.

## Sub-Tasks

- Add a public-safe redirect resolver in the redirect service.
- Normalize request paths before page/content resolution.
- Check enabled redirects before public page/content lookup.
- Return correct HTTP status code and `Location` header for 301/302/307/308.
- Prevent source-to-self loops and bounded redirect chains.
- Decide allowed destination policy for internal vs external URLs.
- Ensure redirect lookup does not intercept admin, API, media, site assets,
  preview, booking public API, or public search paths incorrectly.

## Files To Change

| File | Required change |
|---|---|
| `core/services/redirects/redirectService.ts` | Add `resolvePublicRedirect` with normalization, enabled filter, visited-set/max-hop loop validation, and destination policy helpers. |
| `core/server/publicSite.tsx` | Call redirect resolver before content/page resolution and return `Response.redirect` or explicit Response with status. |
| `core/server/httpServer.ts` | Touch only if redirect must sit before media/admin routing; default should stay inside public site handling. |
| `core/server/validation/redirectSchemas.ts` | Enforce source/destination policy at create/update where possible. |
| `core/server/routes/redirectRoutes.ts` | Map redirect domain errors through `mapRedirectError`. |
| `tests/unit/redirects/redirectService.test.ts` | Cover path normalization, disabled rows, duplicates, loops, destination policy. |
| `tests/integration/runtime/` | Add public runtime redirect tests for status codes and no-match paths. |

## Implementation Pseudocode

```ts
export async function resolvePublicRedirect(pathname: string) {
  const fromPath = normalizePath(pathname);
  const visited = new Set<string>();
  let current = fromPath;

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    if (visited.has(current)) throw new Error("redirect_loop");
    visited.add(current);

    const row = await findEnabledRedirectByFromPath(current);
    if (!row) return current === fromPath ? null : buildRedirectResult(current);

    const toPath = normalizeTarget(row.toPath);
    if (toPath === current) throw new Error("redirect_loop");
    if (isExternalDestination(toPath)) return buildRedirectResult(toPath, row.statusCode);

    current = normalizePath(toPath);
  }

  throw new Error("redirect_loop");
}

function buildRedirectResult(location: string, statusCode = 301) {
  return {
    statusCode: normalizeStatusCode(statusCode),
    location,
  };
}

export async function handlePublicRequest(req: Request) {
  // after public API/assets exclusions and before content route/page lookup
  const redirect = await resolvePublicRedirect(url.pathname);
  if (redirect) return Response.redirect(new URL(redirect.location, url).toString(), redirect.statusCode);
}
```

Data flow:

- Admin route persists row.
- Public request normalizes path and resolves enabled redirect.
- Public runtime returns redirect before page/content 404.

Error handling:

- Disabled redirect rows are ignored.
- Self-redirect and chain loops (`A -> B -> A`) fail closed with no redirect or
  a safe 508/500 policy documented in tests.
- Long non-loop chains are bounded by `MAX_REDIRECT_HOPS`.
- Unsafe external destinations are rejected at create/update or ignored at
  runtime according to product policy.
- Route/service errors map through `mapRedirectError`.

Regression-test shape:

- Seed 301/302/307/308 rows and assert public response status/location.
- Assert disabled row falls through to page/content/404.
- Assert `A -> B -> A`, `A -> B -> C`, disabled intermediates, max-hop
  exhaustion, and external destination policy.
- Assert `/admin`, `/admin/api`, `/media`, `/site/assets`, `/preview`, and
  `/api/search` are not shadowed unexpectedly.
- Assert self-loop does not redirect endlessly.

## Security Contract

- Endpoint visibility: public read behavior only; no new public write.
- Auth model: none for public redirect lookup.
- RBAC/CSRF: not applicable to public read lookup; admin CRUD unchanged.
- Rate-limit bucket: `public_read`.
- Reject-unknown validation: create/update must validate safe source/status and
  destination policy before rows can execute publicly.
- Anti-abuse: no nonce/HMAC/reCAPTCHA because no public write is added.
- Open redirect policy: external destinations must be explicitly allowed and
  tested, or rejected.

## Testing Requirements

- `bun test tests/unit/redirects/redirectService.test.ts`
- Targeted Bun runtime public redirect tests
- `bun test tests/integration/routes/redirects.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Redirects report with public runtime behavior.
- Update `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, and
  `_docs/SECURITY_SPEC.md` with runtime execution, loop, and open-redirect
  policy.
- Update security/user docs if external destination policy is documented.

## Acceptance Criteria

- Public requests to enabled redirect sources return the configured status and
  destination.
- Disabled/no-match/loop paths are safe.
- Public redirect lookup does not shadow admin/API/media/asset routes.
- Chain loops and unsafe destination policies are enforced and route-mapped.
