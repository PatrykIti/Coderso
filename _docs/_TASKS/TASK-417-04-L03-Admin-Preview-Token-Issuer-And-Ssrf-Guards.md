# TASK-417-04-L03: Admin Preview Token Issuer And SSRF Guards
# FileName: TASK-417-04-L03-Admin-Preview-Token-Issuer-And-Ssrf-Guards.md

**Parent Subtask:** TASK-417-04
**Priority:** High
**Category:** Pages / Preview / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-417-02-L03, TASK-417-04-L02
**Status:** ✅ Done

---

## Overview

Own the admin preview token issuer for Pages v2. `POST /admin/api/pages/:id/preview`
creates a bounded preview token and optional probe metadata; the public
`/preview` route only consumes that token.

---

## Security Contract

- **Endpoint visibility:** internal admin write-like action
  `POST /admin/api/pages/:id/preview` for token issuance; public `/preview`
  remains read-only token consumption.
- **Auth model:** admin session required for token issuance; anonymous public
  preview requires a valid hashed preview token.
- **RBAC:** token issuance requires `content:read`; public token consumption has
  no RBAC but validates token, target type, target id, and TTL.
- **CSRF:** admin preview token issuance must remain behind shared admin CSRF
  protections.
- **Rate-limit bucket:** existing admin bucket for token issuance; existing
  preview/public bucket for token consumption.
- **Validation:** `ttlMinutes` is clamped by schema, `probe` is boolean only,
  and unknown fields are rejected.
- **Anti-abuse controls:** random token stored hashed, bounded TTL, same-origin
  target generation only, SSRF probe restricted to generated preview URL/origin,
  bounded redirects, and token/device values redacted from probe diagnostics.

---

## Sub-Tasks

- [x] Keep `POST /admin/api/pages/:id/preview` route validation and permission
  coverage after Page payload cutover.
- [x] Prove preview token creation does not require or accept arbitrary URLs.
- [x] Prove probe diagnostics redact token and device values.
- [x] Prove preview consumes v2 `currentData` and public pages keep
  `publishedData`.

---

## Implementation Pseudocode

```ts
router.post("/pages/:id/preview", requirePermission("content:read"), async (ctx) => {
  validate(pagePreviewSchema, ctx.body);
  const page = await getPage(ctx.params.id);
  if (!page) throw new PageError("page_not_found");
  const { token, expiresAt } = await createPreviewToken({
    targetType: "page",
    targetId: page.id,
    ttlMinutes: body.ttlMinutes,
  });
  const previewUrl = await resolvePreviewUrl({ targetType: "page", token, path: page.slug }, ctx);
  const probe = body.probe ? await probeGeneratedPreviewUrl(previewUrl, bounds) : undefined;
  return sanitizePreviewTokenResponse({ token, previewUrl, expiresAt, probe });
});
```

Expected data flow:

- Editor saves v2 `currentData` first when needed, then calls preview issuer.
- Preview issuer creates token and returns generated URL only.
- Public preview route resolves token and renders v2 `currentData`.

Error handling:

- Missing page maps to `page_not_found`.
- Invalid preview payload maps to schema validation error.
- Probe failures return sanitized metadata, not raw token-bearing URLs.

Regression-test shape:

- Bun route tests cover permission, validation before service work, TTL clamp,
  token persistence as hash, generated-only URL probing, SSRF bounds, redaction,
  and v2 preview render.

---

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed preview tests when
  `DATABASE_URL` is available.
- Targeted Bun Pages preview route tests.
- Targeted runtime preview tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
