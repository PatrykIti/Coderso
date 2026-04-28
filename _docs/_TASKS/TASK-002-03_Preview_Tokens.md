# TASK-002-03: Preview Tokens & TTL
# FileName: TASK-002-03_Preview_Tokens.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-01  
**Status:** Done (2026-01-28)  

---

## Overview

Implement preview token creation and validation. The token is used by the Page Editor "Preview" action to open a public preview link without publishing.

**UI Alignment:**
- Page Editor "Preview" button should call `POST /pages/:id/preview`.
- The response should include `previewUrl` and `expiresAt`.

**Base URL note:** Preview URL uses `PUBLIC_BASE_URL` (ENV) as fallback.
Docelowo ma korzystac z `site.baseUrl` w settings (TASK-100).

---

## Architecture

```
core/services/pages/previewService.ts
core/db/schema.ts
```

---

## Token Rules

- Tokens are random UUIDs (or crypto random bytes) returned **once**.
- Only a **hash** is stored in DB (`sha256`).
- Tokens expire after TTL (default 60 min).
- Optional: one-time usage flag (v1.1).

---

## Service API

```ts
export type PreviewToken = {
  id: string;
  targetType: "page";
  targetId: string;
  tokenHash: string;
  expiresAt: Date;
};

export async function createPreviewToken(input: {
  targetType: "page";
  targetId: string;
  ttlMinutes?: number;
}): Promise<{ token: string; expiresAt: Date }> {}

export async function validatePreviewToken(token: string): Promise<PreviewToken | null> {}

export async function purgeExpiredPreviewTokens(): Promise<void> {}
```

---

## Mock Response (for UI)

```json
{
  "token": "pvw_01hzz6m3f0k5m3s6xj0q",
  "previewUrl": "https://example.com/preview?pageId=page_home&token=pvw_01hzz6m3f0k5m3s6xj0q",
  "expiresAt": "2026-01-28T14:00:00Z"
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/pages/previewService.ts` | create/validate/purge tokens | hash + TTL |
| `core/db/schema.ts` | ensure preview_tokens exists | created in TASK-002-01 |

---

## Testing Requirements

- `tests/unit/pages/previewService.test.ts`
  - create token returns raw token (hash stored)
  - validateToken returns row for valid token
  - validateToken returns null for expired token

**Extra:** verify `expiresAt` honors custom TTL.

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (token format + TTL)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
