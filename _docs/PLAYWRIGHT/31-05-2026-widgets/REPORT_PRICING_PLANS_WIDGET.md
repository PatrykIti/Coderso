# RAPORT: Pricing Plans Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Pricing Plans`
> **Admin page id:** `bf68aaa2-0225-4545-8486-66c2b5f8e775`
> **Public route:** `/audit-31-05-pricing-plans`
> **Playwright sessions:** `codex-31-05-ui-pricing`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-pricing-*`, `data-pricing-plan-*`, tabeli
comparison, inline styles, dialogach confirm, Advanced summaries oraz publicznym
SSR pod `http://localhost:3000/audit-31-05-pricing-plans`.

## Pokrycie UI

Przetestowane:

- warianty: Two Plans, Three Plans, Four Plans, Comparison Rows,
- Header title/description,
- Billing toggle: enabled, labels, Annual default cycle,
- plan fields: name, badge, description, highlight label, price, period,
- price modes: legacy, structured, free, custom,
- CTA destination picker, CTA style, badge tone, highlighted plan,
- per-plan surface color i Clear,
- feature marker, feature status, feature icon, Add feature, Remove feature,
- Add plan, Move down/up, Remove plan confirm dialog,
- comparison switches: sticky header, header badges, header CTA,
- layout: max width, typography, footer note,
- style: card surface, card border, highlight ring, spacing, radius, Clear,
- Advanced read-only summaries i repair-action dialogs,
- public SSR baseline oraz admin console warnings/errors.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Two Plans | Klik `Two Plans` | `data-pricing-variant="two-plans"`, `count=2`, `hidden=1`, grid `lg:grid-cols-2`. | Public baseline renderuje Two Plans. | Dziala | `resolvePricingPlanStateForVariant` renderuje tylko pojemnosc wariantu i zachowuje ukryte plany. | Brak. |
| Variant: Three Plans | Klik `Three Plans` | `variant=three-plans`, `count=3`, `hidden=0/1` zaleznie od liczby zapisanych planow. | Nie publikowano tej zmiany. | Dziala | Renderer mapuje wariant na 3 widoczne plany. | Brak. |
| Variant: Four Plans | Klik `Four Plans` przy 3 zapisanych planach | `variant=four-plans`, `count=3`, `hidden=0`; brak pustej czwartej karty. | Nie publikowano tej zmiany. | Dziala z niuansem UX | Visual pokazuje `FixedPlanCountNotice`, bo wariant wspiera 4, ale renderer renderuje tylko skonfigurowane plany. | Brak dla obecnego kontraktu. Jezeli produkt chce auto-wypelnienie, trzeba zmienic `addPlan`/normalizacje wariantu i testy renderu. |
| Variant: Comparison Rows | Klik `Comparison Rows` | `data-pricing-comparison="true"`, scroll hint, 9 feature rows, highlighted columns. | Nie publikowano tej zmiany. | Dziala | `PricingComparisonRowsLayout` buduje tabele z `collectFeatureRows`. | Brak. |
| Header copy | Fill title/description | Header pokazuje `31-05 Pricing Audit` i opis z Visual. | Public baseline ma domyslny header. | Dziala | `updateHeader` patchuje `header.*`; renderer uzywa `aria-labelledby`. | Brak. |
| Billing enabled + Annual | Enable switch, labels `Monthly audit`/`Annual audit`, cycle `Annual` | Pojawia sie `role="status"`, `data-pricing-billing-toggle="static"`, `data-pricing-cycle="annual"`; ceny przechodza z `$19/month` na `$190/year`. | Public baseline ma billing disabled, wiec brak statusu. | Dziala jako konfiguracja; nie jest visitor-side toggle | Renderer celowo renderuje statyczny status, nie interaktywny przełącznik. Wlasciciel: `PricingPlansBlock` billing branch. | Brak, jesli aktualny kontrakt zostaje. Jezeli oczekiwany jest prawdziwy toggle na froncie, trzeba dodac client-side hydrated state, eventy, a11y i testy public runtime. |
| Plan fields | Fill name/badge/description/highlight/price/period | Plan pokazuje `Audit Starter`, `Audit badge`, opis, `Audit highlight`, zmieniony period. | Nie publikowano tej zmiany. | Dziala | `updatePlan` aktualizuje pola po indeksie. | Brak. |
| Highlight this plan | Toggle Plan 1 | Plan 1 dostaje `data-pricing-highlighted="true"` i ring; Plan 2 przestaje byc highlighted. | Nie publikowano tej zmiany. | Dziala | `setHighlightedPlan` utrzymuje pojedynczy highlight. | Brak. |
| CTA destination/style | Wybierz `Audit 31-05 Hero`, CTA style `Ghost` | Link ma `href="/audit-31-05-hero"`, aria `Start now for Audit Starter`, `data-pricing-plan-cta-style="ghost"`. | Public baseline nie ma CTA href, wiec linki nie renderuja sie. | Dziala | `LinkDestinationField` zapisuje safe route; renderer pokazuje `<a>` tylko przy label + href. | Brak. |
| Badge tone | Select `Accent` | Combo zapisuje `Accent`; karta z badge przyjmuje tone przez renderer badge. | Public baseline pokazuje `neutral` i `highlight`. | Dziala | `renderPlanBadge` mapuje `badgeTone` na style. | Brak. |
| Price mode: structured | Select `Structured amount`, amount `49`, annual `490`, currency `EUR` | Przy annual billing cena renderuje `€490`; okres zostaje z pola period. | Nie publikowano tej zmiany. | Dziala | `resolveDisplayedPlanPrice` uzywa `Intl.NumberFormat` dla structured. | Brak. |
| Price mode: free/custom/legacy | Select `Free plan`, potem `Custom label`, potem `Legacy strings` | Preview pokazuje kolejno `Free audit`, `Talk to audit`, potem wraca do legacy price. | Nie publikowano tej zmiany. | Dziala | Branches priceDisplay sa rozdzielone w normalizacji i renderze. | Brak. |
| Plan surface + Clear | Ustaw `#ccffcc`, potem Clear | Karta ma `background-color: rgb(204,255,204)`; po Clear wraca do dziedziczenia card surface. | Nie publikowano tej zmiany. | Dziala | `SharedColorControl` zapisuje `plans.N.surface`; renderer preferuje plan surface przed card surface. | Brak. |
| Feature marker/status/icon | Feature marker `Status icons`; feature status `Premium` -> `Coming soon`; icon `Sparkle` -> `Clock` | Preview pokazuje status badge `Premium`/`Coming soon` i ikony lucide w markerach. | Public baseline ma bullet markers. | Dziala | `renderFeatureMarker` i `renderFeatureStatusBadge` mapuja status/icon. | Brak. |
| Add/remove feature | Klik `Add feature`; potem Remove ostatniej pozycji | Edytor dodaje puste pole feature; Remove otwiera dialog `Remove feature?`; po confirm feature znika. | Nie dotyczy. | Dziala | `pendingRemoval` + `ConfirmActionDialog`, bez natywnego `window.confirm`. | Brak. |
| Add plan | Klik `Add plan` | Lista edytora rosnie; w wariancie Three Plans nowe plany sa `Hidden in this layout`, a `hidden` rosnie. | Nie publikowano tej zmiany. | Dziala | `addPlan` dodaje do listy do max 6; renderer pokazuje tylko pojemnosc wariantu. | Brak. |
| Move plan | Move down Plan 1, potem Move up | Kolejnosc preview zmienia sie `Audit Starter` -> poz. 2 i wraca po Move up. | Nie publikowano tej zmiany. | Dziala | `movePlan` przestawia tablice planow; renderer czyta kolejnosc tablicy. | Brak. |
| Remove plan | Klik Remove na ukrytym Plan 4 | Dialog `Remove pricing plan? Remove Plan 4? This also removes 0 features...`; anulowano. | Nie dotyczy. | Dziala | Usuwanie planu jest chronione `ConfirmActionDialog`. | Brak. |
| Comparison sticky/header badges/header CTA | Toggle trzy switche | `sticky` zmienia `false` -> `true`; header badges `3` -> `0`; header CTA `1` -> `0`. | Nie publikowano tej zmiany. | Dziala | `comparison.*` steruje atrybutami i zawartoscia `thead`. | Brak. |
| Layout max width/typography/footer | Select `Wide`, `Prominent`, fill footer note | Root ma `data-pricing-max-width="wide"`, klase `max-w-7xl`, `data-pricing-typography="prominent"` i footer note. | Public baseline ma default/balanced/brak footer. | Dziala | `layout.*` mapuje na klasy i footer. | Brak. |
| Card surface/border/highlight ring | Ustaw `#fff7ed`, `#0033ff`, `#ff00ff` | Comparison table style: background `rgb(255,247,237)`, border `rgb(0,51,255)`; highlight ring uzyty w highlighted column/banner. | Nie publikowano tej zmiany. | Dziala | `compactStyle` sklada inline styles; renderer stosuje je dla kart/tabeli. | Brak. |
| Clear style colors | Klik Clear przy card surface/border/highlight ring | Table style po Clear ma tylko `border-style` i `border-width`; highlight ring wraca do defaultu. | Nie publikowano tej zmiany. | Dziala | `clearStyleField` usuwa override; renderer dla highlight ma fallback `var(--color-primary)`. | Brak. |
| Spacing/radius | Select `Spacious`, `Extra large` | Root `data-pricing-spacing="lg"`; karty/tabela dostaja `rounded-xl`. | Nie publikowano tej zmiany. | Dziala | `spacingClassMap` i `radiusClassMap`. | Brak. |
| Advanced summaries | Klik `Advanced` | `0` writable controls; summary pokazuje spacing `lg`, radius `xl`, `Rendered plans 3 of 3`, `Configured plans 5 of 5`, `Hidden preserved plans 2`, billing enabled. | Nie dotyczy. | Dziala | Advanced jest diagnostyka read-only. | Brak. |
| Advanced repair dialogs | Klik `Review plan alignment`, `Review payload cleanup` | Oba otwieraja dialogi potwierdzenia; oba anulowano. | Nie dotyczy. | Dziala | `pendingSupportAction` + `ConfirmActionDialog`. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-pricing-plans` zwrocil HTTP 200 i SSR
HTML z:

- `data-pricing-variant="two-plans"`,
- `data-pricing-spacing="md"`,
- `data-pricing-count="2"`,
- `data-pricing-hidden-count="1"`,
- `data-pricing-max-width="default"`,
- `data-pricing-typography="balanced"`,
- plan 1 `data-pricing-plan-cta-style="outline"`,
- plan 2 `data-pricing-highlighted="true"`, `data-pricing-plan-cta-style="filled"`,
- badge tones `neutral` i `highlight`,
- brak billing statusu, bo domyslnie `billingToggle.enabled=false`.

To potwierdza, ze swieza strona audytowa publikuje domyslny Pricing Plans.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Niuans kontraktowy: billing toggle

W UI admin kontrolka nazywa sie `Billing toggle`, ale publiczny renderer nie daje
odwiedzajacemu przelacznika miesiecznie/rocznie. Po wlaczeniu w adminie publiczny
output jest statycznym statusem cyklu:

- `role="status"`,
- `data-pricing-billing-toggle="static"`,
- `data-pricing-billing-display="static-cycle"`,
- `data-pricing-cycle="annual|monthly"`.

To nie jest bug wzgledem aktualnego kodu. Jest to jednak wazne dla produktu:
jezeli opcja ma oznaczac interaktywny visitor-side toggle, trzeba zmienic kontrakt
renderera, a nie tylko label w edytorze.

## Kod-owner

- `core/widgets/core/pricingPlans.tsx`
  - defaults i schema: okolice linii 327-400,
  - card layout: okolice linii 1180-1349,
  - comparison layout: okolice linii 1351-1590,
  - root attrs i statyczny billing status: okolice linii 1592-1697.
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
  - billing editor: okolice linii 862-933,
  - plan fields/actions/features: okolice linii 935-1477,
  - comparison controls: okolice linii 1479-1532,
  - layout/style controls: okolice linii 1534-1741,
  - Visual remove confirm: okolice linii 1743-1777,
  - Advanced diagnostics/repair dialogs: okolice linii 1783-1905.

## Rekomendacje

1. Brak wymaganej poprawki produkcyjnej dla aktualnego kontraktu.
2. Jezeli produktowo oczekujemy prawdziwego publicznego billing switcha, dodac
   hydrated client behavior dla `pricing-plans`, test public runtime i a11y test
   dla keyboard/focus/aria-live.
3. Jezeli label `Billing toggle` ma zostac statyczny, rozwazyc copy w adminie:
   `Billing cycle display` albo opis wprost, ze front pokazuje domyslny cykl.

## Console / srodowisko

- Admin console po przebiegu: `Errors: 0`, `Warnings: 0`.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- Dwa pomocnicze skrypty Playwright w `.tmp/` byly uzyte tylko do klikanej
  inspekcji UI; nie zmieniaja kodu produkcyjnego.
