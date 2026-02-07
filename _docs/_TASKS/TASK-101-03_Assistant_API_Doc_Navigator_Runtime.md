# TASK-101-03: Assistant API (Doc Navigator Runtime)
# FileName: TASK-101-03_Assistant_API_Doc_Navigator_Runtime.md

**Priority:** High  
**Category:** Core/API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-02, TASK-004-05  
**Status:** To Do

---

## Overview

Wystawiamy API dla asystenta w trybie `docs-only`:
- endpoint chat,
- endpoint status,
- endpoint reindex.

API ma byc deterministyczne, bez odpalania LLM.

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

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/assistantRoutes.ts` | new | status/reindex/chat |
| `core/server/routes/index.ts` | update | register assistant routes |
| `core/services/assistant/assistantService.ts` | new | orchestrates docs retrieval |
| `core/services/assistant/assistantService.test.ts` | new | docs-only runtime tests |
| `tests/integration/routes/assistant.test.ts` | new | auth + payload + response contract |

---

## Security & RBAC

- Wymagane uprawnienie: `settings:read` dla status/chat, `settings:update` dla reindex.
- Limity request body size i message length.
- Sanitization: strip control chars / block prompt-injection style payload markers.

---

## Error Handling

- `assistant_disabled`
- `assistant_index_missing`
- `assistant_reindex_failed`
- `assistant_rate_limited`

Kazdy error zwraca `code`, `message`, `requestId`.

---

## Testing Requirements

- Integration: authenticated user gets 200.
- Integration: unauthorized user gets 403.
- Unit: empty message -> 400.
- Unit: mode mismatch when llm disabled -> fallback docs-only.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (assistant routes + contracts)
- `_docs/SECURITY_SPEC.md` (RBAC and limits)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-api-doc-navigator-runtime.md`
