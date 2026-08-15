# _TMP-task-dispatch-plan-2026-08-10.md

Raport dyspozycji tasków po integracji `f6705443` (TASK-414/545/548/554 +
kanoniczny TASK-551). Cel: maksymalna ilość funkcjonalności w tym tygodniu,
równolegle, bez kolizji ownership.

## 1. Stan po integracji

- Branch: `feat/implementations`, HEAD `f6705443` (wypchnięty, origin in sync).
- Worktree 414 usunięty (wszystko przeniesione; stale delty 489/551 nie weszły).
- `_TMP-task-551-db-cache-handoff-2026-07-24.md` usunięty (spełniony, 0 referencji).
- Zostały untracked: `_TMP-task-414-assistant-contract-handoff-2026-08-09.md`,
  `_TMP-task-414-assistant-contract-handoff-2026-08-10.md` (historyczne, do
  decyzji właściciela).

## 2. Łańcuch zależności (co odblokowuje co)

```
TASK-554 (RBAC hardening) ──► TASK-545 (workflow integrity) ──► TASK-551 (DB/cache program)
        │                             │
        │                             ├─► TASK-489 (rewritten) ──► TASK-555 ──► TASK-556
        │                             └─► TASK-548 (docs portal) ──► TASK-414 (Guide/Agent/Designer)
        └─► TASK-555 (gates)
```

## 3. Taski gotowe do ruszenia TERAZ (niezablokowane, kontrakty kompletne)

### Fala 1 — odblokowuje resztę (3 równoległe worktree, disjoint ownership)

| Task | Priorytet | Rozmiar | Changelog | Uwagi |
|---|---|---|---|---|
| **TASK-554** Post Metadata Publish RBAC Hardening | Critical | Small-Medium | 1267 | Samodzielny security fix; kontrakt surviving (fail-closed presence, `content:publish`). Jedyne blokery: brak. Odblokowuje 545 i 555. |
| **TASK-545** Workflow, Smoke Evidence, Task-Graph Integrity | High | Duży | 1257 | Infrastruktura workflow (node --check gates, evidence manifests, manual closeout). Odblokowuje 551/489/555/556/414. Kontrakty świeżo zaudytowane (0 H/M/L). |
| **TASK-548** Hybrid Visual Documentation Platform | High | Duży | 1261 | Widoczna funkcja (docs portal). Seam order: po 554→545 dla 548-02-L02/04-L03/07-L01; 548-01/03/05/06 mogą iść wcześniej równolegle. |

### Fala 1b — samodzielne funkcje „dużo w tygodniu" (Medium, frontend/domain, brak zależności)

| Task | Rozmiar | Uwagi |
|---|---|---|
| **TASK-486** Popups: Public Runtime Delivery & Trigger/Targeting Engine | Large | Admin CRUD DONE (054-12); runtime render + trigger/targeting/frequency brak. 4 subtaski + 11 leaves, wszystkie To Do. Kontrakt kompletny. |
| **TASK-487** Entries: Revision History & Restore | Medium | Brak zależności; revisions pisane, brak UI/restore. |
| **TASK-490** Forms: Submissions Export (CSV/JSON) | Small | Brak zależności; wzorzec analytics CSV istnieje. Szybki win. |
| **TASK-492** Login Alert Delivery (Email + Webhook) | Small | Brak zależności; alerty tylko do audytu. Szybki win. |
| **TASK-488** Commerce: Variant Editor & Collections CRUD UI | Medium | Frontend-only; backend kompletny. |
| **TASK-491** Integrations Runtime Wiring (GA/Slack/Zapier/Sentry) | Medium | Brak zależności; 4/7 integracji to ozdobne store'y. |
| **TASK-478** Page Editor Inline Link And Toolbar Placement UX | Medium | Samodzielny UX fix. |
| **TASK-481** Page Editor Canvas Brand-Token WYSIWYG | Medium | Samodzielny UX fix. |
| **TASK-467** Admin Bundle Heavy Chunk Hardening | Large | Wydajność admina; niezależny od domen. |
| **TASK-493** SEO: Indexing & Search-Performance Pipeline | Large | Zależny od TASK-027 (DONE) + integracje/secretStore (istnieją). |

## 4. Kolejność realizacji w tygodniu (rekomendacja)

1. **Równolegle 3 worktree:**
   - Worktree A: **TASK-554** (szybki win, odblokowuje 545)
   - Worktree B: **TASK-545** (infrastruktura — największy mnożnik)
   - Worktree C: **TASK-486** (popups — duża widoczna funkcja) LUB **TASK-490+492** (2 małe szybkie)
2. Po terminal 554 → do worktree B dołącza **TASK-548** (docs portal).
3. Po terminal 545 → start **TASK-551** (program, nie w tygodniu) i odblokowanie 489/555/556.
4. Taski Medium (487/488/490/491/492/478/481) mogą być robione w dowolnym momencie równolegle — disjoint ownership z Falami 1-2.

## 5. Równoległość — collision guards (disjoint ownership)

| Stream | Główne pliki | Nie koliduje z |
|---|---|---|
| 554 | `postsRoutes.ts`, `postMetadataContract.ts`, `postSchemas.ts`, `postsClient.ts` | wszystko poza 545-04/551-03-L02 (czytanie referencyjne) |
| 545 | `_docs/_workflows/*`, `scripts/runtime-smoke/*`, `tests/unit/workflows/*` | 548-02-L02 (wspólny seam — kolejność: 545-03-L01 przed 548-02-L02) |
| 548 | docs portal, `tests/vitest/dashboard/*`, playwright | 545-03-L01 (seam), 489-03-L02 (dopiero po 548-07-L01) |
| 486 | `core/server/routes/popupsRoutes.ts`(public), `core/site/popupRuntime*`, `formRuntimeScript`-podobny | 054-12 (Done), 551-09 (publicSite adoption — później) |
| 490/492 | `core/services/forms/*`, `core/services/security/*` | — |
| 478/481 | page editor UI | 551-09 (później) |

**Kolejność seam runtime-smoke (obowiązkowa, z reconcile):**
`554 → 545 → 548-02-L02 → 548-04-L03 → 548-07-L01 → 489-03-L02 → 555-07-L02 → 414-11-L01 → 556-04-L02`

## 6. `_docs/_workflows/` — starocie

- **44 pliki .mjs** (task-511…556), tylko 21 plików `_smoke/` tracked; reszta **ignorowana przez .gitignore** (jednorazowe skrypty orchestracyjne).
- **Nie tworzyć nowego taska** — porządkowanie workflow (node --check, evidence manifests, task-graph repair) to zakres **TASK-545**.
- Po 545: opcjonalny follow-up LOW — zarchiwizować jednorazowe skrypty 511-544 (np. `_docs/_workflows/_archive/`). Nie blokuje niczego.

## 7. Pop-upy — korekta wcześniejszej analizy

- TASK-054-12 (popups admin CRUD) — **✅ Done (2026-02-19)** — admin-only, to było zrobione.
- **TASK-486** — Popups: Public Runtime Delivery & Trigger/Targeting Engine — **⏳ To Do, 4 subtaski + 11 leaves** — to jest właściwy task „poprawić runtime caly popups", niezależny, kontrakt kompletny, brak blokerów (zależność 054-12 DONE). **Rekomendowany do natychmiastowego startu.**

## 8. Decyzje właściciela

1. Start 3 worktree (554 / 545 / 486) — potwierdź.
2. Czy usunąć 2 historyczne handoffy 414 (`_TMP-*-2026-08-0*.md`)?
3. Czy taski 490+492 (2 małe) robić jako osobne streamy czy dołączyć do 486?
