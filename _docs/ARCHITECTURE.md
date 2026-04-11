# WordPress-like CMS na Bun + React (core build + runtime pluginy)

Dokument jest wzorcem technicznym. Na jego podstawie rozpisujemy taski
dla core, store i pluginow.

## Cel projektu

Zbudowac nowoczesny CMS / sklep internetowy z doswiadczeniem developerskim
jak Next.js oraz doswiadczeniem uzytkownika jak WordPress.

## Zakres i nie-cele

Zakres:
- Core SSR + admin w React.
- Admin UI: shadcn/ui + Tailwind v4.
- Pluginy instalowane runtime bez rebuilda core.
- Store z prebuilt paczkami pluginow.
- Curation + skany bezpieczenstwa po stronie store.

Nie-cele:
- Uruchamianie nieufnego kodu w sandboxie (brak izolacji procesowej).
- Vite dev server w produkcji.
- Runtime-build calej aplikacji.

## Zalozenia techniczne i operacyjne

- Hosting typu VM/container z mozliwoscia zapisu na dysk.
- Persistent storage dla `plugins-runtime`.
- Dostep do sieci z core do store (download paczek).
- Core budowany w CI/CD (dist/client + dist/server).
- Pluginy dostarczane jako ESM bundlowane paczki (bez TS/TSX w runtime).
- Konfiguracje biznesowe (np. baseUrl, TTL) trzymamy w settings i ustawiamy z UI,
  bez restartu serwera. ENV zostaje tylko dla krytycznych wartosci infrastrukturalnych
  (np. `DATABASE_URL`, `MEDIA_SECRET_MASTER_KEY`).
- Ustawienia security middleware (CORS/CSRF/rate-limit/headers) konfigurowalne
  z Admin UI i stosowane runtime (bez restartu).

## Strategia testow i coverage (TASK-102 target)

Architektura testow musi byc zgodna z architektura produktu.
Nextless jest celowo WordPress-like na poziomie runtime:
- Bun pozostaje runtime kernelem,
- pluginy i widget bundles sa ladowane dynamicznie,
- runtime nie moze byc sztucznie podporzadkowany jednemu runnerowi tylko po to,
  aby uzyskac wygodniejszy raport coverage.

Docelowy podzial:
- Bun:
  - runtime kernel,
  - route/runtime integration,
  - plugin install/upgrade/rollback,
  - performance gates,
  - security gates,
  - wszystkie testy zalezne od `Bun.serve`, `Bun.file` lub realnego bundle lifecycle.
- Vitest:
  - pure TS domain/services,
  - admin/UI,
  - SDK contracts,
  - source-wide coverage dla kodu, ktory nie powinien zalezec od runtime Buna.

Zasady architektoniczne:
- `Bun.*` APIs trzymamy w waskich adapterach runtime.
- Domain i UI nie powinny znac runtime kernel details.
- Coverage interpretujemy per lane:
  - Bun coverage odpowiada na pytanie "czy runtime jest wykonany i strzezony?",
  - Vitest coverage odpowiada na pytanie "ktore pliki pure TS/UI nadal maja luki?".

Szczegolowy target model jest opisany w `_docs/TESTING_STRATEGY.md`.

## Pierwsze uruchomienie (Setup Wizard)

Po pierwszym logowaniu admin otrzymuje prosty Setup Wizard, aby ustawic:
- `site.publicBaseUrl` (publiczny URL, potrzebny m.in. do preview i linkow w mailach)
- `site.locale`, `site.name`
- `auth.sessionTtlDays` i `auth.resetTtlMinutes`

Wizard zapisuje dane do settings (DB) i oznacza konfiguracje jako zakonczona
przez `setup.completed=true`.

## Coderso admin IA (TASK-054)

- W admin sidebar jest jeden nadrzedny modul: `Coderso`.
- Domyslne moduly v1 (widoczne w sidebar):
  - `Engine` (`/admin/coderso/engine`) - content model builder (content types + schema).
  - `Entries` (`/admin/coderso/entries`) - wpisy rekordow typow z Engine.
  - `Screens` (`/admin/coderso/custom-screens`) - custom admin screens z widgetow dla danych entry.
  - `Widgets` (`/admin/coderso/widgets`) - biblioteka widgetow i template editor.
  - `Forms` (`/admin/coderso/forms`) - lista i edytor formularzy.
- `Posts` jest eksponowany jako top-level pozycja w `Main` (obok `Pages`) i nie jest czescia grupy `Coderso`.
  - **TASK-059 (done):** dedykowane tabele `posts`, `post_revisions`, `post_preview_tokens`, `post_term_assignments` sa aktywnie wykorzystywane przez posts domain service + admin posts API (TASK-059-02 i TASK-059-03),
  - UI editor posts jest odciety od `EntryEditor` (`TASK-059-04`): classic fallback realizuje `PostClassicEditorShell`, a `EntryEditor` jest entries-only,
  - runtime/listings/search source `posts` sa odciete od `content_entries` (`TASK-059-05`): public routes i listing query source `posts` czytaja dedykowane `posts` storage,
  - migracja danych historycznych posts (`TASK-059-06`) jest realizowana przez idempotentny backfill service:
    - source: `content_entries/content_revisions/preview_tokens/content_term_assignments/seo_documents(target=entry)`,
    - target: `posts/post_revisions/post_preview_tokens/post_term_assignments/posts.seo`,
    - trigger internal: `POST /admin/api/posts/migration/backfill` (`settings:write`, domyslnie `dryRun=true`),
    - parity mode: `shadowRead=true` zapisuje mismatch/failure report bez destrukcji legacy danych,
  - widget embedding (`TASK-059-07`): `posts-feed` jest dedykowanym widgetem dla pages buildera (source modes: latest/featured/category/manual) z runtime resolverem `resolvePostsFeedRuntimeData`,
  - internal API: `/admin/api/posts*` (CRUD + autosave/revisions/restore + publish/preview/duplicate/delete) pozostaje `internal` i egzekwuje RBAC `content:read/write/publish`,
  - final QA/closure (`TASK-059-08`) zakonczone: lint/types/full-tests + dokumentacja/changelog/kanban sa zsynchronizowane.
  - fallback mode flag: `settings["posts.editor.mode"] = "blocks" | "classic"` (query override: `?editor=classic` dla awaryjnego rollbacku),
  - **TASK-060 (done):** block editor UX zostal przebudowany do modelu unified canvas + ribbon:
    - jeden wspolny canvas renderuje wszystkie bloki wpisu i pozwala na inline editing bez przechodzenia do osobnego panelu content,
    - ribbon jest tabowany (`Home`, `Insert`, `Review`, `View`) i grupuje akcje jak Word-like authoring UX,
    - staly lewy panel insertera zostal usuniety; dodawanie blokow odbywa sie z ribbona (`Insert` + `Block library`) i przez slash command,
    - list view jest kompaktowym outline (`min 220 / max 320`) z labels-only (`{index}. {BlockLabel}`) i synchronizacja select/scroll,
    - panel `Details` jest otwierany na zadanie z ribbona i dziala kontekstowo (`Document` vs `Block`) bez resetu selekcji/focusu,
  - **TASK-061-01 (done):** UX contract dla writing-first post editing:
    - shared canvas pozostaje glownym miejscem pracy nad trescia,
    - ribbon prowadzi glowny flow akcji (insert/review/view),
    - outline/list view zostaje panelem nawigacyjno-informacyjnym,
    - dalsze taski `061-02+` rozwijaja smart paste i writing-canvas model danych.
  - **TASK-061-02 (done):** model danych `writing-canvas` jest aktywny w normalizerze:
    - nowy `PostBlockType`: `writing-canvas`,
    - typed payload `WritingCanvasContent` (`paragraph/heading/list/quote/image` nodes),
    - deterministic normalization + limits + compatibility hooks (`legacy adapter`, runtime excerpt fallback).
  - **TASK-061-03 (done):** smart paste pipeline dla authoringu postow:
    - nowy `postPasteNormalizer` mapuje `text/html` i `text/plain` do `writing-canvas` nodes,
    - payload z Word/Docs jest czyszczony przez `stripPostOfficeHtmlArtifacts` + rich-text sanitizer,
    - pipeline stosuje deterministic budgets (`html/text/node/list`) + graceful warnings,
    - `PostRichTextAdapter` interceptuje clipboard paste i wstawia bezpieczny payload z hintem dla usera przy degradacji.
  - **TASK-061-04 (done):** clipboard image paste dla post editora:
    - `PostRichTextAdapter` wykrywa obrazy w clipboard i wysyla je przez internal media upload,
    - `mediaClient.uploadClipboardImage` normalizuje obraz z clipboard (mime guard + deterministic filename fallback),
    - rich text schema/sanitizer wspiera bezpieczne inline `img` (`src`, `data-media-id`, `alt`, `loading`, optional dimensions).
  - **TASK-061-05 (done):** image wrap layout semantics dla writing canvas i runtime:
    - wspolny kontrakt `postImageWrapLayout` normalizuje `wrap`, `widthPercent`, `marginPreset`,
    - inspector i rich-text image controls wystawiaja user-friendly ustawienia (`Text wrap`, `Image width`, `Image spacing`),
    - renderer/canvas uzywaja wspolnych klas (`post-image-wrap-*`, `post-image-width-*`, `post-image-margin-*`) z mobile fallback (`max-width: 767px` => stacked/full-width).
  - **TASK-061-06 (done):** writing-first UI integration dla posts editora:
    - domyslny pusty dokument posta startuje od bloku `writing-canvas` (takze fallback po usunieciu wszystkich blokow),
    - ribbon `Insert` eksponuje quick actions dla nietechnicznego flow (`Add writing section`, `Add CTA block`, `Add embed block`, `Add image block`),
    - outline/list view pokazuje logiczne etykiety sekcji (`Writing canvas`, `CTA block`, `Embed block`),
    - `writing-canvas` jest edytowalny inline na wspolnym canvasie, a details panel pokazuje kontekstowe wskazowki dla writing flow.
  - **TASK-061-07 (done):** runtime renderer parity + backward compatibility:
    - `postBlockRuntimeMapper` i `postBlockRuntimeRenderer` obsluguja `writing-canvas` jako first-class runtime block (paragraph/heading/list/quote/image nodes),
    - read-path adapter (`adaptLegacyDocumentForRuntime`) grupuje legacy text blocks do segmentow `writing-canvas` bez destrukcyjnej migracji danych,
    - unsupported/non-convertible legacy blocks pozostaja renderowane w trybie legacy (bez utraty tresci),
    - runtime dokument niesie instrumentacje warningow (`warnings[]`) i publikuje diagnostyczne data-attrs w HTML.
  - **TASK-061-09 (done):** save sync strategy dla post editora:
    - autosave i save-before-preview uzywaja `silent sync` (bez `hydrate` reducera),
    - editor zachowuje lokalny canvas state bez wizualnego reloadu sekcji podczas runtime preview,
    - full `hydrate` pozostaje dla explicit refresh/restore flow.
  - **TASK-061-08 (done):** QA/docs/changelog closure dla writing-canvas i smart paste:
    - lint, types i pełny regression suite domkniete,
    - dokumentacja i changelog zsynchronizowane z finalnym kontraktem.
  - **TASK-062 (done):** dynamiczny spis tresci (TOC) dla posts:
    - nowy `toc` block type jest dostepny w inserterze/ribbon i moze byc umieszczony w dowolnym miejscu dokumentu,
    - runtime buduje heading index z `heading` blocks i `writing-canvas` heading nodes, a `toc` renderuje dynamiczne linki bez recznej synchronizacji,
    - anchor IDs sa deterministyczne i stabilne (`slug + dedupe`), z obsluga custom `anchorId` dla `heading` block attrs i `writing-canvas` heading nodes,
    - smart paste wykrywa statyczny Word TOC (`href="#_Toc..."`), usuwa martwe linki i emituje dyrektywe wstawienia dynamicznego `toc` blocka (idempotentnie, bez duplikatow).
  - **TASK-063-02 (done):** posts editor shell ma region architecture wzorowane na interface skeleton:
    - centralny state paneli jest utrzymywany przez `usePostEditorLayout` (list-view/inserter/details),
    - layout warstwa (`PostEditorLayout`, `PostEditorRegions`) rozdziela regiony `header/content/secondary-sidebar/sidebar/footer`,
    - secondary/details sidebary maja jeden kontrakt stanu dla desktop (`aside`) i mobile (`sheet`) bez duplikacji logiki panel actions.
  - **TASK-063-03 (done):** posts editor header zostal zmodularyzowany do osobnych klastrow toolbar/actions i utrzymuje lifecycle publish/preview/revisions.
  - **TASK-063-04 (done):** inserter zostal przeniesiony do dedykowanego sidebar flow:
    - `PostInserterSidebar` jest explicit secondary-sidebar dialogiem z close buttonem i `Escape` close contract,
    - block library (`BlockInserter`) wspiera category filters, searchable catalog i optional `Most used` sekcje,
    - focus return po zamknieciu insertera jest centralnie realizowany przez `useFocusReturn` (powrot na `Add` trigger).
  - **TASK-063-05 (done):** `Document Outline` sidebar dostal parity dla list/outline/stats:
    - secondary sidebar `PostListViewSidebar` zawiera taby `List view` i `Outline`,
    - stats selectors (`buildPostDocumentStats`) sa liczone deterministycznie z `PostBlockDocument` (words/chars/read-time/headings/paragraphs/blocks),
    - outline selectors (`buildPostDocumentOutline`) zbieraja headingi z `heading` blockow i `writing-canvas` nodes oraz sygnalizuja `empty heading`, `skipped level`, `multiple H1`,
    - stable heading anchors sa wspoldzielone z runtime mapperem (`resolvePostStableAnchorId`), wiec TOC/outline maja spójny anchor model.
  - **TASK-063-06 (done):** writing canvas insertion i smart paste parity:
    - insert orchestration zostala ujednolicona dla wielu entrypointow; finalny primary trigger jest opisany w `TASK-063-11` (left outline `+`),
    - insert orchestration jest wspolne dla 3 wejsc (`sidebar`, `slash`, `appender`) przez `resolvePostInsertMutation` i wspiera deterministic target (`after-selected`, `after-block`, `index`),
    - inserty ustawiaja focus na nowo dodanym bloku przez tokenized focus contract (`insertFocusToken` + primary editable marker),
    - smart paste hardening:
      - heading fidelity dla Word (w tym przypadki z `mso-outline-level` nadpisujace tag heading),
      - usuwanie statycznych Word TOC anchor links (`#_Toc...`) z retained content,
      - dynamic TOC directive dalej dziala idempotentnie przy pelnym wykryciu statycznego TOC.
  - **TASK-063-10 (done):** stitch template migration + focus mode:
    - shell jest wizualnie mapowany do referencji `_docs/UI/admin_panel/46-post-editor/code.html` (left outline rail, center canvas, right details),
    - layout state rozszerzono o `focusMode`; wlaczenie focus mode zamyka sidebars, full-width canvas i zapisuje preferencje lokalnie.
  - **TASK-063-11 (done):** strict HTML parity i unified article canvas:
    - lewy `Document Outline` ma primary insert trigger (`+`) i insert source `outline-plus`,
    - canvas renderuje spojny article flow (borderless blocks, bez card chrome) + title field (`Enter post title...`),
    - media/interactive blocks maja klikalne placeholdery, ktore ustawiają selekcje i przełączają prawy panel na `Block`,
    - prawy panel tabs zostaly ustalone jako `Post` i `Block` (selection-driven context),
    - header po prawej utrzymuje kontrakt `Preview`, `Publish`, `Gear` (+ revisions/focus toggles), a gear otwiera `PostEditorSettingsDialog`,
    - ustawienia edytora sa persistowane lokalnie (`nextless.posts.editor.preferences.v1`) i obejmuja m.in. compact side panels/focus on open.
  - **TASK-063-12 (done):** final reference parity pass dla `_docs/UI/admin_panel/46-post-editor/code.html`:
    - prawa kolumna `Post/Block` ma reference flow (`Publishing -> Categories/Tags -> Featured image -> Danger zone`) i progressive disclosure (`Advanced` collapsed),
    - `Move to trash` w `Danger zone` usuwa post i wykonuje SPA redirect do `/admin/posts` (`replace: true`),
    - gear settings modal jest przebudowany na grouped UX sections i rozszerzony model preferencji:
      - `editorDensity`,
      - `showKeyboardHints`,
      - `defaultInspectorTab` (`post`/`block`),
      - `restoreLastSidebarsState`,
    - persistence preferences jest dualna:
      - local-first (`nextless.posts.editor.preferences.v2` + compatibility write do `v1`),
      - background sync do internal `user-settings` key `posts.editor.preferences`,
    - focus mode ma deterministic snapshot restore side paneli po wyjsciu (`hide -> restore`), a layout restore jest zapisywany per user-session local state.
  - **TASK-063-07 (done):** details inspector tabs + preferences:
    - `PostDetailsSidebar` konsoliduje tabs `Post/Block` z fallbackiem do `Post` bez selekcji,
    - `usePostEditorPreferences` zamyka local-first + user-settings sync preferencji edytora,
    - inspector sekcje wspoldziela `InspectorSection`, a pola liczbowe sa clampowane do bezpiecznych zakresow.
  - **TASK-063-08 (done):** keyboard shortcuts, focus, i accessibility:
    - `usePostEditorShortcuts` utrzymuje centralny rejestr skrotow (inserter/overview/details/escape),
    - `useFocusReturn` przywraca focus do triggerow (`Add`, `Document overview`, `Details`),
    - regiony edytora maja spójne landmarki/aria labels, a toolbar buttons wystawiaja `aria-keyshortcuts`.
  - **TASK-063-14 (done):** richtext command reliability + contextual formatting model:
    - command execution zostalo domkniete przez deterministic engine (`postRichTextCommandEngine`) dla komend blokowych/list/alignment,
    - `PostRichTextAdapter` mapuje command dispatch do engine i zachowuje stabilny flow selection restore,
    - contextual toolbar profile routing jest scentralizowany (`resolveToolbarProfileForBlockType`) i spina kontrakt visibility per block type,
    - ownership split toolbar vs inspector jest finalny: dla blokow tekstowych formatting/alignment/text-scale sa toolbar-owned, inspector zostawia pola layout/runtime-level i block-specific attrs.
  - **TASK-063-15 (done):** section (`writing-canvas`) caret/Enter hardening + command persistence + grouped toolbar:
    - `writing-canvas` edycja dziala na live draft HTML (bez per-keystroke lossy rewrite modelu), a commit do nodes odbywa sie na granicach commit (`blur`),
    - parser/serializer `writing-canvas` utrzymuje intencjonalne puste paragrafy po `Enter` i `Enter+Enter`,
    - semantyka `align` i `code-block` jest utrwalona w modelu (`align` per node, `quote.variant = "code"`) i mapowana do runtime renderingu,
    - toolbar dla profilu `writing-canvas` wspiera grouped controls `Headings`, `List`, `Code`,
    - `clear-formatting` usuwa inline marks/linki bez degradacji struktury blokowej.
  - **TASK-063-16 (done):** section paragraph/quote node-boundary commands:
    - komendy `paragraph` i `quote` w `Section` maja deterministic fallback, gdy edytor chwilowo nie ma block wrappers (`p/h*/blockquote/ul/ol/pre`),
    - fallback opakowuje root HTML do poprawnego bloku (`p` / `blockquote`), dzieki czemu command result jest utrwalany w modelu `writing-canvas` jako node type,
    - roundtrip kontrakt (`html -> nodes -> html`) utrzymuje typ `paragraph`/`quote` bez degradacji po `blur/reselect`.
  - runtime parity: public detail i preview dla posts korzystaja z jednego block-render pipeline (`postBlockRuntimeMapper` + `postBlockRuntimeRenderer`) z fallbackiem dla legacy danych.
- Pelny katalog modulow v1-v3 (Core Builder, Business Builder, Growth Builder)
  jest utrzymywany w rejestrze `core/admin/ui/navigation/codersoModules.ts`
  i opisany w `_docs/CODERSO_MODULES.md`.
- Sidebar Coderso jest budowany z rejestru przez
  `buildDefaultNavSections(flags)` + `buildCodersoNavItems(flags)`,
  co pozwala wlaczac przyszle moduly przez feature flags bez przepisywania menu.
- Legacy sciezki admina sa wspierane przez aliasy i normalizowane do canonical routes
  (np. `/admin/content-types` -> `/admin/coderso/engine`).
- Alias dziala rowniez dla nested routes (np. `/admin/content-types/:id/schema`).
- Logika canonicalizacji jest centralna w `core/admin/utils/adminPaths.ts` i jest wspolna dla:
  - renderowania linkow admin (`resolveAdminHref`),
  - route matchingu (`resolveAdminRoutePath`),
  - prefetch (`core/admin/utils/adminPrefetch.ts`).
- Prefetch admina jest traktowany jako low-priority cache warmup:
  - `force: false` (bez wymuszonego refetch),
  - skip dla aktywnej trasy/modulu,
  - fresh-window + cooldown throttling,
  - kolejka z limitem rownoleglych prefetchy.
- TASK-058 (Admin Cache/Prefetch/Request Stability) jest zamkniety:
  - global reads (`auth bootstrap`, `assistant runtime`, `admin theme profiles`) maja dedupe/single-shot policy,
  - pages/menus nie wymuszaja mount-force refetch przy istniejacym cache,
  - closure validated przez `lint + lint:types + bun test` i perf/security gates.

## Assistant Doc Navigator (Phase A + A2)

Aktualny fundament asystenta (bez LLM) sklada sie z warstw:
- `core/services/assistant/docsIngestService.ts` (ingest `docs/` -> DB + ingest runs)
- `core/services/assistant/docsDbRetriever.ts` (DB-backed ranking/search)
- `core/services/assistant/docsAnswerComposer.ts` (content-first deterministic answer templates)
- `core/services/assistant/assistantService.ts` (DB-only assistant runtime)

Przeplyw runtime:
1. `assistantService` czyta official assistant corpus status z DB ingest tables.
2. Runtime wykonuje retrieval na `assistant_doc_chunks`.
3. Official assistant corpus w `docs/` jest uznawany za gotowy dopiero po seedzie do DB.
4. Gdy DB corpus nie jest gotowy, runtime zwraca stan `not ready`.
5. `docsDbRetriever` stosuje ranking intent-aware: BM25 + section/path priors + metadata docs (`productArea`, `title`, `keywords`) + exact module/screen phrase boosts + cross-area penalties dla obcych domen.
6. Confidence nie zalezy juz tylko od `topScore`; uwzglednia tez domain alignment, query coverage i score gap.
7. `docsAnswerComposer` wykonuje doc-first evidence selection:
   - najpierw wybiera dominant document/surface,
   - potem wybiera najlepsza sekcje (`Basic`, `Medium`, `Instruction`, `Advanced` + helper sections) zalezne od intentu pytania i zadanego `detailLevel/guideMode`.
   - user-facing `surface` label jest oparty o canonical doc metadata (`title`), a nie o heading sekcji.
8. Runtime wspiera conservative `clarifying_question`, gdy top docs pozostaja niejednoznaczne; assistant woli wtedy dopytac niz zwrocic pewna, ale zla odpowiedz.
9. `docsAnswerComposer` sklada odpowiedz (`location_answer`, `how_to_answer`, `clarifying_question`, `missing_answer`) z tresci top evidence, a nie z listy plikow.
10. Final answer korzysta z `chunk.content`, a nie z krotszego preview `snippet`, ktory pozostaje warstwa search/evidence.
11. Docs-only answer zachowuje strukture paragrafow, numerowanych krokow i list wyboru, a UI renderuje je jako czytelne bloki zamiast jednego zlanego tekstu.
12. Procedural pytania `how/use` preferuja `Instruction/Step By Step`; `Basic/Medium` pozostaja wspierajacym kontekstem.
13. Runtime przyjmuje optional `detailLevel` (`basic|medium|instruction|advanced`) i `guideMode` (`default|troubleshooting|decision_guide|checklist|security`) dla deterministic section targeting.
14. Gdy canonical doc ma juz dedykowana sekcje helper-mode (`Troubleshooting`, `Decision Guide`, `Checklist`, `Security`), to ona staje sie primary body dla follow-up answer zamiast byc mieszana z redundant default guidance.
15. Response moze zawierac `followUpOptions[]`, ktore prowadza usera do kolejnego poziomu szczegolowosci lub trybu pomocniczego w tej samej tematyce.

Przeplyw reindex:
1. `POST /assistant/reindex` uruchamia ingest z fixed source root `docs`.
2. Wyniki ingest trafiaja do `assistant_docs`, `assistant_doc_chunks`, `assistant_doc_ingest_runs`.
3. Reindex wykonuje tez cleanup osieroconych rekordow `assistant_docs`, gdy plik
   zostal usuniety z aktualnego source root i nie powinien juz pozostawac w DB-only corpus.

Zasady runtime:
- Official assistant corpus korzysta z root `docs/` jako source-of-truth.
- Seed do DB jest warunkiem gotowosci official assistant corpus.
- Przy braku trafienia system zwraca `missing_answer` (bez halucynacji).

## Assistant LLM mode + Admin UI integration (Phase B)

Rozszerzenie `llm-rag` korzysta z provider abstraction:
- `core/services/assistant/providers/providerTypes.ts`
- `core/services/assistant/providers/openRouterProvider.ts`
- `core/services/assistant/providers/index.ts`
- `core/services/assistant/assistantQuota.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`

Zasady:
- provider jest uruchamiany tylko gdy retrieval zwroci snippets,
- brak konfiguracji providera albo blad requestu powoduje fallback do `docs-only`,
- odpowiedz API zawiera `llm` metadata (`provider`, `model`, `providerRequestId`, `usage`) lub `null`.
- quota layer egzekwuje request limits (`per-user` + optional global) oraz optional token budget dla `llm-rag`.
- observability layer zapisuje metryki: request/error/fallback/no-hit/latency.
- audit events rejestruja fallback mode i provider failures bez wycieku sekretow.

Warstwa Admin UI:
- `core/admin/ui/layouts/AdminShell.tsx` montuje floating launcher asystenta poza topbarem.
- `core/admin/ui/assistant/AssistantPanel.tsx` renderuje launcher + okno rozmowy.
- `core/admin/ui/assistant/AssistantMessage.tsx` pokazuje fallback badge, confidence i sources.
- Warstwa UI jest answer-first: glowna odpowiedz jest primary output, a `Sources` nie sa domyslnie pokazywane zwyklemu userowi.
- Launcher jest widoczny tylko gdy globalne `assistant.enabled=true`.
- Launcher lazy-loaduje runtime dopiero przy otwarciu okna rozmowy i ma jawne stany `loading`, `error`, `disabled`, `ready`.
- Floating launcher moze byc przesuwany przez usera w obrebie viewportu admina.
- Launcher domyslnie uzywa ikony wiadomosci; gdy globalny avatar launchera jest skonfigurowany, uzywa surface avatara.
- Launcher ma czytelny idle state i mocniejszy active state; hover nie moze byc jedynym sposobem ujawnienia affordance.
- Starter prompts i composer sa renderowane dopiero po `runtime ready`.
- `docs not ready` jest traktowane jako minimalistyczny runtime status w surface rozmowy, a nie jako ekran konfiguracji.
- Okno rozmowy jest anchored floating panelem wychodzacym z launchera, a nie pelnym prawym `Sheet`.
- Transcript jest scrollowalny pionowo, dlugie wiadomosci sa zawijane wewnatrz panelu, a composer pozostaje oddzielony od overflow treści.
- User moze delikatnie rozszerzyc szerokosc okna rozmowy, ale tylko w granicach bezpiecznego viewport clamp.
- Konfiguracja globalna pozostaje w `core/admin/ui/settings/AssistantSettingsPage.tsx`; okno rozmowy nie renderuje globalnych ustawien assistant runtime.
- `core/admin/services/assistantClient.ts` obsluguje:
  - `/assistant/status`, `/assistant/chat`, `/assistant/reindex`,
  - `/assistant/actions/plan`, `/assistant/actions/dry-run`, `/assistant/actions/execute`.
- Globalne ustawienia launchera (`assistant.launcher.avatarEnabled`, `assistant.launcher.avatarAsset`) sa trzymane w `settings`.
- Legacy per-user klucze assistant UI moga nadal istniec w `user_settings`, ale nie steruja juz widocznoscia floating launchera.
- `AssistantPanel` wspiera teraz dwa user-facing flow:
  - `Docs Assistant` dla docs-only navigation/Q&A,
  - `LLM Guide` dla setup-planning prompts prowadzacych do typed plan + dry-run + execute review.

## Assistant Action Engine (Initial LLM Guide Slice)

Pierwszy runtime slice `TASK-101-09` nie buduje osobnego toru zapisu.
Zamiast tego:
- `core/services/assistant/actionPlannerService.ts` mapuje prompt do typed planu,
- `core/services/assistant/actionExecutorService.ts` reuse’uje obecne serwisy domenowe,
- `core/server/routes/assistantRoutes.ts` wystawia internal action endpoints,
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` i `ActionExecutionResult.tsx`
  domykaja review/confirm UX w panelu asystenta.
- `core/services/assistant/adminContextCatalogNormalizer.ts` i `adminContextCatalogs.ts`
  buduja bounded/redacted resource catalog snapshot dla `LLM Guide` bez dodawania osobnego flow.

Resource catalog context:
- `POST /assistant/actions/plan` moze otrzymac `context.includeResourceCatalog=true`.
- Route enrichuje wtedy context o `resourceCatalog` z:
  - content types,
  - custom screens,
  - listing queries/templates,
  - forms + fields,
  - widgets/templates.
- Snapshot jest schema-versioned, deterministic, limitowany budzetem i redaguje secret-like keys.
- Docs-only chat nie hydratuje resource catalogu i pozostaje docs-corpus driven.

Aktualnie zaimplementowany biznesowy flow:
- prompt o katalog projektow domow,
- planner tworzy plan dla:
  - content type,
  - custom screen,
  - listing query,
  - listing template,
  - public catalog page,
  - public detail routes,
- execute wykorzystuje:
  - `typeService`,
  - `customScreenService`,
  - `listingQueriesService`,
  - `listingTemplatesService`,
  - `pageService`,
  - `settingsService`,
- bez dodawania assistant-only direct DB write paths.

## Assistant Site Builder (LLM Guide Site-Kit Entry Point)

Warstwa domain:
- `core/services/assistant/siteBuilderExecutor.ts` odpowiada za kontrakt:
  - `previewGuidedSiteBuilderPlan` (`plan + actions + modules`),
  - `executeGuidedSiteBuilder` (`execute + validation`),
  - `validateGuidedSiteBuilderRun` (post-run checks i unresolved items).
- `core/services/assistant/siteBuilderPlanAdapter.ts` trzyma czysty adapter planu site-kit, aby `actionPlannerService` mogl budowac `site-kit.*` akcje bez import-time coupling do DB/runtime installera.

Warstwa API:
- Site-kit flow uzywa tylko `/assistant/actions/*`.
- `POST /assistant/actions/plan` z `context.siteKit` zwraca typed plan z `site-kit.recommend` + `site-kit.install`.
- `POST /assistant/actions/dry-run` previewuje `site-kit.*` akcje.
- `POST /assistant/actions/execute` uruchamia `site-kit.install` przez istniejacy solution kit installer i moze wykonac `site-kit.validate`.
- `site-kit.*` akcje wymagaja `llmAvailable=true`; nie moga przejsc jako docs-only/RAG fallback.
- Stare `/assistant/site-builder/*` endpointy nie sa rejestrowane jako osobna surface.
- Wszystkie endpointy sa internal i CSRF-protected.

Warstwa UI:
- `core/admin/ui/setup/AiSiteWizard.tsx` jako orchestrator stanu/wykonania.
- `core/admin/ui/setup/AiSiteWizardSteps.tsx` jako modularny renderer krokow.
- Step `Plan review` pokazuje explainable action map (`step -> target -> resource`).
- Step `Execute` pokazuje walidacje (`ok/warning/failed`) i `unresolvedItems`.

## Terminologia

- Core: glowna aplikacja (SSR + admin).
- Plugin: rozszerzenie funkcji core (server + admin).
- Store: serwis dystrybucji pluginow, skanow i podpisow.
- Registry: stan zainstalowanych pluginow w DB.
- Runtime storage: katalog `plugins-runtime` z paczkami pluginow.

## Dokumentacja SDK

Szczegoly API dla autorow pluginow znajduja sie w osobnym dokumencie:
`SDK_SPEC.md`. To jest jedyny dozwolony interfejs integracji pluginu z core.

## Dokumentacja Store

Specyfikacja store, pipeline publikacji i wymagania bezpieczenstwa
znajduja sie w `STORE_SPEC.md`.

## Dokumentacja CMS

Zakres CMS, model danych, auth i security opisane sa w:
- `CMS_SPEC.md`
- `CMS_API.md`
- `CONTENT_TYPES_SPEC.md`
- `DATA_MODEL.md`
- `DESIGN_TOKENS.md`
- `MEDIA_SPEC.md`
- `ORM_SPEC.md`
- `PAGE_MODEL.md`
- `PREVIEW_SPEC.md`
- `AUTH_SPEC.md`
- `RBAC_SPEC.md`
- `THEMES_SPEC.md`
- `SEARCH_SPEC.md`
- `AUDIT_SPEC.md`
- `SECURITY_SPEC.md`

---

## Public runtime rendering (pages)

- Public rendering i runtime preview korzystaja z tego samego pipeline w `core/server/publicSite.tsx`.
- Pipeline: resolve danych strony (published vs draft) -> normalizacja template key -> resolver theme/plugin/core -> render runtime page shell.
- Navigation runtime hydration rozstrzyga `linksSource` (manual/menu/pages) przed renderem; tryb `pages` respektuje `settings.showInNav`.

## SEO Manager (v1)

- Metadane SEO i wyniki audytu przechowywane w `seo_documents`.
- Admin UI korzysta z endpointów `/seo` oraz `/seo/audit`.
- Entry Editor zapisuje opis SEO do `seo_documents` (targetType = `entry`), niezaleznie od danych `content_entries.data`.

## Admin Users & Roles (v1)

- Uzytkownicy trzymani sa w tabeli `users`, role w `roles`, mapowanie w `user_roles`.
- Endpointy `/admin-users` i `/admin-roles` obsluguja CRUD + role assignment.
- Katalog permissions jest dostarczany z API i wykorzystywany w macierzy uprawnien.

## Redirects (v1)

- Przekierowania trzymane w tabeli `redirects` z kodami 301/302/307/308.
- Admin UI zarzadza redirectami przez `/redirects`.

## Forms (v1)

- Definicje formularzy sa w tabeli `forms`, pola w `form_fields`.
- `forms` przechowuje:
  - fallback submission (success message + redirect URL),
  - `submission_access` (public/internal),
  - `settings` (layout mode, save-progress, step titles, preset, automation retry policy).
- Submissions trafiaja do `form_submissions` (payload JSONB, ip, userAgent).
- Automatyzacje formularza sa trzymane w `form_actions` (ordered pipeline per form).
- Historia wykonania akcji jest trzymana w `form_action_runs` (success/failed/skipped + retry link).
- Admin UI buduje formularze w `/forms` i zapisuje pola przez `/forms/:id/fields`.
- Admin UI zarzadza pipeline przez `/forms/:id/actions` i logami przez `/forms/:id/action-runs`.
- Publiczny submit odbywa sie przez `POST /forms/:id/submissions` (nonce + opcjonalna reCAPTCHA, zaleznie od Security Settings).
- Runner `formAutomationRunner` wykonuje akcje po zapisie submission:
  - `email`, `webhook`, `entry_sync`, `redirect`, `success_message`,
  - warunki `always|equals|not_equals|exists|not_exists`,
  - auto-retry per formularz (exponential backoff) + retry failed runs przez `POST /forms/action-runs/:runId/retry`.
- Runtime widget `form-embed` wspiera:
  - inline submit (bez przejscia na surowy JSON),
  - multi-step flow na podstawie `forms.settings` + `field.settings.step`,
  - local progress save/restore (opt-in przez `saveProgress`).

## Coderso Listings engine (v1 beta)

- Listings to warstwa query + template do budowy dynamicznych list bez custom kodu.
- Admin API (internal, session/RBAC) udostepnia:
  - `/listings/queries/*` (saved query presets + preview),
  - `/listings/templates/*` (reusable output contracts).
- Query contract jest deklaratywny i walidowany (`listingSchemas`, `queryBuilderService`):
  - source: `entries | posts | users | taxonomies`,
  - allowlisted filters/sort/fields,
  - hard caps dla limit/offset/filter budget.
- Template contract (`listingTemplatesService`) jest data-only:
  - `fields`, `itemActions`, `emptyState`, `style`,
  - warunki widocznosci `conditions` per field binding.
- Runtime widgets (`content-list`, `entry-teaser`) konsumują tylko resolved payload:
  - `source.mode=legacy` (dotychczasowy content-type flow),
  - `source.mode=listing` (listing query/template flow),
  - back-compat: brak `mode` + `listingQueryId` => tryb listing.
- Security:
  - endpoints Listings sa internal (`content:read/write`), bez public write API,
  - public runtime dla entries/posts wymusza `includeDrafts=false` poza preview.

## Coderso Custom Screens (v1 foundation)

- Definicje ekranow admina z widgetow sa w `custom_screens`:
  - `name`, `contentTypeId`, `schemaVersion`, `blocks`, `bindings`, `status`,
  - `showInSidebar`, `sidebarLabel` dla szybkich skrotow w admin nav.
- `customScreenService` trzyma CRUD + normalizacje:
  - `blocks` sa walidowane przez widget schema + normalizer,
  - `bindings` mapuja `widgetId + propPath` -> field key i sa wykonywane przez `bindingResolver`.
- Shortcut model:
  - tylko `active` screen z `showInSidebar=true` moze trafic do lewego menu,
  - skrot jest renderowany po grupie `Coderso`,
  - link prowadzi do `/admin/coderso/custom-screens/:screenId/entries`,
  - `sidebarLabel` nadpisuje domyslna nazwe screena, ale jest opcjonalny.
- Builder (`/admin/coderso/custom-screens/:id`) ma trzy warstwy pracy:
  - screen settings,
  - widget-level bindings dla zaznaczonego bloku,
  - bound preview, ktory materializuje drzewo widgetow przed renderem przez `WidgetRenderer`.
- `Screens` nie korzysta juz z calej public/page widget library:
  - insert library filtruje do surface `custom-screen-builder`,
  - screen-only widgets (`screen-record-header`, `screen-field-value`, `screen-field-group`, `screen-two-column`) sa ukryte w `Coderso/Widgets`,
  - wspoldzielone prymitywy layoutowe musza byc jawnie dopuszczone do obu surface'ow.
- Kazdy custom screen ma derived capabilities:
  - `collection-only`: brak dedykowanego record screen; shortcut zawęża tylko liste rekordow,
  - `dashboard`: screen moze previewowac dane rekordu, ale edycja zostaje w classic editor,
  - `editor`: screen ma writable bindings i moze pelnic role dedykowanego record editor.
- Workflow rekordow custom screen korzysta z istniejacego domain `entries`, bez nowego storage:
  - list route: `/admin/coderso/custom-screens/:screenId/entries`,
  - editor route: `/admin/coderso/custom-screens/:screenId/entries/:entryId`,
  - `contentTypeId` z `custom_screens` jest rozwiazywany do `content_types.slug`, a zapis/listowanie dalej ida przez `content_entries`.
- Record workflow jest gate'owany przez capabilities:
  - `collection-only` prowadzi rekord bezposrednio do classic editor,
  - `dashboard` otwiera read-only screen z CTA do classic editor,
  - `editor` pokazuje tylko pola wynikajace z `write/readwrite` bindings i zapisuje standardowy `entry.data`.

## Coderso Filters & Search (v2 beta)

- Filtry runtime bazuja na URL-tokenach `lq.<queryId>.*` i sa parsowane przez `filterEngine`.
- `listing-filters` i `search-box` dzialaja SSR-first:
  - serwer hydratuje stan filtrowania i metryki facetow,
  - klient synchronizuje URL i robi partial HTML refresh listing blockow.
- API:
  - internal preview: `POST /admin/api/filters/preview` (RBAC),
  - public search: `GET /api/search` (published-only index dla pages/entries/posts).
- Cache policy:
  - odpowiedzi HTML z query parametrami sa pomijane przez page cache, aby uniknac stale filtrowanych widokow.

## Coderso Booking (v1 foundation)

- Booking domain (internal admin API + RBAC) opiera sie o tabele:
  - `booking_resources`,
  - `booking_services`,
  - `booking_service_resources`,
  - `booking_schedules`,
  - `booking_blackouts`,
  - `bookings`.
- Core flow:
  - admin definiuje zasoby, uslugi, mapowania i tygodniowe okna dostepnosci,
  - slot preview wylicza kandydaty i odrzuca kolizje (aktywne rezerwacje + blackouts),
  - rezerwacja przechodzi przez status lifecycle (`pending|confirmed|cancelled|completed|no_show`).
- Security:
  - endpoints `/admin/api/booking/*` sa internal i wymagaja `booking:read` / `booking:write`,
  - runtime API zachowuje stale publiczne endpointy (`/api/booking/slots`, `/api/booking/reservations`),
  - access mode jest per-service (`booking_services.settings.submissionAccess`):
    - `public`: slots wymagaja `runtimeToken`, reservations wymagaja nonce (+ optional reCAPTCHA `public_write`),
    - `internal`: slots/reservations wymagaja sesji admina lub API key scope `booking.submit`, bez nonce/captcha,
  - bledy domenowe sa mapowane do stabilnych kodow API (bez 500 dla znanych przypadkow).
- Admin UI:
  - ekran `/admin/coderso/booking` grupuje operacje domenowe w zakladkach:
    - `Resources`
    - `Services`
    - `Availability`
    - `Reservations`
    - `Slot Preview`
  - lokalna warstwa cache/prefetch (`bookingClient` + `adminPrefetch`) utrzymuje WordPress-like responsiveness przy przechodzeniu miedzy ekranami.
- Runtime widgets:
  - `booking-calendar` publikuje selected slot event po `flowId`,
  - `appointment-form` konsumuje selected slot po `flowId` i tworzy rezerwacje przez public API,
  - resolver runtime (`resolveBookingRuntimeData`) hydratuje active services/resources + submission nonce.

## Coderso Commerce (v1 preview)

- Commerce domain (internal admin API + RBAC) opiera sie o tabele:
  - `commerce_products`,
  - `commerce_collections`,
  - `commerce_product_collections`.
- Internal admin API (`/admin/api/commerce/*`) udostepnia:
  - product CRUD + collection assignment,
  - collections CRUD,
  - deterministic query endpoint (`POST /commerce/products/query`).
- Runtime widgets:
  - `product-gallery`,
  - `product-compare`,
  - `product-table`.
- Public runtime:
  - dane commerce widgetow sa hydradowane SSR przez internal services (`publicSite` + `commerceWidgetRuntime`),
  - brak publicznych endpointow `/api/commerce/*` w v1.
- Checkout/cart abstraction:
  - registry adapterow z fallbackiem `internal_noop`,
  - rozszerzalnosc pluginowa przez filter hook:
    - `commerce:checkout:adapters`,
  - niepoprawne payloady pluginow sa ignorowane, fallback core pozostaje aktywny.

## Coderso Engagement (v3 preview)

- Engagement domain obejmuje:
  - mega-menu metadata na `menu_items.settings`,
  - popup lifecycle (`popups`),
  - review lifecycle (`reviews`).
- Internal admin API (`/admin/api/*`) udostepnia:
  - `/popups` CRUD + `PATCH /popups/:id/status`,
  - `/reviews` CRUD + `PATCH /reviews/:id/status`.
- Security contract:
  - endpointy popups/reviews sa internal-only i wymagaja RBAC (`popups:*`, `reviews:*`),
  - w v1 brak publicznych endpointow `/api/popups` i `/api/reviews`.
- Navigation/runtime contract:
  - menu metadata jest normalizowana server-side i mapowana do `navigation.items[].meta`,
  - shape `meta` jest deterministyczny (`visibility`, `badge`, `description`, `icon`).
- Utility widgets dla engagement flows:
  - `tabs`,
  - `accordion`,
  - `toggle-block`.

## Coderso Solution Kits (v3 preview foundation)

- `Solution Kits` dostarcza typed katalog starterowych verticali (5 kitow) i deterministiczny planner.
- Internal admin API (`/admin/api/*`):
  - `GET /solution-kits`,
  - `GET /solution-kits/:id`,
  - `POST /solution-kits/plan`,
  - `POST /solution-kits/:id/apply`,
  - `POST /solution-kits/:id/rollback`,
  - `GET /solution-kits/runs`,
  - `GET /solution-kits/runs/:runId`.
- Security:
  - endpointy sa internal-only i wymagaja RBAC,
  - read: `solution-kits:read`,
  - mutate (`apply`/`rollback`): `solution-kits:write`.
- Planner contract:
  - wejscie: profil biznesu + cele + locale (+ opcjonalny preferred kit),
  - wyjscie: `recommendedKitId`, `confidence`, `steps[]` (`editable`, `affectsResources`), `settingsPatch`, `notes`,
  - wynik jest deterministiczny dla identycznego inputu.
- AI wizard guided execution contract:
  - flow: `profile -> goals -> recommendation -> review -> execute`,
  - review pozwala ograniczyc execution do `enabledStepIds`,
  - apply endpoint dostaje typed `plan` payload, backend filtruje `resourceBlueprint` przed install run,
  - run metadata (`run.options.wizard`) przechowuje plan snapshot do `rerun` i `clone as draft`.
- Admin navigation focus contract:
  - selected kit moze byc persistowany client-side jako active admin preference,
  - `AdminShell` wyprowadza z niego `CodersoFeatureFlags`,
  - gating dotyczy tylko grupy `Coderso`; top-level `Main/Tools/Admin` pozostaja bez zmian,
  - `Solution Kits` pozostaje widoczne niezaleznie od aktywnego kitu.
- Install engine foundation (service + DB):
  - `solution_kit_install_runs` trzyma execution context (`dry_run|apply|rollback`, status, summary),
  - `solution_kit_install_items` trzyma per-resource trace (operation + snapshots + rollback_action),
  - apply jest idempotentny po kluczach zasobow (`slug` / `location`) i moze dzialac partial-safe,
  - rollback jest best-effort i odtwarza snapshoty dla `update` oraz usuwa zasoby `create`.
- Nested installer strategy (content packs):
  - `content_type`: sync schema + taxonomy state (`content_taxonomies`, `content_terms`),
  - `form`: sync metadata + replace fieldset (`form_fields`),
  - `page`: sync page payload + SEO defaults (`seo_documents`, `targetType=page`),
  - `menu`: resolve `pageSlug -> pageId` and replace menu tree (`menu_items`),
  - nested data jest takze snapshotowane dla rollback (`beforeSnapshot` / `afterSnapshot`).


## Media delivery access

- Storage settings rozszerzono o `delivery.accessMode`:
  - `public` (default)
  - `internal`
- Runtime `GET /media/*` jest bramkowany przez ten tryb:
  - `public`: obecne zachowanie (public delivery),
  - `internal`: wymagana sesja admina (z `media:read`) lub API key scope `media.read`.
- Dotyczy to runtime delivery assetow; admin CRUD media pozostaje na `/admin/api/media*` i RBAC.

## Backups (v1)

- Backupy w v1 to **metadata-only** zapisane w tabeli `backups`.
- Harmonogram trzymany jest w `backup_schedules` i konfigurowany z Admin UI.
- Storage driver dla backupu jest brany z ustawien storage (local/s3/azure).
- Faktyczne tworzenie/restore plikow backupu realizuje przyszly worker/plugin.

## Kluczowe decyzje architektoniczne

- Core budowany produkcyjnie (Vite SSR: client + server).
- Pluginy prebuilt po stronie dev/store.
- Instalacja pluginu = download + verify + unpack + register + load.
- Brak rebuilda core i brak redeployu przy instalacji pluginow.
- Trust by curation: store skanuje i podpisuje paczki.
- Brak sandboxu: plugin dziala w tym samym procesie co core.

---

## Schematy

### 1) Kontekst systemu (prod)

[Browser]
   |
   v
[Bun HTTP Server]
   |-- SSR renderer (dist/server)
   |-- Admin UI (dist/client)
   |-- Plugin loader (registry)
   |-- Static assets (dist/client + plugins dist)
   v
[DB] <-> [plugins-runtime]
   ^
   |
[Store API] (list, download, signature, revocation)

### 2) Build pipeline

Core (CI/CD):
source -> vite build (client) -> dist/client
source -> vite build --ssr -> dist/server

Plugin (dev/store):
source -> build (server ESM + client ESM + CSS) -> paczka ZIP
store -> skany + podpis -> publikacja

### 3) Lifecycle pluginu

Install:
store list -> download -> verify -> unpack -> register -> load

Update:
download nowej wersji -> verify -> unpack obok -> switch version -> (opcjonalny rollback)

Disable:
wylaczenie w registry -> hooki nieaktywne -> UI ukryte

Uninstall:
usuniecie z registry -> usuniecie katalogu -> cleanup assets

---

### 4) Polityka update i rollback (v1)

Update mode (default: auto-security):
- manual: update tylko po akcji admina
- auto-security: auto update tylko dla patch z flaga security
- auto-all: auto update dla kazdej zgodnej wersji
  - auto-security wymaga `release.type=security` w metadata

Update (manual/auto):
- download nowej wersji do temp
- verify podpisu + checksum
- unpack do nowego katalogu wersji
- check: apiVersion, coreVersion, revocations
- smoke-load: import `dist/server.mjs` w try/catch
- switch aktywnej wersji atomowo w registry

Rollback:
- automatyczny rollback do poprzedniej wersji, jesli smoke-load fail
- manualny rollback z panelu admina

Retention:
- domyslnie trzymamy 2 ostatnie wersje (configurable)
- starsze wersje usuwane po udanym update

Pinning:
- admin moze "pin" wersje, aby blokowac auto update

---

### 5) Strategia ladowania pluginow (v1)

Server:
- domyslnie eager load wszystkich aktywnych pluginow przy starcie
- opcjonalny lazy load przez `PLUGINS_LOAD_STRATEGY=lazy`
  (ladowanie przy pierwszym uzyciu hooka/route)

Client:
- lazy load UI pluginu przy wejscu na jego strone admina
- CSS pluginu dolaczany tylko gdy UI pluginu jest aktywne

---

## Struktura repozytorium (docelowa)

/core
  /server               (Bun HTTP, SSR, routing)
  /admin                (Admin app)
  /ui                   (shared UI)
  /plugins              (loader, registry, permissions)
  /store                (klient store + weryfikacja podpisu)
  /schemas              (JSON schema manifestu)
  /db                   (migracje, modele)
  /config               (konfiguracja + defaulty)

/packages
  /sdk                  (publiczny SDK dla pluginow)

/store                  (backend Store)
  /server
  /db
  /services

/themes
  /default
  /<theme-name>

Theme registry:
- Core skanuje `/themes` przy starcie i laduje `theme.json`.
- Meta (name/version/tokens/templates) trzymane w memory cache.

Admin UI themes:
- **Admin UI Theme** jest osobnym systemem (nie korzysta z `/themes`).
- Template'y i profile admina sa trzymane w DB (`admin_theme_templates`, `admin_theme_profiles`).
- Admin UI korzysta z granularnych tokenow (`--admin-*`) mapowanych do shadcn vars w `core/admin/styles/globals.css`.
- UI: **Visual → Admin UI Theme** (pickery + export/import JSON).

/dist                   (output build)
  /client
  /server

/plugins-runtime        (NIE W GIT!)
  /seo-boost/1.0.0
  /payments-stripe/2.3.1

/data
  plugins.db

---

## Core build (Vite SSR)

Wymagane outputy:
- dist/client: assety klienta (admin + public).
- dist/server: entry SSR dla Bun.

Oczekiwana konfiguracja build:
- `vite build --outDir dist/client`
- `vite build --outDir dist/server --ssr src/entry-server.tsx`

Core nie kompiluje pluginow w runtime.

---

## Specyfikacja paczki pluginu

Format: ZIP

Wymagane pliki:
/plugin.json
/dist/server.mjs          (ESM, server runtime)
/dist/client.mjs          (ESM, admin/editor UI)
/dist/style.css           (CSS pluginu)

Opcjonalne:
/public/                  (statyczne assety pluginu)

Wymagania build:
- ESM, bez TS/TSX w runtime.
- Wszelkie zaleznosci zewnatrz bundlowane.
- Dozwolone externale (v1):
  - react
  - react-dom
  - react/jsx-runtime
  - react/jsx-dev-runtime
  - @core/sdk/server
  - @core/sdk/client
  - @core/sdk/shared
- Brak `node_modules` w paczce.

---

## Manifest pluginu (plugin.json)

{
  "id": "seo-boost",
  "name": "seo-boost",
  "version": "1.0.0",
  "targetApiVersion": "1",
  "targetCoreVersion": ">=0.1.0 <0.2.0",
  "entry": {
    "server": "dist/server.mjs",
    "client": "dist/client.mjs",
    "styles": "dist/style.css"
  },
  "provides": {
    "modules": ["widgets", "plugin:seo-boost/custom-module"],
    "widgets": ["plugin:seo-boost/hero-pro"],
    "presets": ["plugin:seo-boost/landing-a"],
    "templates": ["plugin:seo-boost/footer-a"],
    "routes": ["/sync"]
  },
  "permissions": [
    "content:read",
    "content:write",
    "admin:ui"
  ],
  "dependencies": ["forms-plus"],
  "featureFlags": ["seo-beta"],
  "migrations": [{ "id": "001_init", "file": "migrations/001.sql" }],
  "metadata": {
    "title": "SEO Boost",
    "description": "Meta tagi i sitemap",
    "author": "Acme",
    "homepage": "https://example.com"
  },
  "integrity": {
    "sha256": "..."
  }
}

Weryfikacja:
- core normalizuje aliasy legacy:
  - `apiVersion` -> `targetApiVersion`
  - `coreVersion` -> `targetCoreVersion`
- core sprawdza kompatybilnosc API/core, dependencies i contribution contract.
- podpis i metadane zaufania dostarcza store (oddzielnie od plugin.json).

---

## Wersjonowanie SDK i kompatybilnosc

- `apiVersion` w manifest mapuje sie na major `@core/sdk`.
- `coreVersion` definiuje zakres kompatybilnych wersji core.
- Core odrzuca pluginy z niekompatybilnym `apiVersion` lub `coreVersion`.
- Szczegoly: `SDK_SPEC.md`.

---

## Store i pipeline publikacji

Pipeline po stronie store:
1. Dev publikuje paczke ZIP.
2. Store wykonuje skany (SAST, CVE, licencje).
3. Store podpisuje paczke i publikuje metadata.

Minimalne API store:
- GET /plugins (lista)
- GET /plugins/:name (detale)
- GET /plugins/:name/versions/:version/metadata
- GET /plugins/:name/versions/:version/metadata.sig
- GET /plugins/:name/versions/:version/download
- GET /revocations.json

Weryfikacja podpisu:
- core posiada publiczny klucz store.
- signature dostarczana jako `metadata.sig` (ed25519, base64).
- szczegoly podpisu: `STORE_SPEC.md`.

---

## Instalacja pluginu (core)

Algorytm:
1. Pobranie paczki do temp.
2. Weryfikacja signature + sha256.
3. Rozpakowanie do temp.
4. Walidacja manifestu (schema + wersje).
5. Atomowy move do /plugins-runtime/<name>/<version>.
6. Rejestracja w DB (enabled=true).
7. Runtime load (import server.mjs).

Zasady:
- Instalacja nie przebudowuje core.
- W razie bledu -> cleanup i status "error".

---

## Runtime loader (server)

Zachowanie:
- Loader importuje `dist/server.mjs` dla kazdego aktywnego pluginu.
- ESM cache utrzymuje moduly per wersja.
- Zmiana wersji = zmiana sciezki -> nowy import.
- Disable = usuniecie z registry (hooki nie sa wywolywane).
- Safe mode (`PLUGINS_SAFE_MODE=1`) uruchamia core bez pluginow.
- Auto-disable po przekroczeniu progu bledow (default: 3, `PLUGIN_ERROR_THRESHOLD`).
- Licznik bledow i `last_error` przechowywane w registry.

Kontrakt pluginu (server):
- eksport `default function register(ctx)`.
- brak efektow ubocznych przy imporcie (logika tylko w register).

---

## Admin UI loader (client)

Zachowanie:
- dynamiczny import `dist/client.mjs` tylko dla aktywnych pluginow.
- dolaczenie `dist/style.css` do strony admina.

Kontrakt pluginu (client):
- eksport `registerAdmin(ctx)` oraz `registerBlocks(ctx)` (v1).

---

## System hookow (server)

API core:
- addAction(name, fn)
- addFilter(name, fn)

Przyklady:
- addAction("content:save", (payload, ctx) => {})
- addFilter("render:html", (html, ctx) => html)
- addAction("admin:menu", (payload, ctx) => {})
- addFilter("commerce:checkout:adapters", (payload, ctx) => payload)

Hook handler zawsze dostaje `ctx` (request/session/user) jako drugi argument.

Commerce checkout adapters (v1):
- Core dostarcza domyslny adapter `internal_noop`.
- Registry checkout moze byc rozszerzony przez filtr:
  - `commerce:checkout:adapters`
- Filtr dostaje payload:
  - `{ adapters: Record<string, Adapter>, defaultKey: string }`
- Niepoprawne payloady pluginu sa ignorowane; fallback `internal_noop` jest zawsze zachowany.

---

## Admin UI (pluginy)

API core (SDK):
- registerAdminPage({ path, title, component })
- registerDashboardWidget(...)
- registerSettingsSection(...)

Plugin moze:
- dodac pozycje menu
- dodac strone ustawien
- dodac widget dashboardu

---

## Dashboard aggregate service (TASK-099-01)

Cel:
- uniezaleznic ekran Dashboard od mockow i zasilic go jednym payloadem backendowym.

Warstwa:
- `core/services/dashboard/dashboardTypes.ts`:
  - kontrakt DTO (`DashboardPayload`) dla API i UI.
- `core/services/dashboard/dashboardService.ts`:
  - agreguje `totals` (pages/entries/media/users),
  - buduje `recentEdits` przez merge: pages + content_entries + media,
  - oblicza summary storage (`usedBytes`, optional percent),
  - buduje summary security na bazie `security.settings`.

Uwagi:
- `recentEdits` sortowane globalnie malejaco po czasie po merge.
- MVP nie dodaje osobnego subsystemu telemetry ruchu (visitors/pageviews).

---

## Bloki / komponenty tresci

Edytor oparty o JSON schema.

Plugin rejestruje blok:

registerBlock({
  type: "seo/meta",
  schema,
  render,
  editor
})

Blok pojawia sie natychmiast w CMS.

---

## Widgety (core v1)

Pierwsza wersja core musi zawierac podstawowe widgety, ktore pozwalaja
zbudowac pelnoprawna, zaawansowana strone (np. typu mabudo.pl):

- hero section
- timeline (bez dat; etapy/proces w formie osi)
- compare timeline (porownanie dwoch procesow na jednej osi)
- newsletter
- kontakt
- menu/nawigacja
- stopka

Wymagany model konfiguracji (dla wszystkich widgetow, pluginow i addonow):
- Wizard: kreator pytan, wybor wariantu i szybka konfiguracja.
- Visual: glowny tryb edycji content/style, warianty + sekcje wizualne;
  widget moze przejac wariant selector (`visualOwnsVariantSelection`).
- Advanced: tryb techniczny (spacing/layout/responsive + pola eksperckie),
  bez duplikowania podstawowych pol z Visual.
- Zawsze mozna przejsc do Advanced po wstepnej konfiguracji.

Composite-first delivery (Coderso):
- default flow: `All widgets` (composite + atomic),
- secondary helper flow dla nietechnicznych userow: `Recommended` (composite widgets),
- widget metadata contract:
  - `complexity` (`composite|atomic`),
  - `audience` (`beginner|intermediate|advanced`),
  - `module`,
  - `surfaces` (`page-builder|widget-library|custom-screen-builder`),
  - optional `presets[]` i `requires[]`,
- admin widget library filtruje po `module`, `complexity`, i surface `widget-library`.
- `Screens` uzywa osobnego widget surface `custom-screen-builder`.
- module pack matrix:
  - minimum per module: `1 page preset`, `2 section presets`, `3 composite widgets`,
  - enforcement profile: `strict` (runtime gate) / `advisory` (gap reporting),
  - runtime validator: `validateModulePackMatrix({ strictOnly: true })`.

Szczegoly: `WIDGETS.md`.

---

## Routing pluginow (server)

Wersja v1:
- Pluginy rejestruja endpointy pod prefiksem
  `/api/plugins/<plugin-name>/*`.
- Rejestracja przez SDK:
  registerRoute({ method, path, handler, permission? })
- hardening:
  - write methods wymagaja jawnego `permission`,
  - permission musi byc zadeklarowany w manifescie pluginu,
  - path musi byc bezpieczny (`/path`, bez `..`, query/hash),
  - gdy plugin deklaruje `provides.routes`, runtime wymaga zgodnosci.

Cel:
- webhooki (platnosci, integracje).
- brak kolizji z core.

---

## Public assets pluginu

- `/plugins-runtime/<name>/<version>/public` mapowane na
  `/plugins/<name>/<version>/...`
- Cache-Control dla assetow statycznych (long cache).
- Plugin powinien generowac URL przez `ctx.assets.getUrl("...")` zamiast
  hardcode sciezek.
- Dla pracy po stronie servera: `ctx.assets.getPublicPath("...")` zwraca
  bezpieczna sciezke do assetu.

---

## Tailwind CSS

- Tailwind NIE jest generowany per request.
- Plugin dostarcza skompilowany CSS w `dist/style.css`.
- Core nie przebudowuje Tailwinda przy instalacji pluginu.
- Watcher Tailwinda dziala po stronie autora pluginu (dev) lub store (build).
- Safelist w konfiguracji pluginu zapewnia klasy dynamiczne (np. `bg-${color}-500`).
- W prod core nie uruchamia tailwindcss.
- Design tokens sa preferowanym sposobem stylowania w pluginach.

---

## Bezpieczenstwo (trust by curation)

- Store wykonuje skany bezpieczenstwa i CVE.
- Paczki sa podpisane, core weryfikuje podpis i hash.
- Brak sandboxu: plugin dziala w tym samym procesie co core.
- Permissions w manifestach sa warstwa logiczna, nie izolacja.
- Revocation: lista zablokowanych wersji pluginow.

---

## Model uprawnien (v1)

Przyklady:
- content:read
- content:write
- admin:ui
- payments:write
- settings:read
- settings:write

Zasady:
- Plugin deklaruje permissions w manifest.
- Admin akceptuje permissions przy instalacji.
- Core moze blokowac wywolania API bez zgody.

---

## Dane i schema (DB)

Tabela `plugins` (przykladowa):
- id
- name
- version
- apiVersion
- enabled
- status (installed|disabled|error)
- permissions (json)
- entry (json)
- integrity (json)
- signature (text)
- installedAt
- updatedAt
- lastError
- errorCount

Tabela `plugin_settings`:
- pluginName
- key
- value
- updatedAt

---

## Konfiguracja (env)

Przykladowe zmienne:
- PLUGINS_RUNTIME_DIR=/plugins-runtime
- PLUGINS_SAFE_MODE=1
- PLUGIN_ERROR_THRESHOLD=3
- PLUGIN_TIMEOUT_MS=5000
- STORE_BASE_URL=https://store.example.com
- STORE_PUBLIC_KEY=...
- PLUGIN_MAX_SIZE_MB=50
- PLUGIN_DOWNLOAD_TIMEOUT_MS=30000
- PLUGIN_VERIFY_STRICT=true
- PLUGINS_LOAD_STRATEGY=eager
- PLUGIN_KEEP_VERSIONS=2
- PLUGIN_UPDATE_MODE=auto-security

---

## Observability

Wymagane:
- logi instalacji (download, verify, unpack, load).
- logi update/rollback (version switch, failure reason).
- logi bledow pluginow z wersja i nazwa.
- metryki: czas instalacji, czas load, liczba error.

---

## Performance

- Server: eager load aktywnych pluginow (default), lazy opcjonalnie.
- Client: lazy load UI pluginu na zadanie.
- CSS pluginow ladowany tylko w adminie.
- Cache assets pluginow z dlugim TTL.
- Importy per wersja (ESM cache).

---

## Deploy

Core:
- deploy przez Git/CI
- build produkcyjny (Vite SSR)

Pluginy:
- pobierane runtime ze store
- trzymane na persistent storage (plugins-runtime)
- brak redeployu po instalacji

Po deployu:
- registry pluginow ladowane z DB
- runtime laduje aktywne pluginy z /plugins-runtime

---

## Znane ryzyka i mitygacje

### 1. React Dependency Hell (Singleton Problem)
Ryzyko:
- Plugin laduje wlasna kopie `react` lub `react-dom` w `node_modules`.
- Powoduje to blad "Invalid Hook Call Warning" lub bledy kontekstu (Context API).
- Core i plugin musza wspoldzielic DOKLADNIE te sama instancje Reacta.

Mitygacja:
- Rygorystyczne `externals` w konfiguracji bundlera pluginu (zdefiniowane w `SDK_SPEC.md`).
- Linting w Store: odrzucenie paczki, jesli zawiera `react` w bundle.
- Runtime check: core sprawdza, czy plugin nie nadpisuje globalnych symboli Reacta.

### 2. Stabilnosc procesu (Shared Process)
Ryzyko:
- Plugin dziala w tym samym watku/procesie co Core (brak izolacji V8/WASM).
- `while(true)` lub wyciek pamieci w pluginie "zabija" caly serwer.
- Nieobsluzony wyjatek w `render()` pluginu moze polozyc caly SSR.

Mitygacja:
- **Safe Mode**: Uruchomienie serwera z flaga `--safe` wylacza ladowanie pluginow, umozliwiajac wejscie do panelu i wylaczenie wadliwego pluginu.
- **Error Boundaries**: Core owija widgety i strony pluginow w React Error Boundary, aby blad renderowania nie sypal calym UI.
- **Timeouts**: Limity czasu na wykonanie hookow server-side (jesli mozliwe bez workerow).
- **Auto-disable**: Po przekroczeniu progu bledow plugin jest automatycznie wylaczany (z logiem i audytem).
- **Watchdog**: Monitoruje timeouts/wyjatki i oznacza plugin jako unhealthy.

### 3. Ograniczenia stylowania (Tailwind JIT)
Ryzyko:
- Plugin uzywa klasy `bg-[#123abc]`, ktora nie istnieje w CSS Core.
- Tailwind JIT dziala tylko w czasie budowania Core.

Mitygacja:
- Plugin musi dostarczyc wlasny CSS (`dist/style.css`) dla niestandardowych stylow.
- Plugin powinien uzywac systemu stylow/zmiennych Core (Design Tokens) zamiast hardcodowanych wartosci.
- Safelisting: Autor pluginu musi zadbac o wygenerowanie uzywanych klas w swoim CSS buildzie.

### 4. Bezpieczenstwo danych
Ryzyko:
- Plugin ma dostep do `globalThis` i moze teoretycznie czytac pamiec procesu (env vars, keys).

Mitygacja:
- Model "Trust by Curation" (Store).
- Audyt kodu (manual/automated) przed publikacja.
- Brak sandboxu to swiadomy trade-off dla wydajnosci i DX w v1.
