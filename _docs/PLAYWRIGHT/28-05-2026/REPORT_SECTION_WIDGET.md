# RAPORT: Section Widget — audyt gap-close (media / tło / layout / clears)

> **Status:** Zakończony
> **Data:** 2026-05-29 (upgrade audytu z 28-05-2026)
> **Sesja przeglądarki:** `claude-29-05-section-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** page id `d37f900c-e8c2-4608-a71e-4a038300a048`
> **Fixture public:** `http://localhost:3000/section-widget-test`
> **Pliki źródłowe:** `core/widgets/core/section.tsx` (renderer + model + normalizacja), `core/admin/ui/widgets/editors/SectionEditors.tsx` (edytory Wizard/Visual/Advanced), `core/admin/ui/widgets/editors/ClearableFields.tsx` (logika ColorField/Clear)

> **Cel tej sesji (gap-close):** Domknięcie luk wymienionych w poprzednim audycie
> (sekcja „Czego NIE testowałem"): **gałęzie typu tła media**, **media picker**,
> **fit/position**, **opacity/layer/blend**, **pozostałe selecty spacing/layout**,
> oraz **clears / transparent**. Każdą kontrolkę realnie klikano i weryfikowano przez
> inspekcję wyrenderowanego elementu w canvas (atrybuty `data-section-*`, inline
> `style`, klasy) oraz przez round-trip po `Save draft` + reload.

> **Uwaga o zrzutach:** Nazwy plików PNG poniżej są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG nie są wymaganym evidence i nie są
> commitowane do repo. W tej sesji evidence opierało się o programowy odczyt DOM
> (`eval`), nie o PNG.

---

## 1. Przegląd widgetu (skrót modelu istotny dla tej sesji)

**Typ:** `section` · **Kategoria:** layout · **Warianty:** `default`, `contained`, `bleed`.

Gałąź **`style.backgroundMedia`** (klucz dla tej sesji):

| Pole | Wartości / typ | Renderer |
|---|---|---|
| `type` | `none` / `image` / `video` | warunkuje widoczność wszystkich pól poniżej |
| `source` | `library` / `external` | UI edytora odsłania tylko ścieżkę `library` (MediaPicker) |
| `assetId` + `src` | string | resolve URL z biblioteki |
| `fit` | `cover` / `contain` | `background-size` (image) / `object-fit` (video) |
| `position` | `center`/`top`/`bottom`/`left`/`right` | `background-position` / `object-position` |
| `opacity` | 0–100 (clamp) | `opacity` warstwy / 100 |
| `blendMode` | `normal`/`multiply`/`screen`/`overlay` | `mix-blend-mode` (pomijany przy `normal`) |
| `layerOrder` | `media-under-overlay` / `overlay-under-media` | klasa `z-[0]` vs `z-[1]` warstwy media |
| `posterSrc` / `posterAssetId` (video) | string | `poster` na `<video>` |
| `title` / `description` (video) | string | metadane (a11y/notatki) |

**Kluczowa logika rendera (`section.tsx`):** warstwa tła pojawia się dopiero, gdy
`resolveRenderableSectionMediaSrc` zwróci URL **zgodny typowo** (image: `.png/.jpg/...`,
video: `.mp4/.webm/...`). Bez prawidłowego `src` element zwraca
`data-section-background-media="none"` i **nie** renderuje pustej ramki.

---

## 2. Co było faktycznie testowane w tej sesji (zakres realnych interakcji)

Punkt wyjścia: stan z draftu 28-05 (`variant=bleed`, `element=div`,
`id=Strefa-Cennika`, `aria-label=Sekcja cennika`, `shadow=lg`, `minHeight=hero`).

**Background media — gałąź IMAGE:**
- `Background media type`: `None → Image` (odsłonięcie pól warunkowych).
- `Browse media` (MediaPicker, dialog „Media library") — realny wybór assetu `cos1.png` (alt „Placeholder hero image"), zamknięcie dialogu, render warstwy obrazu w canvas.
- `Media fit`: `Cover → Contain`.
- `Media position`: `Center → Top`.
- `Blend mode`: `Normal → Multiply`.
- `Layer order`: `Media under overlay → Overlay under media`.
- `Media opacity`: `100 → 60`, oraz test clampu `150 → 100`.
- Round-trip typu `Image → Video → Image` (zachowanie ustawień fit/position/blend/layer/opacity), ponowny wybór assetu.

**Background media — gałąź VIDEO:**
- `Background media type`: `Image → Video` (odsłonięcie pól wideo).
- `Background video title` / `Background video description` — wpisanie tekstu.
- `Video poster image` (MediaPicker, accept `image/*`) — realny wybór posteru + `Clear` posteru.
- Próba wyboru assetu wideo przez MediaPicker (accept `video/*`).

**Spacing / layout selecty (wcześniej nieklikane indywidualnie):**
- `Region flow`: `Stack → Row`.
- `Container width`: `Full-width wrapper → Content wrapper`.
- `Mobile vertical padding`: `Match base → Compact` (override responsywny).
- `Region gap`: `Match variant → Spacious` (jawny token).
- `Corner radius`: `None → 2XL`.
- `Surface motion`: `None → Fade in`.
- `Title size`: `2XL → 3XL`.

**Surface / kolory + CLEARS:**
- `Gradient start` + `Gradient end` — ustawienie obu stopów (render gradientu).
- `Gradient angle` — stepper `+15° ×2` (180 → 210°).
- `Clear` na `Gradient end` (zanik gradientu, powrót do fallbacku).
- `Background color` — ustawienie `#abcdef`, następnie `Clear` (powrót do transparent).
- `Border width`: `0px → 2px` + `Border color` `#cc0033`.
- `Title color` — ustawienie `#9900cc` na nagłówku H3, następnie `Clear`.

**Persistencja:** `Save draft` → `reload` → ponowny odczyt canvas i panelu Advanced.

**Front:** `/section-widget-test` (nowa karta), render opublikowany, overflow @1280 i @375, konsola.

---

## 3. Co DZIAŁA (potwierdzone w praktyce)

### 3.1 Background media — gałąź IMAGE (pełna weryfikacja w canvas)

| Kontrolka | Akcja | Efekt w canvas (zweryfikowany) | Wynik |
|---|---|---|---|
| Background media type → Image | klik | odsłonięcie: Browse media, fit, position, blend, layer order, opacity | ✅ |
| Browse media (MediaPicker) | wybór `cos1.png` | warstwa `[data-section-background-media="image"]` z `background-image: url(http://localhost:3000/media/.../...png)`; `data-section-background-media` na elemencie → `image` | ✅ realny render |
| Media fit | Cover → Contain | `background-size: contain` | ✅ |
| Media position | Center → Top | `background-position: center top` (przeglądarka normalizuje „top center" → „center top") | ✅ |
| Blend mode | Normal → Multiply | `mix-blend-mode: multiply` | ✅ |
| Layer order | media-under → overlay-under | `data-section-layer-order=overlay-under-media`; klasa warstwy media `z-[0]` → `z-[1]` | ✅ |
| Media opacity | 100 → 60 | `opacity: 0.6` | ✅ |
| Media opacity (clamp) | wpis 150 | `opacity: 1` (clamp do 100%) | ✅ clamp |
| Round-trip Image→Video→Image | przełączenia typu | fit/position/blend/layer/opacity **zachowane**, asset wymaga ponownego wskazania | ✅ zgodne z `resolveBackgroundMediaTypeTransition` |

### 3.2 Background media — gałąź VIDEO (pola metadanych + poster działają)

- `Background media type → Video` poprawnie odsłania: pole assetu wideo (accept `video/*`), `Background video title`, `Background video description`, blok `Video poster image`.
- `Background video title` / `description` — pola tekstowe przyjmują wpis.
- `Video poster image` (MediaPicker, accept `image/*`) — **realny wybór** assetu (`cos1.png`) działa; miniatura i nazwa pojawiają się w polu. `Clear` posteru przywraca „No media selected yet."
- **Bezpieczny render bez źródła wideo:** przy `type=video` bez rozwiązywalnego `src`, canvas utrzymuje `data-section-background-media="none"` i **nie** renderuje `<video>`. To poprawne zachowanie (renderer wymaga zgodnego typowo URL-a).

### 3.3 Spacing / layout selecty

| Kontrolka | Akcja | Efekt w canvas | Wynik |
|---|---|---|---|
| Region flow → Row | klik | `data-section-region-flow=row`; kontener `flex flex-col md:flex-row md:flex-wrap`; item `min-w-0 md:min-w-[16rem] md:flex-1` | ✅ |
| Container width → Content | klik | `data-section-container-width=content`; wrapper `mx-auto w-full px-8` (padding inline wraca, bo `full+bleed` go znosił) | ✅ |
| Mobile vertical padding → Compact | klik | frame `py-4 md:py-10` (mobile=compact, desktop wraca do bazowego `xl`) | ✅ override responsywny |
| Region gap → Spacious | klik | `data-section-region-gap=lg`; kontener regionów `gap-6` | ✅ |
| Corner radius → 2XL | klik | warstwa clipped `... overflow-hidden rounded-2xl` | ✅ |
| Surface motion → Fade in | klik | `data-section-motion=fade`; frame `motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-reduce:animate-none` | ✅ |
| Title size → 3XL | klik | tytuł `text-3xl font-semibold ...` | ✅ |

### 3.4 Surface / kolory + CLEARS

| Kontrolka | Akcja | Efekt w canvas | Wynik |
|---|---|---|---|
| Gradient start + end | oba stopy | `background-image: linear-gradient(210deg, rgb(34,204,85), rgb(238,136,0))` | ✅ render gradientu |
| Gradient angle | stepper +15° ×2 | kąt 180 → 210° widoczny w `linear-gradient(210deg, …)` | ✅ |
| Clear (Gradient end) | klik | gradient znika (`background-image` puste); swatch → fallback `#f1f5f9`, helper „Theme default…", przycisk Clear → disabled | ✅ |
| Background color | `#abcdef` | `background-color: rgb(171,205,239)` | ✅ |
| Clear (Background color) | klik | `background-color` znika (transparent/dziedziczone); swatch → `#ffffff`, helper „…Swatch preview uses transparent."; Clear → disabled | ✅ |
| Border width 2px + Border color | `#cc0033` | `border-width: 2px; border-color: rgb(204,0,51); border-style: solid` | ✅ |
| Title color | `#9900cc` | H3 inline `color: rgb(153,0,204)` | ✅ |
| Clear (Title color) | klik | inline color znika; tytuł wraca do klasy `text-[var(--color-text)]` | ✅ |

### 3.5 Persistencja (Save draft → reload) — łączny round-trip

Po `Save draft` (feedback „Draft saved.") i reloadzie **wszystkie** zmiany wróciły z bazy i wyrenderowały się ponownie:

`variant=bleed`, `containerWidth=content`, `regionFlow=row`, `regionGap=lg`,
`motion=fade`, `media=image`, `layerOrder=overlay-under-media`,
`borderWidth=2px`, `borderColor=rgb(204,0,51)`, `rounded-2xl` obecne,
tytuł `text-3xl`, obraz `background-size=contain`, `mix-blend-mode=multiply`. ✅

_Zrzut (lokalny): `section-admin-media-persist-29-05.png`_

### 3.6 Advanced (read-only) — wiernie odzwierciedla nowy stan

Po reloadzie panel Advanced raportował zgodnie z faktycznym stanem:
- **Layout:** „content wrapper, none max width, xl vertical padding".
- **Surface:** „Inherited background, 2xl radius, lg shadow".
- **Heading:** „h3 heading, center aligned, title set".
- **Background media:** „image from Media Library, contain fit, 100% opacity".
- **Visual effects:** „Gradient angle 210 degrees, overlay 15%, motion fade". ✅

### 3.7 Front (`/section-widget-test`)
- HTTP `200`, tytuł „Section Widget Test", **0 błędów** konsoli.
- Render **opublikowany**: semantyczny `<section>`, `variant=contained`, `media=none`, nagłówek „Test Section Title".
- **Brak poziomego overflow** @1280 i @375 (`scrollWidth ≤ clientWidth`). ✅

_Zrzuty (lokalne): `section-public-desktop-29-05.png`, `section-public-mobile-375-29-05.png`_

---

## 4. Co NIE działa / problemy

- **Nie wykryto błędów funkcjonalnych** w żadnej z domkniętych w tej sesji rodzin
  kontrolek. Gałąź image tła, media picker, fit/position/blend/layer/opacity,
  pozostałe selecty layout/spacing oraz wszystkie ścieżki Clear/transparent
  działają i są trwałe po zapisie.
- Brak błędów konsoli zarówno w adminie (po reloadzie: 0 errors / 0 warnings),
  jak i na froncie (0 errors).

---

## 5. Czego NIE dało się w pełni zweryfikować (not-testable — z dokładną przyczyną)

1. **Realny render warstwy `<video>` w canvas — niemożliwy w tym fixture/środowisku.**
   - **Kontrolka:** `Background video` → `Browse media` (MediaPicker, accept `video/*`) w sekcji „Background media and layers".
   - **Przyczyna:** Biblioteka mediów w tym środowisku zawiera **wyłącznie assety obrazowe** (5× `image/*`: `cos1.png`, `tratata`/`image.png`, 3× `image.png`). Dla typu Video MediaPicker pokazuje **„No media assets found."** — brak jakiegokolwiek pliku `video/*` do wskazania.
   - **Dodatkowo:** edytor Visual **nie eksponuje pola tekstowego na zewnętrzny URL** wideo. Ścieżka `source: "external"` ujawnia się tylko jako afordancja „Saved external media" (Use Media Library / Clear), która wymaga **wcześniej zapisanego** zewnętrznego źródła. Z poziomu UI nie da się więc wpisać własnego URL-a `.mp4/.webm`.
   - **Konsekwencja:** Nie potwierdziłem renderu elementu `<video>` (źródło, `object-fit`, `object-position`, `poster`, autoplay/loop/muted). Potwierdziłem natomiast, że renderer **bezpiecznie** pozostawia `data-section-background-media="none"` przy braku rozwiązywalnego `src` wideo (brak pustej ramki).
   - **Pośrednio zweryfikowane dla wideo:** odsłonięcie pól, wpis title/description, wybór i Clear **posteru** (accept `image/*`, biblioteka ma obrazy).

2. **`Media position` dla wideo (`object-position`)** — nie zweryfikowany na realnym elemencie `<video>` z tego samego powodu co wyżej (brak źródła wideo). Dla obrazu (`background-position`) — zweryfikowany.

3. **Round-trip moich edycji na FRONT (`/section-widget-test`)** — niemożliwy, bo wykonano wyłącznie `Save draft`, **nie** `Publish`. Front serwuje treść **opublikowaną** (`section`/`contained`/`media=none`/„Test Section Title"), więc moje zmiany z draftu (`div`/`bleed`/`image`/„Tytuł audytowy 28-05") **nie pojawiły się** na publicznej trasie. To potwierdza wymienioną w zadaniu „front propagation limitation": kanał draft→public wymaga publikacji, której świadomie nie wykonałem (publikacja to akcja widoczna publicznie).

---

## 6. Niuanse harnessu testowego (NIE są błędami widgetu)

1. **Radix Select ≠ natywny `<select>`.** Wszystkie comboboxy (media type, fit,
   position, blend, layer order, region flow, container width, radius, motion,
   sizes itd.) to komponenty Radix. Wymagają sekwencji „klik trigger → klik opcja";
   komenda `select` (natywna) nie działa. Klik myszą działa bez zarzutu.

2. **`<input type="color">` pod kontrolą React — pułapka sterowania programowego.**
   - `playwright fill` oraz naiwne `el.value = …; dispatch('input')` **nie wyzwalają** React-owego `onChange` na tych polach: swatch wizualnie zmienia kolor, ale stan React pozostaje pusty (przycisk `Clear` zostaje **disabled**, gradient/tło się nie pojawia). To **nie** jest błąd ColorField.
   - Poprawne sterowanie: natywny setter prototypu (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`) + `dispatch('input', {bubbles:true})` **i wartość MUSI się różnić** od poprzedniej (React deduplikuje zapis tej samej wartości przez wewnętrzny value-tracker — stąd początkowe „fałszywe negatywy", gdy dwukrotnie ustawiałem to samo `#ff0000`).
   - Po zastosowaniu poprawnej metody wszystkie ColorFieldy (background, gradient start/end, border, title color) działają i poprawnie włączają `Clear`.

---

## 7. Uwagi UX/UI (niuanse, nie błędy)

1. **Przezroczyste/wyczyszczone tło = biała próbka.** Po `Clear` na Background color
   swatch pokazuje `#ffffff`, ale helper jawnie mówi „…Swatch preview uses transparent."
   — mniej mylące niż mogłoby się wydawać, choć sama próbka nadal sugeruje biel.
   (Analogicznie gradient po Clear pokazuje fallback `#f1f5f9` z „Theme default".)

2. **Diagnostyka Advanced — niepełny opis media.** Podsumowanie „Background media"
   raportuje `type / source / fit / opacity`, ale **pomija** `position`, `blendMode`
   i `layerOrder`. Przy aktywnym multiply + overlay-under-media + position=top
   wsparcie nie zobaczy tych trzech wymiarów w summary. To luka kompletności
   diagnostyki, nie błąd rendera.

3. **„Gradient angle 210 degrees" pokazywane także bez gradientu.** Po wyczyszczeniu
   stopów gradientu Advanced nadal raportuje kąt (`Visual effects: Gradient angle …`).
   Kąt jest stanem zawsze obecnym; bez obu stopów gradient i tak się nie renderuje,
   ale tekst może sugerować aktywny gradient.

4. **Brak pola zewnętrznego URL dla media w Visual.** Jedyną drogą wskazania
   obrazu/wideo jest Media Library (MediaPicker). Ścieżka `external` istnieje w
   modelu i normalizerze, lecz UI odsłania ją wyłącznie jako tryb „naprawczy"
   („Saved external media") dla treści już mających zapisane źródło zewnętrzne.
   Dla treści tworzonych od zera nie ma jak podać własnego URL-a (świadome
   ograniczenie zakresu, ale warto odnotować przy planach wideo bez assetu w bibliotece).

5. **Język deweloperski w helperach** (utrzymany z poprzedniego audytu): backticki/
   inline-code kierowane do autora treści (`Wide alias`, `h2`, `Full-width wrapper`,
   `No max width`). Techniczny ton w UI autorskim.

6. **Dobra warunkowość** (potwierdzona ponownie): `Grid columns` disabled dopóki
   Region flow ≠ Grid; pola wideo (title/description/poster) odsłaniane tylko dla
   typu Video; pola media w ogóle ukryte dla typu None. Pozytywny wzorzec.

---

## 8. Podsumowanie

| Obszar | Zakres tej sesji | Wynik |
|---|---|---|
| **Background media — Image** | type, picker, fit, position, blend, layer order, opacity (+clamp), round-trip typu, persistencja | ✅ pełna weryfikacja w canvas + reload |
| **Background media — Video** | odsłonięcie pól, title/description, poster (wybór+Clear) | ✅ częściowo; render `<video>` **not-testable** (brak assetów video/* i brak pola URL) |
| **Spacing/layout selecty** | Row, Content, mobile padding override, region gap, radius 2XL, motion fade, title size 3XL | ✅ każdy zmienia canvas i jest trwały |
| **Clears / transparent** | gradient end, background color (transparent), title color, + border/gradient set | ✅ każdy clear przywraca fallback i wyłącza przycisk Clear |
| **Advanced** | odczyt po reloadzie | ✅ zgodny ze stanem (z niuansem niepełnego opisu media — sekcja 7.2) |
| **Front** | render opublikowany, overflow @1280/@375, konsola | ✅ semantyczny `<section>`, brak overflow, 0 błędów; draft **nie** propaguje bez Publish |

**Werdykt końcowy:** Domknięto wszystkie wskazane luki dotyczące mediów/tła oraz
pozostałych selectów layout/spacing i ścieżek Clear/transparent. W przetestowanym
zakresie **nie wykryto błędów funkcjonalnych** — gałąź image tła renderuje się
realnie i przeżywa zapis, comboboxy i clears działają poprawnie, a renderer
bezpiecznie obsługuje brak źródła media. Jedyne realne ograniczenie to **brak
możliwości weryfikacji renderu wideo** w tym fixture (zero assetów `video/*` w
bibliotece + brak pola na zewnętrzny URL) oraz brak propagacji draftu na front bez
publikacji — oba opisane dokładnie w sekcji 5. Uwagi z sekcji 6–7 to niuanse
harnessu/UX, nie defekty.

---

## 9. Zrzuty (etykiety lokalne)

| Plik (lokalna etykieta) | Opis |
|---|---|
| `section-admin-media-persist-29-05.png` | Admin, Visual — stan po edycjach media/surface, zapisany draftem i potwierdzony po reloadzie |
| `section-admin-advanced-29-05.png` | Admin, Advanced — diagnostyka read-only odzwierciedlająca nowy stan |
| `section-public-desktop-29-05.png` | Front `/section-widget-test`, 1280px (render opublikowany) |
| `section-public-mobile-375-29-05.png` | Front `/section-widget-test`, 375px (brak overflow) |
