# TASK-101-03: Assistant API (Doc Navigator Runtime)
# FileName: TASK-101-03_Assistant_API_Doc_Navigator_Runtime.md

**Priority:** High  
**Category:** Core/API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-02, TASK-004-05  
**Status:** Done (2026-02-09)

---

## Overview

Wystawiamy API dla asystenta w trybie `docs-only`:
- endpoint chat,
- endpoint status,
- endpoint reindex.

API ma byc deterministyczne, bez odpalania LLM.
API ma byc backend-agnostic dla docs retrieval (`filesystem` teraz, `db` po TASK-101-08).

---

## Endpoints

- `GET /admin/api/assistant/status`
- `POST /admin/api/assistant/reindex`
- `POST /admin/api/assistant/chat`

### Chat request

```json
{
  "message": "gdzie sa opcje hero widget?",
  "mode": "docs-only",
  "context": {
    "page": "widgets/templates",
    "locale": "pl"
  }
}
```

### Chat response

```json
{
  "mode": "docs-only",
  "retrievalBackend": "filesystem",
  "answer": "Opcje Hero znajdziesz w ...",
  "confidence": 0.86,
  "sources": [
    {
      "path": "_docs/_WIDGETS/HERO.md",
      "heading": "Visual",
      "lineStart": 20,
      "lineEnd": 60
    }
  ],
  "fallbackUsed": false
}
```

### Status response (minimum)

```json
{
  "enabled": true,
  "retrievalBackend": "filesystem",
  "indexReady": true,
  "lastReindexAt": "2026-02-09T20:00:00.000Z"
}
```

After `TASK-101-08`, status is extended with DB ingest run details.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/assistantRoutes.ts` | new | status/reindex/chat |
| `core/server/routes/index.ts` | update | register assistant routes |
| `core/services/assistant/assistantService.ts` | new | orchestrates docs retrieval via backend selector |
| `tests/unit/assistant/assistantService.test.ts` | new | docs-only runtime tests |
| `tests/integration/routes/assistant.test.ts` | new | auth + payload + response contract |
| `core/server/httpServer.ts` | update | optional docs reindex on boot initialization |

---

## Security & RBAC

- Wymagane uprawnienie: `settings:read` dla status/chat, `settings:write` dla reindex.
- Message length limit: max 2000 chars.
- Sanitization: strip control chars / block prompt-injection style payload markers.

---

## Error Handling

- `assistant_disabled`
- `assistant_index_missing`
- `assistant_reindex_failed`
- `assistant_message_invalid`

Kazdy error zwraca `code`, `message`, `requestId`.

---

## Testing Requirements

- Route integration: endpoints are registered and request payload is passed to service.
- Route integration: service errors are mapped to `ApiError` with `requestId`.
- Unit: mode mismatch when llm disabled -> fallback docs-only.
- Unit: disabled assistant rejects chat/reindex calls.
- Unit: invalid message markers are rejected.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (assistant routes + contracts)
- `_docs/SECURITY_SPEC.md` (RBAC and limits)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-api-doc-navigator-runtime.md`
