# RAPORT: Hero Widget — UI-first retest (31-05-2026)

> **Status:** W toku — pierwszy UI-first pass na swiezej stronie audytowej.
> **Strona admin:** `Audit 31-05 Hero`
> **Admin page id:** `1b9072a3-fd31-45f0-bf2f-33054ff3f900`
> **Public route:** `/audit-31-05-hero`
> **Playwright session:** `codex-31-05-ui-hero2`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI:

1. Otworzono nowa strone `/audit-31-05-hero` z domyslnym blokiem Hero.
2. Zaznaczono blok w page builderze i klikano kontrolki Visual.
3. Efekt sprawdzano na zywej preview sekcji w adminie przez DOM, klasy i
   computed style.
4. Public route sprawdzono przez HTTP/HTML po stronie `http://localhost:3000`.
5. Dla znalezionego dryftu wykonano krotki audyt kodu w `HeroEditors.tsx` i
   `hero.tsx`.

## Pokrycie UI

Przetestowane w tej czesci:

- warianty: Centered, Media Right, Media Left, Media Center,
- CTA layout: Single CTA, Dual CTA,
- headline input,
- `badge.enabled` / `socialProof.enabled` toggles,
- `style.textColor` swatch + Clear,
- public SSR baseline.

Jeszcze nie domkniete w tym pliku: wszystkie pozostale selekty typografii,
layoutu, media/background picker flows, gradient, social proof avatars,
rich-text toolbar, destination picker, Advanced pelna macierz.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Centered | Klik karta wariantu | Preview przelacza layout na `flex flex-col gap-4`; brak placeholdera media; headline zostaje widoczny. | Public baseline renderuje domyslny centered SSR. | Dziala | Renderer wybiera `resolvedVariant === "centered"` i nie renderuje ramki media. | Brak. |
| Variant: Media Right | Klik karta wariantu | Preview ma `md:flex-row`; pojawia sie placeholder `Select media type`. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` traktuje `split` jako media-right. | Brak. |
| Variant: Media Left | Klik karta wariantu | Preview ma `md:flex-row-reverse`; pojawia sie placeholder `Select media type`. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` rozpoznaje `media-left` jako split z odwrocona kolejnoscia. | Brak. |
| Variant: Media Center | Klik karta wariantu | Preview ma `flex flex-col items-center gap-8`; pojawia sie inline media placeholder. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje `isMediaCenter`. | Brak. |
| CTA layout: Single CTA | Wybor z selecta | `secondaryCta.*` znika z inspektora; preview ma 1 link CTA. | Nie publikowano tej zmiany. | Dziala, ale destrukcyjne | `HeroEditors.tsx` robi `update({ secondaryCta: undefined })`. | Jesli to ma byc bezpieczny toggle, zachowac poprzedni secondary CTA w lokalnym stanie albo pokazac potwierdzenie utraty danych. |
| CTA layout: Dual CTA po Single CTA | Wybor z selecta po wczesniejszym Single | Kontrolki secondary wracaja, ale `Secondary CTA Label` jest puste, destination pokazuje `No secondary destination`, preview nadal ma tylko 1 link. | Nie publikowano tej zmiany. | **Czesciowo / UX bug** | `const secondary = value.secondaryCta ?? { label: "", href: "" }`; po Single dane sa usuniete, wiec Dual odtwarza pusty obiekt. Renderer normalizuje pusty CTA jako brak linku. | Przy powrocie na Dual uzyc `heroDefaults.secondaryCta` albo zapamietac ostatni niepusty secondary CTA; alternatywnie nazwac opcje "Enable empty secondary CTA" i pokazac warning, ale to gorszy UX. |
| Headline | Fill `Audit Hero Headline 31` | `h1` w admin preview zmienia tekst natychmiast. | Nie publikowano tej zmiany. | Dziala | Input jest Visual-owned i aktualizuje `headline`. | Brak. |
| `badge.enabled` | Toggle | `aria-checked` zmienia stan; badge znika/wraca w preview, gdy dane badge sa obecne. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje badge tylko przy `normalized.badge?.enabled`. | Brak. |
| `socialProof.enabled` | Toggle | `aria-checked` zmienia stan; social proof renderuje sie warunkowo. | Nie publikowano tej zmiany. | Dziala | `hero.tsx` renderuje `data-widget-part="hero.social-proof"` tylko przy enabled. | Brak. |
| `style.textColor` | Swatch ustawiony na `#00ff00`, potem Clear | Headline zmienia computed color na `rgb(0, 255, 0)`; kontrolka pokazuje `Selected color`; Clear przywraca `Theme default` i computed color `rgb(15, 23, 42)`. | Nie publikowano tej zmiany. | Dziala | `HeroColorField` `onChange` aktualizuje `style.textColor`; Clear usuwa zapisane pole. | Brak. |

## Public baseline

`curl http://localhost:3000/audit-31-05-hero` zwrocil HTTP 200 i SSR HTML z:

- `h1`: `Build your system with Coderso`,
- primary CTA: `Get started`,
- secondary CTA: `Learn more`,
- domyslny `centered` layout.

To potwierdza, ze nowa strona audytowa publikuje domyslny Hero. Zmiany z
klikanej sesji admin nie zostaly uzyte jako finalny stan publiczny w tym
czesciowym pass.

## Console / srodowisko

- Podczas przejscia do kolejnego widgetu core server zaczal timeoutowac przez
  Vite proxy; helper zostal zrestartowany zgodnie z instrukcja uzytkownika.
- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.

## Wstepny kod-owner dla znalezionego dryftu

- `core/admin/ui/widgets/editors/HeroEditors.tsx`
  - okolice `HeroVisualEditor`, `secondary`, `ctaMode`, `updateSecondary`,
    `hero.cta.layout`.
  - Problem: Single CTA usuwa `secondaryCta`; Dual odtwarza pusty fallback
    `{ label: "", href: "" }`, wiec wizualnie "Dual CTA" nie daje drugiego CTA.
- `core/widgets/core/hero.tsx`
  - Renderer zachowuje sie poprawnie: pusty secondary CTA nie renderuje linku.

## Pozostale luki tego raportu

Ten plik nie zamyka Hero jako calosci. Do domkniecia wymagane sa jeszcze:

- destination picker primary/secondary + clear,
- background color/gradient/media/overlay controls,
- media type image/video/none i picker,
- layout/spacing/typography/shadow/border/radius/motion wszystkie opcje,
- rich headline/body toolbar,
- Advanced read-only summaries,
- zapis/publikacja kontrolowanego stanu i replay public.

