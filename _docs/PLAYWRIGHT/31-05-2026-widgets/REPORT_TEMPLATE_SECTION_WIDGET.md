# RAPORT: Template Section Widget - UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla Wizard / Visual / Advanced oraz public runtime.
> **Strona admin:** `Audit 31-05 Template Section Ready`
> **Admin page id:** `d80c50e0-d3a0-48a0-a2d9-cbd6c43fd580`
> **Public routes:** `/audit-31-05-template-section-ready`, `/audit-31-05-template-section-unresolved`, `/audit-31-05-template-section-missing`, `/audit-31-05-template-section-invalid-id`, `/audit-31-05-template-section-draft`, `/audit-31-05-template-section-empty`, `/audit-31-05-template-section-loop`
> **Playwright sessions:** `codex-31-05-ui-template-section`, `codex-31-05-ui-template-section-public`, `codex-31-05-ui-template-section-advanced`, `codex-31-05-ui-template-section-interaction`
> **Claude:** pierwotny audyt UI-first powstal bez Claude z powodu `401 Invalid authentication credentials`; pass remediacyjny TASK-362 zostal dodatkowo sprawdzony lokalnym Claude CLI po naprawach.

## Status remediacji (2026-06-01)

TASK-362 zamknal oba znaleziska z raportu:

- TS-31-05-01: non-UUID `templateId` jest odrzucany na zapisach, a legacy public runtime renderuje `template_missing` bez HTTP 500 i bez raw ID w widocznym tekscie.
- TS-31-05-02: nested `template_loop` propaguje sie do parent markerow; parent nie raportuje juz `ready`, gdy rozstrzygniecie konczy sie loop placeholderem.

## Metoda

Test byl prowadzony od UI na kontrolowanych stronach z blokiem
`template-section`. Przed testami przeczytano `_docs/_WIDGETS/TEMPLATE_SECTION.md`,
taski `TASK-343-12`, `TASK-336-04`, `TASK-252-05-02` i `TASK-174-05-01`,
implementacje `core/widgets/core/templateSection.tsx`,
`core/services/widgets/templateSectionRuntime.ts`,
`core/server/publicSite.tsx`, edytory
`core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` oraz testy
`tests/vitest/widgets/templateSection.test.tsx` i
`tests/vitest/ui/template-section-editor-wave.test.tsx`.

Przez admin API utworzono fixture widget templates i strony:

- `/audit-31-05-template-section-ready` - published template z 2 blokami
  `spacer`, metadata `previewLabel/category/version`,
- `/audit-31-05-template-section-unresolved` - page payload bez `resolved`,
  zeby sprawdzic public runtime resolution,
- `/audit-31-05-template-section-missing` - valid UUID, ktore nie istnieje w
  `widget_templates`,
- `/audit-31-05-template-section-invalid-id` - nie-UUID w `templateId`,
- `/audit-31-05-template-section-draft` - draft template,
- `/audit-31-05-template-section-empty` - published template bez blokow,
- `/audit-31-05-template-section-loop` - template zawierajacy child
  `template-section` wskazujacy na ten sam template.

Admin UI pass objal `Run setup again`, Wizard template select, Visual
presentation fields, shared layout/visibility, Advanced diagnostics, raw JSON
absence and interaction smoke for field edits plus draft template selection.
Public runtime sprawdzono realnym DOM-em: data markers, states, placeholders,
resolved child widgets, draft/missing/empty/loop behavior, invalid id handling
and overflow.

## Pokrycie UI

Przetestowane:

- Wizard: template picker, status badge, no-template option, stale `resolved`
  clearing path by selecting a new template,
- Visual: active template summary, `metadata.previewLabel`,
  `metadata.category`, read-only `metadata.version`, shared block layout and
  visibility,
- Advanced: read-only resolved template diagnostics, source/resolved block
  summary, runtime behavior copy, no raw JSON controls,
- public runtime: ready, no-admin-resolved-but-public-ready, missing,
  invalid-id, draft/unpublished, empty and loop fixtures.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview / editor | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Initial render | Otwarta strona ready i zaznaczony blok | Visual root istnieje, Active template pokazuje `Audit 31-05 Ready Template Section`. | `/ready` HTTP 200, `data-template-section-state="ready"`, 2 child spacery. | Dziala | Public hydrator rozpoznaje `template-section` i wstrzykuje `resolved.blocks`. | Brak. |
| Public resolution without saved `resolved` | Page payload bez `resolved` | Admin Advanced mowi `admin_preview_unresolved`. | `/unresolved` public i tak renderuje `ready` z 2 spacerami. | Dziala | `publicSite.tsx` runtime zawsze wywoluje resolver dla public requestu. | Brak. |
| Wizard picker | `Run setup again`, otwarcie selecta | Opcje: No template, Loop, Empty, Draft, Ready; wybranie Draft pokazuje badge `Draft` i opis template. | Nie dotyczy bez zapisu. | Dziala | `TemplateSelectField` uzywa `useWidgetTemplates()` i zapisuje `templateId`; `templateName` jest derived. | Brak. |
| Wizard ownership | Inspect Wizard root | `writablePaths=["templateId"]`, brak duplicate writable paths. | Nie dotyczy. | Dziala | UI ma tylko picker; `templateName` jest mutowane pomocniczo w `updateValue()`. | Brak. |
| Visual active template | Otwarcie Visual | Pokazuje aktywny template i sekcje Template presentation. | Ready fixture pokazuje metadata przed child blocks. | Dziala | `TemplateSectionVisualEditor` renderuje summary + `TemplatePresentationEditor`. | Brak. |
| Visual preview label | Wpis `Ready Fixture Edited` | Input przyjmuje wartosc. | Public zapisany fixture ma `Ready Fixture` w label row. | Dziala | `metadata.previewLabel` jest Visual-owned writable path. | Brak. |
| Visual category | Wpis `Audit Edited` | Input przyjmuje wartosc. | Public marker `data-template-section-category="Audit"` i widoczny label row. | Dziala | `metadata.category` jest Visual-owned writable path. | Brak. |
| Visual version | Inspect Visual | Version pokazane jako read-only `ready-v1`. | Public marker `data-template-section-version="ready-v1"`. | Dziala | Visual uzywa `ReadonlyWidgetSummaryRow` dla `metadata.version`. | Brak. |
| Shared layout/visibility | Inspect Visual | Shared paths obecne: `layout.container`, padding, margin, `visibility.devices.*`. | Public fixtures nie overflowuja. | Dziala | Shared builder controls sa poza widget-local contract, ale widoczne i wrapped. | Brak. |
| Advanced diagnostics | Klik Advanced w osobnej sesji | `writablePaths=[]`, `rawControlCount=0`; pokazuje `0 editor-resolved blocks; 2 source blocks...` i `admin_preview_unresolved`. | Nie dotyczy. | Dziala | Advanced jest read-only i truthfully odroznia editor preview od public runtime. | Brak. |
| Missing template, valid UUID | Fixture z nieistniejacym valid UUID | Nieosiagalne przez zwykly select; edge dla legacy/import/API. | HTTP 200, `resolution="template_missing"`, placeholder `Template not found`, brak missing ID w visible text. | Dziala | `getWidgetTemplate()` zwraca `null`, runtime mapuje na `template_missing`. | Brak dla valid UUID. |
| Invalid template id | Fixture z `templateId="missing-template-31-05"` | Nieosiagalne przez zwykly select; API/payload edge. | Po TASK-362: HTTP 200, `resolution="template_missing"`, safe placeholder, brak raw ID w visible text. | Dziala | Runtime waliduje UUID przed DB lookupiem, a write paths odrzucaja malformed `templateId`. | Brak. |
| Draft template | Fixture z `status="draft"` | Wizard pokazuje badge `Draft`. | HTTP 200, `resolution="template_unpublished"`, brak child spacerow. | Dziala | `resolveTemplateSectionRuntimeData()` blokuje draft poza preview. | Brak. |
| Empty template | Published template bez blokow | Advanced potrafi pokazac source block count. | HTTP 200, `resolution="template_empty"`, text `This template has no blocks yet.` | Dziala | Renderer traktuje `resolved.blocks.length === 0` jako placeholder. | Brak. |
| Loop template | Template zawiera child template-section na siebie | Nie crashuje admin UI. | Po TASK-362: HTTP 200, parent marker ma `resolution="template_loop"` i nie raportuje `state="ready"`. | Dziala | Hydrator propaguje child `template_loop` do parent `resolved.error`; renderer ma defensywny scan nested blocks. | Brak. |
| Stale resolved blocks on missing | Missing valid UUID z legacy `resolved.blocks` w page payload | Nie dotyczy. | Public nie renderuje stale spacerow (`staleMissingSpacerCount=0`). | Dziala | Public hydrator nadpisuje `resolved` wynikiem runtime resolvera. | Brak. |
| Raw JSON / native controls | Advanced inspect | `rawControlCount=0`, brak textarea/pre, `unwrappedControls=[]`. | Nie dotyczy. | Dziala | Advanced uzywa summary rows zamiast raw payload editor. | Brak. |

## Znaleziska i remediacja

### TS-31-05-01 - Naprawione: nie-UUID `templateId` renderuje safe placeholder

**Objaw przed TASK-362:** `/audit-31-05-template-section-invalid-id` zostal zapisany przez
admin API z `templateId="missing-template-31-05"`. Public runtime zwraca HTTP
500 i Bun error overlay:

```text
Failed query: select ... from "widget_templates" where "widget_templates"."id" = $1
params: missing-template-31-05
PostgresError: invalid input syntax for type uuid: "missing-template-31-05"
```

Valid, ale nieistniejacy UUID na `/audit-31-05-template-section-missing`
zachowuje sie poprawnie: HTTP 200, `data-template-section-resolution="template_missing"`,
placeholder `Template not found. Pick another template.` i brak stale child
blocks.

**Dlaczego przed TASK-362:**

- Schema dopuszcza dowolny string: `templateId: { type: "string" }` w
  `core/widgets/core/templateSection.tsx:38-43`.
- Runtime tylko trimuje input: `ensureId()` w
  `core/services/widgets/templateSectionRuntime.ts:10-17`.
- Potem pyta DB bez walidacji formatu:
  `core/services/widgets/templateSectionRuntime.ts:25` ->
  `core/services/widgets/widgetTemplateService.ts:84-88`.
- Kolumna `widget_templates.id` jest UUID, wiec Postgres rzuca przed tym, jak
  kod moze zwrocic `template_missing`.

**Naprawa w TASK-362:**

1. `templateId` jest teraz kontraktem UUID-or-empty w ownerze Template Section.
2. Runtime zwraca `template_missing` dla malformed legacy ID przed DB lookupiem.
3. Page/widget-template writes oraz widget-template revision restore odrzucaja malformed nested Template Section data.
4. Legacy widget-template reads pozostaja tolerancyjne, zeby public hydrator mogl zamienic stare dane na placeholder.
5. Regresje sprawdzaja brak raw ID/templateName leak w public runtime.

### TS-31-05-02 - Naprawione: loop resolution propaguje sie do parent markerow

**Objaw przed TASK-362:** `/audit-31-05-template-section-loop` nie crashuje i pokazuje loop
placeholder, ale DOM ma dwa template-section nodes:

```json
[
  {
    "state": "ready",
    "resolution": "ready",
    "text": "Loop Fixture...Template loop detected..."
  },
  {
    "state": "empty",
    "resolution": "template_loop",
    "text": "Template loop detected. Remove nested template sections."
  }
]
```

Visitor widzi komunikat loop, ale zewnetrzny marker `ready` sugeruje, ze caly
selected template zostal poprawnie wyrenderowany.

**Dlaczego przed TASK-362:**

- `publicSite.tsx` wykrywa loop dopiero przy hydratacji child
  `template-section`, gdy `templateStack` zawiera juz parent id:
  `core/server/publicSite.tsx:530-540`.
- Parent template ma jeden resolved block, wiec `TemplateSectionBlock`
  klasyfikuje go jako `ready`: `core/widgets/core/templateSection.tsx:197-207`
  i `core/widgets/core/templateSection.tsx:279-286`.
- Nie ma propagacji child `template_loop` do parent `resolved.error`.

**Naprawa w TASK-362:**

1. Runtime hydrator oznacza parent `resolved.error="template_loop"`, jezeli child hydration wykryje loop.
2. Renderer dodatkowo skanuje nested resolved blocks jako defensywny fallback dla stale payloadow.
3. DB-backed public runtime test potwierdza HTTP 200, brak rekurencji i brak parent `state="ready"`.

## Co dziala

- Published templates renderuja sie publicznie nawet gdy page payload nie ma
  admin-side `resolved`.
- Draft, empty i valid missing templates daja safe placeholders z poprawnymi
  `data-template-section-resolution`.
- Stale `resolved.blocks` przy missing template nie renderuja sie publicznie.
- Wizard picker dziala i pokazuje statusy template'ow.
- Visual ma poprawne ownership dla `metadata.previewLabel` i
  `metadata.category`, a `metadata.version` jest read-only.
- Advanced pozostaje read-only, bez raw JSON i bez false success copy.
- Po TASK-362 malformed legacy IDs i loop markers failuja bezpiecznie i truthfully.

## Walidacja

- `bun run test:vitest -- tests/vitest/widgets/templateSection.test.tsx tests/vitest/ui/template-section-editor-wave.test.tsx` - passed, 2 files / 12 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `git diff --check -- _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_TEMPLATE_SECTION_WIDGET.md _docs/PLAYWRIGHT/31-05-2026-widgets/README.md` - passed.

Remediacja TASK-362 (2026-06-01):

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/templateSectionRuntime.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/template-section-editor-wave.test.tsx` - passed, 4 files / 32 tests.
- `bun test tests/unit/pages/pageWidgetData.test.ts` - passed, 3 tests.
- `set -a && source .env && set +a && bun test tests/unit/widgets/widgetTemplateService.test.ts --test-name-pattern "Template Section|legacy reads|revision restore"` - passed, 3 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts --test-name-pattern "Template Section references"` - passed, 1 test.
- `bun test tests/integration/routes/widgetTemplates.test.ts` - passed, 3 tests.
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts --test-name-pattern "Template Section"` - passed, 3 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
