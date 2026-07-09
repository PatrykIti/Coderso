# Audyt repozytorium, workflow, worktree i 20 ostatnich tasków

**Data audytu:** 2026-07-09

**Repozytorium:** `/home/coder/project/Coderso`

**Audytowany HEAD:** `6224c1de2aa2823e189ee5e3f60ad201828b89cc`

**Branch:** `feature/tasks-fixes` (zgodny z `origin/feature/tasks-fixes`)

**Charakter pracy:** read-only review kodu i kontraktów tasków, testy, runtime smoke oraz bezpieczne porządki Git. Nie poprawiałem opisanych defektów produkcyjnych.

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
