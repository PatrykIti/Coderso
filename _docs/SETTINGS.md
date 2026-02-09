# Settings Matrix (Core)

Dokument zbiera klucze `settings` i ich znaczenie dla runtime/admin UI.

## Assistant settings (`settings`)

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `assistant.enabled` | `boolean` | `false` | Globalny toggle asystenta w Admin UI |
| `assistant.defaultMode` | `"docs-only" \| "llm-rag"` | `"docs-only"` | Domyslny tryb odpowiedzi |
| `assistant.docs.paths` | `string[]` | `["_docs"]` | Sciezki dokumentacji indeksowane przez Doc Navigator |
| `assistant.docs.reindexOnBoot` | `boolean` | `false` | Czy wykonywac reindex przy starcie |
| `assistant.llm.enabled` | `boolean` | `false` | Wlacza sciezke LLM |
| `assistant.llm.provider` | `"openrouter" \| "none"` | `"none"` | Provider LLM |
| `assistant.llm.model` | `string` | `"google/gemma-3n-e2b-it:free"` | Id modelu providera |
| `assistant.llm.maxInputTokens` | `number` | `8192` | Limit wejscia dla zapytan |
| `assistant.llm.maxOutputTokens` | `number` | `2048` | Limit wyjscia odpowiedzi |
| `assistant.llm.timeoutMs` | `number` | `20000` | Timeout requestu LLM |
| `assistant.quotas.requestsPerMinute` | `number` | `20` | Soft quota/min |
| `assistant.quotas.requestsPerDay` | `number` | `1000` | Soft quota/day |

## Assistant user settings (`user_settings`)

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `assistant.mode` | `"docs-only" \| "llm-rag" \| null` | `null` | Per-user override trybu |
| `assistant.ui.enabled` | `boolean` | `true` | Widocznosc UI asystenta |
| `assistant.ui.avatarEnabled` | `boolean` | `false` | Toggle avatara |
| `assistant.ui.avatarAsset` | `string \| null` | `null` | Asset id/url avatara |

## Validation invariants

- `assistant.defaultMode="llm-rag"` wymaga:
  - `assistant.llm.enabled=true`
  - `assistant.llm.provider != "none"`
- `assistant.enabled=true` wymaga niepustego `assistant.docs.paths`.
- Limity liczbowe (`tokens`, `timeout`, `quotas`) musza byc dodatnimi integerami.
