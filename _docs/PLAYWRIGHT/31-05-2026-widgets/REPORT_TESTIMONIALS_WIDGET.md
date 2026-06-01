# RAPORT: Testimonials Widget — UI-first retest (31-05-2026)

> **Status:** Zakonczony UI-first pass dla glownej macierzy opcji.
> **Strona admin:** `Audit 31-05 Testimonials`
> **Admin page id:** `aaa01721-7535-455f-968f-504ef0112c30`
> **Public route:** `/audit-31-05-testimonials`
> **Playwright sessions:** `codex-31-05-ui-testimonials*`
> **Claude:** probowano uruchomic non-interactive; CLI zwrocil `401 Invalid authentication credentials` przed testem.

## Metoda

Test byl prowadzony od UI na swiezej stronie audytowej. Efekt sprawdzano w
admin live preview po `data-testimonials-*`, `data-testimonial-*`, klasach,
inline styles, dialogu remove, linkach CTA i Advanced summaries. Public route
sprawdzono przez `http://localhost:3000/audit-31-05-testimonials`.

## Pokrycie UI

Przetestowane:

- warianty: Grid, Spotlight, Slider Static,
- count 6, spacing None/Spacious,
- slider dots/none,
- header copy,
- quote, formatted quote, author, role, source label, rating 0/5,
- rating-zero display: label-empty i empty-stars,
- Add testimonial, Move down, Remove z confirm dialogiem,
- background tone/gradient, header alignment, title size, card radius/border,
- section/card/text/accent colors i Clear text color,
- CTA visibility, page destination, new tab, link style,
- load-more pagination, page size, label,
- Advanced read-only summaries,
- public SSR baseline.

## Macierz opcji

| Kontrolka / opcja | Akcja UI | Wynik admin preview | Wynik public | Status | Dlaczego / kod | Jak naprawic |
|---|---|---|---|---|---|---|
| Variant: Grid | Klik `Grid` | `data-testimonials-variant="grid"`, count 3, grid `sm:grid-cols-2 lg:grid-cols-3`. | Public baseline renderuje Grid. | Dziala | `buildVariantSyncedTestimonialsValue` synchronizuje wariant i count; renderer mapuje grid. | Brak. |
| Variant: Spotlight | Klik `Spotlight` | `variant=spotlight`, count 2, pierwsza karta `data-testimonial-highlighted="true"`, layout `lg:grid-cols-2`. | Nie publikowano tej zmiany. | Dziala | Renderer przenosi/podswietla `layout.spotlightItemId`. | Brak. |
| Variant: Slider Static | Klik `Slider Static` | `variant=slider-static`, count 3, list `flex overflow-x-auto snap-x snap-mandatory`. | Nie publikowano tej zmiany. | Dziala | Renderer uzywa horyzontalnej listy SSR, bez client carousel. | Brak. |
| Slider navigation | W Slider Static ustaw `Dots` i `None` | `Dots` daje `data-testimonials-slider-navigation="dots"` i 3 nav dots; `None` daje 0 dots. | Public baseline ma `none`. | Dziala | `behavior.sliderNavigation` renderuje dots tylko dla `slider-static`. | Brak. |
| Count | Select `6` | `data-testimonials-count="6"` i 6 kart. | Nie publikowano tej zmiany. | Dziala | `setTestimonialsCount` normalizuje liste w limicie 2-24. | Brak. |
| Spacing | Select `None`, potem `Spacious` | `gap-0`, potem `gap-7`, `data-testimonials-spacing` zmienia sie `none` -> `lg`. | Nie publikowano tej zmiany. | Dziala | `spacingOptions` mapuja na klasy listy. | Brak. |
| Header copy | Fill eyebrow/title/description | Header pokazuje `31-05 audit proof`, `31-05 Testimonials Audit`, opis z Visual. | Nie publikowano tej zmiany. | Dziala | `updateHeader` patchuje `header.*`; renderer buduje `aria-label` z title. | Brak. |
| Quote / author / role / source | Fill pola pierwszej opinii | Karta pokazuje nowy quote, `Audit Author`, `QA Lead`, `Audit Source`. | Nie publikowano tej zmiany. | Dziala | `updateItem` aktualizuje item po indeksie. | Brak. |
| Rating 0 + label-empty | Select rating `0 / 5`, potem `No rating label` | `data-testimonial-rating="0"`, tekst `No rating` renderuje sie przed cytatem. | Nie publikowano tej zmiany. | Dziala | `RatingDisplay` ma branch `label-empty`. | Brak. |
| Rating 0 + empty stars | Select `Show empty stars` | Karta pokazuje empty-stars block dla rating 0. | Nie publikowano tej zmiany. | Dziala | `ratingDisplay="stars"` renderuje rating block niezaleznie od zera. | Brak. |
| Add testimonial | Klik `Add testimonial` | Count 6 -> 7, pojawia sie nowa karta. | Nie publikowano tej zmiany. | Dziala | `addTestimonial` dodaje normalized item do max 24. | Brak. |
| Move down | Klik `Move down` dla pierwszej pozycji | Pierwsza karta zmienia sie po reorderze. | Nie publikowano tej zmiany. | Dziala | `moveTestimonial` przestawia tablice. | Brak. |
| Remove | Klik `Remove` dla 7. pozycji | Dialog `Remove testimonial 7?`; po confirm count wraca do 6. | Nie publikowano tej zmiany. | Dziala | `ConfirmActionDialog` + `removeTestimonialByIndex`. | Brak. |
| Surface layout | Gradient `Cool`, tone `Contrast`, align `Right`, title `Large`, radius `Extra large`, border `Heavy` | Atrybuty: `background-gradient=cool`, `background-tone=contrast`, `header-align=right`, `title-size=lg`, `card-radius=xl`, `card-border-width=md`; card ma `rounded-[1.75rem] border-2`. | Nie publikowano tej zmiany. | Dziala | Renderer mapuje style tokeny na klasy i inner surface wrapper. | Brak. |
| Colors | Ustaw section/card/text/accent colors | Inner surface ma section background/gradient; karta ma `background-color: rgb(250,250,210)`, `border-color: rgb(255,102,0)`, text `rgb(119,17,204)`. | Nie publikowano tej zmiany. | Dziala | `SharedColorControl` zapisuje style; renderer aplikuje card styles na item i section styles na inner wrapper. | Brak. |
| Clear text color | Klik `Clear` przy Text color | Karta wraca do `color: var(--color-text)`. | Nie publikowano tej zmiany. | Dziala | Clear usuwa `style.textColor`, renderer bierze token fallback. | Brak. |
| CTA disabled/enabled | Enable CTA, label `Audit CTA`, destination `Audit 31-05 Hero`, New tab, Link style | Link renderuje `href="/audit-31-05-hero"`, `target="_blank"`, `rel="noopener noreferrer"`, `data-testimonials-cta-style="link"`. | Nie publikowano tej zmiany. | Dziala | `LinkDestinationField` + `resolveWidgetLinkAttrs`. | Brak. |
| Pagination load-more | Mode `Load more`, page size `2`, label | Root `data-testimonials-pagination="load-more"`, `<details data-testimonials-load-more>` z label `Show more audit testimonials`. | Nie publikowano tej zmiany. | Dziala | Renderer dzieli visible/overflow przez `resolveVisibleTestimonials`. | Brak. |
| Advanced | Klik `Advanced` | `0` writable widget controls; summary pokazuje `grid`, `6 configured`, spacing `lg`, pagination `load-more`, CTA `Audit CTA`. | Nie dotyczy. | Dziala | Advanced jest read-only diagnostics. | Brak. |
| Formatted quote clear | W rich quote zaznacz wszystko i Backspace | Po poprawce `quoteHtml="<br>"` normalizuje sie do pustego stanu; preview wraca do `data-testimonial-quote-mode="plain"` i pokazuje plain quote fallback. | Nie dotyczy. | Dziala po poprawce | `sanitizeTestimonialsQuoteHtml` najpierw zachowuje dotychczasowa allowliste, a potem odrzuca HTML bez realnego plain textu (`<br>`, `<p><br></p>`, whitespace/`&nbsp;`). | Brak. Pokryte regresjami w `tests/vitest/widgets/testimonials.test.tsx` i `tests/vitest/ui/testimonials-editor-wave.test.tsx`. |

## Public baseline

`curl http://localhost:3000/audit-31-05-testimonials` zwrocil HTTP 200 i SSR HTML z:

- `data-testimonials-variant="grid"`,
- `data-testimonials-count="3"`,
- `data-testimonials-spacing="md"`,
- `data-testimonials-rating-display="hide-empty"`,
- `data-testimonials-pagination="none"`,
- heading `Trusted by teams`,
- 3 testimonial items with ratings `5`, `5`, `4`,
- `data-testimonial-quote-mode="plain"`.

To potwierdza, ze swieza strona audytowa publikuje domyslny Testimonials.
Zmiany z klikanej sesji admin nie byly publikowane jako finalny stan publiczny.

## Kod-owner dla znalezionego problemu

- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
  - `PostRichTextAdapter` dla `testimonials.visual.quoteHtml.*` w okolicach
    linii 755-764.
- `core/widgets/core/testimonials.tsx`
  - `testimonialsQuoteAllowedTags` dopuszcza `br` w okolicach linii 145-147.
  - `sanitizeTestimonialsQuoteHtml` zwraca samotne `<br>` jako wartosc w
    okolicach linii 587-595.
  - `TestimonialQuote` renderuje HTML branch, gdy `quoteHtml` jest truthy, w
    okolicach linii 925-936.

## Wynik i remediacja

Zamkniete w TASK-376 / TASK-376-01.

- `sanitizeTestimonialsQuoteHtml` odrzuca teraz sanitized rich quote HTML, jezeli
  `htmlToPlainText` nie znajduje realnej tresci.
- `TestimonialsEditors.tsx` nie dostal editor-only fallbacku; jego update path
  przechodzi przez `normalizeTestimonialsData`, wiec owner-side sanitizer
  czysci `quoteHtml` takze w Visual editor state.
- Regresje: `quoteHtml: "<br>"`, `<p><br></p>` i whitespace/`&nbsp;` nie
  wybieraja juz HTML branchu, a preview/SSR pokazuje plain quote fallback.
- Walidacja: focused widget/UI regressions fail-before/pass-after, `bun run
  test:vitest -- tests/vitest/widgets/testimonials.test.tsx
  tests/vitest/ui/testimonials-editor-wave.test.tsx`, `bun --cwd core lint`,
  `bun --cwd core lint:types`.

## Console / srodowisko

- Claude CLI nie wykonal audytu z powodu `401 Invalid authentication credentials`.
- Radix selecty w dlugim `playwright-cli run-code` byly stabilniejsze po
  rozdzieleniu akcji: klik triggera przez locator i wybor `role=option` z DOM.
- Kolory weryfikowano natywnym setterem inputa `type=color`; zwykle
  przypisanie `input.value` nie wyzwala Reactowego `onChange`.
