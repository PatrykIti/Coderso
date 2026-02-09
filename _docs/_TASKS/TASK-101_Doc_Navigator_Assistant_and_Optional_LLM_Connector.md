# TASK-101: Doc Navigator Assistant + Optional LLM Connector
# FileName: TASK-101_Doc_Navigator_Assistant_and_Optional_LLM_Connector.md

**Priority:** High  
**Category:** Admin/UI + Core/Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-007, TASK-100, TASK-042  
**Status:** In Progress (Phase A - 2026-02-09, 101-01/02/03 done)

---

## Overview

Wprowadzamy asystenta w Admin UI, ktory domyslnie dziala jako **Doc Navigator**
(bez duzego LLM), a opcjonalnie moze korzystac z zewnetrznego providera LLM
(np. OpenRouter) dla bardziej naturalnych odpowiedzi.

Cel biznesowy:
- uzytkownik szybko znajduje "co gdzie jest" w dokumentacji,
- system dziala stabilnie i tanio (niskie RAM, bez halucynacji) w trybie domyslnym,
- mozliwe jest rozszerzenie o modele zewnetrzne bez przebudowy core.

---

## Product Requirements

1. Domyslny tryb: `docs-only` (Doc Navigator, bez LLM).
2. Odpowiedzi zawsze zawieraja zrodla (sciezka + sekcja dokumentu).
3. Opcjonalny tryb: `llm-rag` z providerem OpenRouter.
4. Uzytkownik moze wlaczyc/wylaczyc asystenta i wybrac tryb.
5. Asystent moze miec opcjonalny avatar 3D (`.glb`) bez wymuszania tej warstwy.
6. Ustawienia i limity musza byc zarzadzalne z Admin UI.

---

## Architecture (Target)

```
core/services/assistant/
  docsIndexService.ts           # filesystem parser + in-memory index (fallback)
  docsRetriever.ts              # in-memory BM25-like retrieval (Phase A)
  docsIngestService.ts          # _docs/_internal -> DB ingest pipeline (Phase A2)
  docsDbRetriever.ts            # DB retrieval/scoring (Phase A2)
  assistantService.ts           # orchestrator odpowiedzi + backend selection
  providers/
    providerTypes.ts            # kontrakty providerow
    openRouterProvider.ts       # adapter OpenRouter

core/server/routes/
  assistantRoutes.ts            # chat/status/reindex endpoints

core/services/settings/
  settingsService.ts            # global assistant settings
core/services/settings/
  userSettingsService.ts        # per-user preferences

core/admin/services/
  assistantClient.ts
core/admin/ui/assistant/
  AssistantPanel.tsx            # chat panel
  AssistantSettingsCard.tsx     # settings UI
  AssistantAvatar.tsx           # opcjonalny render .glb
```

---

## Delivery Strategy

### Phase A: No-LLM foundation (must-have)
- docs indexing + retrieval
- deterministic response templates
- chat endpoint for `docs-only`
- admin chat UI with citations

### Phase A2: Internal docs knowledge base in DB
- dedicated docs source root `_docs/_internal`
- DB schema for docs/chunks/ingest runs
- ingest pipeline with quality validation
- DB-backed retriever with filesystem fallback

### Phase B: Optional LLM mode
- provider abstraction
- OpenRouter adapter
- token/time/budget guards

### Phase C: UX and hardening
- avatar optionalny
- quotas, observability, security
- rollout + docs

---

## Sub-Tasks (Detailed)

- `TASK-101-01_Assistant_Settings_and_Data_Model.md`
- `TASK-101-02_Documentation_Index_and_Retrieval_Engine.md`
- `TASK-101-03_Assistant_API_Doc_Navigator_Runtime.md`
- `TASK-101-04_LLM_Provider_Abstraction_and_OpenRouter_Adapter.md`
- `TASK-101-05_Admin_UI_Assistant_Chat_and_Modes.md`
- `TASK-101-06_Assistant_Avatar_Rendering_and_Preferences.md`
- `TASK-101-07_Assistant_Security_Quotas_Observability_and_Hardening.md`
- `TASK-101-08_Internal_Docs_KB_Schema_Ingest_and_DB_Retrieval.md`

---

## Acceptance Criteria

1. Uzytkownik otrzymuje poprawne odpowiedzi "gdzie to jest" bez LLM.
2. Odpowiedzi zawieraja minimum 1 zrodlo dokumentacji.
3. Tryb `llm-rag` mozna wlaczyc globalnie i per user.
4. Przy bledzie providera LLM fallback wraca do `docs-only`.
5. Admin UI ma czytelny panel czatu i ustawien asystenta.
6. Opcjonalny avatar nie degraduje dzialania panelu bez WebGL.

---

## Testing Requirements

- Unit: indexer/retriever/ranking/templating
- Unit: provider adapter contracts + fallback rules
- Integration: API endpoints (`docs-only`, `llm-rag`)
- UI: chat flow, mode switch, citations, error states
- Security: permissions + rate limits + prompt sanitization rules

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` (assistant architecture)
- `_docs/CMS_API.md` (assistant endpoints)
- `_docs/SETTINGS.md` (new assistant keys)
- `_docs/SECURITY_SPEC.md` (quotas/rate limits/provider secrets)
- `_docs/WIDGETS.md` tylko jesli assistant panel bedzie osadzany jako widget

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-doc-navigator-and-optional-llm-connector.md`
