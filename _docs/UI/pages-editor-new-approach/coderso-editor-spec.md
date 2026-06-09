# Coderso — Edytor strony (redesign): specyfikacja funkcjonalna

> Dokument opisuje docelowy model edytora stron w CMS Coderso po redesignie.
> Cel: zastąpić układ z dwoma panelami bocznymi (biblioteka widgetów + szczegóły)
> edycją bezpośrednio na canvasie, sterowaną **pływającym paskiem** z kontekstowymi
> subpanelami. Prototyp referencyjny: `coderso-editor-redesign.html`.

---

## 1. Cel i zmiana podejścia

**Stan obecny:** lewy panel = biblioteka wyspecjalizowanych widgetów (Product Gallery, Timeline, Listing Filters…), prawy panel = szczegóły/ustawienia zaznaczonego widgetu, środek = canvas tylko do podglądu. Edycja odbywa się „obok" canvasu.

**Stan docelowy:** oba panele boczne znikają. Zostaje pełnoekranowy **interaktywny canvas**. Edycja jest kontekstowa — zaznaczasz element na canvasie, a sterowanie pojawia się w **pływającym pasku** tuż przy nim. Opcje są pochowane pod ikonami; kliknięcie ikony rozwija **subpanel** z kontrolkami dla danej funkcji.

**Kluczowa decyzja architektoniczna — „sekcja-kontener + bloki" zamiast jednego wszechmocnego widgetu:**
- Strona dzieli się na **sekcje** (jak obecnie — logiczny, niezależnie konfigurowalny podział).
- Wewnątrz sekcji wstawiasz **bloki** (tekst, obraz, przycisk, galeria produktów, timeline, formularz…) z jednego, spójnego mechanizmu dodawania.
- Dla użytkownika to jedno podejście do wszystkiego; pod spodem rendering pozostaje wyspecjalizowany per typ bloku. Unikamy „god-componentu", którego konfiguracja puchnie nie do utrzymania.

---

## 2. Inspiracje (na czym to jest wzorowane)

| Produkt | Co zapożyczamy |
|---|---|
| **Webflow** | Model responsywności jako **kaskada** (desktop = baza, mniejsze breakpointy nadpisują); znacznik wartości dziedziczonej vs nadpisanej; przełącznik breakpointów u góry. |
| **Framer** | Pływający/kontekstowy pasek właściwości; edycja bezpośrednio na canvasie; minimalistyczny chrome wokół dużej przestrzeni roboczej. |
| **Builder.io / Plasmic** | Sekcja jako kontener + wstawianie bloków z palety; struktura strony jako drzewo warstw. |
| **Elementor / WordPress (Gutenberg)** | Inline „+" do wstawiania między sekcjami; podział na sekcje/kolumny/bloki. |
| **Figma** | Pływające, przeciągalne panele; outline/warstwy jako nakładka; precyzyjne kontrolki odstępów. |
| **Notion / Linear / Raycast** | **Command Palette (⌘K)** jako główny sposób wstawiania i nawigacji bez paneli bocznych. |

---

## 3. Mapa interfejsu

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOP BAR (stała, nad canvasem)                                         │
│  logo · Pages/Strona · "Niezapisane"   [Duży|Średni|Mały]  Edytujesz:… │
│                          Warstwy · Page settings · History · Preview · │
│                                                              Publish    │
├──────────────────────────────────────────────────────────────────────┤
│  STAGE (przewijalny, tło w kropki)                                     │
│   ┌────────── CANVAS (szerokość zależna od breakpointu) ──────────┐    │
│   │  [+ dodaj sekcję]  (na hover w przerwie)                       │    │
│   │  ┌─ SEKCJA: Menu górne ─────────────────────────────┐         │    │
│   │  ┌─ SEKCJA: Hero (zaznaczona) ──────────────────────┐         │    │
│   │  ┌─ SEKCJA: Proces budowy ──────────────────────────┐         │    │
│   │  ┌─ SEKCJA: Polecane projekty ──────────────────────┐         │    │
│   └────────────────────────────────────────────────────────────┘     │
│                                                                        │
│            ╔══════ PŁYWAJĄCY PASEK (przeciągalny) ══════╗              │
│            ║ ⠿ Hero [SPLIT] │ 🔲 ✎ 🎨 ▦ 🖼 📱 👁 │ ↑↓⧉🗑 ║              │
│            ║ ── SUBPANEL (rozwija się pod paskiem) ──    ║              │
│            ╚══════════════════════════════════════════╝              │
└──────────────────────────────────────────────────────────────────────┘

  Nakładki: Command Palette (⌘K) · Warstwy (lewy-górny róg) · Toast
```

---

## 4. Top bar (pasek nad canvasem)

Stały pasek. Zawiera tylko akcje globalne strony — żadnych właściwości elementów.

- **Logo + breadcrumb** — `Pages / Strona Główna`. Lewy róg.
- **Status zapisu** — „Niezapisane zmiany" z pulsującą kropką; znika po publikacji.
- **Przełącznik breakpointów** — `Duży (1080px) · Średni (744px) · Mały (390px)`. Pełni **podwójną rolę**: (1) zmienia szerokość canvasu (podgląd), (2) ustawia **kontekst edycji** — wszystko, co teraz zmienisz, zapisuje się dla tego breakpointu. To rozwiązuje problem „ustawień per ekran".
- **Wskaźnik kontekstu** — pigułka „Edytujesz: Duży ekran". Na mniejszych: „…(nadpisuje bazę)".
- **Warstwy** (ikona) — otwiera nakładkę z outlinem strony.
- **Page settings** — meta strony, SEO, slug, skrypty (modal, poza zakresem edycji sekcji).
- **History** — historia wersji / undo-redo.
- **Preview** — podgląd na żywo w nowej karcie.
- **Publish** — główny przycisk (akcent marki); publikacja → toast „Opublikowano".

---

## 5. Canvas / Stage

- **Stage** = przewijalny obszar roboczy z subtelnym tłem w kropki (sygnalizuje „płótno", nie gotową stronę).
- **Canvas** = biała „kartka" strony, wyśrodkowana; jej **maksymalna szerokość zmienia się płynnie** wraz z breakpointem (1080 / 744 / 390 px). Nad nią mono-readout: „DUŻY EKRAN · 1080px · widok bazowy".
- **Sekcje** renderują się jedna pod drugą, z prawdziwą treścią (WYSIWYG).
- **Zaznaczanie:**
  - hover sekcji → delikatna ramka (kolor akcentu, jasny),
  - klik → zaznaczenie (pełna ramka akcentu) + **etykieta sekcji** nad nią (nazwa + wariant, np. `Hero · SPLIT`) + pojawia się pływający pasek,
  - klik w puste tło stage / `Esc` → odznaczenie.
- **Inline „+ dodaj sekcję":** w przerwie między sekcjami; na hover przerwa się rozszerza i pokazuje pigułkę „Dodaj sekcję" → otwiera Command Palette.
- **Stan pusty sekcji:** przerywana ramka z CTA „Dodaj pierwszy blok".
- **Znacznik nadpisania (override):** na breakpoincie innym niż bazowy sekcje ze zmienionymi wartościami pokazują żółtą plakietkę „nadpisane na małym/średnim".

---

## 6. Pływający pasek (element sygnaturowy)

Pojawia się tylko, gdy coś jest zaznaczone. Domyślnie zadokowany na dole-środku; **przeciągalny** za uchwyt (⠿) po lewej (docelowo: auto-dokowanie blisko zaznaczonego elementu, by go nie zasłaniać).

Struktura paska (od lewej):
1. **Uchwyt przeciągania** (⠿).
2. **Etykieta zaznaczenia** — nazwa sekcji + chip wariantu (np. `Hero` + `SPLIT`).
3. **Grupa kontrolek funkcji** (ikony otwierające subpanele) — patrz §7.
4. **Grupa akcji sekcji** — przenieś w górę / w dół / duplikuj / usuń.

Zachowanie:
- Każda ikona ma **tooltip** (discoverability — bo opcje są pod ikonami).
- Klik ikony → otwiera jej subpanel pod paskiem; ponowny klik / klik innej ikony → przełącza. Jednocześnie otwarty jest **jeden** subpanel.
- Ciemny motyw paska celowo odcina go od jasnego canvasu (to „narzędzie", nie treść strony).

---

## 7. Subpanele (kontrolki per ikona)

Każda ikona w pasku rozwija jeden subpanel. Poniżej zawartość każdego.

### 🔲 Układ (Layout)
Jak sekcja jest poukładana.
- **Wariant** — np. `Split / Wyśrodkowany / Pełna szerokość` (warianty zależne od typu sekcji; odpowiednik dzisiejszych „Alternating / Cards / Compact").
- **Kolumny treści** — 1 / 2 / 3 / 4.
- **Wyrównanie pionowe** — góra / środek / dół.
- **Maksymalna szerokość** — pole z wartością (np. `1080px`).

### ✎ Treść (Content)
Edycja danych i bloków sekcji.
- **Nagłówek**, **Opis** — pola tekstowe.
- **Tekst przycisku** + **Cel (URL)**.
- Wskazówka: bloki wstawia się przez „+" w sekcji lub przez ⌘K.
- (Docelowo) lista bloków sekcji z reorderowaniem — odpowiednik dzisiejszego „Steps content and order".

### 🎨 Wygląd (Style)
- **Kolor akcentu** — swatche.
- **Zaokrąglenie** — suwak (px).
- **Cień** — brak / mały / duży.
- (Docelowo) typografia: rozmiar, waga, krój.

### ▦ Odstępy (Spacing)
- **Padding** góra / dół (osobne pola).
- **Padding** lewo / prawo.
- **Odstęp między blokami** — suwak.

### 🖼 Tło (Background)
- **Typ** — kolor / gradient / obraz / brak.
- **Kolor / źródło** — swatche lub wybór z Media.

### 📱 Responsywność (Responsive)
- Informacja o aktywnym breakpoincie i modelu kaskady (patrz §8).
- **Ukryj sekcję na tym ekranie** — przełącznik.
- **Zmień układ na pionowy (mobile)** — przełącznik.
- **Nadpisania per breakpoint** (np. rozmiar nagłówka) + link **„↺ przywróć dziedziczenie"**.

### 👁 Widoczność i logika (Visibility)
- **Widoczna** — on/off.
- **Tylko dla zalogowanych** — on/off.
- **Pokaż w zakresie dat** — on/off (+ daty).
- **ID kotwicy (anchor)** — np. `#hero`.

### Akcje sekcji (prawa grupa, bez subpanela)
- **W górę / W dół** — zmiana kolejności.
- **Duplikuj** — kopia sekcji wraz z ustawieniami.
- **Usuń** — z potwierdzeniem przy publikacji.

---

## 8. Model responsywności (kaskada) — WAŻNE

Nie robimy trzech niezależnych kopii ustawień. Stosujemy **dziedziczenie kaskadowe** (jak Webflow/Framer):

- **Duży ekran (1080px) = baza.** Tu definiujesz domyślny wygląd.
- **Średni (744px)** i **Mały (390px)** **dziedziczą** wszystko z bazy.
- Zmiana czegokolwiek na mniejszym breakpoincie tworzy **nadpisanie (override)** tylko tej jednej wartości. Reszta nadal płynie z bazy.
- Override jest oznaczony wizualnie (żółta plakietka na sekcji + podświetlone pole w panelu) i można go cofnąć („przywróć dziedziczenie").

Dzięki temu wybór breakpointu u góry = wybór „dla jakiego ekranu teraz edytuję", a nie ręczne utrzymywanie trzech osobnych stron. Zmiana w bazie automatycznie propaguje się tam, gdzie nie ma nadpisania.

---

## 9. Command Palette (⌘K / Ctrl+K)

Główny mechanizm wstawiania po usunięciu lewej biblioteki.
- Otwierany skrótem **⌘K**, kliknięciem inline „+" między sekcjami, lub „+ dodaj blok" w pustej sekcji.
- Pole wyszukiwania + lista pogrupowana: **Sekcje** (Hero, Timeline, Galeria produktów, Porównanie, Filtry listingu…) i **Bloki** (Tekst, Obraz, Przycisk/CTA, Formularz…).
- Filtrowanie na żywo (wpisz „time" → Timeline). Nawigacja klawiaturą, Enter = wstaw.

---

## 10. Warstwy (outline strony)

Nakładka w lewym-górnym rogu (toggle z top bara). Lista wszystkich sekcji strony w kolejności. Klik = zaznacz + przewiń do sekcji. Ikona oka = szybkie ukrycie. Pomaga nawigować po długich stronach bez stałego panelu bocznego. (Docelowo: drzewo sekcja → bloki, drag-reorder.)

---

## 11. Skróty klawiszowe

| Skrót | Akcja |
|---|---|
| `⌘K` / `Ctrl+K` | Otwórz Command Palette (wstaw sekcję/blok) |
| `Esc` | Zamknij paletę / odznacz element |
| (docelowo) `⌘Z` / `⌘⇧Z` | Cofnij / ponów |
| (docelowo) `⌘D` | Duplikuj zaznaczoną sekcję |
| (docelowo) `Del` | Usuń zaznaczoną sekcję |

---

## 12. Stany interfejsu

- **Brak zaznaczenia** — pasek ukryty, widoczne inline „+" na hover.
- **Hover sekcji** — jasna ramka.
- **Zaznaczenie** — pełna ramka + etykieta + pływający pasek.
- **Pusta sekcja** — placeholder z CTA dodania bloku.
- **Override (poza bazą)** — żółta plakietka na sekcji, podświetlone pole w panelu.
- **Po publikacji** — status „Niezapisane" znika, toast „Opublikowano".

---

## 13. Proponowany model danych (dla agenta)

Struktura, która naturalnie obsługuje sekcje, bloki i kaskadę responsywną:

```jsonc
{
  "page": {
    "id": "d3decff3-f232-4220-a00f-f733f170f0d6",
    "name": "Strona Główna",
    "breakpoints": ["desktop", "tablet", "mobile"], // desktop = baza
    "sections": [
      {
        "id": "sec_hero",
        "type": "hero",            // typ steruje wariantami i renderem
        "name": "Hero",
        "variant": "split",
        "blocks": [
          { "id": "blk_h1", "type": "heading", "props": { "text": "Twój wymarzony dom…" } },
          { "id": "blk_p",  "type": "text",    "props": { "text": "Energooszczędne…" } },
          { "id": "blk_cta","type": "button",  "props": { "label": "Zobacz projekty", "href": "/projekty" } }
        ],
        "style":   { "bg": "#FFFFFF", "radius": 14, "shadow": "sm", "accent": "#0D9488" },
        "layout":  { "columns": 2, "align": "center", "maxWidth": "1080px" },
        "spacing": { "py": 34, "px": 40, "gap": 30 },
        "visibility": { "visible": true, "authOnly": false, "anchor": "#hero" },

        // kaskada: tylko NADPISANIA względem bazy (desktop)
        "responsive": {
          "tablet": { "layout": { "columns": 1 } },
          "mobile": { "layout": { "columns": 1 }, "style": { "h1Size": "30px" } }
        }
      }
      // …kolejne sekcje
    ]
  }
}
```

Zasady dla agenta:
- Render = baza (`desktop`) z nałożonym `responsive[currentBreakpoint]` (deep-merge).
- Edycja na breakpoincie ≠ desktop zapisuje wyłącznie do `responsive[bp]` (override), nie do bazy.
- „Przywróć dziedziczenie" = usuń odpowiedni klucz z `responsive[bp]`.
- Reorder/duplikuj/usuń operują na tablicy `sections` (i `blocks` wewnątrz).
- Typy sekcji/bloków są rozszerzalne — nowy typ = nowy renderer + zestaw wariantów + zestaw kontrolek subpaneli.

---

## 14. Co świadomie odrzucono / do decyzji

- **„Jeden wszechmocny widget"** — odrzucony na rzecz „sekcja-kontener + bloki" (mniej configu w jednym miejscu, łatwiejsze utrzymanie). Jeśli wolisz dosłownie jeden widget z przełącznikiem typu w panelu — wykonalne, ale config będzie skupiony i obszerny.
- **Niezależne ustawienia per ekran** — odrzucone na rzecz kaskady (unikamy dryfu i podwójnej pracy).

## 15. Możliwe rozszerzenia (kolejne iteracje)

- Auto-dokowanie pływającego paska blisko zaznaczenia (by nie zasłaniał elementu).
- Inline-edycja tekstu na canvasie (double-click w nagłówek).
- Presety sekcji (zapisany Hero z ustawieniami do ponownego użycia — częściowy zamiennik „Templates").
- Drag & drop sekcji bezpośrednio na canvasie oraz w panelu Warstwy.
- Pełne undo/redo spięte z History.
