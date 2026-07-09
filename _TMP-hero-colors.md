# Kolory sekcji HERO — prototyp `_docs/projekty-domow-wow-site`

Źródło: `index.html` (`<section class="hero section-pad">`, linie 38–91) + `assets/styles.css`.
Poniżej wszystkie kolory użyte w sekcji hero, pogrupowane wg miejsca (elementu), do którego się odnoszą.

---

## Zmienne bazowe (`:root`) używane w hero

Te zmienne z `:root` są wykorzystywane przez elementy hero:

- `--bg` → `#07111f` — bazowe ciemne tło (używane też jako kolor tekstu na jasnych przyciskach)
- `--text` → `#f7fbff` — główny kolor tekstu (nagłówek H1, jasne elementy)
- `--muted` → `#a8b5c7` — tekst wyciszony (paragrafy)
- `--muted-2` → `#7e8ba0` — tekst mocno wyciszony (podpisy w mini-dashboard)
- `--aqua` → `#8ee8ff` — kolor akcentu (eyebrow, kropka scroll-hint)
- `--surface` → `rgba(255,255,255,.075)` — półprzezroczyste tło paneli / chipów
- `--surface-strong` → `rgba(255,255,255,.12)`
- `--line` → `rgba(255,255,255,.14)` — kolor obramowań
- `--shadow` → `0 22px 70px rgba(0,0,0,.36)` — cień kart (blueprint-card)

---

## 1. Tło całej strony / za sekcją hero (`body`)

Widoczne pod hero (sekcja jest przezroczysta). Warstwy tła:

- Poświata aqua (lewy górny róg): `radial-gradient(circle at 18% -10%, rgba(142,232,255,.22), transparent 28rem)`
- Poświata fioletowa (prawy górny róg): `radial-gradient(circle at 82% 5%, rgba(199,183,255,.18), transparent 26rem)`
- Gradient pionowy bazowy: `linear-gradient(180deg, #07111f 0%, #081321 52%, #06101b 100%)`
- Kolor zaznaczenia tekstu (`::selection`): `rgba(142,232,255,.28)`

---

## 2. Kursor-poświata (`.cursor-glow`) — nakładka nad hero

- `radial-gradient(circle, rgba(142,232,255,.16), rgba(199,183,255,.07) 35%, transparent 70%)`

---

## 3. Orby tła hero (`.hero-bg-orb`)

Dwie rozmyte plamy koloru unoszące się w tle sekcji:

- `.orb-one` (lewy dół): `rgba(142,232,255,.14)` — aqua
- `.orb-two` (prawy góra): `rgba(199,183,255,.16)` — fiolet

---

## 4. Kolumna z treścią (`.hero-copy`)

### Eyebrow — „Pracownia projektów domów przyszłości” (`.eyebrow`)
- Tekst: `var(--aqua)` → `#8ee8ff`
- Kreska przed tekstem (`.eyebrow span`): `linear-gradient(90deg, var(--aqua), transparent)`

### Nagłówek H1 (`.hero-copy h1`)
- Kolor: dziedziczony `var(--text)` → `#f7fbff`

### Lead / akapit wiodący (`.lead`)
- Kolor: `#c8d4e3`

### Przyciski akcji (`.hero-actions`)
- **Primary** „Zaprojektujmy Twój dom” (`.button.primary`):
  - Tło: `linear-gradient(135deg, #f7fbff, #b8f4ff 55%, #d8c9ff)`
  - Tekst: `#07111f`
  - Cień: `0 18px 45px rgba(142,232,255,.22)`
- **Secondary** „Zobacz projekty” (`.button.secondary`):
  - Tło: `rgba(255,255,255,.08)`
  - Tekst: `var(--text)` → `#f7fbff`
  - Obramowanie: `rgba(255,255,255,.14)`

### Wyróżniki / trust-row (`.trust-row span`)
- Tekst: `#dce7f5`
- Tło: `rgba(255,255,255,.075)`
- Obramowanie: `rgba(255,255,255,.13)`

---

## 5. Karta wizualizacji (`.blueprint-card` / prawa kolumna `.hero-showcase`)

### Tło i obramowanie karty
- Tło: `linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.045))`
- Obramowanie: `rgba(255,255,255,.16)`
- Cień: `var(--shadow)` + `inset 0 1px 0 rgba(255,255,255,.16)`

### Siatka „blueprint” (`.blueprint-card:before`)
- Linie siatki: `#8ee8ff0f` (dwa gradienty, poziom + pion)

### Górna linia karty (`.blueprint-topline`)
- Tekst („Concept 07 / Modern Barn”, „142 m²”): `#dce7f5`

### Rysunek domu — linie SVG (`.house-line`, gradient `#lineGlow`)
- Gradient linii: od `#b8f4ff` do `#d4c2ff`
- Wypełnienie bryły (jeden `path`): `rgba(255,255,255,.03)`
- Cień/poświata linii (`drop-shadow`): `rgba(142,232,255,.35)`

### Pierścień słońca (`.sun-ring`)
- Obramowanie: `rgba(255,255,255,.12)`
- Tło: `radial-gradient(circle, rgba(255,215,168,.12), transparent 62%)` — ciepły (warm)

### Pływające chipy (`.floating-chip` — „+ duże przeszklenia”, „A++ ready”, „VR / 3D”)
- Tekst: `#dce7f5`
- Tło: `#ffffff13`
- Obramowanie: `#ffffff21`
- Cień: `0 16px 34px rgba(0,0,0,.22)`

### Mini-dashboard (`.mini-dashboard div` — „3 / 21 dni / 96%”)
- Tło kafelka: `rgba(6,16,29,.52)`
- Obramowanie: `rgba(255,255,255,.12)`
- `strong` (liczby): dziedziczy `var(--text)` → `#f7fbff`
- `span` (podpisy): `var(--muted-2)` → `#7e8ba0`

---

## 6. Wskaźnik przewijania (`.scroll-hint`, dół sekcji)

- Obramowanie „myszki”: `rgba(255,255,255,.18)`
- Kropka (`.scroll-hint span`): `var(--aqua)` → `#8ee8ff`

---

## Podsumowanie palety hero (skrót)

| Rola | Wartość |
|------|---------|
| Tło bazowe | `#07111f`, `#081321`, `#06101b` |
| Tekst główny | `#f7fbff` |
| Tekst lead | `#c8d4e3` |
| Tekst na chipach / topline | `#dce7f5` |
| Tekst wyciszony | `#a8b5c7` / `#7e8ba0` |
| Akcent aqua | `#8ee8ff` (+ `rgba(142,232,255,*)`) |
| Akcent fiolet | `#c7b7ff` / `rgba(199,183,255,*)` / `#d4c2ff` / `#d8c9ff` |
| Akcent ciepły (słońce) | `rgba(255,215,168,*)` |
| Jasne linie SVG | `#b8f4ff` → `#d4c2ff` |
| Przycisk primary | gradient `#f7fbff → #b8f4ff → #d8c9ff`, tekst `#07111f` |
| Powierzchnie szkła | `rgba(255,255,255,.045–.13)` |
| Obramowania | `rgba(255,255,255,.12–.16)` |

---

# Typografia, fonty, obramowania, radiusy — sekcja HERO

## Font (globalny, dziedziczony w całym hero)

- `font-family`: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Domyślna wysokość linii akapitu (`p`): `line-height: 1.75`
- Brak zewnętrznego fontu (web-font) — używany jest systemowy stack sans-serif.

## Zmienne bazowe rozmiarów (`:root`)

- `--radius` → `28px`
- `--radius-sm` → `18px`
- `--container` → `1180px` (szerokość `.container` = `min(1180px, calc(100% - 40px))`)

---

## 1. Kontener sekcji (`.hero.section-pad`)

- `min-height`: `100svh`
- `padding`: `120px` góra / `80px` dół (nadpisuje `.section-pad` = `112px 0`)
- Siatka `.hero-grid`: `grid-template-columns: minmax(0,1fr) minmax(420px,.9fr)`, `gap: 56px`

## 2. Eyebrow (`.eyebrow` — „Pracownia projektów…”)

- `font-size`: `.78rem`
- `font-weight`: `750`
- `letter-spacing`: `.08em`
- `text-transform`: `uppercase`
- `gap`: `10px`
- Kreska (`.eyebrow span`): `width: 34px`, `height: 1px`

## 3. Nagłówek H1 (`.hero-copy h1`)

- `font-size`: `clamp(2.6rem, 5vw, 4.4rem)`
- `line-height`: `.99`
- `letter-spacing`: `-.03em`
- `margin`: `20px 0 24px`
- `max-width`: `760px` (w `.hero-copy`; bazowo `900px`)

## 4. Lead / akapit (`.lead`)

- `font-size`: `clamp(1.05rem, 1.8vw, 1.32rem)`
- `line-height`: `1.75` (z domyślnego `p`)
- `max-width`: `690px`
- `margin`: `0`

## 5. Przyciski akcji (`.hero-actions`, `.button`)

- Kontener `.hero-actions`: `gap: 14px`, `margin: 34px 0 26px`
- `.button`:
  - `min-height`: `48px`
  - `padding`: `14px 20px`
  - `border`: `1px solid transparent`
  - `border-radius`: `999px` (pełny pigułka)
  - `font-weight`: `850`
  - `hover`: `transform: translateY(-2px)`
- `.button.secondary` `border-color`: `rgba(255,255,255,.14)`

## 6. Trust-row (`.trust-row span`)

- `font-size`: `.84rem`
- `padding`: `9px 12px`
- `border`: `1px solid rgba(255,255,255,.13)`
- `border-radius`: `999px`
- `gap` między elementami: `10px`
- `backdrop-filter`: `blur(14px)`

---

## 7. Karta wizualizacji (`.blueprint-card`)

- `min-height`: `570px`
- `padding`: `24px`
- `border`: `1px solid rgba(255,255,255,.16)`
- `border-radius`: `34px`
- Siatka blueprint (`:before`): `background-size: 34px 34px`
- `perspektywa` sceny (`.hero-showcase`): `perspective: 1200px`

### Górna linia (`.blueprint-topline`)
- `font-size`: `.84rem`

### Sekcja rysunku (`.house-visual`)
- `height`: `410px`

### Linie SVG domu (`.house-line`)
- `max-width`: `560px`
- `stroke-width`: `5` (główne linie) / `4` (linia dolna)
- `drop-shadow`: `0 0 14px rgba(142,232,255,.35)`

### Pierścień słońca (`.sun-ring`)
- `width` / `height`: `230px`
- `border`: `1px solid rgba(255,255,255,.12)`
- `border-radius`: `50%`

### Pływające chipy (`.floating-chip`)
- `font-size`: `.84rem`
- `padding`: `9px 12px`
- `border`: `1px solid` (`#ffffff21`)
- `border-radius`: `999px`
- `box-shadow`: `0 16px 34px rgba(0,0,0,.22)`

### Mini-dashboard (`.mini-dashboard`)
- Siatka: `grid-template-columns: repeat(3,1fr)`, `gap: 10px`
- Kafelek (`div`): `padding: 15px`, `border: 1px solid rgba(255,255,255,.12)`, `border-radius: 20px`
- `strong` (liczby): `font-size: 1.1rem`
- `span` (podpisy): `font-size: .78rem`, `margin-top: 4px`

---

## 8. Wskaźnik przewijania (`.scroll-hint`)

- `width`: `34px`, `height`: `52px`
- `border`: `1px solid rgba(255,255,255,.18)`
- `border-radius`: `999px`
- Kropka (`span`): `width: 5px`, `height: 9px`, `border-radius: 999px`

---

## Responsywność hero (breakpointy)

### ≤ 1060px
- `.hero-grid` → jedna kolumna (`grid-template-columns: 1fr`)
- `.hero-showcase` → `max-width: 620px`
- `.section-pad` → `padding: 84px 0`

### ≤ 700px
- `.hero` → `padding-top: 118px`
- `.hero-grid` → `gap: 30px`
- H1 → `font-size: clamp(2rem, 9vw, 3rem)`
- `.blueprint-card` → `min-height: 470px`, `padding: 18px`, `border-radius: 26px`
- `.house-visual` → `height: 330px`
- `.mini-dashboard` → jedna kolumna (`grid-template-columns: 1fr`)
- `.floating-chip` → `display: none` (ukryte)
- `.section-pad` → `padding: 70px 0`

---

## Podsumowanie rozmiarów (skrót)

| Element | font-size | radius | border |
|---------|-----------|--------|--------|
| H1 | `clamp(2.6rem, 5vw, 4.4rem)` | — | — |
| Lead | `clamp(1.05rem, 1.8vw, 1.32rem)` | — | — |
| Eyebrow | `.78rem` | — | — |
| Button | dziedziczy, `font-weight: 850` | `999px` | `1px solid transparent` |
| Trust-row / chipy | `.84rem` | `999px` | `1px solid` |
| Blueprint-card | — | `34px` (mob. `26px`) | `1px solid rgba(255,255,255,.16)` |
| Mini-dashboard kafelek | `strong 1.1rem` / `span .78rem` | `20px` | `1px solid rgba(255,255,255,.12)` |
| Sun-ring | — | `50%` | `1px solid rgba(255,255,255,.12)` |
| Scroll-hint | — | `999px` | `1px solid rgba(255,255,255,.18)` |
