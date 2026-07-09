# Audyt repozytorium, workflow, worktree i 40 tasków (dwie kohorty po 20)

**Data audytu:** 2026-07-09

**Repozytorium:** `/home/coder/project/Coderso`

**Audytowany HEAD kodu produkcyjnego:** `6224c1de2aa2823e189ee5e3f60ad201828b89cc`

**HEAD przy rozszerzeniu audytu:** `1a3c4bd4be1a7dce99dfc3a1227e81f49ec71c4c` (jedyny commit ponad bazą produkcyjną aktualizuje ten raport)

**Branch:** `feature/tasks-fixes` (zgodny z `origin/feature/tasks-fixes`)

**Charakter pracy:** read-only review kodu i kontraktów tasków, testy, runtime smoke oraz bezpieczne porządki Git. Nie poprawiałem opisanych defektów produkcyjnych.

**Rozszerzenie:** druga część raportu (sekcje 15–25) obejmuje dokładnie kolejne 20 identyfikatorów w dół: `TASK-511`…`TASK-492`.

## 1. Wniosek wykonawczy

Repo jest technicznie duże, konsekwentnie podzielone i ma bardzo szeroki zestaw testów. Bieżący HEAD przechodzi lint, typecheck, cały lane Bun, wszystkie pięć release gates, precommit oraz skan zależności/sekretów. Nie oznacza to jednak, że ostatnie taski można uznać za bezbłędne.

Audyt wykazał:

- **9 findings HIGH**, w tym trzy istotne problemy bezpieczeństwa uploadów/media, jeden layout/click-interception escape przez `customSvg`, całkowicie nieaktywny file upload w publicznym formularzu oraz kilka opcji edytora, które zapisują się, lecz nie działają na froncie;
- **18 findings MEDIUM** w obszarze atomowości, parity preview↔front, kompozycji efektów, CSS, responsywności i UX;
- **6 findings LOW** oraz kilka niespójności dokumentacji;
- **2 procesowe findings HIGH**: brak trwałych dowodów obowiązkowego runtime smoke oraz możliwość false-clean / za mała liczba rund w części skryptów workflow;
- bardzo dobrą bazę testową, która obecnie zbyt często testuje osobno model, CSS-string i runtime-string, ale nie ich końcowe połączenie ani geometrię w prawdziwej przeglądarce.

Porządki Git zostały wykonane wszędzie, gdzie dało się bezpiecznie udowodnić integrację. Nie usunąłem `feature/task-511`, ponieważ jego worktree zawiera unikalne, nieśledzone pliki. Usunięcie go teraz byłoby utratą danych. Aktualny stan to więc **dwa wymagane branche plus jeden zachowany wyjątek**.

## 2. Zakres i metoda

Przeczytane źródła kontraktów obejmowały co najmniej `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`, `_docs/TESTING_STRATEGY.md`, domenowe specyfikacje Pages/Forms/Media/Menus/Content Types/Security, task index, changelog index, pliki tasków, skrypty workflow, źródła produkcyjne i testy.

„Ostatnie 20 tasków” wyznaczyłem deterministycznie jako 20 ostatnich zakończonych **board-level tasków** według czasu ich końcowego merge commita. Fizyczne subtaski/leaves były audytowane razem z rodzicem, a nie liczone jako osobne pozycje. Następny poza zakresem był TASK-515.

Review łączył:

1. kontrolę kontraktu task → kod → test → changelog;
2. analizę bieżącego kodu na HEAD, nie tylko opisu commita;
3. niezależne audyty agentów dla obszarów Pages effects, Pages bundles oraz Admin/Forms/Media;
4. pełne i celowane testy;
5. read-only smoke na działającym core/admin/site przez `coderso-dev-core-host` i `playwright-cli`;
6. małe reprodukcje przeglądarkowe i funkcjonalne dla miejsc, w których test jednostkowy maskował seam.

## 3. Repo i workflow — co tu się dzieje

Coderso jest CMS-em opartym o Bun z adminem React/Vite, publicznym runtime SSR, domenowymi service contracts, Drizzle/PostgreSQL, plugin/store/SDK oraz rozbudowanym Page v2 builderem. Najnowsze taski koncentrują się na fidelity edytorów i zaawansowanych efektach Page v2.

Docelowy workflow opisany w `AGENTS.md` jest sensowny:

`RESEARCH → AUTHOR → co najmniej 5 rund DRIFT-AUDIT → sekwencyjny IMPLEMENT → per-subtask gates → POST-AUDIT → realny runtime SMOKE → closure`

Mocne strony procesu:

- schema-first, reject-unknown i present-only są jawnie wymagane;
- rozdział Bun runtime vs Vitest pure/UI jest zwykle poprawnie stosowany;
- skrypty próbują wymuszać fresh-context review, single-writer ownership i land order;
- istnieje dobry wzorzec false-clean guard w `_docs/_workflows/task-drift-audit-only.mjs:125-159` oraz w `_docs/_workflows/task-522-author.mjs:150-177`;
- testy bezpieczeństwa, route mapping, migrations i byte-identity są liczne i wartościowe.

Główna wada procesu to różnica między opisanym rygorem a tym, co naprawdę egzekwują poszczególne skrypty.

## 4. Worktree i branche

### 4.1 Stan początkowy i weryfikacja

Poza głównym worktree istniały worktree dla TASK-473, 474, 479, 482, 483, 484, 511, 512, 513, 514, 515, 516, 519, 520 i 521 oraz prunable `/tmp/t501-head`.

Przed usunięciem każdego worktree/brancha zastosowałem odpowiednio:

- `merge-base --is-ancestor` dla commitów będących bezpośrednimi przodkami;
- porównanie drzew dla branchy zintegrowanych squashem;
- porównanie blobów i plików dla nieśledzonych artefaktów;
- ręczną kontrolę diff dla TASK-473: 9/12 plików było byte-identical z historycznym integratorem `6500ea12`, a trzy pozostałe różniły się wyłącznie formatowaniem; drzewo integratora odpowiadało zintegrowanemu PR #19.

### 4.2 Usunięte bezpiecznie

Usunąłem worktree TASK-473, 474, 479, 482, 483, 484, 512, 513, 514, 515, 516, 519, 520 i 521 oraz pruned `/tmp/t501-head`. Usunąłem też odpowiadające im zbędne lokalne branche, jak również bezpiecznie zweryfikowane lokalne branche squash/patch (`feat/atomic-editors`, `feat/widgets`, `feature/email`, `feature/fixes`, `fix/fixes`, `feature/task-478`, `feature/task-479`, `feature/visual`, `feature/tasks` i inne związane z usuniętymi worktree).

Remote refs pozostały nietknięte.

### 4.3 Celowo zachowany TASK-511

Worktree `/home/coder/project/Coderso-task-511`, branch `feature/task-511`, HEAD `6f1dee36` zawiera dziewięć untracked plików tekstowych, których nie ma w bieżącym drzewie:

- parent `TASK-511_Backup_V2_Scalable_Compressed_Encrypted_Importable.md`;
- siedem tasków `TASK-511-01`…`TASK-511-07`;
- `_docs/_workflows/task-511-author-audit.mjs`.

Ma też siedem ignored PNG; sześć z nich nie istnieje w głównym worktree (`wf511-backups-proto.png`, `wf511-backups-prototype.png`, `wf511-proto-backups.png`, `wf511-prototype-backups.png`, `wf511_backups_proto.png`, `wf511audit-backups-proto.png`).

Nie ma podstaw, by założyć, że właściciel chce te dane wyrzucić. Najbezpieczniejsza ścieżka do dokładnie dwóch branchy to najpierw zdecydować, czy TASK-511 ma zostać zachowany/commitnięty i zintegrowany, czy jawnie porzucony; dopiero potem usunąć worktree i branch.

### 4.4 Stan końcowy

Worktree:

- `/home/coder/project/Coderso` → `feature/tasks-fixes` @ `6224c1de`;
- `/home/coder/project/Coderso-task-511` → `feature/task-511` @ `6f1dee36` (data-loss blocker).

Lokalne branche:

- `main` @ `13b5d8e3`, tracking `origin/main`;
- `feature/tasks-fixes` @ `6224c1de`, tracking `origin/feature/tasks-fixes`;
- `feature/task-511` @ `6f1dee36`, bez upstreamu.

`main` jest przodkiem `feature/tasks-fixes`; branch roboczy jest 82 commity przed `main` i 0 za nim.

## 5. Audytowane 20 tasków

| Kolejność | Task | Final merge | Changelog | Werdykt skrócony |
|---:|---|---|---:|---|
| 1 | TASK-533 — Layout | `6224c1de` | 1247 | Wymaga poprawek: responsive spans, grid sanitizer, geometria timeline |
| 2 | TASK-532 — Typography Fidelity | `00f69e6f` | 1246 | Wymaga poprawek: dwa martwe responsive controls i divider no-op |
| 3 | TASK-534 — Declarative Interactivity | `4dd9d859` | 1245 | Wymaga poprawek: magnetic, footer init, gallery authoring/schema |
| 4 | TASK-531 — Premium Backgrounds & Glow | `21908e02` | 1244 | Wymaga poprawek: full-bleed responsive paint i multi-layer color |
| 5 | TASK-535 — Audit Remediation 522–530 | `8bfdd965` | 1243 | Remediation niepełna: pozostają seams efektów i responsywności |
| 6 | TASK-530 — Page Editor Slider Step | `12a00da6` | 1242 | Implementacja w zakresie wygląda poprawnie; brak parent task file |
| 7 | TASK-528 — Whole-Card Tilt | `06564017` | 1241 | Główny fix poprawny; kombinacja tilt+layer nadal ma problem downstream |
| 8 | TASK-529 — Cursor Spotlight Coordinates | `b50d574f` | 1240 | Poprawne; kod i test używają viewport coordinates |
| 9 | TASK-524 — Single-Node Effects | `2567a1df` | 1239 | Częściowo poprawne; niezależne transform effects nadal się nadpisują |
| 10 | TASK-525 — Fullbleed & Reveal | `d66519fc` | 1238 | Wymaga poprawki: reveal final state wyłącza hover transform |
| 11 | TASK-523 — Canvas Background & Spotlight | `c238506a` | 1237 | Core fix dobry; pozostał drift clamp/UI/test i kontrakty sąsiednie |
| 12 | TASK-526 — Editor Panel Scroll | `3d1f61a3` | 1236 | Bez istotnego defektu w audytowanym zakresie |
| 13 | TASK-522 — Hero Toolkit & Effects | `e5e25f06` | 1235 | Wymaga poprawek bezpieczeństwa i kompozycji efektów |
| 14 | TASK-521 — Motion & Interaction Effects | `d4e0bb81` | 1234 | Wymaga poprawki responsive nested merge/present-only |
| 15 | TASK-520 — Menu Scrolled State | `121e3d59` | 1233 | Wymaga poprawki responsive-only state machine |
| 16 | TASK-519 — Alpha-Capable Color Input | `b79dd09b` | 1232 | Wymaga ujednolicenia admin/write/render color boundary |
| 17 | TASK-516 — Forms Editor & File Field | `f9fe218d` | 1228 | Krytyczne funkcjonalnie i bezpieczeństwowo |
| 18 | TASK-514 — Entries Editor | `d0d314a4` | 1227 | Wymaga transakcji i zawężenia projekcji sekretu |
| 19 | TASK-513 — Content Type Editor | `046add65` | 1226 | Bez istotnego actionable defect; migracja/kontrakty spójne |
| 20 | TASK-512 — Media Library | `a47f1062` | 1225 | Główny zakres działa; trzy LOW follow-upy UX/race/cache |

## 6. Findings HIGH

### H-01 — TASK-516: publiczne pole `file` nie wykonuje uploadu

`core/widgets/core/formEmbed.tsx:1116-1153` renderuje file input bez `name` oraz nazwany hidden input, zakładając upload runtime, którego nie ma. `core/widgets/core/formRuntimeScript.ts:88-117,454-480,566-574,597-626` czyta wyłącznie nazwane kontrolki, buduje JSON, a change handler tylko odświeża logikę/progress; nie ma `FormData`, wywołania `/uploads` ani zamiany pliku na media ID.

Skutek: wybór pliku nigdy nie trafia do payloadu. Required/multiple również nie działają zgodnie z kontraktem, a wymagane pole kończy się błędem backendu (`core/services/forms/validation.ts:405-415,484-497`). Istniejący test sprawdza głównie markup, nie pełny flow.

**Zalecenie:** upload-before-submit z jawnie obsłużonym stanem loading/error, ID/ID[] w hidden modelu, constraint validation oraz realny browser test wybór pliku → upload → submission → media usage.

### H-02 — TASK-516: stored same-origin XSS przez rozjazd filename extension ↔ MIME

PDF jest domyślnie dozwolony (`core/services/media/mediaService.ts:41-48`). Sniffer bada markup tylko w pierwszych 1024 bajtach (`:211-226`), a PDF rozpoznaje po `%PDF-` (`:229-262,295-317`). Client filename i rozszerzenie zostają zachowane (`:69-77`, `core/services/media/storage/local.ts:22-50`). Delivery ustala typ przez `Bun.file(targetPath).type`, czyli z rozszerzenia (`core/server/httpServer.ts:504-512`), a media jest dispatchowane przed wspólnym pipeline nagłówków (`:530-546`).

Praktyczny payload: `payload.html`, declared `application/pdf`, prefix `%PDF-`, HTML/script po bajcie 1024. Przechodzi sniff, zapisuje się jako `.html`, a publiczny endpoint wydaje `text/html;charset=utf-8` na tym samym originie. Lokalna reprodukcja potwierdziła, że `Bun.file("payload.html").type` daje `text/html;charset=utf-8`.

**Zalecenie:** nazwa storage wyłącznie z serwerowego trusted MIME/rozpoznanej sygnatury; delivery z persisted canonical MIME, `X-Content-Type-Options: nosniff`, bezpieczny `Content-Disposition` dla aktywnych/niepewnych typów i pełny test bypassu >1024 B.

### H-03 — TASK-516: content sniff jest wyłączony dla sesji i API key

`core/services/forms/submissionAccess.ts:27-54` ustawia `requireCaptcha:false` dla uwierzytelnionej sesji oraz sesji/API key z `forms.submit`. Upload kopiuje ten bool bezpośrednio jako `sniffContent` (`core/server/routes/formsRoutes.ts:305-323,352-359`). W public mode zalogowany użytkownik nie potrzebuje nawet `forms:write`; check jest tylko dla internal.

Captcha i bezpieczeństwo zawartości są dwoma niezależnymi kontraktami. Obecne sprzężenie pozwala zapisać aktywny SVG/markup z pominięciem byte sniff.

**Zalecenie:** sniff/canonicalization zawsze, niezależnie od auth/captcha; captcha ma sterować wyłącznie anti-abuse. Dla SVG wymagany osobny bezpieczny contract lub wymuszone attachment/isolation.

### H-04 — TASK-522: `customSvg` pozwala na layout escape i przechwycenie kliknięć

Sanitizer dopuszcza arbitralny `class` (`core/services/pages/svgSanitizer.ts:127,277`), po czym markup trafia do `dangerouslySetInnerHTML` (`core/services/pages/pageRendererV2.tsx:2724`). Reprodukcja:

```html
<svg class="fixed inset-0 z-50 pointer-events-auto">...</svg>
```

przechodzi `sanitizeSvg` bez zmian. W prawdziwej stronie z bieżącym publicznym CSS computed style wyniósł: `position:fixed`, wszystkie insety `0px`, `z-index:50`, `pointer-events:auto`. Autor może więc przykryć viewport i przechwytywać interakcje. `_docs/SECURITY_SPEC.md:462-475` błędnie twierdzi, że usunięcie `style` zamyka ten layout-escape, mimo że `class` pozostaje otwarty.

**Zalecenie:** usunąć `class` z author SVG albo allowlistować wartości do wąskiego, semantycznego zestawu niezależnego od utility CSS; dodać testy `fixed/inset/z/pointer-events` i realne `elementFromPoint`.

### H-05 — TASK-534: opcja Magnetic nigdy nie działa

Model obiecuje `data-magnetic` (`core/services/pages/pageDocumentV2.ts:865-871`), detektor włącza CSS/skrypt (`core/services/pages/pageCompositionEffects.tsx:289-300`), a runtime szuka `[data-magnetic]` (`core/services/pages/pageEffectsRuntime.ts:208-225`). Renderer nie mapuje jednak `block.style.magnetic` na żaden atrybut (`core/services/pages/pageRendererV2.tsx:1188-1192`). Repo-wide search potwierdza, że produkcyjny renderer nigdzie nie stempluje tego hooka.

Test renderu ręcznie konstruuje oczekiwany atrybut/seam zamiast sprawdzić dokument → renderer → runtime selector.

**Zalecenie:** stamp na właściwym frame oraz integracyjny test renderowanego dokumentu i pointer movement.

### H-06 — TASK-534/535: efekty w footerze nie są uzbrajane, gdy main też ma runtime

Main renderuje się przed footerem (`core/site/pageRuntimeV2.tsx:64-74`). Każdy `PageDocumentRender` umieszcza script po swoich sekcjach (`core/services/pages/pageRendererV2.tsx:3866-3877`). Pierwszy IIFE natychmiast ustawia globalny init flag i skanuje istniejący DOM (`core/services/pages/pageEffectsRuntime.ts:67-79,91-95,146-154,214-225`). W chwili wykonania skryptu main footer nie został jeszcze sparsowany. Późniejszy footer script (`core/site/siteShell.tsx:769-786`) widzi flag i kończy pracę.

Skutek: footer-only działa, main-only działa, ale main+footer pozostawia footer reveal/switcher/tilt/magnetic nieuzbrojone.

**Zalecenie:** inicjalizacja per-root albo jeden script po całym shell DOM; idempotencja per element (`data-bound`) zamiast globalnego all-or-nothing flag. Test musi renderować main i footer z różnymi efektami w kolejności parsera.

### H-07 — TASK-532: responsive `fontSizeCustom` i `textTransform` są martwe na froncie

Kontrolki mają `responsive:true` (`core/services/pages/pageEditorControlRegistry.ts:1062-1085`), lecz `pageResponsiveCss` emituje tylko starsze font enums i numeric line-height/letter-spacing (`core/services/pages/pageResponsiveCss.ts:806-843`). Nie istnieje gałąź dla nowych pól ani diagnostyka.

Override zapisuje się i wygląda poprawnie w device preview, ale publiczny front nie dostaje `font-size`/`text-transform`.

**Zalecenie:** dodać emit lub zdjąć responsive flag; obowiązkowy test public CSS i computed style na dwóch viewportach.

### H-08 — TASK-533: responsive `colSpan`/`rowSpan` są martwe na froncie

Kontrolki również mają `responsive:true` (`core/services/pages/pageEditorControlRegistry.ts:1008-1029`). Bazowy renderer mapuje span (`core/services/pages/pageRendererV2.tsx:1152-1171`), ale collector responsive kończy bez żadnej gałęzi span (`core/services/pages/pageResponsiveCss.ts:596-598,599-843`).

**Zalecenie:** emit breakpoint CSS na frame albo uczciwie uczynić kontrolkę base-only. Test musi mierzyć geometry/grid placement w preview i published front.

### H-09 — TASK-534: nowo insertowalna galeria jest praktycznie nieautoryzowalna

Galeria jest insertable, ale startuje z `items:[]` (`core/services/pages/pageDocumentV2.ts:1205-1216,1346-1350`). Jej registry ma tylko layout/filterable/filterCategories (`core/services/pages/pageEditorControlRegistry.ts:1325-1344`) — nie ma media/items editor ani kategorii na itemie. Generic items editor obsługuje `label` i nieadekwatny `Link URL` (`core/admin/ui/pages/editorControls/ListItemsControl.tsx:53-67,86-101`, użycie `PageEditor.tsx:4576-4585`).

Autor może utworzyć filter chips, ale nie może przypisać kategorii do zdjęć; wtedy runtime ukryje wszystkie elementy po wyborze filtra (`core/services/pages/pageRendererV2.tsx:1707-1724`, `core/services/pages/pageEffectsRuntime.ts:120-126`).

**Zalecenie:** dedykowany gallery item editor (media, alt, caption, category) i pełny author→save→publish→filter smoke.

## 7. Findings MEDIUM

### M-01 — TASK-514: metadata update nie jest atomowy

`updateEntryMetadata` zapisuje status/publish, potem taxonomy, metadata/visibility/hash i SEO w osobnych krokach (`core/services/content/entryService.ts:983-1048`). Późniejsza walidacja taxonomy może rzucić (`core/services/content/taxonomyService.ts:300-350`) po wcześniejszym publish. Potrzebna jest jedna transakcja oraz walidacja przed pierwszym write.

### M-02 — TASK-514: hash hasła jest niepotrzebnie materializowany

Mimo bezpiecznych public projections (`core/services/content/entryService.ts:618-681`), `deleteEntry` używa pełnego `.returning()` (`:685-687`), `updateEntry` szerokiego `.returning()` (`:845-855`), a `publishEntry` szerokiego `select()` (`:868-878`). `accessPassword` jest hashem (`core/db/schema.ts:789-793`). Zawęzić projekcje do minimalnego zestawu.

### M-03 — TASK-516: anonimowy upload zużywa dwa tokeny `public_write`

`core/server/publicFormsApi.ts:69-105` nalicza bucket na wejściu, a handler robi to ponownie (`core/server/routes/formsRoutes.ts:323-335`). Jeden request ma podwójny koszt; testy izolują handler i tego nie widzą.

### M-04 — TASK-519: admin color allowlist nie jest podzbiorem write/render boundaries

Admin akceptuje out-of-range funkcje i keywords `currentColor`/`inherit` (`core/admin/ui/shared/colorValue.ts:21-33,95-118,154-162`), podczas gdy widget render odrzuca zakresy (`core/widgets/core/clearableStyle.ts:17-75`), a menu odrzuca te keywords (`core/services/menus/normalizeMenuAppearance.ts:147-174`). Skutek to optimistic preview, po którym wartość znika lub przestaje działać po save/reopen.

### M-05 — TASK-520: responsive-only scrolled menu state jest inertny

Model i CSS legalnie obsługują responsive scrolled keys (`core/services/menus/menuDocumentV2.ts:125-177,489-537,1761-1790`, `core/site/menuDocumentCss.ts:1238-1261,1328-1358`), ale script gate patrzy tylko na bazowy sticky/scrolled state (`core/site/siteShell.tsx:680-696`). Przy wariancie istniejącym wyłącznie na mobile/tablet `data-scrolled` nigdy się nie pojawi.

### M-06 — TASK-521/522/535: nested responsive `layer` ma różne merge semantics w preview i froncie

`core/services/pages/pageDocumentV2.ts:4589` robi shallow merge i zastępuje całe `layer`; preview traci bazowe `y/z`. Public CSS emituje tylko pola override (`core/services/pages/pageResponsiveCss.ts:597,756`), pozostawiając bazowe inline wartości, a bez bazowego layer renderer nie stempluje `data-layer` (`core/services/pages/pageCompositionEffects.tsx:196`). Potrzebny jeden deep/present-key merge contract dla obu ścieżek.

### M-07 — TASK-522/524/528: efekty deklarowane jako niezależne konkurują o `transform`

Decoration, hover i tilt są współlokowane na frame (`core/services/pages/pageCompositionEffects.tsx:181,189,207`), a CSS/runtime zapisują ten sam `transform` (`core/services/pages/pageRendererV2.tsx:1078,1101`, `core/services/pages/pageEffectsRuntime.ts:198`). Kombinacje nadpisują się. Rozdzielić transform channels przez nested wrappers albo custom properties/individual transform properties.

### M-08 — TASK-525: reveal final state wyłącza hover lift/scale

Po reveal bardziej specyficzna reguła ustawia `transform:none` (`core/services/pages/pageRendererV2.tsx:833-840`), wygrywając z hover lift/scale (`core/services/pages/pageCompositionEffects.tsx:115-117`). Test powinien sprawdzać computed transform po reveal i hover, nie wyłącznie obecność reguł.

### M-09 — TASK-522: seamless marquee może ułożyć kopię w drugim wierszu

Dwa osobne `inline-flex` tracki animują swoje `translateX(-50%)` (`core/services/pages/pageCompositionEffects.tsx:63-64,96`), a parent renderowany w `core/services/pages/pageRendererV2.tsx:2386-2389` nie jest flex/nowrap. To nie gwarantuje ciągłej taśmy. Potrzebny wspólny flex rail lub jedna animowana grupa z dwoma segmentami.

### M-10 — TASK-522: glow pseudo-overlay może przechwytywać kliknięcia

Absolutny `::after` dla `glow-reveal`/`lift-glow` nie ma `pointer-events:none` (`core/services/pages/pageCompositionEffects.tsx:81-89`). Dodać jawny non-interactive contract i test click-through.

### M-11 — TASK-523/535: `layer.z` ma drift 40 w UI/test vs 20 w modelu

Registry i test pozwalają na 40 (`core/services/pages/pageEditorControlRegistry.ts:968`, `tests/vitest/pages/page-editor-control-registry.test.ts:1446`), ale model clampuje do 20 (`core/services/pages/pageDocumentV2.ts:417,3388`). Preview może pokazać wartość, która zmieni się po save/reopen. `_docs/PAGE_MODEL.md:1375-1379` poprawnie opisuje invariant 20, więc source registry/test wymagają synchronizacji.

### M-12 — TASK-535: tilt+layer wrapper może shrink-to-fit

Hoistowany wrapper (`core/services/pages/pageRendererV2.tsx:2894-2897`) staje się absolutnym elementem z `width:auto`, a CSS (`core/services/pages/pageCompositionEffects.tsx:36-37`) go nie rozciąga. Pełnoszeroki frame może zwęzić się do zawartości. Dodać width/stretch contract oraz geometry test.

### M-13 — TASK-531: responsive paint full-bleed trafia w inny box niż base paint

Base full-bleed usuwa paint z capowanego contentu i nakłada go na 100vw root (`core/services/pages/pageRendererV2.tsx:506-514,544-583`). Responsive builder zawsze emituje background/radius/shadow na content child (`core/services/pages/pageResponsiveCss.ts:165-169,446-512,905-908`). Breakpoint daje capowany/dwutonowy paint zamiast pełnego bleed.

### M-14 — TASK-531: safe color layer jest dozwolona, lecz emitowana jako nieważne `background-image`

Sanitizer dopuszcza gradient lub kolor per layer (`core/services/pages/pageAuthoringSanitizers.ts:164-198`), ale renderer i responsive CSS używają `backgroundImage`/`background-image` (`core/services/pages/pageRendererV2.tsx:484-490,560-566,873-876`, `core/services/pages/pageResponsiveCss.ts:461-470,646-653`). `linear-gradient(...), #fff` nie jest prawidłową listą `<image>` i przeglądarka odrzuca deklarację. Ograniczyć do gradientów albo poprawnie rozdzielić final color w shorthand.

### M-15 — TASK-532: divider width/align są cichym no-opem bez gradientu

Registry zawsze pokazuje gradient/width/align (`core/services/pages/pageEditorControlRegistry.ts:1449-1478`), lecz renderer czyta width/align tylko przy `gradient===true` (`core/services/pages/pageRendererV2.tsx:2545-2568`); legacy `<hr>` je ignoruje (`:2571-2580`). Dodać `showWhen`, zastosować pola w obu wariantach lub odrzucać martwą konfigurację.

### M-16 — TASK-533: grid sanitizer dopuszcza niezerowe unitless lengths

`GRID_LEN` ma opcjonalną jednostkę dla dowolnej liczby (`core/services/pages/pageAuthoringSanitizers.ts:369-375`) i jest stosowany w `minmax/repeat` (`:442-457`). `minmax(5,1fr)` i `repeat(3,2)` przechodzą, choć CSS dopuszcza bez jednostki tylko szczególny przypadek `0`. Następnie wartość trafia do `gridTemplateColumns` (`core/services/pages/pageRendererV2.tsx:745-760`).

### M-17 — TASK-533: ostatni segment timeline kończy się pod kropką, nie na niej

Item ma padding i zmienną wysokość (`core/services/pages/pageRendererV2.tsx:3045-3052`), axis ma `inset-y-0`/`bottom:0` (`:3060-3069`), a marker leży blisko góry (`:3074-3083`). `bottom:0` oznacza dół itemu, nie środek ostatniej kropki. Test `tests/vitest/pages/page-renderer-v2.test.tsx:5312-5318` sprawdza string, nie geometrię.

### M-18 — TASK-534: gallery item schema nie jest strict reject-unknown

Ogólny `arraySchema` nie ma nested item schema (`core/services/pages/pageDocumentV2.ts:1421-1424,1702-1703`), a normalizer po cichu rekonstruuje tylko znane pola (`:3730-3765`). Zewnętrzny payload z arbitralnymi keys przechodzi Ajv, po czym dane znikają. Dodać jawny `additionalProperties:false` item schema i route round-trip/reject test.

## 8. Findings LOW

- **L-01 / TASK-521:** `cursorSpotlight:false` zostawia niepuste `effects`, więc reset nie wraca do deklarowanego byte identity (`core/services/pages/pageDocumentV2.ts:2804-2821`).
- **L-02 / TASK-521:** `parallaxIntensity` zapisuje się bez `scrollEffect:"parallax"`, ale renderer tylko wtedy je konsumuje (`core/services/pages/pageDocumentV2.ts:3064`, `core/services/pages/pageRendererV2.tsx:3401-3407`).
- **L-03 / TASK-516:** nested form/field settings schemas nie mają strict `additionalProperties:false`, a normalizery cicho kasują unknown keys (`core/server/validation/formSchemas.ts:3-49`, `core/services/forms/validation.ts:147-295`, `core/services/forms/formSettings.ts:260-307`).
- **L-04 / TASK-512:** update folder slug ma race między pre-check i UPDATE; create mapuje constraint, update nie, więc race może dać 500 zamiast 409 (`core/services/media/mediaFoldersService.ts:143-161,180-211`, `core/server/routes/mediaRoutes.ts:78-129`).
- **L-05 / TASK-512:** odrzucony `cachedFoldersPromise` zostaje przyklejony, bo cache czyści się tylko po sukcesie (`core/admin/services/mediaFoldersClient.ts:37-49,65-75`).
- **L-06 / TASK-512:** load/create/rename/reorder/delete errors są połykane bez feedbacku i retry (`core/admin/ui/media/MediaLibraryPage.tsx:203-210,434-458`).

## 9. Istotna granica zakresu TASK-514

TASK-514 świadomie dodał tylko persistence/admin UI dla `public/private/password`. Publiczne enforcement jest odroczone do otwartego TASK-517. To nie jest drift względem kontraktu TASK-514, ale ważna prawda produktowa: obecne `private/password` nie powinno być komunikowane jako skuteczne zabezpieczenie publicznego frontu, dopóki TASK-517 nie zostanie dostarczony.

## 10. Findings procesu i dokumentacji

### P-HIGH-01 — obowiązkowy runtime smoke nie zostawia trwałego dowodu

`AGENTS.md:238-250` wymaga realnych scenariuszy i screenshotów w `_docs/_workflows/_smoke/`, ale `.gitignore:19-20` ignoruje wszystkie JPG/PNG. Na dysku jest **209** obrazów, `git ls-files` pokazuje **0** tracked. Najnowszy obraz w głównym worktree jest z 2026-07-06; nie ma trwałych dowodów dla UI tasków 519–535.

Skrypty wprost odraczają smoke do orchestratora, np. `_docs/_workflows/task-519-impl.mjs:200`, `task-520-impl.mjs:197`, `task-521-impl.mjs:204`, `task-522-impl.mjs:206`, a taski są zamykane jako Done bez wersjonowanego manifestu wyniku.

**Zalecenie:** trackować mały JSON/MD manifest per task (scenarios, assertions, console errors, screenshot paths/hash) oraz allowlistować task-scoped screenshots albo przechowywać je jako CI artifact z trwałym linkiem.

### P-HIGH-02 — część workflow może ogłosić false-clean i nie wykonuje pięciu rund

`AGENTS.md:203-208` wymaga co najmniej pięciu rund i uznaje brak odpowiedzi za false-clean. `_docs/_workflows/task-531-534-author.mjs:110-144` wykonuje maksymalnie **3** rundy, używa `.filter(Boolean)` i może zakończyć przy braku HIGH/MEDIUM bez sprawdzenia oczekiwanej liczby agentów (`:124-131`). Podobny wzorzec występuje w wielu impl/fix scripts.

To kontrastuje z poprawnym guardem w `task-522-author.mjs:166-177` i `task-drift-audit-only.mjs:145-159`.

**Zalecenie:** wspólny helper `requireAllResults(expected)` i jedna kanoniczna pętla; brak wyniku ma unieważniać rundę.

### P-MEDIUM-01 — skrypty każą agentom commitować mimo reguły owner-only

`AGENTS.md:270` mówi, że commit tworzy owner. Tymczasem m.in. `task-519-impl.mjs:201`, `task-520-impl.mjs:198`, `task-521-impl.mjs:205`, `task-522-impl.mjs:207`, `task-534-impl.mjs:113` i `task-535-remediation.mjs:151` wprost nakazują agentowi commit. Ujednolicić kontrakt lub jawnie udokumentować wyjątek.

### P-MEDIUM-02 — board/task/changelog mają materialny drift

- W rodzinach ostatnich 20 tasków jest 201 fizycznych plików, z czego **35** ma niekanoniczne `Status`, najczęściej `✅ Done (data)`, mimo że data ma być w osobnym polu.
- Parent TASK-512 nadal pokazuje wszystkie siedem dzieci jako `⏳ To Do` (`TASK-512...md:92-98`), choć board i dzieci są Done.
- TASK-533 nadal wskazuje changelog `1245` (`TASK-533...md:41`), lecz faktyczny jest 1247.
- Changelog 1245 mówi, że TASK-534 „takes 1244” (`1245-...md:8`).
- Changelog 1244 zawiera niewypełnione `<FILL: pass/skip/fail>` i `<FILL: N/5>` (`1244-...md:161-163`).
- Changelogi 1244/1246/1247 używają `…` zamiast jawnie wymienić wszystkie zamknięte descendants.
- Dziesięć plików TASK-532 zawiera stray `</content>`; parent ma też `</invoke>` (`TASK-532...md:410-411`).

### P-MEDIUM-03 — niektóre board tasks nie mają fizycznego kontraktu

TASK-528, TASK-529 i TASK-530 istnieją wyłącznie jako rozbudowane wiersze board (`_docs/_TASKS/README.md:186-188`), bez parent task files. TASK-535 ma tylko parent mimo wieloseamowej remediation. To utrudnia single-writer ownership, parent/child state i audyt kontraktu.

### P-MEDIUM-04 — closure evidence bywa sprzeczne z rzeczywistością

Taski 531–534 deklarują live smoke jako deferred, a jednocześnie są Done. Historyczne closeout TASK-534 notowało failures w full Bun, a task zamknięto; bieżący HEAD jest już zielony, lecz dowód closure był niespójny. Changelog 1244 ma placeholdery mimo board claim „all gates green”.

### P-LOW-01 — dynamiczny next-free changelog i stare branch hints są podatne na kolizje

Skrypty closure często każą `grep next-free` dopiero na końcu zamiast pinować numer przed streamem (np. `task-534-impl.mjs:113`, `task-535-remediation.mjs:151`). Przy równoległych streamach przeczy to collision guardom.

## 11. Walidacja

### 11.1 Statyczna i pełne testy

| Komenda / lane | Wynik |
|---|---|
| `bun --cwd core lint` | PASS |
| `bun --cwd core lint:types` | PASS |
| root `tsc -p tsconfig.json --noEmit` | PASS |
| `bun run precommit:check` | PASS (core, store, SDK, root) |
| Celowane Pages effects | 17 plików, 655/655 PASS |
| Celowane Pages bundles | 10 plików, 522/522 PASS + CSS 4/4 PASS |
| Celowane Admin/Forms/Media | Vitest 15 plików 472/472; Bun 9 plików 143/143 PASS |
| `bun run test:bun` | **1495 PASS, 1 SKIP, 0 FAIL**, 260 plików, 1484.91 s |
| `bun run gates:coderso` | functional/ux/performance/security/reliability — **5/5 PASS** |

Pełny `bun run test:vitest` uruchomił 830 plików: 5990 testów przeszło, dwa przekroczyły globalny timeout 10 s:

- `tests/vitest/ui/block-layout-shared-wave.test.tsx`;
- `tests/vitest/ui/section-editor-wave.test.tsx`.

Zgodnie z regułą repo oba pliki powtórzyłem osobno. Pierwszy przeszedł 3/3 (5.21 s), drugi 17/17 (6.56 s). Werdykt: potwierdzony under-load timeout flake; pełna komenda formalnie miała exit 1, więc nie opisuję jej jako bezwarunkowo zielonej.

Jedyny skip w Bun to opcjonalny OpenAI live provider test. OpenRouter live tests przeszły.

### 11.2 Security scan

`bun run scan:security` zakończył się exit 0 w trybie advisory:

- Bun audit: bez HIGH;
- Trivy lockfile: 0 HIGH/CRITICAL vulnerabilities;
- Trivy config: 0 misconfigurations;
- Trivy secret + Gitleaks history/worktree: bez leaków;
- container image scan: pominięty, bo nie podano `SECURITY_SCAN_IMAGE`.

Semgrep zgłosił dwa „blocking” patterns, mimo że advisory wrapper kończy się 0:

1. `_docs/_workflows/task-522-author.mjs:185` — dynamiczny tekst promptu obok słowa `<script>`; manualnie false positive, nie DOM sink;
2. `core/services/pages/pageRendererV2.tsx:2724` — `dangerouslySetInnerHTML`; markup jest sanitizowany, ale finding doprowadził do realnego H-04: sanitizer przepuszcza niebezpieczne utility classes.

### 11.3 Runtime smoke (bez mutowania DB)

| Scenariusz | Dowód widocznego efektu | Wynik |
|---|---|---|
| Core/public/admin health | API/public i login admin odpowiadały HTTP 200 | PASS |
| Public homepage desktop 1280×720 | H1 „Build with Coderso”, 3 artykuły, main width 1280, 0 console errors | PASS |
| Public homepage mobile 390×844 | `scrollWidth=390`, H1 w viewport, jedna kolumna, form controls dostępne | PASS |
| Opublikowane demo TASK-522–525 | 3 realne `[data-layer]`, marquee z animacją `cx-ticker`, brak overflow i console errors | PASS dla istniejącej konfiguracji |
| Admin auth/onboarding guard | Login działa; `/admin/pages` kieruje do istniejącego setup guard bez zapisu | PASS |
| Admin light/dark | body background zmienił się z `rgb(246,245,242)` na `rgb(24,23,26)`, root dostał `.dark` | PASS |
| `customSvg` layout escape | Sanitizer zachował klasę; public CSS policzył fixed/inset-0/z-50/pointer-events-auto | **FAIL bezpieczeństwa (H-04)** |

Przed loginem admin wykonał oczekiwany probe `/admin/api/auth/me` zakończony 401; publiczne flow nie miały błędów konsoli. W bazie nie było aktualnie żadnego formularza, więc pełnego file-upload E2E nie dało się wykonać bez tworzenia danych; nie mutowałem środowiska. H-01–H-03 wynikają z kompletnego prześledzenia render → runtime → route → storage → delivery oraz małych reprodukcji boundary.

## 12. Co jest dobrze zrobione

- TASK-513: config/date/slug/permissions są spójne, migrations `0067/0068/0069` mają SQL, snapshot i journal; nie znalazłem osobnego actionable defect w zakresie TASK-513.
- TASK-526: scroll containment panelu jest logiczny i testowany.
- TASK-529: viewport coordinate fix usuwa błędne dodawanie `scrollY` i jest poprawny.
- TASK-528: główny whole-card tilt seam został naprawiony; problem M-12 dotyczy kombinacji z późniejszym layer wrapperem.
- Sanitizery Pages blokują większość klasycznych `url()/expression/@import` payloadów, a present-only/byte-identity jest w wielu miejscach bardzo dobrze testowane.
- Route registration, RBAC mapping, DB fixture isolation i migrations mają znacznie lepszą jakość niż przeciętny projekt o tej skali.
- Bieżący HEAD jest szeroko zielony; findings są konkretne i lokalne, nie świadczą o ogólnej niestabilności całego repo.

## 13. Priorytet napraw

1. **P0 security:** H-02, H-03 i H-04; potraktować jako prywatny security workstream, nie publiczny issue z gotowym payloadem.
2. **P0 funkcjonalny:** H-01 — nie reklamować file field jako działającego, dopóki front upload E2E nie jest gotowy.
3. **P1 parity/runtime:** H-05…H-09 oraz M-05/M-06/M-12/M-13.
4. **P1 data integrity:** M-01 i M-02.
5. **P2 composition/CSS:** M-07…M-11 oraz M-14…M-18.
6. **P2 workflow:** wersjonowany smoke manifest, wspólny false-clean guard, pięć rund i normalizacja task/changelog state.
7. Po poprawkach uruchomić targeted gates, pełny Vitest bez konkurencji, Bun lane dla routes/runtime, security scans oraz realny co najmniej pięcioscenariuszowy smoke z computed style/geometry/DOM state.

## 14. Ostateczny werdykt

Nie rekomenduję traktowania ostatnich 20 tasków jako „audyt clean”. Repo jest build/test healthy, ale kilka głównych obietnic tasków nie dociera do realnego runtime, a upload/media i `customSvg` mają realne luki bezpieczeństwa.

Porządki worktree są zakończone w granicach bezpiecznej automatyzacji. Jedyną przeszkodą do pozostawienia wyłącznie `main` i `feature/tasks-fixes` jest zachowany TASK-511 z unikalnymi, niecommitniętymi danymi.

---

# Część II — rozszerzenie o TASK-511…TASK-492

## 15. Zakres, stan bazy i metoda rozszerzenia

Sformułowanie „kolejnych 20 tasków wcześniejszych od 512 w dół” zinterpretowałem deterministycznie jako dokładnie dwadzieścia identyfikatorów: **TASK-511, TASK-510, …, TASK-492**. Nie liczyłem fizycznych dzieci jako osobnych tasków.

Stan implementacji tej kohorty:

- TASK-492, TASK-493 i TASK-494 są nadal `⏳ To Do`;
- TASK-495…TASK-510 są `✅ Done`;
- TASK-511 jest `⏳ To Do`, ale jego osiem plików tasków i skrypt workflow istnieją wyłącznie jako dziewięć untracked plików w zachowanym worktree `feature/task-511`;
- bieżący HEAD `1a3c4bd4` różni się od audytowanej bazy kodu `6224c1de` tylko wcześniejszą wersją tego raportu, więc ustalenia kodowe odnoszą się do tej samej bazy produkcyjnej co część I.

Audyt został rozdzielony na trzy niezależne strumienie agentów:

1. TASK-492…TASK-498 — kontrakty login alerts/GSC/theme oraz Pages/Posts/Screens;
2. TASK-499…TASK-504 — menuDocumentV2, Design editor, Screens entry/runtime;
3. TASK-505…TASK-511 — binding GC, menu CSS responsive cascade, security/workflow i pełny kontrakt Backup v2.

Każdy istotny finding został następnie sprawdzony w głównym wątku przeciwko realnym plikom. Dla GSC porównałem kontrakt również z aktualną oficjalną dokumentacją Google. Dla menu CSS wykonałem małe reprodukcje na prawdziwym builderze CSS, a dla entry editor agenci wykonali reprodukcję zdarzenia klawiaturowego.

## 16. Werdykt per task

| Task | Status | Changelog | Werdykt |
|---|---|---:|---|
| TASK-492 — Login Alert Delivery | To Do | — | Kontrakt nie jest gotowy: blokuje login, dopuszcza unsigned webhook i nie ma SSRF policy |
| TASK-493 — SEO/GSC Pipeline | To Do | — | Kontrakt nie jest gotowy: myli semantykę API, ma błędny submit i niekompletny URL Inspection/sitemap model |
| TASK-494 — Admin Theme Token Direct | To Do | — | Nie jest execution-ready; brakuje dzieci, board row i ważnych import/export consumers |
| TASK-495 — Page/Template Editor | Done | 1204 | Główny zakres dobry; współdzielony fixed rail jest nieodporny na wąski viewport |
| TASK-496 — Shared Editor Chrome | Done | 1205 | Ekstrakcja dobra, lecz Screens nie mają deklarowanego dirty-navigation guard |
| TASK-497 — Posts Restyle | Done | 1206 | Restyle/testy dobre; szybkie Close może zgubić draft przed debounce |
| TASK-498 — Screens Data Builder | Done | 1207 | Istotny drift: Tabs są dekoracyjne, Button nie ma pełnego authoring/runtime seam |
| TASK-499 — MenuDocumentV2 | Done | 1208 | Brakuje części strict/deterministic invariants i bezpiecznej rewalidacji cache |
| TASK-500 — Screen Sections/Insertion | Done | 1209 | Rdzeń DnD/sections dobry; link/image sanitization pozostaje niepełne |
| TASK-501 — Menu Per-Device | Done | 1210 | PASS w swoim oryginalnym zakresie; późniejsze pola OFF nie domykają cascade |
| TASK-502 — Menu Design Fixes V2 | Done | 1211 | Front recursion działa; canvas nie używa tej samej publicznej projekcji |
| TASK-503 — Screens Polish V2 | Done | 1212 | Krytyczny UX drift: entry wrapper połyka spację w contenteditable |
| TASK-504 — Menu Styling Depth | Done | 1213 | Oryginalne style działają; duplicate href daje wiele `aria-current`; docs drift |
| TASK-505 — Screens Columns/Binding GC | Done | 1214 | Pusty dokument przepuszcza ghost binding bez warningu |
| TASK-506 — Modern Menu Styling | Done | 1215 | HIGH: jawne responsive OFF/none nie neutralizują desktopowych efektów |
| TASK-507 — Indicator Scope | Done | 1216 | Level 0 leak naprawiony, ale level 1 nadal przecieka do jawnie wyłączonego level 2 |
| TASK-508 — Menu Nesting/Flyout | Done | 1217 | Ten sam HIGH reset drift oraz niespójny domyślny padding osi |
| TASK-509 — Security Strict | Done | 1218 | Implementacja taska poprawna; bieżący HEAD ponownie nie przechodzi strict scan przez późniejsze zmiany |
| TASK-510 — Workflow Codification | Done | 1219 | Dokument jest dobry; późniejsze workflowy nie przestrzegają zapisanych gwarancji |
| TASK-511 — Backup v2 | To Do/untracked | plan 1229 | **BLOCKED:** kontrakt ma CRITICAL privilege escalation i wiele HIGH data-integrity/OOM/security gaps |

TASK-495…TASK-509 zostały zintegrowane głównie przez PR #19 (`205c66a5`), a TASK-510 przez późniejszy ciąg integracyjny zawierający `c314c5d41`. Nie znalazłem „zapomnianego” gotowego kodu w dawnych worktree tej kohorty; wyjątkiem pozostaje świadomie zachowany, niezaimplementowany TASK-511.

## 17. Findings HIGH w aktualnie zaimplementowanym kodzie

### II-H-01 — TASK-496: Screens nie mają deklarowanego dirty-navigation guard

Builder i entry editor utrzymują dirty state (`CustomScreenEditorPage.tsx:255,336-337`; `CustomScreenEntryEditor.tsx:358,741-775`), lecz shared `CustomScreenShell` tylko pokazuje badge (`CustomScreenShell.tsx:45-58`). W `core/admin/ui/custom-screens/**` nie ma `useAdminDirtyNavigationGuard` ani `beforeunload`.

Nawigacja sidebar/topbar może więc porzucić ręcznie niezapisane dane. Pages mają właściwy wzorzec w `PageEditor.tsx:2476-2494`.

### II-H-02 — TASK-498: widoczny Button chip nie może zostać powiązany z polem

Paleta dodaje Button bez `field` (`ScreenBlockLibrary.tsx:67-81,115-121`). Factory tworzy binding `href` tylko, jeśli field już dostał w wejściu (`screenDocumentOps.ts:322-335`), ale inspector nie ma `BoundFieldRow` — ma jedynie action/variant/href (`ScreenBlockInspector.tsx:960-990`).

Test factory przekazuje field bezpośrednio i omija realny user flow. W efekcie obietnica data-oriented Button nie jest osiągalna z UI.

### II-H-03 — TASK-498: Tabs są dekoracją, nie działającymi tabami

`ScreenRuntimeRenderer.tsx:1259-1388` renderuje etykiety jako nieinteraktywne `span` i wszystkie panele jednocześnie. Nie ma active state, `tablist/tab/tabpanel`, ukrywania nieaktywnej treści ani keyboard navigation.

Test `custom-screen-runtime-renderer.test.tsx:413-434` sprawdza tylko obecność labeli. To przykład testu, który potwierdza markup, ale nie funkcję.

### II-H-04 — TASK-503: entry editor połyka spację w edytowalnym polu

`CustomScreenEntryCanvas.tsx:56-63` przekazuje `onSelectBlock`, przez co root bloku dostaje `role="button"`. Handler w `ScreenRuntimeRenderer.tsx:670-726` bezwarunkowo robi `preventDefault()` dla Enter/Space. Wewnętrzny `contentEditable role="textbox"` zatrzymuje Enter/Escape, ale nie spację (`InlineEditWrapper.tsx:37-49,56-70`).

Reprodukcja na finalnym HEAD zwróciła:

```json
{"editable":true,"defaultPrevented":true,"dispatchAccepted":false,"blockRole":"button"}
```

To realny błąd podstawowego flow wpisywania tekstu, a dodatkowo nested-interactive/a11y defect. Najbezpieczniej przenieść selection na osobny uchwyt albo co najmniej gate'ować handler przez `event.target === event.currentTarget`.

### II-H-05 — TASK-506/508: responsive OFF/none nie neutralizuje efektu desktop

Jawne wartości resetujące są poprawnie zapisywane i wykrywane przez compare keys, lecz emitery CSS generują dla nich zero deklaracji:

- divider `false`: `menuDocumentCss.ts:541-544`;
- indicator `none` i `hoverUnderline:false`: `:591-618`;
- `showCaret:true` nie odwraca bazowego `false`: `:631-632`;
- `caretRotateOnOpen:false` nie odwraca bazowego `true`: `:633-645`;
- `flyoutAnimation:"none"` nie neutralizuje bazowego fade/slide: `:664-690`;
- total device re-emit przechodzi przez te same present-only emitery: `:1001-1022,1102-1114`.

Reprodukcja „desktop effects ON, tablet none/false/true/false/none” nie wygenerowała w ogóle tablet media block:

```json
{"tabletMedia":false,"tabletResetContent":false}
```

Kontrakt wymaga realnej delty dla każdego klucza (`TASK-506-02...md:702-705,779-781`), a testy `menu-document-css.test.ts:936-1020` sprawdzają kompletność listy kluczy, nie semantykę wartości wyłączających.

### II-H-06 — cross-cohort seam TASK-504/TASK-520: responsive `brand.iconColor` jest martwe

Model świadomie dopuszcza `iconColor` również w responsive style (`menuDocumentV2.ts:726-737,1049-1057`). Publiczny renderer rozwiązuje desktop i zapisuje kolor jako inline style SVG (`siteShell.tsx:517,543-553`). Tymczasem:

- `BRAND_STYLE_COMPARE_KEYS` pomija `iconColor` (`menuDocumentCss.ts:905-921`);
- `brandIconDecls` emituje tylko width/height (`:471-479`);
- zwykła media-query reguła i tak nie pokonałaby inline `style.color` bez zmiany mechanizmu.

Kontrolka może więc zapisać tablet/mobile icon color, ale front nie pokaże efektu. To nowe ustalenie uzupełniające audyt TASK-520 z części I.

## 18. Blokery kontraktów TASK-492…TASK-494

Poniższe findingi dotyczą tasków **niezaimplementowanych**. Są blokadami authoring/readiness, a nie regresjami obecnego runtime.

### TASK-492 — trzy HIGH

1. **„Nieblokująca” dostawa blokuje login.** Kontrakt mówi, że alert nie może blokować odpowiedzi (`TASK-492-02...md:24-27`), ale route robi `await sendLoginAlert` (`TASK-492-02-L02...md:105-115`), a service sekwencyjnie czeka na SMTP i webhook z timeoutem 8 s (`TASK-492-02-L01...md:105-151`). Potrzebny outbox/queue albo uczciwie opisany synchroniczny latency contract.
2. **Webhook może wyjść bez podpisu.** Parent wymaga HMAC/secret (`TASK-492_Login...md:23-25,35-38`), lecz pseudokod podpisuje tylko `if (secret)` i niezależnie wykonuje fetch (`TASK-492-02-L01...md:122-145`); schema dopuszcza secret null (`TASK-492-01-L02...md:73-76`). Relacja URL↔secret musi być fail-closed.
3. **Brak SSRF policy.** Konfigurowalny server-side webhook może trafić do loopback/RFC1918/link-local/metadata, przejść redirect albo DNS rebinding (`TASK-492-01-L01...md:110-112`; `TASK-492-02-L01...md:142-145`). Sam HTTPS nie rozwiązuje SSRF.

Dodatkowo channel toggle jest pozorny: `emailChannelEnabled = recipients.length > 0 || true`, nie trafia do payloadu (`TASK-492-03-L01...md:82-116`), a service zawsze dokłada email użytkownika. Osobny internal delivery-error update też nie jest spójnie oddzielony od publicznego `SecuritySettingsUpdate` (`TASK-492-01-L01...md:92-97,153-162`; `securitySettings.ts:698-702`).

### TASK-493 — cztery HIGH

1. **Błędna semantyka URL Inspection.** `normalizeIndexingState` traktuje `indexingState` jako INDEXED/NOT_INDEXED (`TASK-493-01-L01...md:194-205`). Oficjalnie pole mówi, czy noindex blokuje indeksowanie, a high-level informacja „czy URL jest zindeksowany” pochodzi z `verdict`: [UrlInspectionResult](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult).
2. **Sitemap submit ma zły scope i path.** Task mintuje domyślnie `webmasters.readonly` (`TASK-493-03-L01...md:99-107`) i wywołuje niepełne `sitemaps/{feedpath}` (`TASK-493-02-L02...md:73-79`). Google wymaga write scope `webmasters` oraz `sites/{siteUrl}/sitemaps/{feedpath}`: [Sitemaps submit](https://developers.google.com/webmaster-tools/v1/sitemaps/submit).
3. **URL Inspection to placeholder, nie wykonywalny kontrakt.** `syncIndexedPages` zawiera tylko komentarz (`TASK-493-03-L02...md:87-90`). Brakuje osobnego POST clienta, `inspectionUrl/siteUrl` body, kolektora URL, quota/batching/retry. Endpoint i body opisuje [index.inspect](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect), a aktualny limit to 2000 QPD/site i 600 QPM/site: [usage limits](https://developers.google.com/webmaster-tools/limits).
4. **Sitemap collector jest stale wobec modelu repo.** Pomija `content_entries.visibility` (`schema.ts:789-793`), osobne Posts (`:870-900`) i `site.contentRoutes[].detailPath` (`detailPageBindingResolver.ts:104-112`). Literalna implementacja mogłaby ujawnić istnienie private/password entries, pominąć posty i wygenerować nieistniejące URL-e.

MEDIUM: Search Analytics nie paginuje `startRow` ponad 25k (`TASK-493-03-L02...md:74-84`), mimo oficjalnego wymogu [pagination](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data); sitemap/robots ufa `url.origin` zamiast `resolvePublicBaseUrl` (`TASK-493-02-L01...md:87-95`; `baseUrl.ts:85-119`); overview nie definiuje cache key/TTL/validator/invalidation/cacheBus; pseudokod używa nieistniejącego `apiClient.get/post` zamiast `apiRequest`; migracja 0064 jest historyczna przy journalu kończącym się na 0069.

### TASK-494 — HIGH scope gap i brak readiness

Task chce usunąć `admin_theme_profiles`, ale nie obejmuje działającego import/export:

- zapis profili: `importExportService.ts:501-537`;
- bundle/enum contract: `importExportTypes.ts:19-30,74-92`;
- reject-unknown schemas: `importExportSchemas.ts:125-145`;
- client import/export: `importExportClient.ts:43-57,69-77`.

Usunięcie tabeli według obecnej listy ownerów złamałoby kompilację albo restore. Ponadto docelowy singleton nie ma wskazanej tabeli/klucza/schematu, decyzja „templates zostają?” jest nadal otwarta (`TASK-494...md:47-65,88-100`), RBAC hint `settings:write` jest niezgodny z istniejącym `themes:read/write`, nie ma fizycznych dzieci ani execution pseudocode. Sam plik istnieje, ale TASK-494 nie ma wiersza w `_docs/_TASKS/README.md`, więc statystyki boardu są zaniżone.

## 19. TASK-511 — kontrakt BLOCKED przed implementacją

### 19.1 Stan źródła kontraktu

Worktree `/home/coder/project/Coderso-task-511` jest na starym HEAD `6f1dee36`. Osiem plików TASK-511 i `task-511-author-audit.mjs` pozostają untracked. Główne repo nie trackuje żadnego `TASK-511*`, choć board `_docs/_TASKS/README.md:109` mówi „Contracts authored + drift-audited”.

Nie należy rozpoczynać implementacji ani usuwać worktree. Najpierw trzeba przenieść kontrakt na aktualny HEAD, usunąć poniższe blokery, przeprowadzić od nowa pełny drift-audit i dopiero wtedy zdecydować o integracji.

### II-C-01 — CRITICAL: `backups:write` może zaimportować pełny dostęp i przejąć konto

Import route wymaga wyłącznie `backups:write` (`TASK-511-05...md:227-232`), a kontrakt jednocześnie:

- akceptuje archived role `["*"]` (`TASK-511-04...md:267-275`);
- upsertuje roles, users, password hashes i assignments (`:511-575`);
- aktualizuje istniejące role i użytkowników po UUID.

Operator mający tylko `backups:write` może przygotować własne zaszyfrowane CBK, utworzyć/przypisać sobie rolę full-access albo podmienić password hash istniejącego administratora. Nadpisanie roli po UUID wpływa również na użytkowników docelowych, których archiwum nie zawiera.

Minimum: `users:write + roles:write`, full-access actor gate dla importu `*`, privilege ceiling względem aktora, ochrona istniejących kont/roli oraz test `backups:write`-only → 403.

### II-511-H-01 — lockout guard liczy nieaktywnych administratorów

Kontrakt celowo nie filtruje statusu (`TASK-511-04...md:174-188,577-586`), podczas gdy session/login akceptuje tylko `status === "active"` (`auth.ts:25-26`; `authRoutes.ts:197-199`). Archiwum z jedynym full-access userem w stanie inactive/pending przejdzie guard i zostawi panel bez aktywnego admina.

### II-511-H-02 — users/roles/user_roles mogą OOM

Parent obiecuje streaming każdej sekcji, ale 04/05 świadomie materializują pełne `UserRow[]/RoleRow[]/UserRoleRow[]` (`TASK-511-04...md:420-457`; `TASK-511-05...md:716-738`). „Owner-scoped exception” nie ma limitu rekordów ani bajtów.

Argument, że guardy muszą widzieć cały zbiór, wskazuje na staging/temp tables i set-based SQL, nie na bezlimitowe tablice procesu.

### II-511-H-03 — tar writer ignoruje backpressure

`tarPack` iteruje wszystkich memberów w `ReadableStream.start()` i bezwarunkowo wywołuje `controller.enqueue` (`TASK-511-01...md:400-417`). Wolniejszy gzip/GCM/output może dopuścić resident queue obejmującą dużą część archiwum. Źródło musi być pull-driven, najwyżej jeden bounded chunk na `pull()`.

### II-511-H-04 — eksport nie jest spójnym snapshotem DB

Każda tabela i batch są czytane osobnymi queries (`TASK-511-01...md:254-305`), a kontrakt akceptuje zależny od czasu wynik (`:332-337`). Concurrent write może dać child bez parent albo różne wersje powiązanych rekordów. Cały export potrzebuje repeatable-read snapshotu albo twardej write-quiescence/maintenance contract.

### II-511-H-05 — niezaufany KDF header steruje ogromnym kosztem przed auth

Decoder dopuszcza `logN <= 20, r <= 32, p <= 16`, a `maxmem = 256*N*r` (`TASK-511-02...md:217-218,233-251`). Maksymalny nagłówek może zażądać około 8 GiB pamięci plus ogromny CPU przed weryfikacją GCM. Import powinien akceptować dokładnie wspierany profil albo mały allowlist z serwerowym hard capem.

### II-511-H-06 — maintenance mode jest obietnicą bez kompletnego implementation contract

Headline wymaga settingu, public 503 i gate importu (`TASK-511-05...md:50-70`), ale lista ownerów nie obejmuje settings/publicSite/httpServer (`:367-397`), `importBackupFromUpload` nie sprawdza flagi (`:480-521`), a error mapping nie zawiera `backup_maintenance_required` (`:337-363,929-947`).

Co więcej, import `settings.json` może przywrócić `site.maintenanceMode:false` wewnątrz tx (`:783-789`), otwierając publiczny ruch po DB commit, ale przed media restore. Pozostawienie całego `/auth/*` dostępnym umożliwia też reset-confirm, który zmienia hasło i sesje (`authRoutes.ts:386-403`).

### II-511-H-07 — limit uploadu 2 GiB jest nieosiągalny i egzekwowany za późno

Kontrakt ustawia 2 GiB (`TASK-511-05...md:441-451`), lecz obecny pipeline:

- parsuje całe body przed session/rate-limit/CSRF/RBAC (`httpServer.ts:336-379`);
- używa pełnego `req.formData()` (`requestBody.ts:20-29`);
- nie ustawia `maxRequestBodySize` (`httpServer.ts:527-550`);
- Bun ma domyślnie 128 MiB (`node_modules/bun-types/serve.d.ts:674-678`).

Globalne podniesienie limitu tworzyłoby pre-auth multipart DoS. Potrzebna jest specjalna streaming route path z auth/rate/CSRF i Content-Length capem przed konsumpcją.

### II-511-H-08 — lokalny download buforuje multi-GB kilka razy

Plan to `readFile → base64 → JSON → atob → Uint8Array → Blob` (`TASK-511-06...md:116-140,469-482`). Base64 dodaje około 33% i duplikuje pamięć zarówno na serwerze, jak i w karcie. Download musi zwracać streaming Response/Bun.file, nie JSON.

### II-511-H-09 — remote create łamie główną obietnicę no-OOM

Kontrakt jawnie buforuje S3/Azure do jednego ArrayBuffer i zawęża no-OOM do local driver (`TASK-511-06...md:397-414,1028-1045`). To przeczy parent headline „scalable/no OOM at scale”. Finalny encrypted stream można spoolować do pliku, poznać size i wykonać multipart/`putAt` bez pełnego bufora.

### II-511-H-10 — table/migration model jest stale wobec aktualnego main

`ARCHIVE_TABLE_DESCRIPTORS` (`TASK-511-01...md:229-252`) nie obejmuje m.in.:

- `mediaFolders` oraz `media.folderId` FK (`schema.ts:1128-1164`);
- `dashboardLayouts` (`schema.ts:396-410`).

Restore może utracić drzewo folderów lub dostać FK mismatch; dashboard layout nie jest nawet sklasyfikowany. TASK-511-06 nadal opisuje migrację 0066 (`:66-74,506-535`), a main ma już `0066_dashboard_layouts.sql` i migracje do 0069; następna jest co najmniej 0070.

### II-511-H-11 — media restore nie jest atomowy i może niszczyć stare pliki

Local `putAt` zapisuje bezpośrednio do targetu (`TASK-511-03...md:190-197`), DB commit następuje przed media restore (`TASK-511-05...md:503-517`), a rollback storage jest jawnie wyłączony (`TASK-511-03...md:505-509`). Błąd w połowie może zostawić nową DB z częściowymi plikami, a write może wcześniej uciąć poprawny istniejący target.

Potrzebne są temp keys/paths, pełna walidacja, atomic promote/rename lub compensation journal; maintenance musi trwać przez promotion.

### II-511-H-12 — manifest validator nie jest strict mimo deklaracji

`validateManifest` sprawdza głównie top keys, table keys i `t.key` (`TASK-511-05...md:565-608`). Nie waliduje pełnych typów/ranges/formats `member,rowCount,byteSize,sha256,engineVersion,createdAt` ani nested media/users i ich unknown keys.

`seen.set(entry.name, …)` nie odrzuca duplicate physical members (`:618-668`), a przy `include:["users"]` brak `manifest.users` omija count check (`:733-736`). Potrzebny jest pełny exact schema, include-dependent required sections, canonical member names, unique physical names i per-member ceilings.

### II-511-H-13 — restore media omija właściwy byte/MIME trust boundary

TASK-511 wyznacza MIME z rozszerzenia i dopuszcza SVG/text/json (`TASK-511-03...md:443-460`), po czym zapisuje bytes bez ponownego sniffingu (`:489-496`). Normalny untrusted upload odrzuca markup/SVG i wymaga zgodności magic bytes (`mediaService.ts:284-317`), a local delivery ustala typ z pliku/rozszerzenia (`httpServer.ts:504-512`).

Crafted archive może więc umieścić aktywny same-origin HTML/SVG pod `/media/*`, dodatkowo z pominięciem `media:write` przez sam `backups:write`. Restore musi sprawdzić DB mime/key/bytes, wykonać byte sniff i odrzucić aktywny content przed zapisem.

### 19.2 Dalsze MEDIUM w TASK-511

- ustar zakłada nazwę <100 B, lecz `media/<storageKey>` nie ma limitu (`TASK-511-01...md:375-397`; `TASK-511-03...md:558-565`);
- 11-cyfrowy octal size field ma limit około 8 GiB/member, co przeczy „at any scale”;
- raw adapter errors, które według kontraktu mogą zawierać credentials, są logowane bez redakcji (`TASK-511-03...md:111-115,279-282,493-496,571-576`);
- `encryptBackupArchive` nie mapuje wszystkich source/gzip/scrypt errors do deklarowanego `backup_encrypt_failed` (`TASK-511-02...md:268-297,303-351`);
- UI ma rozpoznawać v2 Restore, ale `BackupItem` nie niesie version/format, a local `artifactPath` jest redagowany do `"local"` (`backupsClient.ts:16-26,173-177`);
- TASK-511-06 nadal ma nierozstrzygnięte pytania w `Open Questions` mimo parent decisions (`:1008-1045`);
- closure board arithmetic w TASK-511-07:451-454 jest już stale.

## 20. Findings MEDIUM/LOW w aktualnej implementacji

### II-M-01 — fixed 300 px rail clearance na wąskim viewport

Pages zawsze dostają `paddingRight:300` (`PageEditor.tsx:2610-2618`), Screens analogicznie (`ScreenAuthoringCanvas.tsx:520-524`), a panel ma max 280 px (`CanvasEditor.tsx:91-96`). Bez breakpointu 320–480 px zostawia prawie zerowy canvas.

### II-M-02 — TASK-497 szybkie Close może zgubić draft

Autosave ma debounce 1800 ms (`usePostAutosave.ts:16-21,44-54`), a Close bezwarunkowo nawiguje (`PostBlockEditorShell.tsx:620-625`). Nie ma dirty guard ani `flush()` przed wyjściem.

### II-M-03 — TASK-498 Publish/Custom Button są inert

Inspector oferuje `link|publish|custom` (`ScreenBlockInspector.tsx:960-990`), ale runtime tworzy anchor wyłącznie dla link; pozostałe akcje kończą jako `span` (`ScreenRuntimeRenderer.tsx:1229-1255`). Testy pokrywają tylko link.

### II-M-04 — TASK-498 tabs data nie jest strict

Normalizer cicho usuwa unknown nested keys i dopuszcza puste/duplicate IDs (`customScreenSchemas.ts:649-658`). Renderer używa ID jako React key i slot key (`ScreenRuntimeRenderer.tsx:1266-1285,1320-1324`). Reprodukcja potwierdziła duplicate IDs oraz silent unknown-key drop.

### II-M-05 — TASK-498/500 Button href nie przechodzi domain sanitizer

`button.href` przechodzi model (`customScreenSchemas.ts:660-665`), inspector i DOM (`ScreenBlockInspector.tsx:982-988`; `ScreenRuntimeRenderer.tsx:1229-1251`) bez `sanitizeAuthoringLinkHref`. React sam blokuje część `javascript:`, ale model nadal przechowuje m.in. data/vbscript/protocol-relative. Sanitizer powinien działać na write i ponownie na render seam.

### II-M-06 — related-list rejection może zostać trwałe

Preview i entry effects uruchamiają async IIFE bez `catch` (`CustomScreenWorkspacePreviewDialog.tsx:76-131`; `CustomScreenEntryEditor.tsx:815-867`). `listEntriesCached` zapisuje promise, ale nie czyści go w `finally` (`entriesClient.ts:261-272`), więc kolejne odczyty mogą odziedziczyć tę samą rejected promise.

### II-M-07 — related-list nie subskrybuje cache target entries

Entry editor słucha screen/current-entry keys, ale nie `cacheKeys.entriesList(target)` (`CustomScreenEntryEditor.tsx:716-739`). Zmiana powiązanego rekordu pozostaje niewidoczna do remountu lub innej zmiany dokumentu.

### II-M-08 — TASK-499 nie domyka strict/deterministic menu model

`normalizeMenuDocumentV2` nie odrzuca top-level unknown keys (`menuDocumentV2.ts:1563-1585`), generuje brakujące IDs (`:453-456,1529-1532`), nie sprawdza globalnej unikalności IDs ani topology „exactly one menu-bar, optional drawer”. Renderer/CSS konsumują `sections[0]` (`siteShell.tsx:655-708`; `menuDocumentCss.ts:983-987`). Reprodukcja przyjęła duplicate section/block IDs i drawer-only.

### II-M-09 — Design Editor może nadpisać pięciominutowy stale cache

Editor hydratuje cache, po czym wywołuje `getMenuWithItemsCached` bez force (`MenuDesignEditor.tsx:3081-3093,3124-3148`). Klient zwraca cache bez background requestu (`menusClient.ts:168-175`), TTL wynosi pięć minut (`cachePolicy.ts:1,23-26`), a Design Editor nie ma `cacheBus` subscription/dirty remote-update guard. Structure editor ma oba mechanizmy (`MenuEditorPage.tsx:458-563`).

### II-M-10 — TASK-502 canvas nie używa publicznego filtrowania

Canvas renderuje surowe items/children (`MenuDesignEditor.tsx:794-845`), podczas gdy front usuwa `logged_in` i rekurencyjnie filtruje niewidoczne/martwe elementy (`siteShell.tsx:224-246,675`). Canvas może więc pokazywać linki i sublisty, których anonimowy front nie wyrenderuje.

### II-M-11 — TASK-504 duplicate href daje wiele `aria-current="page"`

`resolveMenuActiveHref` zwraca tylko string href (`siteShell.tsx:143-165`), a każdy link o tej samej wartości zostaje ostemplowany (`:198-218`). Reprodukcja dwóch `/same` dała dwa current links. Winner powinien nieść identity/path key konkretnego itemu.

### II-M-12 — TASK-505 pusty dokument przepuszcza ghost binding

Oba write paths zachowują binding, gdy `blockIds.size === 0` (`customScreenSchemas.ts:1403-1409,1592-1606`), choć `reconcileScreenBindings` prawidłowo odrzuca każdy brakujący ID (`screenDocumentOps.ts:1021-1036`), a klient też wykrywa orphan (`CustomScreenEditorPage.tsx:118-153`).

Reprodukcja:

```json
{"bindings":[{"blockId":"ghost-block","field":"projectStatus"}],"warnings":{"removedFieldOrphans":[],"removedBlockOrphans":[]}}
```

Test `custom-screen-schemas.test.ts:1258-1279` obejmuje ghost przy co najmniej jednym live block, ale nie `blocks: []`.

### II-M-13 — TASK-507 level 1 nadal przecieka do jawnie wyłączonego level 2

L1 selector celowo pasuje także do głębszych linków (`menuDocumentCss.ts:507-510`), ale L2 `indicator:"none"` i `hoverUnderline:false` nic nie emitują (`:591-618`). TASK-507 opisuje tę klasę problemu (`TASK-507...md:72-89`), lecz poprawił tylko level 0 → dropdown (`:91-97`).

Reprodukcja:

```json
{"l1RuleReachesL2":true,"l2ResetRule":false,"l2UnderlineReset":false}
```

### II-M-14 — TASK-508 niespójny domyślny padding osi

Provider pokazuje `Default 6px` (`menuDocumentV2.ts:2536-2548`), ale jeśli autor ustawi tylko `containerPaddingX`, CSS dopełnia Y do 0 (`menuDocumentCss.ts:827-832`). Druga oś powinna dostać `MENU_SHELL_SUBLIST_PADDING`, przy zachowaniu zero bytes, gdy nie ustawiono żadnej osi.

### LOW / a11y / UX

- `PostsTable` robi cały `tr` klikalny bez keyboard semantics (`PostsTable.tsx:104-107`); w md..lg ukrywa też Author/Published bez mobile fallback (`:85-87,133-139`).
- `CanvasEditor` nakłada `aria-label` na div bez roli (`CanvasEditor.tsx:145-153`).
- screen entry wrapper `role="button"` zawiera linki/form controls (`ScreenRuntimeRenderer.tsx:680-725`).
- `normalizeScreenImageSrc` przez `startsWith("/")` dopuszcza protocol-relative/backslash forms (`customScreenSchemas.ts:592-605`), podczas gdy shared Pages sanitizer odrzuca `//` (`pageAuthoringSanitizers.ts:238-274`).
- komentarz mówi o per-user Screen entry preferences, ale storage key jest globalny (`useScreenEntryPreferences.ts:3-6,38,68-71`).

## 21. Proces, board, changelog i evidence drift

### II-P-HIGH-01 — bieżący strict security gate znów jest czerwony

`bun run scan:security:strict` zakończył się exit 1. Wyniki:

- Bun audit: bez HIGH;
- Trivy vulnerabilities/config: 0;
- Trivy secret + Gitleaks history/worktree: clean;
- container image scan: pominięty, brak `SECURITY_SCAN_IMAGE`;
- Semgrep: dwa findings:
  1. `_docs/_workflows/task-522-author.mjs:185` — manualnie false positive w tekście promptu;
  2. `core/services/pages/pageRendererV2.tsx:2724` — `dangerouslySetInnerHTML`, ten sam seam, który w części I doprowadził do potwierdzonego layout-escape przez `customSvg`.

TASK-509 sam był poprawnie zamknięty i jego 36/36 GitHub Actions refs nadal ma pełny SHA; nodemailer/overrides/settings-test isolation także są zachowane. To **downstream security-gate regression po TASK-509**, nie wada jego pierwotnej implementacji. Board claim „strict GREEN” jest historyczny, nie opisuje obecnego HEAD.

### II-P-HIGH-02 — TASK-510 rules nie są egzekwowane przez późniejsze workflow

`AGENTS.md:203-218` wymaga co najmniej pięciu rund, reconcile w każdej i false-clean protection; `:233-236` oczekuje około pięciu post-audit lenses.

- `task-531-534-author.mjs:103-138` ma jedno reconcile przed pętlą, maksymalnie trzy rundy, `filter(Boolean)` i brak expected-result count;
- `task-533-impl.mjs:72-109` ma tylko dwie post-audit lenses i ten sam missing-result problem.

Potrzebny wspólny `requireAllResults(expected)` i jedna kanoniczna pętla, zamiast lokalnych wariantów.

### II-P-HIGH-03 — runtime smoke evidence nadal nie jest trwałe

Dla TASK-495…TASK-510 liczba znalezionych na dysku obrazów z numerem taska wynosi:

| Task | Obrazy |
|---|---:|
| 495–499 | 0 każdy |
| 500 | 10 |
| 501 | 12 |
| 502–503 | 0 każdy |
| 504 | 5 |
| 505 | 0 |
| 506 | 1 |
| 507 | 6 |
| 508–510 | 0 każdy |

Globalnie jest 209 PNG, ale `git ls-files` nadal pokazuje 0 tracked, bo `.gitignore` ignoruje `*.png`. Jest to ten sam systemowy problem opisany w części I: obecność pliku na jednej maszynie nie jest trwałym dowodem closure.

### Dokumentacja/task graph

- wszystkie 100 fizycznych plików TASK-492…TASK-510 mają canonical `Status`; osiem plików TASK-511 również ma `⏳ To Do`;
- TASK-494 istnieje, ale nie ma board row;
- Done parents nadal pokazują dzieci jako To Do:
  - TASK-498 parent:124-127;
  - TASK-499 parent:116-120;
  - TASK-502 parent:452-456;
  - TASK-503 parent:328-331;
- TASK-504 parent deklaruje siebie jako własnego parenta (`TASK-504...md:5`);
- TASK-504-05 wskazuje changelog z datą 2026-07-02 (`:382`), a realny plik 1213 ma datę 2026-07-03;
- changelogi TASK-495…TASK-510 są kompletne i tworzą ciąg 1204…1219;
- board TASK-511 deklaruje authored/drift-audited contract, którego żaden plik nie jest tracked w repo.

## 22. Walidacja rozszerzenia

Poniższe uruchomienia częściowo się pokrywają; nie sumuję ich jako liczby unikalnych testów:

| Zakres | Wynik |
|---|---|
| Agent TASK-492…498: główne Vitest | 21 plików, 297/297 PASS |
| Agent TASK-492…498: sąsiednie kontrakty | 12 plików, 43/43 PASS |
| Agent TASK-492…498: Bun | 10 plików, 40/40 PASS |
| Agent TASK-499…504: Vitest | 24 pliki, 617/617 PASS |
| Agent TASK-499…504: Bun | 5 plików, 125/125 PASS |
| Agent TASK-505…511: Vitest | 7 plików, 475/475 PASS |
| Agent TASK-505…511: Bun | 3 pliki, 104/104 PASS |
| Niezależny szeroki Menu Vitest | 18 plików, 431/431 PASS |
| Niezależny Custom Screens Vitest | 38 plików, 323/323 PASS |
| Niezależny Posts/shared chrome Vitest | 78 plików, 406/406 PASS |
| Niezależny Bun menu/screens/posts | 8 plików, 128/128 PASS |
| `bun run scan:security:strict` | FAIL wyłącznie na 2 Semgrep findings opisanych wyżej |

CSS probes na prawdziwym `buildMenuDocumentCss` potwierdziły brak tablet neutralizers oraz L1→L2 leak. Event probe potwierdził anulowanie Space. TASK-511 nie ma kodu do uruchomienia; był audytowany jako kontrakt przeciwko aktualnemu runtime/schema/request pipeline.

Pełnego runtime smoke z części I nie powtarzałem, ponieważ od tamtego audytu nie zmienił się żaden plik produkcyjny. Nie mutowałem DB, aby sztucznie tworzyć menu/screen fixtures pod znalezione kombinacje; dowody dla nich pochodzą z realnych builderów, komponentów i targeted suites.

## 23. Co w tej kohorcie jest zrobione dobrze

- TASK-501 zachowuje poprawny desktop/tablet/mobile cascade w pierwotnym zestawie pól; problem dotyczy później dodanych semantycznych OFF values.
- TASK-499/500 mają solidne snapshot persistence, move-not-clone DnD, cycle guard i binding pruning dla normalnych delete flows.
- TASK-502 publiczna recursive nav zachowuje głębokość i keyboard-focusable linkless groups.
- TASK-503 style channel, clearable labels, image ratio i preference default-off są spójne poza wrapper keyboard bug.
- TASK-504 oryginalne text/image brand fields, level cascade, force-open preview i active-path threading są dobrze połączone.
- TASK-505 grid rendering, section style contract i field-orphan recovery są szeroko testowane; finding dotyczy jednego ważnego zero-block edge.
- TASK-508 kierunki, accordion i robust visibility/opacity flyout poprawiły realny wcześniejszy no-op.
- TASK-509 dependency/action hardening pozostaje obecne i poprawne.
- TASK-510 dobrze opisuje docelowy workflow; drift leży w konsumentach, nie w samym tekście reguł.
- TASK-492/493 mają sensowny physical parent/child podział i Security Contracts — trzeba poprawić treść, nie wyrzucać całej struktury.

## 24. Priorytet napraw po rozszerzonym audycie

1. **P0 / nie implementować TASK-511:** zamknąć CRITICAL RBAC escalation, aktywny-admin guard, streaming/backpressure/snapshot, upload transport, atomic media promotion, exact manifest i media sniffing; przenieść kontrakt na aktualny HEAD i przeprowadzić świeży audit loop.
2. **P0 / obecny produkt:** naprawić entry editor Space (II-H-04) oraz functional Tabs/Button seams (II-H-02/03).
3. **P1 / responsive menu:** wspólny matrix neutralizer dla wszystkich OFF/none/true-reset values, L1→L2 explicit off oraz `brand.iconColor` public responsive path.
4. **P1 / data loss UX:** dirty guards Screens, Posts flush/guard, related-list rejection/cache subscriptions.
5. **P1 / task contracts:** przepisać TASK-492 webhook/delivery, TASK-493 GSC/sitemap oraz rozbić/uzupełnić TASK-494.
6. **P2 / deterministic model:** menu top-level strictness, required/unique IDs, topology invariant, duplicate current-item identity.
7. **P2 / proces:** wymusić expected-agent counts, pięć reconcile rounds, około pięć post-audit lenses i wersjonowany smoke manifest/artifacts.
8. Po poprawkach: targeted Vitest/Bun, lint/types, strict security scan oraz co najmniej pięć realnych browser scenarios z visible effect/keyboard/computed CSS.

## 25. Ostateczny werdykt po 40 taskach

Rozszerzenie potwierdza wcześniejszy obraz: repo ma bardzo dobrą bazę techniczną i szerokie green test suites, ale testy często nie obejmują semantycznych wartości resetujących, realnego event bubbling ani pełnego authoring→persistence→public-render seam.

TASK-495…TASK-510 są zintegrowane; nie ma bezpiecznego powodu przywracać ich starych worktree. Nie są jednak „audit clean”: najpoważniejsze bieżące problemy to klawiatura Screens, niedokończone Tabs/Button oraz responsive menu reset cascade.

TASK-492…TASK-494 wymagają contract correction przed implementacją. TASK-511 jest jednoznacznie **BLOCKED** i musi pozostać zachowany jako worktree, dopóki jego untracked dane nie zostaną świadomie przeniesione albo porzucone przez właściciela. Jego aktualnego kontraktu nie wolno implementować literalnie.
