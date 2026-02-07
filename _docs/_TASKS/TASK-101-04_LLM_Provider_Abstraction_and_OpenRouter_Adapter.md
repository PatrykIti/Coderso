# TASK-101-04: LLM Provider Abstraction and OpenRouter Adapter
# FileName: TASK-101-04_LLM_Provider_Abstraction_and_OpenRouter_Adapter.md

**Priority:** Medium  
**Category:** Core/Assistant + Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-01, TASK-101-03, TASK-042  
**Status:** To Do

---

## Overview

Dodajemy opcjonalny tryb `llm-rag` przez warstwe provider abstraction.
Pierwsza implementacja: OpenRouter.

Zasada: LLM nigdy nie dziala bez retrieval snippets z docs.

---

## Provider Contract

```ts
type AssistantProviderRequest = {
  systemPrompt: string;
  userMessage: string;
  snippets: Array<{ path: string; heading: string; content: string }>;
  limits: {
    maxInputTokens: number;
    maxOutputTokens: number;
    timeoutMs: number;
  };
};

type AssistantProviderResponse = {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  providerRequestId?: string;
};
```

---

## OpenRouter Requirements

- API key z settings/secrets, nie z frontendu.
- Model konfigurujacy z settings, np. `gemma-3n-2b`.
- Guardrails:
  - max token caps,
  - timeout,
  - retries (max 1),
  - fallback do `docs-only` przy bledzie.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/assistant/providers/providerTypes.ts` | new | provider interface |
| `core/services/assistant/providers/openRouterProvider.ts` | new | OpenRouter adapter |
| `core/services/assistant/providers/index.ts` | new | provider resolver |
| `core/services/assistant/assistantService.ts` | update | llm-rag path + fallback |
| `core/services/assistant/providers/openRouterProvider.test.ts` | new | adapter tests |
| `core/services/assistant/assistantService.test.ts` | update | llm fallback tests |

---

## Safety Rules

1. Prompt template wymusza cytowanie zrodel.
2. Odpowiedz bez zrodel -> oznacz `confidence` low + fallback hint.
3. Brak klucza providera -> natychmiast fallback `docs-only`.
4. Provider errors logowane bez wycieku klucza/token payloadu.

---

## Testing Requirements

- Unit: provider maps request/response correctly.
- Unit: timeout and non-200 response handled.
- Unit: fallback path invoked when provider fails.
- Integration (mock): llm-rag returns answer + sources + usage.

---

## Documentation Updates Required

- `_docs/INTEGRATIONS.md` (OpenRouter config)
- `_docs/SECURITY_SPEC.md` (secret handling + redaction)
- `_docs/CMS_API.md` (chat response fields: usage/provider)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-openrouter-adapter.md`
