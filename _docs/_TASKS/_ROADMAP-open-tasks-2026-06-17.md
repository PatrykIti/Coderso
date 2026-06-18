> Wygenerowano 2026-06-17 wielo-agentowym przeglądem WSZYSTKICH otwartych tasków boardu
> (57 To Do + 9 In Progress) na ten dzień — ocena realnego stanu/zależności/ryzyka per rodzina
> + synteza. Zastępuje nieaktualny `_TMP_KOLEJNOSC_TASKOW_420-453_2026-06-11.md` (program
> Pages Editor V2 / TASK-420..453 jest już CLOSED). Plik planistyczny — odświeżyć po domknięciu Fazy A.

# Roadmap otwartych programów Coderso

## 1. Podsumowanie

- **Otwartych programów: 11** (+ 3 wstrzyknięte residua Pages: TASK-454, 469, 470). Program Pages Editor V2 (TASK-420..453) jest **CLOSED**.
- **Dominuje skala**: aż **6 programów jest OGROMNYCH (Very Large, wielofazowych)** — TASK-414, TASK-468, TASK-239, TASK-240, TASK-105 oraz Store 021/022/023. Każdy wymaga **własnego planu**, nie wolno traktować ich jako pojedynczego taska.
- **Najbliżej domknięcia** (tani, szybki zysk): **TASK-458** i **TASK-459** — kod, gates i offline lanes zielone; zostaje wyłącznie **live Playwright smoke + zamknięcie board/changelog**. Tuż za nimi **TASK-336** (18/18 leaves Done, zostaje tylko strict 38/38 gate + closure).
- **Najpilniejszy realny defekt**: **TASK-454 §A** — autosave nigdy nie jest promowany do `currentData`, więc praca autora **cicho cofa się po ponownym otwarciu** (silent data-loss).
- **Najcięższe zależności**: **TASK-467 blokuje TASK-468**; w Store sekwencja **021 → 023 → 022**; TASK-468 faza 01 (freeze kontraktu) jest tania i ready-now mimo zablokowanej reszty.

## 2. Główna tabela otwartych programów (pogrupowana tematycznie)

### Pages / Public Runtime / residua
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| TASK-459 | Visitor Catalog: filtry, sort, paginacja | High | Small | near-done | 459-01..04 Done z przypiętą walidacją (SQL pushdown, migracja 0060, oracle parity); brakuje tylko live demo + board/changelog. | Keystone listingowy shipnięty, ale nieudowodniony E2E; latent integration gap. |
| TASK-454 | Draft Recovery & Cache Trust Hardening | High | Medium | To Do | Cache-guard już shipnięty (449-02), ale §A autosave nie promowany do currentData, §B brak SPA nav-guard, §C hydration revalidation. | **Silent data-loss autora** + poisoned-cache render. |
| TASK-469 | Rich-Text Inline Canvas Edit Fidelity | Medium | Medium | To Do | Inline edit gubi markup (`stripInlineMarkup`) gdy panel go zachowuje. | Lossy edit — korektność UX. |
| TASK-470 | image.fit + video.title dead-props → renderer | Low | Small | To Do | Dwa martwe opcje panelu niewpięte do renderera; dzieli `pageRendererV2.tsx` z 469. | Drobne — dwie inert opcje panelu. |

### In-progress domknięcia (cross-theme)
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| TASK-458 | Menus Site Shell + Menu Design Editor | High | Small | near-done | 3 leaves Done, draft-leak naprawiony envelope'em, wszystkie gates zielone; zostaje live smoke + closure. | Stale-board / closure-hygiene (kod bezpieczny). | Done
| TASK-336 | Widget Editor Contract V2 + One-Time Wizard | High | Medium | In Progress (near-done) | 18 leaves Done, smoke 38/38 zielony; zostaje 336-17: strict 38/38 gate (soft→hard) + closure. | Przyszły widget przejdzie CI bez kontraktu V2 / z duplikatem writable owner. | DONE

### Bundle / Custom Screens
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| TASK-467 | Admin Bundle Heavy Chunk Hardening | High | Large | To Do | Greenfield (0 plików), 3 ciężkie krawędzie importu wciąż żywe; ściśle sekwencyjny łańcuch. | Chunki >1MB raw degradują first-load; **TASK-468 dziedziczy coupling**. |
| **TASK-468** | **Custom Screens Canvas → V4** | High | **Very Large** | To Do | Pure greenfield, kontrakt V4 tylko jako pseudokod; 7 faz, ~35 subtasków. | Tech-debt + **data-loss przy migracji V1/V2/V3 i drop kolumn** w fazie 07. |

### Store (security-critical backend)
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| **021/022/023** | **Plugin Store: Backend + Publish/Scans + Auth** | High | **Very Large** | To Do | Greenfield, w pełni wyspecyfikowane, 0 kodu; core-side UI/klient już czeka. | **Supply-chain tampering / publish złośliwych bundli / impersonacja publishera** — brak bezpiecznej dystrybucji. |

### Assistant (umbrelle + guardrail)
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| **TASK-414** | **Generic CMS Site Assistant Completion** | High | **Very Large** | In Progress | Tylko 1 z 13 dzieci Done; pozostałe 12 to wciąż bullets bez plików; umbrella praktycznie dormant. | Asystent zostaje demo service-business, nie generic CMS co-pilot; embedded security w każdym dziecku. |
| TASK-406 | Assistant Cross-Industry Reset E2E | High | Large | To Do | Niezaczęte; dep TASK-405 Done, profile clinic/salon już istnieją; guardrail-test (0 kodu prod). | Cross-industry media trust boundary nieweryfikowany (regresja wrong-industry imagery). |

### Umbrelle greenfield (produkt)
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| **TASK-239** | **Membership & Client Portal Umbrella** | High | **Very Large** | To Do | 0% w kodzie, wszystkie 7 deps Done; sub-taski nierozbite na pliki. | Brak gated member-area; **wysoki security surface** gdy powstanie (druga auth/sesja). |
| **TASK-240** | **Multilingual & i18n Umbrella** | Medium | **Very Large** | To Do | 0% w kodzie, additive/non-breaking; sub-taski nierozbite, brak -01 contract. | Brak multilingual (capability gap, nie defekt); security contract dopiero gdy powstanie. |

### Coverage (tło)
| ID | Program | Priorytet | Effort | Status | Realny stan (1 zdanie) | Ryzyko-jeśli-nie |
|----|---------|-----------|--------|--------|------------------------|------------------|
| **TASK-105** | **Real Vitest 100% Coverage Program** | Medium | **Very Large** | In Progress | Fale 04/05/06 prawie domknięte (branch-only residue); docs zamrożone 2026-03-15, artefakt 4.4% nieautorytatywny; realna masa = admin long-tail. | "100%" gate nieosiągalny → coverage nie jest twardym CI bar; regresje na high-churn editor surfaces. |

## 3. Rekomendowana kolejność w fazach

### Faza A — domknięcia in-progress (tani, szybki zysk; ready-now)
1. **TASK-458** (Small) — odpal live dev-host + Playwright, 3 scenariusze, evidence pod `.tmp/`, zamknij board+changelog. **Uwaga**: artefakty audytu z 2026-06-13 (`.tmp/task-458-459-live-audit-*`) to NIE acceptance smoke — potrzebny świeży przebieg.
2. **TASK-459** (Small) — live demo otodom-style (facety, truthful counts, pager, shareable URL w świeżej sesji, no-JS GET fallback, draft nie wycieka) desktop+mobile; zamknij board+changelog. Seed przypiąć jako reusable fixture.
3. **TASK-336** (Medium) — 336-17: wpiąć strict `listWidgetsForSurface('page-builder').toHaveLength(38)` + `requireContract:true` (soft→hard), finalny 38-widget smoke, wyzerować temporary duplicate-allowance entries, sync docs/board/changelog.

> Wszystkie trzy są niezależne i ready-now; jedyna bariera to czas operatora na live dev host. 458 i 459 mogą iść **równolegle** (różne tematy, brak kolizji plików).

### Faza B — High z realnym ryzykiem (data-loss / perf / blokery)
4. **TASK-454** (Medium) — **najpilniejszy realny defekt**: napraw §A (promocja autosave do `currentData`), §B (prawdziwy SPA unsaved-nav guard), §C (mount hydration revalidation). Ready-now, brak zależności.
5. **TASK-467** (Large) — **najpierw zweryfikuj 5 zewn. deps**: 399-04, 462, 464, 209, 054-22. Łańcuch ściśle sekwencyjny 01→02→03(L01→L02→L03→L04); **nie paralelizować**. L04 to hard closure gate (musi failować, póki któryś over-budget chunk niezfixowany). Land przed TASK-468.

### Faza C — residua/polish Pages (wstawki, tanie)
6. **TASK-469** (Medium) + **TASK-470** (Small) — **zrobić razem**: oba dzielą `pageRendererV2.tsx`, więc jeden touch pliku zamiast dwóch. 469 = fidelity inline edit (zachowanie markupu), 470 = wpięcie `image.fit` + `video.title`. Deps (422/438/440/441) Done.

### Faza D — duże programy produktowe (wg zależności i wartości)
7. **TASK-468 — faza 01 NATYCHMIAST** (tania, odblokowująca): freeze kontraktu V4 + drift audit + decision record. Reszta (02–07) czeka na **TASK-467** (blocker) i 464 (Done). **OGROMNY — własny plan**; faza 07 destructive (drop `blocks/bindings`) tylko po backfill verification.
8. **Store 021/022/023** — sekwencja **021 → 023 → 022** (publish potrzebuje auth/tokenów z 023, mimo płaskich nagłówków "depends on 021"). **OGROMNY, security-critical — własny plan**; rozstrzygnij wcześnie key-lifecycle/rotation oraz storage ZIP (brak własnych subtasków). Core-side klient już czeka.
9. **TASK-414** — **OGROMNY, własny plan**: krok 1 = read-only drift audit, krok 2 = promocja 12 bullets do plików TASK-414-NN w kolejności zależności, potem **capability-sync guardrail child PRZED poszerzaniem scope** (parent tego wymaga). Najwyższa near-term wartość: follow-up editing depth, helper-mode, brand-token, broad vertical coverage.
10. **TASK-406** (Large) — guardrail-test, po czystym baseline E2E z TASK-405. **Koordynować z acceptance-matrix dzieckiem TASK-414**, by nie dublować destructive/reset E2E. Pilnować evidence hygiene (brak kluczy/cookies/CSRF) i izolacji disposable DB.

### Faza E — umbrelle greenfield (wartość, ale 0% done)
11. **TASK-239** — **OGROMNY, własny plan**: wszystkie deps Done, ready-now. Najpierw rozbić 239-01..06 na pliki; dobry pierwszy slice = **239-01** (migracje + `evaluatePortalAccess` z allow/deny unit matrix). **239-03 (evaluator+middleware) MUSI landować przed 239-04/05** odsłaniającymi settings.
12. **TASK-240** — **OGROMNY, własny plan**: planować **PO osiadnięciu prac Pages**, bo krok 3 mutuje page/post/content services (uniknąć kolizji). Odśwież path-drift w "Files to Change". Pierwszy shippable slice = settings + resolver + localized pages + switcher. Medium near-term mimo High value.

### Faza F — coverage jako tło / równolegle
13. **TASK-105** — może iść **równolegle** z dowolną fazą (to testy, nie koliduje na plikach produktowych). **Najpierw re-baseline** `bun run test:coverage` (docs zamrożone na 2026-03-15, test count 471→681, artefakt 4.4% nieautorytatywny). Sekwencja: re-baseline → wchłonąć admin long-tail (105-10) w explicit slices → 105-08 per-file → 105-09 closure. ROI malejący na 3 prawie-domkniętych falach.

## 4. Programy OGROMNE (Very Large, wielofazowe) — wymagają własnego planu

> **Nie traktować jako pojedynczy task** — każdy potrzebuje osobnego planu fazowego, sekwencjonowania leaves i bramki bezpieczeństwa:

- **TASK-468** (Custom Screens → V4) — 7 faz, ~35 subtasków; data-loss w migracji i destructive cleanup.
- **021/022/023** (Plugin Store) — 9 subtasków, security-critical trust boundary 3rd-party.
- **TASK-414** (Generic Assistant) — 12 nieroprowadzonych dzieci, każde przekracza trust boundaries.
- **TASK-239** (Portal) — 6 sub-tasków, druga krypto-oddzielna auth/sesja.
- **TASK-240** (i18n) — 6 sub-tasków, additive ale szeroko dotyka services.
- **TASK-105** (Coverage) — wielofalowy program, najpierw re-baseline.

## 5. Notatki o zależnościach i równoległości

- **Blokery twarde**: TASK-467 → TASK-468 (impl 02–07); w Store 021 → 023 → 022.
- **Współdzielone pliki**: TASK-469 + TASK-470 dzielą `pageRendererV2.tsx` → robić razem. TASK-240 krok 3 koliduje z page/post/content services → po pracach Pages.
- **Może iść równolegle (brak kolizji plików)**: TASK-105 (testy) z dowolną fazą; TASK-458 ∥ TASK-459 (różne tematy); faza 01 TASK-468 ∥ TASK-467 (decision-record vs impl).
- **Koordynacja zakresu**: TASK-406 ↔ acceptance-matrix child TASK-414 (nie dublować destructive/reset E2E).
- **Do weryfikacji przed startem**: 5 zewn. deps TASK-467 (399-04/462/464/209/054-22); w TASK-414 cross-refy 404/405/406/410/412; w TASK-240 path-drift w "Files to Change".
