# Prototyp `_docs/projekty-domow-wow-site` — pełna rozpiska wszystkich sekcji

Kompletny opis układu, fontów, wielkości, obramowań, radiusów, animacji i efektów
dla całego prototypu (FormaDom Studio). Źródła: `index.html`, `oferta.html`,
`projekty.html`, `proces.html`, `cennik.html`, `o-nas.html`, `kontakt.html`,
`projekt-aurora.html` + `assets/styles.css` + `assets/app.js`.

> Sekcja HERO ma osobny, szczegółowy plik: **`_TMP-hero-colors.md`** (kolory + typografia + radiusy).
> Tutaj hero jest tylko skrótowo; reszta stron/sekcji jest opisana pełnie.

---

# 0. Fundamenty globalne

## 0.1 Zmienne `:root`

| Zmienna | Wartość | Rola |
|---------|---------|------|
| `--bg` | `#07111f` | tło bazowe |
| `--bg-2` | `#0b1628` | tło drugorzędne (ciemne panele) |
| `--surface` | `rgba(255,255,255,.075)` | szkło / powierzchnie |
| `--surface-strong` | `rgba(255,255,255,.12)` | mocniejsze szkło |
| `--glass` | `rgba(11,22,40,.72)` | szkło ciemne |
| `--text` | `#f7fbff` | tekst główny |
| `--muted` | `#a8b5c7` | tekst wyciszony |
| `--muted-2` | `#7e8ba0` | tekst mocno wyciszony |
| `--line` | `rgba(255,255,255,.14)` | obramowania |
| `--aqua` | `#8ee8ff` | akcent główny |
| `--mint` | `#adffd8` | akcent zielony |
| `--violet` | `#c7b7ff` | akcent fiolet |
| `--warm` | `#ffd7a8` | akcent ciepły |
| `--danger` | `#ff9fba` | akcent różowy |
| `--shadow` | `0 22px 70px rgba(0,0,0,.36)` | cień kart |
| `--radius` | `28px` | radius bazowy |
| `--radius-sm` | `18px` | radius mały |
| `--container` | `1180px` | szerokość kontenera |

## 0.2 Font (globalny, cała strona)

- `font-family`: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (systemowy, brak web-fontu)
- `p` → `line-height: 1.75`, kolor `--muted`
- `ul` → `padding-left: 1.1rem`, kolor `--muted`, `line-height: 1.9`
- `html` → `scroll-behavior: smooth`
- `::selection` → tło `rgba(142,232,255,.28)`

## 0.3 Tło `body`

Trzy warstwy:
- `radial-gradient(circle at 18% -10%, rgba(142,232,255,.22), transparent 28rem)` (poświata aqua)
- `radial-gradient(circle at 82% 5%, rgba(199,183,255,.18), transparent 26rem)` (poświata fiolet)
- `linear-gradient(180deg, #07111f 0%, #081321 52%, #06101b 100%)` (baza)
- `overflow-x: hidden`, `min-height: 100vh`

## 0.4 Nakładki globalne

**`.noise`** (ziarno na całości):
- `position: fixed; inset: 0; z-index: 0; opacity: .07; mix-blend-mode: screen`
- tło = inline SVG `feTurbulence` (fractalNoise, baseFrequency .8, 3 oktawy)

**`.cursor-glow`** (poświata za kursorem — tylko `pointer:fine`):
- `420 × 420px`, `border-radius: 999px`, `position: fixed`, `filter: blur(8px)`
- tło `radial-gradient(circle, rgba(142,232,255,.16), rgba(199,183,255,.07) 35%, transparent 70%)`
- `opacity: 0` → `1` gdy `body.has-pointer`; pozycja podąża za myszą (JS)

## 0.5 Kontener i odstępy

- `.container` → `width: min(1180px, calc(100% - 40px))`, `margin: 0 auto`, `z-index: 2`
- `.section-pad` → `padding: 112px 0`
- `.top-none` → `padding-top: 24px`

## 0.6 Reveal on scroll (wspólny mechanizm)

- `[data-reveal]` → `opacity: 0; transform: translateY(22px)`
- transition: `opacity .8s ease, transform .8s cubic-bezier(.2,.8,.2,1)`, `transition-delay: var(--delay,0ms)`
- `.is-visible` (dodawana przez IntersectionObserver) → `opacity: 1; transform: translateY(0)`
- `data-delay="80|120|160…"` → ustawiane jako `--delay` w ms (JS)

---

# 1. Menu główne / Header (`.site-header`)

Sticky „pill” pływający u góry na wszystkich stronach.

- `position: fixed; left: 50%; top: 18px; transform: translateX(-50%)`
- `width: min(1220px, calc(100% - 28px))`, `z-index: 20`
- `display: flex; align-items: center; gap: 18px; justify-content: space-between`
- `padding: 12px 14px 12px 16px`
- `border: 1px solid rgba(255,255,255,.12)`
- `border-radius: 999px`
- tło `rgba(8,17,31,.62)`, `backdrop-filter: blur(20px)`
- `box-shadow: 0 18px 50px rgba(0,0,0,.24)`
- `transition: .28s ease`

**Stan `.is-scrolled`** (po przewinięciu > 20px, JS):
- tło `rgba(8,17,31,.84)`, `border-color: rgba(255,255,255,.18)`, `top: 10px`

### 1.1 Logo (`.brand` + `.brand-mark` + `.brand-text`)
- `.brand` → `display: flex; gap: 10px`
- `.brand-mark` → `44 × 44px`, `border-radius: 16px`, kolor `--aqua`
  - tło `linear-gradient(135deg, rgba(142,232,255,.16), rgba(199,183,255,.11))`
  - `border: 1px solid rgba(255,255,255,.12)`, `box-shadow: inset 0 0 24px rgba(142,232,255,.1)`
  - w środku SVG domku (stroke `currentColor`, width `2.8`)
- `.brand-text strong` → `1.05rem`, `letter-spacing: -.03em`
- `.brand-text small` → `.74rem`, kolor `--muted-2`, `margin-top: 4px`

### 1.2 Nawigacja desktop (`.desktop-nav`, `.nav-link`)
- `.desktop-nav` → `display: flex; gap: 4px; padding: 4px`, `border: 1px solid rgba(255,255,255,.08)`, `border-radius: 999px`, tło `rgba(255,255,255,.035)`
- `.nav-link` → `font-size: .89rem`, kolor `--muted`, `padding: 10px 13px`, `border-radius: 999px`, `transition: .2s`, `white-space: nowrap`
- `.nav-link:hover` / `.is-active` → kolor `--text`, tło `rgba(255,255,255,.09)`
- Linki: Start · Oferta · Projekty · Proces · Cennik · O nas · Kontakt

### 1.3 CTA w headerze (`.header-cta` — „Zacznij projekt”)
- `padding: 12px 16px`, `border-radius: 999px`
- tło `var(--text)` (#f7fbff), kolor `#07111f`, `font-weight: 800`, `font-size: .9rem`
- `box-shadow: 0 12px 30px rgba(142,232,255,.12)`

### 1.4 Hamburger (`.menu-button`) — tylko mobile
- `46 × 46px`, `border-radius: 999px`, tło `rgba(255,255,255,.08)`, `border: 1px solid var(--line)`
- 3 × `span` (`18 × 2px`, `border-radius: 99px`, `transition: .2s`)
- `display: none` na desktopie; `display: flex` przy `≤ 1060px`
- `.is-open` → animacja w „X” (span1 `translateY(7px) rotate(45deg)`, span2 `opacity:0`, span3 `translateY(-7px) rotate(-45deg)`)

---

# 2. Menu mobilne (`.mobile-menu`)

- Domyślnie `display: none`; aktywne przy `≤ 1060px`
- `position: fixed; top: 84px; left: 14px; right: 14px`, `z-index: 19`
- `padding: 18px`, `border-radius: 28px`
- tło `rgba(8,17,31,.92)`, `border: 1px solid rgba(255,255,255,.13)`, `backdrop-filter: blur(20px)`, `box-shadow: var(--shadow)`
- domyślnie `opacity: 0; transform: translateY(-12px); pointer-events: none`
- `.is-open` → `opacity: 1; transform: translateY(0); pointer-events: auto`
- `nav` → `display: grid; gap: 6px`; na końcu przycisk `.button.primary.full` („Umów konsultację”)

---

# 3. HERO (strona główna) — skrót

> Pełny opis: **`_TMP-hero-colors.md`**.

- `.hero` → `min-height: 100svh`, `padding-top: 120px; padding-bottom: 80px`, `display: flex; align-items: center`
- `.hero-grid` → `grid-template-columns: minmax(0,1fr) minmax(420px,.9fr)`, `gap: 56px`
- Dwa orby tła `.hero-bg-orb` (aqua/fiolet, `filter: blur(26px)`, animacja `floatOrb`)
- Lewa kolumna `.hero-copy`: eyebrow (aqua, uppercase, .78rem), H1 `clamp(2.6rem,5vw,4.4rem)`, lead, przyciski, trust-row
- Prawa kolumna `.blueprint-card`: szkło, siatka blueprint, SVG rysunek domu (gradient aqua→fiolet, animacja rysowania `draw`), pływające chipy, sun-ring, mini-dashboard
- `.scroll-hint` na dole (animowana kropka `scrollDot`)

---

# 4. Przyciski (`.button`) — wspólny system

- `display: inline-flex; align-items: center; justify-content: center; gap: 10px`
- `min-height: 48px`, `padding: 14px 20px`, `border-radius: 999px`, `font-weight: 850`
- `border: 1px solid transparent`
- `transition: transform/box-shadow/background/color .2s`
- `:hover` → `transform: translateY(-2px)`

| Wariant | Tło | Tekst | Border |
|---------|-----|-------|--------|
| `.primary` | `linear-gradient(135deg, #f7fbff, #b8f4ff 55%, #d8c9ff)` | `#07111f` | — (cień `0 18px 45px rgba(142,232,255,.22)`) |
| `.secondary` | `rgba(255,255,255,.08)` | `--text` | `rgba(255,255,255,.14)` |
| `.ghost` | `transparent` | `--text` | `rgba(255,255,255,.16)` |
| `.full` | — | — | `width: 100%` |

`.magnetic` — klasa markera pod efekt przyciągania (w tym demo bez dodatkowego JS).

---

# 5. Eyebrow (`.eyebrow`) — wspólny nagłówek-etykieta

Występuje w hero i na wszystkich podstronach.
- kolor `--aqua`, `font-weight: 750`, `letter-spacing: .08em`, `text-transform: uppercase`, `font-size: .78rem`
- `display: inline-flex; align-items: center; gap: 10px`
- `.eyebrow span` (kreska) → `width: 34px; height: 1px`, tło `linear-gradient(90deg, var(--aqua), transparent)`

---

# 6. Intro strip + ticker (`.intro-strip`) — strona główna

- `.intro-strip` → `border-block: 1px solid rgba(255,255,255,.1)`, tło `rgba(255,255,255,.035)`, `overflow: hidden`
- `.intro-strip-grid` → `grid-template-columns: 1fr 1.2fr`, `gap: 26px`, `padding: 24px 0`
- `p` → `font-size: 1.1rem`, kolor `#e6eef8`
- **`.ticker`** (marquee) → `display: flex; gap: 12px; white-space: nowrap`, animacja `ticker 18s linear infinite`
  - `span` → `padding: 10px 16px`, `border: 1px solid rgba(255,255,255,.12)`, `border-radius: 999px`, kolor `--muted`, tło `rgba(255,255,255,.045)`
  - słowa: minimalizm · światło · komfort · technologia · natura
- keyframes `ticker`: `to { transform: translateX(-260px) }`

---

# 7. Nagłówki sekcji (`.split-head`) — wspólny wzorzec

- `display: flex; justify-content: space-between; gap: 30px; align-items: end; margin-bottom: 34px`
- `h2` (`.split-head h2`, `.wow-copy h2`, `.cta-card h2`, `.comparison h2`) →
  `font-size: clamp(1.8rem, 2.6vw, 2.7rem)`, `line-height: 1.08`, `letter-spacing: -.04em`, `margin: 14px 0 0`
- `.section-lead` → `max-width: 390px`
- Przy `≤ 1060px` → `flex-direction: column; align-items: start`

---

# 8. Karty usług (`.service-grid` / `.service-card`) — strona główna

- Siatka → `grid-template-columns: repeat(3,1fr)`, `gap: 18px`
- `.service-card` → `padding: 28px`, `min-height: 290px`
  - tło `linear-gradient(145deg, rgba(255,255,255,.105), rgba(255,255,255,.045))`
  - `border: 1px solid rgba(255,255,255,.13)`, `border-radius: var(--radius)` (28px)
  - `box-shadow: 0 20px 60px rgba(0,0,0,.22)`, `overflow: hidden`
  - `:after` → poświata `radial-gradient(circle, rgba(142,232,255,.15), transparent 66%)`, `opacity: 0` → `1` na hover (`transition: .25s`)
- `.icon-orb` (numer 01/02/03) → `54 × 54px`, `border-radius: 20px`, tło `rgba(142,232,255,.12)`, kolor `--aqua`, `border: 1px solid rgba(142,232,255,.22)`, `font-weight: 900`
- `.service-card h3` → `1.45rem`, `margin: 28px 0 10px`, `letter-spacing: -.03em`
- `.service-card a` → kolor `--aqua`, `font-weight: 800`, `margin-top: 18px`

---

# 9. Panel interaktywny „wow” (`.dark-panel-section` / `.wow-panel`) — strona główna

Sekcja wyboru stylu domu (Nowoczesna stodoła / Miejska willa / Dom eko).

- `.dark-panel-section:before` → `position: absolute; inset: 20px 0`, tło `linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015))`, `border-block: 1px solid rgba(255,255,255,.08)`
- `.wow-panel` → `grid-template-columns: 1fr .95fr`, `gap: 24px`, `padding: 24px`, `border-radius: 38px`, tło `rgba(255,255,255,.06)`, `border: 1px solid rgba(255,255,255,.13)`, `box-shadow: var(--shadow)`
- `.wow-copy` → `padding: 38px`; `p` → `font-size: 1.08rem; max-width: 560px`

### 9.1 Przełącznik stylu (`.style-switcher` / `.style-pill`)
- `.style-switcher` → `display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px`
- `.style-pill` → `border: 1px solid rgba(255,255,255,.14)`, tło `rgba(255,255,255,.07)`, kolor `--muted`, `border-radius: 999px`, `padding: 12px 15px`, `cursor: pointer`, `transition: .2s`
- `:hover` / `.is-active` → tło `var(--text)`, kolor `#07111f`

### 9.2 Podgląd (`.style-preview` / `.preview-glass` / `.preview-house`)
- `.style-preview` → `min-height: 390px; display: grid; place-items: center`
- `.preview-glass` → `border-radius: 30px`, `padding: 28px`, `border: 1px solid rgba(255,255,255,.14)`
  - tło `radial-gradient(circle at 40% 22%, rgba(142,232,255,.18), transparent 34%), linear-gradient(145deg, rgba(8,17,31,.72), rgba(255,255,255,.08))`
- `.preview-label` → kolor `--aqua`, `font-weight: 900`, `uppercase`, `.78rem`
- `.preview-house` → `height: 210px`; `:before` = bryła domu (clip-path), `:after` = okno; `transition: .35s` (zmiana kształtu przy przełączaniu stylu)
  - **barn** (dach spadzisty): `clip-path: polygon(0 100%,0 42%,50% 0,100% 42%,100% 100%)`, tło `linear-gradient(135deg, rgba(255,255,255,.82), rgba(184,244,255,.54))`
  - **villa** (prostokąt): `clip-path: polygon(0 100%,0 26%,100% 26%,100% 100%)`
  - **eco** (zaokrąglony): `border-radius: 30px 30px 6px 6px`, tło zielone `linear-gradient(135deg, rgba(173,255,216,.74), rgba(255,255,255,.84))`
- JS podmienia klasę/label/opis (dane w `styleData`)

---

# 10. Siatka projektów (`.project-grid` / `.project-card`) — strona główna + Projekty

- **strona główna** `.featured-projects` → `grid-template-columns: 1.15fr .85fr`, `grid-auto-rows: 260px`, `gap: 18px`
- `.project-card` → `border-radius: var(--radius)`, `border: 1px solid rgba(255,255,255,.13)`, tło `rgba(255,255,255,.05)`, `box-shadow: 0 18px 50px rgba(0,0,0,.22)`, `transition: transform/border-color .25s`
- `:hover` → `transform: translateY(-6px)`, `border-color: rgba(142,232,255,.34)`
- `.project-card.large` → `grid-row: span 2`
- `.project-art` → `place-items: end start; padding: 22px; overflow: hidden`
  - `:before` → nakładka `linear-gradient(160deg, transparent, rgba(0,0,0,.56))`
  - `:after` → biała bryła domu `clip-path: polygon(0 100%,0 48%,50% 8%,100% 48%,100% 100%)`, `background: rgba(255,255,255,.75)`, na hover `scale(1.04) translateY(-6px)`
  - `span` (nazwa) → badge `uppercase .78rem`, `letter-spacing: .18em`, tło `rgba(255,255,255,.84)`, kolor `#06101b`, `border-radius: 999px`, `font-weight: 950`

### 10.1 Warianty tła kafla (`.project-art.art-*`)
| Klasa | Gradient |
|-------|----------|
| `.art-aurora` | radial aqua `28% 26%` + `linear(135deg,#39445c,#101827 58%,#050b13)` |
| `.art-linea` | radial fiolet `76% 20%` + `linear(135deg,#463b60,#101827 58%,#060b14)` |
| `.art-nova` | radial ciepły `30% 10%` + `linear(135deg,#5d4937,#121a23 58%,#050b13)` |
| `.art-mono` | radial aqua `78% 30%` + `linear(135deg,#1c2430,#05070b)` |
| `.art-vista` | radial mint `28% 22%` + `linear(135deg,#1f4b43,#0a131d 60%,#050b13)` |
| `.art-calm` | radial biały `30% 20%` + `linear(135deg,#2b3442,#07111f)` |

- `.project-info` → `padding: 18px 20px`; `h3` `1.25rem`; `p` kolor `--muted-2`, `.93rem`

---

# 11. Proces / kroki (`.process-home` / `.steps-grid`) — strona główna

- `.process-home` → tło `linear-gradient(180deg, transparent, rgba(255,255,255,.028), transparent)`
- `.steps-grid` → `grid-template-columns: repeat(4,1fr)`, `gap: 14px`
- `article` → `padding: 24px`, `border-radius: 24px`, `border: 1px solid rgba(255,255,255,.12)`, tło `rgba(255,255,255,.055)`
- `span` (numer 01–04) → kolor `--aqua`, `font-weight: 950`
- `h3` → `margin: 20px 0 8px`

---

# 12. Sekcja CTA (`.cta-section` / `.cta-card`) — strona główna + Proces

- `.cta-card` → `display: flex; justify-content: space-between; gap: 28px; align-items: center`
- `padding: 38px`, `border-radius: 38px`
- tło `radial-gradient(circle at 82% 10%, rgba(142,232,255,.23), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.05))`
- `border: 1px solid rgba(255,255,255,.14)`, `box-shadow: var(--shadow)`
- `.cta-card p` → `max-width: 620px`
- Przy `≤ 700px` → `flex-direction: column; align-items: flex-start; padding: 26px; border-radius: 28px`

---

# 13. Page hero (podstrony) (`.page-hero`)

Nagłówek podstron: Oferta, Projekty, Proces, Cennik, O nas, Kontakt.
- `.page-hero` → `padding: 170px 0 64px`
- `.page-hero.compact h1` → `font-size: clamp(2.3rem, 3.6vw, 3.4rem)`, `max-width: 960px`
- H1 dzieli styl z hero: `line-height: .99`, `letter-spacing: -.03em`, `margin: 20px 0 24px`
- W środku: `.eyebrow` + `h1` + `p.lead`

---

# 14. Oferta — siatka ofert (`.offer-grid` / `.offer-card`)

- `.offer-grid` → `grid-template-columns: 1.2fr .9fr .9fr`, `gap: 18px`
- `.offer-card` → dzieli bazę z `.service-card` (gradient szkła, border `rgba(255,255,255,.13)`, `border-radius: 28px`, cień), `padding: 30px`
  - `:after` → ta sama poświata na hover co service-card
- `.offer-card.feature` → `grid-row: span 2` (duża karta „01”)
- `.offer-card h2` → `font-size: clamp(1.5rem, 2vw, 2rem)`, `letter-spacing: -.04em`
- `.offer-number` → jak `.icon-orb`: `54 × 54px`, `border-radius: 20px`, tło `rgba(142,232,255,.12)`, kolor `--aqua`, `border: 1px solid rgba(142,232,255,.22)`, `font-weight: 900`
- Listy `ul/li` → kolor `--muted`, `line-height: 1.9`

---

# 15. Oferta — porównanie (`.comparison` / `.comparison-grid`)

- `.comparison` → `grid-template-columns: 1fr 1fr`, `gap: 30px`, `padding: 36px`, `border-radius: 34px`, tło `rgba(255,255,255,.065)`, `border: 1px solid rgba(255,255,255,.12)`
- `.comparison-grid` → `display: grid; gap: 12px`
  - `div` → `padding: 18px`, `border-radius: 20px`, tło `rgba(255,255,255,.06)`, `border: 1px solid rgba(255,255,255,.1)`
  - `strong` → blok; `span` → kolor `--muted`, `margin-top: 4px`

---

# 16. Projekty — filtry + portfolio (`.filter-bar` / `.portfolio-grid`)

- `.filter-bar` → `display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px`
- `.filter-chip` → jak `.style-pill`: `border rgba(255,255,255,.14)`, tło `rgba(255,255,255,.07)`, kolor `--muted`, `border-radius: 999px`, `padding: 12px 15px`
  - `:hover` / `.is-active` → tło `var(--text)`, kolor `#07111f`
  - filtry: Wszystkie / Nowoczesna stodoła / Wille / Parterowe / Energooszczędne
- `.portfolio-grid` → `grid-template-columns: repeat(3,1fr)`, `gap: 18px`
- `.portfolio-item.is-hidden` → `display: none` (JS filtrowanie po `data-category`)
- Karty = te same `.project-card` + `.art-*` co na stronie głównej

---

# 17. Proces — oś czasu (`.timeline`)

- `.timeline` → `position: relative; display: grid; gap: 18px`
- `:before` → pionowa linia `left: 24px; top: 0; bottom: 0; width: 1px`, tło `linear-gradient(var(--aqua), rgba(255,255,255,.06))`
- `.timeline article` → `margin-left: 46px`, `padding: 28px`, `border-radius: var(--radius)`, tło `rgba(255,255,255,.06)`, `border: 1px solid rgba(255,255,255,.12)`
  - `:before` → kropka `left: -34px; top: 34px`, `13 × 13px`, `border-radius: 50%`, tło `--aqua`, `box-shadow: 0 0 28px var(--aqua)` (poświata)
- `.timeline h2` → `1.65rem`, `margin: 8px 0`
- `.timeline span` (numer 01–05) → kolor `--aqua`, `font-weight: 950`

---

# 18. Cennik — pakiety (`.pricing-grid` / `.price-card`)

- `.pricing-grid` → `grid-template-columns: repeat(3,1fr)`, `gap: 18px`, `align-items: stretch`
- `.price-card` → baza szkła jak service-card, `padding: 30px`, `display: flex; flex-direction: column`
- `.price-card.highlighted` → `transform: translateY(-18px)`, `border-color: rgba(142,232,255,.36)`, `box-shadow: 0 30px 80px rgba(142,232,255,.13)` (wyróżniony „Najczęściej wybierane”)
- `.price-label` → jak chip/trust: `.84rem`, tło `rgba(255,255,255,.075)`, `border: 1px solid rgba(255,255,255,.13)`, `border-radius: 999px`, `padding: 9px 12px`, kolor `#dce7f5`
- `.price` (kwota) → `font-size: clamp(2rem, 3vw, 3.2rem)`, `letter-spacing: -.06em`, kolor `--text`, `font-weight: 950`, `margin: 18px 0`
- `.price-card ul` → `flex: 1`
- Przy `≤ 700px` → `.highlighted { transform: none }`

---

# 19. O nas — o pracowni + wartości + zespół

### 19.1 `.about-grid` / `.about-card`
- `.about-grid` → `grid-template-columns: 1fr .9fr`, `gap: 18px`
- `.about-card` → baza szkła, `padding: 36px`; `h2` → `1.9rem`, `letter-spacing: -.04em`

### 19.2 `.values-grid`
- `grid-template-columns: repeat(2,1fr)`, `gap: 14px`
- `div` → `min-height: 160px`, `border-radius: var(--radius)`, `padding: 24px`, tło `rgba(255,255,255,.06)`, `border: 1px solid rgba(255,255,255,.12)`, `display: flex; flex-direction: column; justify-content: space-between`
- `strong` (numer) → kolor `--aqua`; `span` → `font-size: 1.2rem`, `font-weight: 850`

### 19.3 `.team-grid` / `.team-card` / `.avatar`
- `.team-grid` → `grid-template-columns: repeat(3,1fr)`, `gap: 18px`
- `.team-card` → baza szkła, `padding: 26px`
- `.avatar` → `84 × 84px`, `border-radius: 28px`, `border: 1px solid rgba(255,255,255,.14)`
  - domyślnie tło `radial-gradient(circle at 35% 25%, var(--aqua), transparent 36%), linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.04))`
  - `.avatar.two` → radial `--violet`
  - `.avatar.three` → radial `--warm`

---

# 20. Kontakt — formularz + panel boczny + mapa

### 20.1 `.contact-grid` / `.contact-form`
- `.contact-grid` → `grid-template-columns: 1fr .82fr`, `gap: 18px`
- `.contact-form` → baza szkła, `padding: 30px`, `display: grid; gap: 16px`
- `label` → `display: grid; gap: 8px`, kolor `#dce7f5`, `font-weight: 750`
- `input / textarea / select` → `width: 100%`, `border: 1px solid rgba(255,255,255,.13)`, tło `rgba(255,255,255,.07)`, kolor `--text`, `border-radius: 18px`, `padding: 14px 15px`, `outline: none`, `transition: .2s`
  - `:focus` → `border-color: rgba(142,232,255,.55)`, `box-shadow: 0 0 0 4px rgba(142,232,255,.1)`
  - `select option` → kolor `#07111f`
- `.form-note` → `font-size: .9rem`, kolor `--muted-2` (JS podmienia tekst po „Wyślij brief”)

### 20.2 `.contact-side` / `.contact-card`
- `.contact-side` → `display: grid; gap: 18px`
- `.contact-card` → baza szkła, `padding: 30px`; `a` → `display: block`, kolor `--aqua`, `font-weight: 850`, `margin: 12px 0`

### 20.3 `.map-card` + `.map-pulse` (abstrakcyjna mapa)
- `.map-card` → `min-height: 360px`, `border-radius: var(--radius)`, `border: 1px solid rgba(255,255,255,.13)`
  - tło = siatka `34px` (dwa `linear-gradient` linii `rgba(255,255,255,.05)`) + `radial-gradient(circle at 50% 50%, rgba(142,232,255,.2), transparent 28%)` + `rgba(255,255,255,.045)`
- `.map-pulse` → `24 × 24px`, `border-radius: 50%`, tło `--aqua`
  - `box-shadow: 0 0 0 16px rgba(142,232,255,.12), 0 0 0 34px rgba(142,232,255,.06)`
  - animacja `mapPulse 2.2s ease-in-out infinite`
- `.map-card span` („Studio”) → `position: absolute; left: 50%; top: 58%`, `font-weight: 900`, kolor `#dce7f5`

---

# 21. Projekt (detal) — `projekt-aurora.html`

### 21.1 `.project-detail-hero` / `.detail-grid`
- `.project-detail-hero` → `padding: 170px 0 90px`
- `.detail-grid` → `grid-template-columns: 1fr .88fr`, `gap: 38px`, `align-items: center`
- `.back-link` → `display: inline-flex`, kolor `--muted`, `margin-bottom: 22px`
- H1 → jak hero (`clamp(2.6rem,5vw,4.4rem)`)

### 21.2 `.detail-stats` (142 m² / sypialnie / łazienki / A++)
- `grid-template-columns: repeat(4,1fr)`, `gap: 10px`, `margin: 32px 0`
- `div` → `padding: 16px`, `border-radius: 18px`, tło `rgba(255,255,255,.07)`, `border: 1px solid rgba(255,255,255,.12)`
- `strong` → `1.1rem`; `span` → kolor `--muted-2`, `.78rem`, `margin-top: 5px`

### 21.3 `.detail-art`
- `height: 560px`, `border-radius: 34px` (używa `.art-aurora`)

### 21.4 `.detail-sections` (Strefa dzienna / prywatna / Elewacja)
- `grid-template-columns: repeat(3,1fr)`, `gap: 18px`
- `article` → `padding: 24px`, `border-radius: 24px`, `border: 1px solid rgba(255,255,255,.12)`, tło `rgba(255,255,255,.055)`

### 21.5 `.gallery-strip` / `.gallery-card`
- `.gallery-strip` → `grid-template-columns: 1.2fr .8fr 1fr`, `gap: 18px`, `min-height: 420px`
- `.gallery-card` → `border-radius: 30px`, `border: 1px solid rgba(255,255,255,.13)`, `min-height: 260px`
  - tło `radial-gradient(circle at 24% 25%, rgba(142,232,255,.42), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.035))`
- `.gallery-card.tall` → `min-height: 420px`
- `.gallery-card.warm` → radial ciepły `rgba(255,215,168,.42)` w `70% 25%`

---

# 22. Stopka (`.site-footer`)

- `.site-footer` → `padding: 64px 0 28px`, `border-top: 1px solid rgba(255,255,255,.09)`, tło `rgba(3,9,16,.42)`, `z-index: 2`
- `.footer-grid` → `grid-template-columns: 1.4fr .7fr .9fr .9fr`, `gap: 26px`
- `.footer-grid h3` → `margin: 0 0 14px`
- `.footer-grid a / span` → `display: block`, kolor `--muted`, `margin: 10px 0`
- `.footer-brand` → `margin-bottom: 18px`
- `.footer-bottom` → `display: flex; justify-content: space-between; gap: 20px`, kolor `--muted-2`, `.88rem`, `margin-top: 44px`, `padding-top: 22px`, `border-top: 1px solid rgba(255,255,255,.08)`

---

# 23. Katalog animacji (`@keyframes`)

| Nazwa | Użycie | Czas / easing | Opis |
|-------|--------|---------------|------|
| `floatOrb` | `.orb-one`/`.orb-two` (hero) | `12s`/`14s` ease-in-out infinite (`.orb-two` reverse) | `50% { translate3d(34px,-28px,0) scale(1.08) }` |
| `draw` | `.draw-line` (SVG domu) | `2.4s` ease forwards (slow `3s`, delay `.25/.45/.65s`) | rysowanie linii: `stroke-dashoffset 900 → 0` |
| `pulseRing` | `.sun-ring` (hero) | `5s` ease-in-out infinite | `50% { scale(1.12); opacity: .68 }` |
| `floatChip` | `.floating-chip` (hero) | `6s` ease-in-out infinite (delay `.9/1.6s`) | `50% { translateY(-12px) }` |
| `scrollDot` | `.scroll-hint span` | `1.8s` ease-in-out infinite | `70% { translateY(18px); opacity: .25 }` |
| `ticker` | `.ticker` (intro strip) | `18s` linear infinite | `to { translateX(-260px) }` |
| `mapPulse` | `.map-pulse` (kontakt) | `2.2s` ease-in-out infinite | pulsujące pierścienie box-shadow |
| reveal (transition, nie keyframe) | `[data-reveal]` | `.8s` cubic-bezier(.2,.8,.2,1) + `--delay` | `translateY(22px)→0`, `opacity 0→1` |

---

# 24. Efekty JS (`assets/app.js`)

1. **Sticky header** — `scroll` (passive): toggle `.is-scrolled` gdy `scrollY > 20`.
2. **Menu mobilne** — klik `[data-menu-button]` → toggle `.is-open` na przycisku i `.mobile-menu` + `aria-hidden`.
3. **Reveal delays** — `[data-delay]` → ustawia `--delay: <ms>ms`.
4. **Reveal on scroll** — `IntersectionObserver(threshold: 0.14)` dodaje `.is-visible` do `[data-reveal]` (jednorazowo, potem `unobserve`).
5. **Cursor glow + tilt** — tylko przy `pointer:fine`:
   - `body.has-pointer` + `.cursor-glow` podąża za `pointermove`
   - `[data-tilt]` (karty): `rotateX(-y*7deg) rotateY(x*7deg) translateY(-2px)` liczone z pozycji myszy nad kartą; reset na `pointerleave`
6. **Przełącznik stylu** — `[data-style]` (barn/villa/eco): podmienia klasę `.preview-house`, `.preview-label` i tekst `[data-style-copy]` z obiektu `styleData` (etykiety: Modern Barn / Urban Villa / Eco Soft).
7. **Filtr portfolio** — `[data-filter]`: toggluje `.is-hidden` na `.portfolio-item` wg `data-category` (`all` = pokaż wszystko).
8. **Fałszywy submit** — `[data-fake-submit]` podmienia tekst `[data-form-note]` na potwierdzenie.

---

# 25. Responsywność (breakpointy globalne)

### ≤ 1060px
- Ukryte: `.desktop-nav`, `.header-cta`; pokazane: `.menu-button`, `.mobile-menu`
- Jednokolumnowo: `.hero-grid`, `.wow-panel`, `.comparison`, `.detail-grid`, `.about-grid`, `.contact-grid`
- `.hero-showcase` → `max-width: 620px`
- Dwukolumnowo (repeat 2): `.service-grid`, `.steps-grid`, `.portfolio-grid`, `.pricing-grid`, `.team-grid`, `.detail-sections`, `.footer-grid`
- `.offer-grid` → `1fr 1fr` (feature `grid-column: span 2`)
- `.project-grid` → `1fr 1fr`; `.intro-strip-grid` → `1fr`
- `.split-head` → `flex-direction: column; align-items: start`
- `.section-pad` → `padding: 84px 0`

### ≤ 700px
- Wszystko jednokolumnowo (service/steps/project/portfolio/pricing/team/detail/footer/offer/gallery)
- `.hero` → `padding-top: 118px`; `.hero-grid` → `gap: 30px`
- H1 → `clamp(2rem, 9vw, 3rem)`
- `.blueprint-card` → `min-height: 470px`, `padding: 18px`, `border-radius: 26px`; `.house-visual` → `330px`
- `.mini-dashboard` → `1fr`; `.floating-chip` → `display: none`
- `.cta-card` → `column`, `padding: 26px`, `border-radius: 28px`
- `.detail-stats` → `repeat(2,1fr)`; `.price-card.highlighted` → `transform: none`
- `.values-grid` → `1fr`; `.footer-bottom` → `column`
- `.page-hero / .project-detail-hero` → `padding-top: 132px`
- `.wow-copy` → `padding: 18px`; `.wow-panel` → `padding: 14px`
- `.contact-form / .offer-card / .price-card / .about-card` → `padding: 22px`
- `.section-pad` → `padding: 70px 0`

### `prefers-reduced-motion: reduce`
- Wyłącza wszystkie `animation` i `transition` (`!important`), `scroll-behavior: auto`, ukrywa `.cursor-glow`

---

# 26. Skrót — radiusy i typowe wielkości

| Element | Radius | Font-size |
|---------|--------|-----------|
| Header pill / nav / przyciski / chipy | `999px` | nav `.89rem`, przyciski weight 850 |
| Karty (service/offer/price/about/team) | `28px` (`--radius`) | h2 `clamp(1.8–2.7rem)` |
| wow-panel / cta-card | `38px` | — |
| comparison | `34px` | — |
| blueprint-card | `34px` (mob `26px`) | — |
| preview-glass / gallery-card | `30px` | — |
| brand-mark | `16px` | — |
| icon-orb / offer-number | `20px` | weight 900 |
| avatar | `28px` | — |
| inputy formularza | `18px` | — |
| detail-stats / comparison-grid | `18–20px` | strong `1.1rem` |
| steps / detail-sections | `24px` | — |
| H1 (hero/detal) | — | `clamp(2.6rem, 5vw, 4.4rem)` |
| H1 (page-hero compact) | — | `clamp(2.3rem, 3.6vw, 3.4rem)` |
| Cena (`.price`) | — | `clamp(2rem, 3vw, 3.2rem)` weight 950 |
| Eyebrow / label | — | `.78rem` uppercase |
| Chipy / trust / price-label | `999px` | `.84rem` |
