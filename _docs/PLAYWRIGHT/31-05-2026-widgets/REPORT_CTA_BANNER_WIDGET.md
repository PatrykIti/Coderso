# RAPORT: CTA Banner Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 CTA Banner`
> **Admin page id:** `0da605f4-018b-46dc-a6d1-69b107956ece`
> **Public route:** `/audit-31-05-cta-banner`
> **Playwright session:** `codex-31-05-ui-cta`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI:

1. Otworzono swieza strone `/audit-31-05-cta-banner`.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual/Advanced.
3. Efekt sprawdzano w admin live preview po `data-cta-banner-*`,
   `data-cta-button`, klasach, inline styles i tekstach diagnostycznych.
4. Public route sprawdzono przez `http://localhost:3000/audit-31-05-cta-banner`.
5. Dla znalezionego dryftu wykonano audyt kodu w `CtaBannerEditors.tsx` i
   `ctaBanner.tsx`.

## Pokrycie UI

Przetestowane:

- warianty: Centered, Split, With Badge,
- missing badge state,
- content copy i Show description,
- primary/secondary/tertiary CTA: label, page destination, missing destination,
  enable/disable, new tab, icon,
- palety Light/Dark/Brand przez Dark,
- kolory tekstu, borderu, buttonow i background color + Clear,
- border width, banner radius, button radius, primary/secondary button size,
- gradient start/end/angle,
- background media type Image/None, image fit/position, clear-image state,
- motion Slide up,
- Advanced summaries i Normalize feedback,
- public SSR baseline.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Centered | Domyslny stan | `variant=centered`, `presentation=centered`, wrapper `flex flex-col items-center gap-4 text-center`. | Public baseline renderuje centered SSR. | Dziala | `resolveCtaBannerVariantPresentation` zwraca `centered`. | Brak. |
| Variant: Split | Klik `Split` | `presentation=split`, wrapper `md:flex-row md:items-center md:justify-between`. | Nie publikowano tej zmiany. | Dziala | Renderer wybiera split layout po `presentation.presentation === "split"`. | Brak. |
| Variant: With Badge | Klik `With Badge` | `presentation=badge-panel`; content dostaje panel `rounded-2xl ... shadow-sm`; badge widoczny. | Nie publikowano tej zmiany. | Dziala | TASK-343 fix jest skuteczny: With Badge jest wizualnie rozny od Centered. | Brak. |
| With Badge bez badge text | Wyczyszczono `Badge` | `data-cta-banner-badge-state="missing"`; badge znika, ale badge-panel layout zostaje. | Nie publikowano tej zmiany. | Dziala | `resolveCtaBannerVariantPresentation("with-badge", false)` zwraca `badgeState: "missing"`. | Brak. |
| Content copy | Fill badge/title/description | Preview pokazuje `31-05 Badge`, `31-05 CTA Banner Audit`, nowy opis. | Nie publikowano tej zmiany. | Dziala | `updateContent` patchuje `content.*`; renderer renderuje pola warunkowo. | Brak. |
| Show description | Toggle off/on | Po off opis znika; po on wraca. | Nie publikowano tej zmiany. | Dziala | Renderer wymaga `showDescription !== false` i niepustego opisu. | Brak. |
| Primary CTA destination/new-tab/icon | Label `Primary Audit CTA`, page `Audit 31-05 Hero`, new tab on, icon `External link` | Link ma href `/audit-31-05-hero`, `target="_blank"`, `rel="noopener noreferrer"`. | Nie publikowano tej zmiany. | Dziala | `LinkDestinationField` zapisuje slug; `resolveWidgetLinkAttrs` dodaje atrybuty new-tab. | Brak. |
| Primary CTA missing destination | Clear destination przy niepustym labelu | Editor pokazuje warning; preview renderuje disabled span `data-cta-button-state="missing-destination"` z tekstem `Destination required`. | Nie publikowano tej zmiany. | Dziala | `resolveCtaBannerActionRenderState` zwraca `missing_destination`; renderer nie ukrywa CTA po cichu. | Brak. |
| Secondary CTA disabled | Toggle `Enabled` off | Secondary znika z preview; zostaje tylko primary. | Nie publikowano tej zmiany. | Dziala | `enabled === false` daje stan `hidden`. | Brak. |
| Tertiary CTA missing destination | Enable tertiary + label bez destination | Preview pokazuje tertiary jako disabled `missing-destination`. | Nie publikowano tej zmiany. | Dziala | Ten sam resolver akcji obsluguje tertiary. | Brak. |
| Tertiary CTA destination | Wybor page `Audit 31-05 Feature Grid` | Tertiary przechodzi na aktywny link `/audit-31-05-feature-grid`. | Nie publikowano tej zmiany. | Dziala | Destination picker dziala dla trzeciej akcji. | Brak. |
| Palette: Dark | Klik `Dark` | Banner style zmienia sie na ciemne tlo `rgb(15, 23, 42)`, tekst jasny, primary `rgb(56, 189, 248)`. | Nie publikowano tej zmiany. | Dziala | Preset zapisuje jawne `style` i `background.color`. | Brak. |
| Manual colors | Swatche: text `#00ff00`, border `#ff0000`, primary bg `#0000ff`, background `#ffff00` itd. | Style w preview zmieniaja sie zgodnie z kolorami; labels pokazuja `Selected color` albo `Transparent` tam gdzie wartosc jest transparent. | Nie publikowano tej zmiany. | Dziala | `ColorField` aktualizuje odpowiednie `style.*` i `background.color`. | Brak. |
| Background color Clear | Klik `Clear` dla background color | Inline style traci `background-color`; pozostaja tekst/border. | Nie publikowano tej zmiany. | Dziala | `clearBackgroundField(..., "color")` usuwa `background.color` i `style.background`. | Brak. |
| Border/radius/button sizes | Select `3px`, `2XL`, `Pill`, primary `Large`, secondary `Small` | Banner `rounded-2xl`, `border-width: 3px`; primary `rounded-full px-5 py-2.5 text-base`, secondary `rounded-full px-3 py-1.5 text-xs`. | Nie publikowano tej zmiany. | Dziala | `borderWidthValueMap`, `radiusClassMap`, `buttonRadiusClassMap`, `buttonSizeClassMap`. | Brak. |
| Background gradient | Ustaw start `#111111`, end `#eeeeee`, angle `45` | Preview ma `background-image: linear-gradient(45deg, rgb(17, 17, 17), rgb(238, 238, 238))`. | Nie publikowano tej zmiany. | Dziala w renderze | `resolveBackgroundStyle` przeklada `background.gradient` na `backgroundImage`. | Advanced diagnostics do poprawy, patrz wiersz nizej. |
| Background media type Image | Select `Image`, potem `Contain` i `Bottom` | Pola media sie pojawiaja; `Clear image` disabled bez assetu; brak `src`, wiec preview nadal pokazuje gradient bez pustego `url()`. | Nie publikowano tej zmiany. | Dziala | Renderer dodaje image tylko, gdy `src` przejdzie `normalizeWidgetSafeHref`. | Brak. |
| Background media type None | Select `None` | Pola media znikaja; gradient zostaje, bo to osobny background field. | Nie publikowano tej zmiany. | Dziala | `background.media.type` nie kasuje `background.gradient`. | Brak. |
| Entrance motion Slide up | Select `Slide up` | Outer ma `data-cta-banner-motion="slide-up"`, klasy motion-safe i `animation-duration: 500ms`. | Nie publikowano tej zmiany. | Dziala | `motionClassMap.slide-up` jest stosowany na outer section. | Brak. |
| Advanced Normalize | Klik `Normalize now`, confirm | Pokazuje status `CTA banner data normalized.` | Nie dotyczy. | Dziala | `ConfirmActionDialog` wywoluje `onChange(normalizeValue(value))` i status. | Brak. |
| Advanced style diagnostics przy aktywnym gradientzie | Po ustawieniu gradientu przejscie do Advanced | Runtime preview ma `background-image`, ale Advanced `Style diagnostics` pokazuje `Background Theme default`; gradient nie jest nigdzie wymieniony. | Nie dotyczy. | **Nie dziala / misleading UI** | `styleRows` w `CtaBannerAdvancedEditor` ma tylko `Background = normalized.background?.color ?? normalized.style?.background`; nie ma `background.gradient`, mimo ze `resolveBackgroundStyle` renderuje gradient. | Dodac row `Background gradient` lub opis `Background` jako `Gradient configured` gdy `normalized.background?.gradient` jest ustawione. Dodac test Advanced diagnostics. |

## Public baseline

`curl http://localhost:3000/audit-31-05-cta-banner` zwrocil HTTP 200 i SSR HTML z:

- `data-cta-banner-variant="centered"`,
- `data-cta-banner-presentation="centered"`,
- `data-cta-banner-badge-state="visible"`,
- title `Ready to launch your next campaign?`,
- primary `Get started`,
- secondary `Contact sales`.

To potwierdza, ze swieza strona audytowa publikuje domyslny CTA Banner.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny
w tym pass.

## Kod-owner dla znalezionego dryftu

- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
  - `CtaBannerAdvancedEditor`, `styleRows` okolice linii 1437-1446.
  - Problem: diagnostyka nie pokazuje `background.gradient`.
- `core/widgets/core/ctaBanner.tsx`
  - `resolveBackgroundStyle` okolice linii 818-835 poprawnie renderuje
    `background.gradient` jako `backgroundImage`.

## Rekomendowana poprawka

1. W Advanced dodac diagnostyke gradientu:
   - `Background gradient: Configured` albo konkretna wartosc gradientu,
   - ewentualnie `Background: Gradient configured` gdy gradient nadpisuje brak
     `background.color`.
2. Dodac regresje w `tests/vitest/ui/cta-banner-editor-wave.test.tsx`:
   - render Advanced z `background.gradient`,
   - oczekuj tekstu o skonfigurowanym gradiencie,
   - oczekuj, ze sam `Background Theme default` nie jest jedynym sygnalem tla.

## Console / srodowisko

- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- Pierwszy skrypt zatrzymal sie na locatorze tekstowym dla `Dark`; powtorzony
  przebieg po `getByRole("button", { name: "Dark" })` potwierdzil, ze paleta
  dziala. To byl blad automatyzacji, nie widgetu.
