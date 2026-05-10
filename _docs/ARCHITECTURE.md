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
Coderso jest celowo WordPress-like na poziomie runtime:
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

## Advanced admin IA (TASK-054)

- W admin sidebar jest jeden nadrzedny modul techniczny: `Advanced`.
- `Coderso` pozostaje nazwa produktu; nie jest nazwa grupy nawigacyjnej.
- Domyslne moduly v1 (widoczne w sidebar):
- `Engine` (`/admin/advanced/engine`) - content model builder (content types + schema).
  - Collection workspace route:
    `/admin/advanced/engine/:contentTypeId/collection`.
- `Entries` (`/admin/advanced/entries`) - wpisy rekordow typow z Engine.
  - `Screens` (`/admin/advanced/custom-screens`) - custom admin screens z widgetow dla danych entry.
  - `Widgets` (`/admin/advanced/widgets`) - biblioteka widgetow i template editor.
  - `Forms` (`/admin/advanced/forms`) - lista i edytor formularzy.
- `Posts` jest eksponowany jako top-level pozycja w `Main` (obok `Pages`) i nie jest czescia grupy `Advanced`.
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
    - ustawienia edytora sa persistowane lokalnie (`coderso.posts.editor.preferences.v2`, z legacy fallbackiem `nextless.posts.editor.preferences.v1`) i obejmuja m.in. compact side panels/focus on open.
  - **TASK-063-12 (done):** final reference parity pass dla `_docs/UI/admin_panel/46-post-editor/code.html`:
    - prawa kolumna `Post/Block` ma reference flow (`Publishing -> Categories/Tags -> Featured image -> Danger zone`) i progressive disclosure (`Advanced` collapsed),
    - `Move to trash` w `Danger zone` usuwa post i wykonuje SPA redirect do `/admin/posts` (`replace: true`),
    - gear settings modal jest przebudowany na grouped UX sections i rozszerzony model preferencji:
      - `editorDensity`,
      - `showKeyboardHints`,
      - `defaultInspectorTab` (`post`/`block`),
      - `restoreLastSidebarsState`,
    - persistence preferences jest dualna:
      - local-first (`coderso.posts.editor.preferences.v2` + compatibility write do `v1`),
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
  jest utrzymywany w rejestrze `core/admin/ui/navigation/advancedModules.ts`
  i opisany w `_docs/CODERSO_MODULES.md`.
- Sidebar Coderso jest budowany z rejestru przez
  `buildDefaultNavSections(flags)` + `buildAdvancedNavItems(flags)`,
  co pozwala wlaczac przyszle moduly przez feature flags bez przepisywania menu.
- Legacy sciezki admina sa wspierane przez aliasy i normalizowane do canonical routes
  (np. `/admin/content-types` -> `/admin/advanced/engine`).
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

## Assistant LLM Guide mode + Admin UI integration (Phase B)

Rozszerzenie `llm-guide` korzysta z provider abstraction:
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
- quota layer egzekwuje request limits (`per-user` + optional global) oraz optional token budget dla `llm-guide`.
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
- `core/services/assistant/actionPlannerService.ts` orkiestruje prompt -> typed plan,
- `core/services/assistant/actionPlanSchema.ts` waliduje strict nested action-plan schema,
- `core/services/assistant/actionPlanHeuristics.ts` trzyma pure prompt/context heuristics,
- `core/services/assistant/actionRegistry.ts` trzyma whitelistowany registry action handlers,
- `core/services/assistant/actionExecutionStore.ts` zapisuje replay-safe idempotency results w DB,
- `core/services/assistant/actionExecutorService.ts` reuse’uje obecne serwisy domenowe,
- `core/server/routes/assistantRoutes.ts` wystawia internal action endpoints,
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` i `ActionExecutionResult.tsx`
  domykaja review/confirm UX w panelu asystenta.
- Resource-operation review UI distinguishes create/update/delete/archive/detach/restore/blocked actions, shows destructive and blocked preview states before execute, renders partial execution counts, and redacts secret-like dynamic text from preview/result payloads.
- `core/services/assistant/adminContextCatalogNormalizer.ts` i `adminContextCatalogs.ts`
  buduja bounded/redacted resource catalog snapshot dla `LLM Guide` bez dodawania osobnego flow.
- `core/services/assistant/cmsOperationDraftSchema.ts`, `assistantOperationPolicy`,
  and `cmsTargetResolver.ts` add the generic CMS operation foundation inside the
  same planner flow.
- Legacy `cmsResourceRegistry.ts` has been removed; resource aliases, operations,
  filters, field intents, follow-up counts, safety rules, and coverage metadata
  are read from `assistantOperationPolicy`.
- TASK-189 closed the policy remediation after the TASK-188 audit: provider output
  is operation-draft-only, provider `actions[]` are not adapted into executable
  plans, shared-kind settings/admin resources keep exact policy identity, and
  provider-side local-first CMS/admin one-offs were removed.
- TASK-189-05 hardened that cutover by removing the remaining planner-owned
  CMS/admin resource branches from `actionPlannerService.ts`. The planner now
  orchestrates local/provider `CmsOperationDraft` construction plus product
  blueprint dispatch; CMS/admin aliases, gated/read-only behavior, active target
  resolution, selected-block patches, media references, post/media gating,
  safety checks, and action mapping are owned by `assistantOperationPolicy`,
  `cmsTargetResolver.ts`, and `cmsOperationActionMapper.ts`.
- TASK-188 closed the policy cutover: provider guidance, resolver/filtering,
  action mapping/safety, follow-up state, and live coverage validation now use
  the operation policy as the source of truth. Route/domain RBAC, CSRF, strict
  action schemas, idempotency, and domain services remain authoritative for
  execution.
- CMS operation drafts support `surfaceHint` plus allowlisted filters so UI
  locations such as `Screens` or `Engine` do not become resource target names.
- `core/services/assistant/cmsOperationActionMapper.ts` maps resolved CMS operation
  drafts to existing strict typed actions. It does not add executor paths; dry-run
  and execute still dispatch through `actionExecutorService.ts` and domain services.
- `core/services/assistant/cmsPlanningState.ts` stores bounded advisory candidate
  memory for follow-up prompts. Follow-up pronouns, count words, and candidate
  selection are resolved through `operationPolicy/followUpPolicy.ts` from
  `assistantOperationPolicy`. The browser can pass this state back to
  `/assistant/actions/plan`, but the server normalizes it and re-resolves targets
  through the current resource catalog before any mutation plan is produced.
- Resource catalog snapshots now include bounded page summaries when the plan route
  requests server-side resource context; page data payloads stay out of the catalog.
- `core/services/assistant/blueprints/businessBlueprintTypes.ts` defines the shared business blueprint pack contract used to wrap current catalog-family presets without changing their generated action plan output.
- `core/services/assistant/blueprints/blueprintCapabilitySchema.ts` and `blueprintCapabilityRegistry.ts` now layer strict capability metadata on top of the current executable packs and adjunct/gated modules without introducing a second executor boundary.
- `core/services/assistant/blueprints/blueprintCandidateResolver.ts`, `blueprintCompositionGraph.ts`, `blueprintConflictResolver.ts`, `blueprintSchemaMerger.ts`, `blueprintFacetMerger.ts`, `blueprintCardConfigMerger.ts`, `blueprintActionAssembler.ts`, `blueprintExistingResourceMatcher.ts`, and `blueprintCompositionMetadata.ts` provide the current `TASK-190` composition foundation: capability candidates, graph fragments, typed route/resource/field/media/permission conflict detection, validator-backed content schema merge, schema-backed listing facet/card merge, projection widening for required listing runtime fields, blocking gated-domain surfacing, catalog-backed existing-resource reuse, strict review diagnostics, and typed action assembly now keep supported multi-capability and primary-plus-gated setup requests on the composed planner path before provider drafting can bypass them, while single-pack setup/refinement routing plus generic detail-page resource packaging remain deferred to later `TASK-190` rollout leaves.
- `core/services/assistant/blueprints/blueprintPageSectionTypes.ts` and `blueprintPageSectionLibrary.ts` add the first `TASK-190-05` page-section layer: assistant-facing aliases/slots now resolve deterministically to existing page-builder widgets plus alias-specific `modulePackMatrix` helper mappings, unsupported aliases such as `steps` stay gated until a real widget/preset owner seam exists, and raw media URLs are rejected until the assistant has trusted media-library ids.
- `core/services/assistant/blueprints/blueprintPageSectionComposer.ts` and the widened `page.upsert` contract add the next `TASK-190-05` slice: canonical collection pages now assemble listing/filter/form blocks through the existing widget owner, while `PageData.settings.collectionLink` persists canonical list-page linkage inside the current page owner seam for later workspace/no-duplicate leaves.
- `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts` adds the first `TASK-190-06` admin-surface slice: catalog admin review screens now merge deterministic admin groups into existing `screen-*` custom-screen blocks, validate referenced content schema fields, reject secret-like field references, and keep output on the current `custom-screen.upsert` `blocks` / `bindings` transport shape rather than adding an assistant-only layout schema.
- `core/services/assistant/blueprints/blueprintBindingComposer.ts` adds the next `TASK-190-06` admin-surface slice: assistant-composed custom-screen bindings now validate existing `widgetId + propPath + field + mode` contracts against the composed content schema, reject unsafe/secret-like paths, and dedupe identical binding ids before handing payloads to the custom-screen owner seam. Canonical admin-screen metadata now lives as nullable top-level `collectionRole` / `compositionKey` fields on `custom_screens` and round-trips through custom-screen schemas, services, cached admin clients, resource catalog summaries, and `custom-screen.upsert` / `custom-screen.update`.
- `core/services/content/detailPageTypes.ts`, `detailPageSchema.ts`, and the new `detail_page_documents` / `detail_page_revisions` tables add the persisted detail-page owner seam for `TASK-190-05-03`: strict normalized document storage, deterministic UUID-compatible ids, and the blocking `content_type_has_detail_pages` delete dependency are defined before later generic detail-page resource packaging and no-duplicate leaves consume that contract.
- `core/services/content/detailPageDocumentService.ts` plus the executable `detail-page.upsert` contract extend that seam without introducing a second executor path: assistant dry-run/execute now persist strict detail-page documents, refresh advisory `contentTypeSlug` from the linked content type, and keep publish state owned by `DetailPageDocument.status`, while canonical route linkage remains owned by `setting.content-route.upsert.detailPageId`.
- `core/server/routes/detailPageRoutes.ts` and `core/server/validation/detailPageSchemas.ts` now add the internal `/admin/api/detail-pages*` detail-page boundary for `TASK-190-05-03-07-01`: list/detail/create/update/delete, preview, publish/unpublish, autosave, revision list/restore, and autosave discard routes stay orchestration-only at the route layer, filter by stable `contentTypeId` where applicable, surface linked-route delete conflicts through `mapDetailPageError`, and keep route linkage outside the detail-page route family.
- `core/services/content/detailPageRevisionService.ts` now owns detail-page revision list/restore/discard behavior for `TASK-190-05-03-07-01-03`: restore rewrites only `currentDocument`, keeps publish state on the dedicated lifecycle routes, and autosave discard is the only allowed revision delete path.
- `core/services/assistant/blueprints/blueprintProviderContext.ts` and `blueprintCompositionDraftSchema.ts` add bounded provider-side capability summaries plus a strict capability-id draft schema for shadow/dev use, while the production provider contract for generic CMS/admin planning stays `cms_operation_draft`.
- `core/services/assistant/blueprints/blueprintComposerShadow.ts` runs candidate-vs-current-plan comparisons behind a test/local env gate; it can surface diagnostics in planner metadata for QA, but it remains metadata-only and does not execute the composition graph/assembler itself.
- `core/services/assistant/blueprints/leadCaptureBlueprint.ts` provides a lead-capture pack that creates a public inquiry form and a simple landing page through existing `form.upsert` and block-backed `page.upsert` actions.
- `core/services/assistant/blueprints/bookingServiceBlueprint.ts` registers a gated booking pack (`requires-prerequisite`) that returns typed questions instead of creating booking resources until booking action adapters exist.
- `core/services/assistant/blueprints/productInquiryBlueprint.ts` provides an executable product inquiry catalog pack and a gated checkout/payment needs-input path.
- `core/services/assistant/blueprints/editorialContentHubBlueprint.ts` provides an editorial hub page with a posts-feed widget and does not create or mutate post records.
- The current composition cutover is intentionally bounded to existing packs/modules. Capability manifests may already describe latent `detail-page` intent, and the landed `TASK-190` slices already cover persisted detail-page storage, published runtime rendering, shared preview handling, typed `detail-page.upsert`, the internal detail-page admin route family, admin client/cache parity, detail-page fixture/runtime acceptance, admin-screen layout composition, custom-screen binding/metadata safety, the collection-workspace route/read/cache/UI shell, the manual detail-template editor, assistant follow-up context for the workspace/detail-page surface, catalog-backed no-duplicate DB reuse, and strict `metadata.blueprintComposition` review diagnostics. The remaining follow-up work is narrower: generic assistant detail-page resource packaging stays under the later `TASK-190` leaves.

Resource catalog context:
- `POST /assistant/actions/plan` moze otrzymac `context.includeResourceCatalog=true`.
- Route enrichuje wtedy context o `resourceCatalog` z:
  - content types,
  - bounded detail-page summaries,
  - entries,
  - posts,
  - custom screens,
  - listing queries/templates,
  - forms + fields,
  - menus + bounded menu items,
  - media summaries,
  - commerce product/collection summaries,
  - solution kit summaries,
  - existing SEO documents,
  - widgets/templates.
- Snapshot jest schema-versioned, deterministic, limitowany budzetem i redaguje secret-like keys.
- Docs-only chat nie hydratuje resource catalogu i pozostaje docs-corpus driven.

Runtime admin context:
- `core/admin/ui/assistant/useAssistantAdminContext.ts` buduje advisory runtime snapshot z `AdminRouterContext` / `AdminShell`.
- Snapshot zawiera:
  - route i active href,
  - area/module,
  - selected resource hint,
  - route-derived visible action hints,
  - advisory permission hints wymagane dla widocznych akcji.
- `PageEditor` publishes bounded active page surface context for assistant planning: page identity, selected block id, block id/type/path summaries, slot keys, template-section references, and unsaved-change warnings.
- `WidgetTemplateEditorPage` publishes bounded active widget template surface context: template identity, selected block id, block id/type/path summaries, slot keys, template-section references, and template settings summary.
- Custom screen builder, records list, and record editor surfaces publish bounded active custom screen context: screen identity, capabilities mode, selected entry id, selected block id, block summaries, bindings, and writable field names.
- Writable field names are derived only from widget-aware write-capable targets
  (for example `screen-field-value.value`), so legacy fallback widgets and
  read-only screen props do not advertise false editor capability.
- The assistant plan route rehydrates active surface identity server-side before planning: pages through `pageService`, widget templates through `widgetTemplateService`, and custom screens through `customScreenService`; missing resources clear the active surface instead of trusting stale browser context.
- Active page hydration also extracts and dedupes `template-section` references from the advisory surface and persisted page canvas data, then loads referenced widget template summaries through `widgetTemplateService` with bounded nested block/config keys and secret-like redaction. Page template inspection requires `widgets:read` in addition to active page `content:read`.
- When a page edit points at a template-backed block and both page-instance and reusable-template targets are plausible, the planner returns `needs_input` instead of mutating. Explicit page-instance prompts route to `page.widget.patch`; explicit reusable-template prompts can route to `widget-template.block.patch` only when the hydrated template summary resolves exactly one supported nested block/field.
- Snapshot nie jest autoryzacja; execute/dry-run dalej polegaja na route/domain permission checks.
- Snapshot nie zawiera user PII, roli, sesji, raw permissions ani tokenow.

Planner schema/recovery:
- Planner output jest normalizowany przez strict schema przed zwroceniem z `planAssistantActions`.
- Provider draft output jest traktowany jako untrusted input and must be a
  `CmsOperationDraft`; provider-supplied `actions[]`, arbitrary executor inputs,
  secret-like keys, unknown fields, missing/ambiguous `resourceKey`, and malformed
  drafts cannot become executable actions. Provider drafts are not repaired into
  valid drafts after TASK-189-05.
- `core/services/assistant/providerPlanningContext.ts` owns the bounded/redacted provider planning prompt package. It packages prompt text, docs evidence, advisory runtime context, resource catalog summaries, and model-capability output contracts for provider planning calls.
- Provider planning packages now also include bounded blueprint capability summaries for setup/composer shadow evaluation, but provider adapters still request `cms_operation_draft` for the current production planning path.
- Provider planning packages are passed through `assistantRedaction.ts` before the provider boundary.
- `planAssistantActionsWithProviderDraft` is the async helper for controlled
  provider operation-draft planning. It requires injected provider availability,
  validates or repairs provider JSON as a CMS operation draft through
  `cmsOperationDraftSchema.ts`, resolves targets locally through policy, and
  falls back to the deterministic local planner on provider errors,
  unavailability, malformed drafts, or unsafe mismatches.
- Assistant action plans can carry strict planner metadata (`local`, `provider`, or `fallback`) so the admin review UI can explain whether a plan came from provider draft or local deterministic planning.
- Assistant action plans can also carry strict read-only `inspection` metadata for
  CMS resource candidate lists. These plans have no actions and are not executable.
- Assistant action plans can carry strict `responseKind` metadata (`docs`,
  `inspection`, `action_plan`, `needs_input`, or `gated`) so the UI does not infer
  behavior from prompt text or action count alone.
- In `LLM Guide` mode the admin panel routes prompts through `/assistant/actions/plan`
  by default; docs-only mode remains on `/assistant/chat`.
- Provider planning now accepts strict CMS operation drafts as the preferred output
  shape. The server validates those drafts locally, resolves targets from trusted
  context, and only then returns inspection/actions/needs-input plans.
- Provider structured output is selected through model capability profiles rather
  than planner hardcode. The planner requests a provider-agnostic
  `cms_operation_draft` contract, and provider adapters translate that contract
  to the concrete provider payload when supported.
- Direct OpenAI and OpenRouter providers are separate adapters behind the same
  `AssistantProvider` interface; production credentials stay in encrypted
  Integrations config rather than planner code.
- Provider planner fixture coverage uses injected fake providers, and opt-in OpenRouter/OpenAI live smoke tests cover real provider behavior through test-only env vars.
- LangGraph.js adoption is deferred in `_docs/ADR_LANGGRAPH_ASSISTANT_ORCHESTRATION.md`;
  TASK-188 keeps orchestration as staged pure functions while policy modules own
  business rules and strict action schemas/domain routes own mutation safety.

Execution registry and idempotency:
- Dry-run/execute dispatch korzysta z formalnego `actionRegistry.ts`, nie z ukrytego centralnego switcha.
- Preview changes maja stabilne pola `conflicts[]` i `dependencies[]`.
- Preview metadata is normalized through `actionDiffService.ts`; warnings, conflict messages, dependency keys, summaries, and target keys redact secret-like `key=value` fragments before they reach the UI/API response.
- `execute` nadal wymaga `idempotencyKey`.
- Wyniki execute sa zapisywane w `assistant_action_executions` z `actorId`, `planId`, `planHash` i zredagowanym result payload.
- Powtorzony klucz idempotency dla tego samego actor/plan/hash zwraca zapisany wynik; konflikt actor/plan/hash zwraca machine-readable idempotency conflict.
- Execute responses include idempotency diagnostics with `replayed` and `scope=actor_plan_hash`; no raw stored payload is exposed.
- Assistant metrics track action execution count, failed action count, and idempotency replay count for support diagnostics.
- Fresh assistant action executions also persist sanitized undo manifest items in `assistant_action_undo_items`; those items record action/resource provenance, undo strategy, dependency keys, public impact metadata, and stable after-state fingerprints for later cleanup planning.

Declared capability boundary:
- `docs-only` pozostaje read-only i nie zwraca executable action plans.
- `LLM Guide` wykonuje tylko strict typed actions opisane w `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, po plan/dry-run/review/execute.
- `LLM Guide` can also return non-mutating CMS inspection plans for prompts such as
  page lookup or custom-screen prefix lookup; those plans render candidates but do not
  expose dry-run/execute controls.
- Obecny executable business set obejmuje house-projects catalog, catalog-family packs, lead capture site, product inquiry catalog, portfolio case study, editorial content hub oraz `site-kit.recommend/install/validate`.
- Booking resource setup, checkout/payment, webhook form automation, nested page widget patches, `menu.structure.patch`, bulk/sample entry creation, field patching i solution-kit refinements bez server-derived installed-kit context pozostaja gated follow-up capabilities.
- Guide nie wspiera arbitralnego code execution ani autonomicznych mutacji poza review/confirm flow.

Action family contract registry:
- `core/services/assistant/actionFamilyContracts.ts` documents the next assistant action families without enabling execution.
- Contract-only action types currently include:
  - `entry.sample.create`, `entry.bulk-draft.create`, `entry.field.patch`,
  - `menu.structure.patch`.
- These contracts declare schema owners, required permissions, strict reject-unknown expectations, anti-abuse notes, and secret-handling rules.
- Contract-only action types are not part of `assistantActionTypes`; strict plan
  schema and provider operation-draft mapping continue to reject them until their
  preview/execute adapters land in later `TASK-170` slices.
- Contract-only action families can still produce non-executable preview metadata through `createContractOnlyActionPreviewMetadata`, which returns a machine-readable `assistant_action_contract_only` conflict and permission dependencies for future adapters/UI work.
- `entry.upsert-draft` is the first promoted action from this registry. It is executable, draft-only, uses existing content entry services, and does not publish content.
- `custom-screen.delete` is executable for explicit delete requests resolved from server-side resource catalog context; execute rechecks target id/name/prefix before calling the custom screen domain delete service.
- `page.delete` is executable for active-context page delete requests; execute rechecks target id/title/slug/status before calling the page domain delete service.
- `widget-template.delete` is executable for active-context reusable template delete requests; dry-run warns about reusable template blast radius and execute rechecks id/name/status/category before deletion.
- `entry.delete` is executable for active entry route context and rechecks optional content type/title/slug/status expectations before deletion.
- `content-type.delete` is executable for exact server-side catalog targets and is blocked when the catalog reports existing entries.
- `listing-query.delete` and `listing-template.delete` are executable for active/exact catalog listing targets; dry-run and execute scan page data plus widget template blocks/settings for surviving references before deletion.
- `form.delete` deletes exact zero-submission forms; `form.archive` preserves forms with submissions by setting status to `archived` without exposing submission payloads.
- `menu.item.delete` deletes exact menu items through the menu tree service while preserving unrelated menu items.
- `seo.document.delete` deletes exact SEO documents without deleting the owning page or entry target.
- `page.update` edits active page title/slug/draft-published status and page-owned settings while preserving unrelated page data and blocks.
- `page.widget.patch` supports selected block `patch-data` for existing data paths and preserves unrelated blocks/slots.
- `widget-template.update` edits reusable template metadata/settings; `widget-template.block.patch` patches selected reusable template block data paths and preserves unrelated blocks/settings.
- `custom-screen.update` edits custom screen metadata/sidebar/canonical collection-link metadata/binding mode; `custom-screen.widget.patch` patches selected custom screen widget block data paths while preserving unrelated blocks/bindings.
- `entry.update`, `form.update`, `listing-query.update`, `listing-template.update`, `menu.item.update`, and `seo.document.update` cover remaining domain resource edits through existing domain services and preserve unrelated fields/config/tree items.
- `menu.item.upsert` is executable and uses existing menu services to upsert safe relative navigation links without duplicating items on re-execution.
- `seo.document.upsert` is executable and uses existing SEO services for explicit page/entry targets.
- `media.reference.attach` is executable for `entry` targets and uses existing media/entry services to attach existing media ids without accepting upload bytes.
- `listing-query.filters.patch` is executable and updates `query.filters` on existing listing queries while preserving unrelated query configuration.
- `listing-template.card.patch` is executable and updates `config.card` on existing listing templates while preserving unrelated template config.
- `page.widget.patch` is executable for top-level `upsert-block` operations and uses runtime widget validation before updating page current data.
- `form.automation.upsert` is executable for safe non-webhook form actions and uses existing form action services; webhook automation remains out of scope until secret handling is explicit.
- Generic CMS operation mapping supports counted multi-target delete/archive/update plans when the trusted resolver returns the exact expected count and every target maps to an existing strict typed action. Explicit multi-create plans are allowed only from locally validated `mutation.patch.items[]` definitions that become existing typed upsert/create actions; vague or mismatched bulk prompts return `needs_input`.
- After assistant action execution, the admin client invalidates known cache families from successful non-noop execution results across pages, entries, content types, custom screens, forms, listings, widget templates, menus, and SEO. Cache keys are derived from strict action inputs or sanitized `resourceId`, not provider text.
- `/assistant/actions/dry-run` and `/assistant/actions/execute` enforce action-specific permissions from `actionFamilyContracts.ts` in addition to the baseline assistant route permissions.

Aktualnie zaimplementowany business setup surface:
- executable catalog-family packs tworza content type, custom screen, listing query, listing template, public catalog page i public detail routes,
- canonical content-route ownership stays in `site.contentRoutes`; route rows may
  now carry optional `detailPageId` metadata as the structural link to one
  detail-page document, and the public runtime consumes that link through the
  dedicated detail-page runtime resolver,
- Engine collection workspace reads begin at
  `GET /admin/api/content-types/:id/collection-workspace`. The server-owned
  summary is bounded and separates `canonical`, `linkedSecondary`,
  `unresolved`, and `candidates` buckets. Canonical content route, route-linked
  detail template, explicit canonical list page, page-linked listing query /
  template, and canonical admin screen now resolve from their current owner
  seams; missing/ambiguous links stay unresolved with bounded candidates, and
  `settings:read` gates route-derived canonical data. Admin access to that
  summary stays under the existing content-types client/cache family through
  `contentTypes:collectionWorkspace:<contentTypeId>`, and the
  `/advanced/engine/:contentTypeId/collection` shell owns only route-local
  refresh/pending UX,
- canonical detail templates can be opened from that workspace at
  `/admin/advanced/engine/:contentTypeId/collection/detail-template/:detailPageId`.
  The editor stays in the content-types admin family, reuses the existing
  page-builder shell/components, warms the detail-page record plus bounded
  sample entries through shared admin prefetch, and delegates save/autosave,
  preview, publish/unpublish, and revision lifecycle to `detailPagesClient.ts`,
- assistant follow-up context for the collection workspace stays in the existing
  admin-context pipeline: `useAssistantAdminContext.ts` emits only
  `collectionWorkspaceHint`, the detail-template editor publishes
  `activeSurface.kind = "detail-page"` through `activeSurfaceContext.ts`, and
  `assistantRoutes.ts` / `activeSurfaceHydration.ts` hydrate the bounded
  server-owned `collectionWorkspace` summary plus detail-page identity before
  provider packaging. Browser-owned workspace summaries are rejected, stale
  detail-page ids drop to `null`, and `detail-page` planning context requires
  `content:read` plus `widgets:read`,
- published content routes that carry `detailPageId` now resolve normalized
  detail-page documents and render them through the current page-builder
  runtime shell; missing links continue to fall back to the legacy
  `renderPublicEntry.tsx` detail renderer,
- lead capture oraz product inquiry packs moga tworzyc public inquiry forms przez istniejacy Forms runtime,
- portfolio case-study pack dodaje result/testimonial fields,
- editorial content hub tworzy public hub page z `posts-feed` bez mutowania post records,
- `site-kit.*` actions przechodza przez solution-kit installer/validator,
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
- `site-kit.*` akcje wymagaja `llmAvailable=true`; nie moga przejsc jako docs-only fallback.
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
- Admin UI zarzadza formularzami w kanonicznych trasach
  `/admin/advanced/forms`, `/admin/advanced/forms/:id` i
  `/admin/advanced/forms/:id/action-runs`; `/admin/forms` jest tylko aliasem
  kompatybilnosci admina.
- Backend API pozostaje pod `/forms/*`: edytor zapisuje pola przez
  `PUT /forms/:id/fields`, pipeline przez `/forms/:id/actions`, a logi przez
  `/forms/:id/action-runs`.
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
  - `bindings` mapuja `widgetId + propPath` -> field key i sa wykonywane przez
    `bindingResolver`,
  - save path odrzuca unsupported write combinations dla screen widgets, wiec
    tylko widget-owned write-capable targets licza sie do dedicated-editor
    readiness i writable field lists.
- Shortcut model:
  - tylko `active` screen z `showInSidebar=true` moze trafic do lewego menu,
  - skrot jest renderowany po grupie `Coderso`,
  - link prowadzi do `/admin/advanced/custom-screens/:screenId/entries`,
  - `sidebarLabel` nadpisuje domyslna nazwe screena, ale jest opcjonalny.
- Builder (`/admin/advanced/custom-screens/:id`) ma trzy warstwy pracy:
  - screen settings,
  - widget-level bindings dla zaznaczonego bloku,
  - bound preview, ktory materializuje drzewo widgetow przed renderem przez `WidgetRenderer`.
- `Editor View` preview owner jest cached-first nad `entries:list:<typeSlug>`:
  pierwszy cached record hydratuje i builder canvas, i preview dialog; cold
  cache fallback pozostaje schema-shaped z jawna notka dla `no-records` albo
  `read-failed`.
- `Screens` nie korzysta juz z calej public/page widget library:
  - insert library filtruje do surface `custom-screen-builder`,
  - screen-only widgets (`screen-record-header`, `screen-field-value`, `screen-field-group`, `screen-two-column`) sa ukryte w `Advanced/Widgets`,
  - wspoldzielone prymitywy layoutowe musza byc jawnie dopuszczone do obu surface'ow.
- Kazdy custom screen ma derived capabilities:
  - `collection-only`: brak dedykowanego record screen; shortcut zawęża tylko liste rekordow,
  - `dashboard`: screen moze previewowac dane rekordu, ale nie ma ani jednego
    widget-aware write-capable target,
  - `editor`: screen ma co najmniej jeden widget-aware write-capable binding i
    moze pelnic role dedykowanego record editor.
- Workflow rekordow custom screen korzysta z istniejacego domain `entries`, bez nowego storage:
  - list route: `/admin/advanced/custom-screens/:screenId/entries`,
  - editor route: `/admin/advanced/custom-screens/:screenId/entries/:entryId`,
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
  - ekran `/admin/advanced/booking` grupuje operacje domenowe w zakladkach:
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
  - `AdminShell` wyprowadza z niego `AdvancedFeatureFlags`,
  - active kit focus rozwija dependency graph z `ADVANCED_MODULE_REGISTRY`,
  - kity z `engine`, `entries` i `widgets` nie ukrywaja `Screens` (`custom-screens`),
  - gating dotyczy tylko grupy `Advanced`; top-level `Main/Tools/Admin` pozostaja bez zmian,
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

```text
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
```

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

```text
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
```

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

```text
/plugin.json
/dist/server.mjs          (ESM, server runtime)
/dist/client.mjs          (ESM, admin/editor UI)
/dist/style.css           (CSS pluginu)
```

Opcjonalne:

```text
/public/                  (statyczne assety pluginu)
```

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

```json
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
```

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

```ts
registerBlock({
  type: "seo/meta",
  schema,
  render,
  editor
})
```

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
