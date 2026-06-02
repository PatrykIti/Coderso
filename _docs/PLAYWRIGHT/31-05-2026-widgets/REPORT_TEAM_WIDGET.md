# RAPORT: Team Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Team`
> **Admin page id:** `c28825cb-1fa3-49fb-9105-493938893054`
> **Public route:** `/audit-31-05-team`
> **Playwright session:** `codex-31-05-ui-team`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Remediation status (2026-06-01)

TASK-380 closes the two report findings:

- TEAM-31-05-01: member-count reductions now use shared
  `ConfirmActionDialog` cancel/accept flow instead of native `window.confirm`.
- TEAM-31-05-02: widget smoke now treats Team as a media-fixture widget, uploads
  a deterministic Team portrait through the authenticated admin media API, and
  adds a browser proof for MediaPicker photo selection, Clear photo, publish,
  and public image rendering.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-team-*`, orderze kart, linkach, CTA, fallbackach
avatarow, stylach inline, Advanced summaries oraz publicznym SSR pod
`http://localhost:3000/audit-31-05-team`.

Zmiany z klikanej sesji admin nie byly zapisywane jako finalny stan publiczny.
Po sesji publiczny route nadal renderowal domyslne `Meet the team`.

## Pokrycie UI

Przetestowane:

- warianty: Cards, Compact List, Spotlight,
- wybor spotlight lead,
- redukcja liczby profili cancel/accept,
- Add member i regrow po redukcji,
- header eyebrow/title/description, align, title size,
- CTA label + destination picker,
- name/role/bio,
- Move down/up,
- Clear photo i fallback initials,
- social link add/platform/profile/label/remove cancel/accept,
- member remove cancel/accept,
- style: section background, card background, card border, columns, gap, radius,
  card border width, compact-list mobile bio,
- Clear kolorow,
- Advanced read-only summaries,
- public SSR baseline,
- targeted Vitest suites dla renderera i edytora.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Cards | Stan poczatkowy | `data-team-variant="cards"`, `count=3`, `columns=3`, header `Meet the team`, 3 profile. | Public baseline renderuje Cards. | Dziala | `TeamBlock` mapuje domyslny wariant na grid kart i `data-team-*`. | Brak. |
| Variant: Compact List | Klik `Compact List` | `data-team-variant="compact-list"`, container `flex flex-col gap-5`, karty maja `sm:flex-row`. | Nie publikowano tej zmiany. | Dziala | Branch `compact-list` renderuje `MemberCard` z `compact=true`. | Brak. |
| Variant: Spotlight | Klik `Spotlight` | `data-team-variant="spotlight"`, lead card ma `data-team-spotlight-lead="true"` i klase `p-6`. | Nie publikowano tej zmiany. | Dziala | Renderer wylicza `spotlightLead` i oddziela reszte kart. | Brak. |
| Spotlight lead | Klik `Set as spotlight lead` na drugim profilu | Lead zmienia sie na `Marek Nowak`; order renderu: Marek, Anna, Ewa. | Nie publikowano tej zmiany. | Dziala | `spotlightLeadId` wskazuje wybranego membera; renderer przenosi go na lead slot. | Brak. |
| Member count cancel | Select `1` przy 3 authored profiles i odrzucenie confirm | Przechwycony prompt `Reducing the member count will remove the last 2 profiles. Continue?`; count zostal `3`. | Nie dotyczy. | Naprawione | TASK-380 przenosi count reduction na `ConfirmActionDialog`; cancel nie mutuje `members`. | Brak. |
| Member count accept | Select `1` i akceptacja confirm | Count `1`, zostal tylko pierwszy profil. | Nie publikowano tej zmiany. | Naprawione | `setMembersCount` jest czysta mutacja; dialog accept dopiero wywoluje przyciecie przez normalizer. | Brak. |
| Add member / regrow | Klik `Add member`, potem count do 3 | Powstaja placeholdery `Team Member 2` i `Team Member 3`; usuniete authored profiles nie wracaja. | Nie publikowano tej zmiany. | Dziala zgodnie z destrukcyjnym count flow | Po przycieciu stan nie zachowuje historii usunietych profili. | Brak, jezeli kontrakt ma byc destrukcyjny. |
| Header copy | Fill eyebrow/title/description | Header pokazuje `Audit leadership`, `31-05 Team Audit`, opis; `aria-label` root = `31-05 Team Audit`. | Public baseline ma domyslny header. | Dziala | Visual patchuje `header.*`; renderer pokazuje header tylko dla niepustych pol. | Brak. |
| Header align/title size | Select `Left`, `3XL` | Root `data-team-header-align="left"`, `data-team-title-size="3xl"`. | Nie publikowano tej zmiany. | Dziala | `resolveTeamHeaderAlign` i `resolveTeamHeaderTitleSize` mapuja dane na klasy i attrs. | Brak. |
| CTA label + page destination | Fill label i wybierz `Audit 31-05 Hero` | CTA renderuje `Join audit team` z `href="/audit-31-05-hero"`. | Nie publikowano tej zmiany. | Dziala | `TeamCta` renderuje tylko label + safe link attrs. | Brak. |
| Name / role / bio | Edycja pierwszego profilu | Card ma `Ada Audit`, `Quality Lead`, bio `Owns widget UI audit quality.`, aria `Ada Audit, Quality Lead`. | Nie publikowano tej zmiany. | Dziala | `MemberCard` uzywa znormalizowanych pol membera. | Brak. |
| Move down/up | Klik Move down, potem Move up | Order zmienil sie na `Team Member 2`, `Ada Audit`, `Team Member 3`, potem wrocil. | Nie publikowano tej zmiany. | Dziala | `moveMember` przestawia pozycje w tablicy i normalizacja zachowuje ID. | Brak. |
| Clear photo | Klik `Clear photo` | Image znika, fallback initials `A`; `imgSrc=null`, `fallbackHidden="A"`. | Nie publikowano tej zmiany. | Dziala | `handleClearPhoto` czysci `photo`; `Avatar` renderuje dekoracyjny fallback. | Brak. |
| MediaPicker photo | UI picker obecny | `/admin/api/media?limit=10` zwrocil `[]`; nie bylo assetu do klikniecia. | Public baseline ma remote Unsplash photos. | Naprawione w smoke harnessie | TASK-380 dodaje Team portrait seed i `mediaProof`, ktory wybiera photo przez realny MediaPicker, sprawdza Clear photo, publikuje i weryfikuje publiczne `<img>`. | Uruchomic live smoke, gdy admin/frontend/auth sa dostepne. Dry-run i unit tests potwierdzaja harness contract. |
| Social add/platform/profile/label | Add link, platform GitHub, profile `ada-audit`, label `Audit GitHub` | Link renderuje `https://github.com/ada-audit`, target `_blank`, rel `noopener noreferrer`. | Nie publikowano tej zmiany. | Dziala | `updateMemberSocialPlatform` + profile field buduja safe URL; renderer filtruje unsafe URL przez `resolveWidgetLinkAttrs`. | Brak. |
| Social remove cancel | Klik Remove i Cancel | Link `Audit GitHub` zostal. | Nie dotyczy. | Dziala | Inline pending removal trzyma stan do confirm. | Brak. |
| Social remove accept | Klik Remove i Confirm remove | Link zostal usuniety; pozostaly dwa poprzednie linki. | Nie dotyczy. | Dziala | `removeMemberSocialLink` filtruje link po ID. | Brak. |
| Member remove cancel | Add member, Remove, Cancel | Count zostal `4`. | Nie dotyczy. | Dziala | Member removal uzywa inline `Confirm remove` / `Cancel`, nie natywnego confirm. | Brak. |
| Member remove accept | Remove + Confirm remove | Count wrocil do `3`; pozostaly `Ada Audit`, `Team Member 2`, `Team Member 3`. | Nie dotyczy. | Dziala | `removeMemberById` filtruje profil po ID. | Brak. |
| Columns | Select `4 columns` | Root `data-team-columns="4"`; Advanced pokazuje `4 columns`. | Nie publikowano tej zmiany. | Dziala | Dla Spotlight zewnetrzny grid zostaje `lg:grid-cols-3`, a support grid korzysta z `spotlightRestColumnsClassMap[columns]`. Renderer test pokrywa ten kontrakt. | Brak. |
| Gap | Select `Spacious` | Root `data-team-gap="lg"`, grid gap zmieniony na `gap-7`. | Nie publikowano tej zmiany. | Dziala | `gapClassMap.lg`. | Brak. |
| Card radius | Select `Extra large` | Cards maja `rounded-xl`. | Nie publikowano tej zmiany. | Dziala | `radiusClassMap.xl`. | Brak. |
| Card border width | Select `3px` | Root `data-team-border-width="3"`, card style `border-width: 3px`. | Nie publikowano tej zmiany. | Dziala | `borderWidthStyleMap[borderWidth]`. | Brak. |
| Section/card colors | Set section `#111827`, card `#f8fafc`, border `#cbd5e1` | Section style `background-color: rgb(17, 24, 39)`, cards maja zapisane background/border; contrast warning widoczny dla section. | Nie publikowano tej zmiany. | Dziala | Color controls zapisuje hex, preview renderuje CSS colors i warning z kontrastu. | Brak. |
| Clear colors | Klik Clear dla 3 kolorow | Section style pusty; card style zostawia tylko border-style/width; Advanced pokazuje Theme default. | Nie publikowano tej zmiany. | Dziala | `resolveClearableStyleValue` usuwa puste override. | Brak. |
| Compact-list mobile bio | Select `Hide visually on mobile` | Root `data-team-compact-mobile-bio="hide"`; help informuje, ze dotyczy tylko Compact List. | Nie publikowano tej zmiany. | Dziala | `MemberCard` dodaje `sr-only sm:not-sr-only sm:block` tylko dla `compact`. | Brak. |
| Advanced read-only | Klik `Advanced` | `rootCount=1`, `writableControls=0`, `formControls=0`; sekcje layout/surface/content/contract obecne. | Nie dotyczy. | Dziala | `TeamAdvancedEditor` renderuje `ReadonlyWidgetSummaryRow`. | Brak. |
| Advanced content summary | Po edycjach | Pokazuje `3 members`, `2 configured`, `CTA Configured`, `Photo coverage 0/3`. | Nie dotyczy. | Dziala | Helpers licza memberow, social links, CTA i photo coverage z normalizowanych danych. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-team` zwrocil HTTP 200 i SSR HTML z:

- `data-team-variant="cards"`,
- `data-team-count="3"`,
- `data-team-columns="3"`,
- `data-team-gap="md"`,
- `data-team-radius="lg"`,
- `data-team-header-align="center"`,
- `data-team-title-size="2xl"`,
- `data-team-border-width="1"`,
- `data-team-compact-mobile-bio="show"`,
- heading `Meet the team`,
- 3 profile: `Anna Kowalska`, `Marek Nowak`, `Ewa Zielinska`,
- member headings jako `h3`,
- image alt `Photo of ...`,
- external social links z `target="_blank"` i `rel="noopener noreferrer"`,
- brak CTA.

To potwierdza, ze swieza strona audytowa publikuje domyslny Team. Zmiany z
klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Ograniczenia fixture

Media API w tym srodowisku pierwotnie zwrocilo `[]`, dlatego klikany pass nie
mogl uczciwie potwierdzic wyboru nowego zdjecia przez MediaPicker w realnym
browserze. TASK-380 przeniosl ten brak do deterministycznego smoke harnessu:
Team portrait image jest uploadowany przez admin media API przed proba, a
`mediaProof` wybiera zdjecie, sprawdza clear-photo recovery, publikuje fixture
i weryfikuje publiczny obraz.

## Kod-owner

- `core/widgets/core/team.tsx`
  - social link safe attrs: okolice linii 630-656,
  - card render, fallback avatar, compact mobile bio: okolice linii 658-715,
  - CTA safe render: okolice linii 718-743,
  - root attrs, style resolution, variant branches: okolice linii 746-897.
- `core/admin/ui/widgets/editors/TeamEditors.tsx`
  - Advanced color summary helper: okolice linii 254-262,
  - member count reduction z `window.confirm`: okolice linii 636-667,
  - members/social inline confirm UI: okolice linii 1292-1645,
  - style controls: okolice linii 1780-1848,
  - Advanced diagnostics: okolice linii 1853-2015.
- `tests/vitest/widgets/team.test.tsx`
  - renderer/defaults/normalization/safe links: okolice linii 28-312,
  - compact mobile bio i spotlight coverage: okolice linii 233-278.
- `tests/vitest/ui/team-editor-wave.test.tsx`
  - social/member destructive UI: okolice linii 430-565,
  - social platform switching: okolice linii 567-643,
  - media picker, CTA, style controls: okolice linii 645-783.

## Rekomendacje

1. Zamkniete w TASK-380: `setMembersCount` nie uzywa juz native
   `window.confirm`; destrukcyjna redukcja jest obsluzona przez shared dialog.
2. Zamkniete w TASK-380: Team ma deterministic media image seed i browserowy
   MediaPicker/photo proof w smoke harnessie.
3. W kolejnej rundzie mozna rozbudowac Playwright extractor dla Spotlight tak,
   aby raportowal tez klase zagniezdzonego support gridu, bo zewnetrzny grid ma
   stale `lg:grid-cols-3` z projektu.

## Walidacja

- `playwright-cli -s=codex-31-05-ui-team run-code --filename .tmp/playwright-team-compact.js` — passed.
- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx` — passed, 12 tests.
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx` — passed, 7 tests.
- `curl http://localhost:3000/audit-31-05-team` — HTTP 200, public baseline unchanged.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- TASK-380 follow-up: focused UI regression failed before fix because count
  reduction mutated through the native confirm path; after fix
  `bun run test:vitest -- tests/vitest/widgets/team.test.tsx tests/vitest/ui/team-editor-wave.test.tsx`
  passed, 20 tests.
- TASK-380 follow-up: `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
  passed, 24 tests.
- TASK-380 follow-up: `bun scripts/playwright-widget-contract-smoke.ts --dry-run --widget team --output-json .tmp/task-380-team-smoke-dry-run.json --output-md .tmp/task-380-team-smoke-dry-run.md`
  passed with `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  `metadataGaps=0`.
