# RAPORT: Team Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Team Widget)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Sesja przeglądarki:** `team-audit` (oddzielna od innych agentów)
> **Strona testowa:** TEST-TEAM-0516 (`/test-team-0516`)

---

## 1. Przegląd widgetu

**Typ:** Content (standalone, bez slotów)
**Kategoria:** `content`
**Warianty:** `cards`, `compact-list`, `spotlight`
**Ograniczenia elementów:** min 1 / max 12 członków, max 5 social linków per członek
**Plik renderera:** `core/widgets/core/team.tsx`
**Plik edytora:** `core/admin/ui/widgets/editors/TeamEditors.tsx`

Team widget służy do prezentacji profili członków zespołu z zdjęciem (lub inicjałem fallback), imieniem, rolą, bio oraz linkami do mediów społecznościowych. Obsługuje sekcję nagłówkową (tytuł + opis).

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Header** | `title`, `description` |
| **Members** | `id`, `name`, `role`, `bio`, `photo` (URL), `socialLinks[]` |
| **SocialLink** | `id`, `label`, `url` |
| **Style** | `columns` (1/2/3/4), `gap` (none/sm/md/lg), `cardSurface`, `cardBorder`, `radius` (none/md/lg/xl) |

### 2.2 Warianty

| Wariant | Opis | Układ |
|---------|------|-------|
| `cards` | Responsywna siatka kart (domyślny) | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (dla 3 kol.) |
| `compact-list` | Pionowa lista z poziomym układem awatara i treści | `flex-col` z `sm:flex-row` wewnątrz każdej karty |
| `spotlight` | Wyróżnienie pierwszego członka + pozostali w bocznej kolumnie | `grid lg:grid-cols-3` — lead zajmuje `lg:col-span-2` |

### 2.3 Tryby edytora

- **Wizard** — szybki start: wariant (dropdown), liczba członków, imiona pierwszych 3 członków
- **Visual** — pełny edytor: wariant (picker kart), liczba, header, per-member (name/role/bio/photo), social links, kolory kart, gap, radius, columns
- **Advanced** — diagnostyka: tokeny layout (columns/gap/radius), card surface/border token, Normalize now, Reset to defaults, Raw payload JSON

---

## 3. Wyniki testów Playwright — co działa poprawnie ✓

### 3.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie Cards / Compact List / Spotlight (karta-picker) | ✓ Działa |
| Cards: responsywna siatka kart | ✓ Działa |
| Compact List: poziomy układ avatar + content | ✓ Działa |
| Spotlight: lead na `data-team-spotlight-lead="true"` (Anna Kowalska) | ✓ Działa |
| Aktywny wariant oznaczony „Selected", pozostałe „Pick" | ✓ Działa |
| Admin canvas == Frontend rendering dla wszystkich wariantów | ✓ Zgodne |

### 3.2 Zarządzanie listą członków

| Test | Wynik |
|------|-------|
| Add member — dodaje nowy item, count aktualizuje się w canvas | ✓ Działa |
| Remove member — usuwa bez potwierdzenia | ✓ Działa (UX-01) |
| Remove disabled gdy 1 członek (minimum) | ✓ Działa |
| Move up / Move down — zmiana kolejności | ✓ Działa |
| Move up disabled dla pierwszego, Move down disabled dla ostatniego | ✓ Działa |
| Members count selector — zmiana liczby | ✓ Działa |

### 3.3 Pola per-member

| Test | Wynik |
|------|-------|
| Name — input, aktualizuje avatar inicjał | ✓ Działa |
| Role — wyświetla pod imieniem | ✓ Działa |
| Bio — textarea, opcjonalne | ✓ Działa |
| Photo URL pusty — inicjał fallback (pierwsza litera imienia, `aria-hidden="true"`) | ✓ Działa |
| Photo URL niepoprawny (nie-URL string) — przeglądarka ładuje jako relative URL → **broken image** | ✗ Bug (UX-07) |
| Social links — add/edit label + URL | ✓ Działa |
| Add link disabled przy 5 linkach (max) | ✓ Działa |
| Remove social link — usuwa bez potwierdzenia | ✓ Działa (UX-08) |
| Nowy social link domyślnie URL = `"#"` | ✗ Bug (UX-10) |

### 3.4 Header sekcji

| Test | Wynik |
|------|-------|
| Title widoczny/ukrywany gdy pole puste | ✓ Działa |
| Description widoczny/ukrywany gdy pole puste | ✓ Działa |
| Cały `<header>` usunięty z DOM gdy oba pola puste | ✓ Działa |

### 3.5 Card Style

| Test | Wynik |
|------|-------|
| Columns — zmiana liczby kolumn (1/2/3/4) dla Cards variant | ✓ Działa |
| Columns — zmiana dla Spotlight (2/3/4 — identyczny efekt) | ✗ Bug (BUG-03) |
| Gap — zmiana odstępów (none/sm/md/lg) | ✓ Działa |
| Card radius — zmiana zaokrąglenia (none/md/lg/xl) | ✓ Działa |
| Card background — color picker + text input + Canvas update | ✓ Działa |
| Card border — color picker + text input + Canvas update | ✓ Działa |
| Clear dla Card background i Card border | ✓ Działa |

### 3.6 Advanced

| Test | Wynik |
|------|-------|
| Columns/gap/radius token w Advanced | ✓ Działa |
| Card surface / border token (input) + Clear | ✓ Działa |
| Normalize now | ✓ Działa |
| Reset to defaults | ✓ Działa (przywraca Anna Kowalska, Marek Nowak, Ewa Zielinska) |
| Raw payload snapshot (JSON) | ✓ Wyświetla |

### 3.7 Krytyczne odkrycia z testów

| Test | Wynik |
|------|-------|
| Social links `target` attribute | ✗ Brak `target="_blank"` (BUG-06) |
| Social links `rel` attribute | ✗ Brak `rel="noopener"` (BUG-06) |
| Avatar img `loading` attribute | ✗ Brak `loading="lazy"` (BF-02) |
| Section `aria-label` | ✗ Brak (BUG-04) |
| Header tytuł tagName | ✗ Hardcoded `<H3>` bez H1/H2 na stronie (BUG-05) |
| Count 3→2→3 niszczy dane member | ✗ "Ewa Zielinska" → "Team Member 3" (UX-11) |
| Wizard: zmiana na Spotlight nie aktualizuje count | ✗ Zostaje "3" (UX-06) |

### 3.8 Frontend vs Admin

| Aspekt | Admin Canvas | Frontend | Zgodność |
|--------|-------------|----------|----------|
| Cards layout (3 kol.) | ✓ | ✓ | ✓ Zgodne |
| Compact List layout | ✓ | ✓ | ✓ Zgodne |
| Spotlight layout (lead + rest) | ✓ | ✓ | ✓ Zgodne |
| Avatar inicjał fallback (inicjał litery) | ✓ | ✓ | ✓ Zgodne |
| Social links render | ✓ | ✓ | ✓ Zgodne |
| Header conditional (title/description) | ✓ | ✓ | ✓ Zgodne |
| Kolory kart (border/bg) | ✓ | ✓ | ✓ Zgodne |
| Social links target="_blank" | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |
| H3 hierarchy (brak H1/H2) | ✗ | ✗ | ✓ Zgodne (oba mają bug) |
| aria-label na section | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |
| loading="lazy" na img | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |

**Wniosek:** Widget zachowuje się identycznie w admin canvas i na froncie. Wszystkie problemy są symetryczne — brak błędów specyficznych dla jednego środowiska.

---

## 4. Analiza kodu — dodatkowe bugs

### 4.1 Bugs wykryte z analizy kodu

#### BUG-01 — `resolveTeamColumns`, `resolveTeamGap`, `resolveTeamRadius` — niekompletna lista wariantów
**Priorytet:** Niski (działa przez przypadkową poprawność)
**Lokalizacja:** `core/widgets/core/team.tsx:184–197`
**Opis:** Każda z tych funkcji sprawdza warunki z POMINIĘCIEM wartości, która jest wartością domyślną fallback. `resolveTeamColumns` nie sprawdza `"3"` (zwraca `"3"` przez `return "3"` default). `resolveTeamGap` nie sprawdza `"md"`. `resolveTeamRadius` nie sprawdza `"lg"`. Kod działa poprawnie (wartości domyślne trafiają do odpowiedniej gałęzi), ale jest mylący i może powodować problemy przy refaktorze.

```typescript
// Obecny kod — "3" nie jest sprawdzane explicite
const resolveTeamColumns = (value: string | undefined): TeamColumns => {
  if (value === "1" || value === "2" || value === "4") return value;
  return "3"; // "3" dopada tu przez brak sprawdzenia
};
```

#### BUG-02 — `addMember`: `photo: ""` zamiast `photo: undefined`
**Priorytet:** Niski (Avatar poprawnie obsługuje pusty string)
**Lokalizacja:** `core/admin/ui/widgets/editors/TeamEditors.tsx:369`
**Opis:** Przy dodawaniu nowego członka `photo` jest ustawiane na `""`. `resolveOptionalString("")` zwraca `""` (pusty string, nie `undefined`). Avatar komponent sprawdza `photo.trim().length > 0` więc fallback inicjału działa poprawnie — ale payload zawiera `photo: ""` zamiast braku pola. Może powodować niespójność w raw JSON.

#### BUG-03 — `spotlightRestColumnsClassMap` ignoruje wartości "2", "3", "4"
**Priorytet:** Średni
**Lokalizacja:** `core/widgets/core/team.tsx:58–63`
**Opis:** W wariancie `spotlight` kolumna "rest" używa `spotlightRestColumnsClassMap`. Wartości `"2"`, `"3"` i `"4"` wszystkie mapują do `"grid-cols-1 sm:grid-cols-2"`. Kontrolka "Columns" w edytorze jest więc praktycznie bezużyteczna dla wariantu spotlight (tylko `"1"` vs pozostałe). Użytkownik nie otrzymuje żadnego komunikatu o tym ograniczeniu.

```typescript
const spotlightRestColumnsClassMap: Record<TeamColumns, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",  // identyczne jak 3 i 4
  "3": "grid-cols-1 sm:grid-cols-2",  // identyczne
  "4": "grid-cols-1 sm:grid-cols-2",  // identyczne
};
```

#### BUG-04 — `<section>` bez `aria-label` / `aria-labelledby`
**Priorytet:** Wysoki
**Lokalizacja:** `core/widgets/core/team.tsx:471`
**Opis:** Element `<section>` nie posiada żadnej etykiety dostępności. Screen reader nie identyfikuje regionu jako "sekcja zespołu". Narusza WCAG 1.3.1.

#### BUG-05 — `<h3>` hardcoded bez możliwości konfiguracji poziomu
**Priorytet:** Wysoki
**Lokalizacja:** `core/widgets/core/team.tsx:483`
**Opis:** Tytuł sekcji jest zawsze renderowany jako `<h3>`. Brak możliwości zmiany poziomu nagłówka. Na stronach bez H1/H2 przed tym widgetem hierarchia nagłówków jest zaburzona — narusza WCAG 1.3.1.

#### BUG-06 — Social links otwierają się w tym samym oknie bez `rel="noopener"`
**Priorytet:** Średni
**Lokalizacja:** `core/widgets/core/team.tsx:383`
**Opis:** Linki social media renderowane są bez `target="_blank"` (otwierają się w tym samym oknie, przerywając nawigację) i bez `rel="noopener noreferrer"` (potencjalne zagrożenie bezpieczeństwa przy dodaniu `target="_blank"`).

#### BUG-07 — `Avatar` fallback: `aria-hidden="true"` bez alternatywnej etykiety dla `<article>`
**Priorytet:** Średni
**Lokalizacja:** `core/widgets/core/team.tsx:366–373`
**Opis:** Gdy brak zdjęcia, wyświetlany jest `<span>` z inicjałem i `aria-hidden="true"`. Karta `<article>` nie ma `aria-label`. Screen reader widzi artykuł z `<h4>` (imię) i `<p>` (rola/bio) — ale nie ma dostępnej reprezentacji wizualnej identyfikacji (avatar). To akceptowalne, jeśli h4 jest opisowy, jednak w kontekście spójności dostępności warto zweryfikować.

#### BUG-08 — `normalizeTeamData` wywołuje `normalizeTeamMembers` dwukrotnie w `TeamBlock`
**Priorytet:** Niski (brak wpływu na wynik)
**Lokalizacja:** `core/widgets/core/team.tsx:447–451`
**Opis:** W `TeamBlock` wywoływana jest `normalizeTeamData(data)` (która wewnętrznie wywołuje `normalizeTeamMembers`), a następnie `normalizeTeamMembers(normalized.members)` ponownie. Podwójna normalizacja jest zbędna.

---

## 5. Problemy UX edytora

#### UX-01 — Remove member bez dialogu potwierdzenia
**Opis:** Kliknięcie "Remove" natychmiast usuwa członka bez potwierdzenia. Brak undo.
**Ryzyko:** Przypadkowe usunięcie członka z wypełnioną treścią (imię, rola, bio, zdjęcie, linki).
**Rekomendacja:** Confirm dialog: *"Usunąć członka [Name]? Akcja jest nieodwracalna."*

#### UX-02 — Social links i member content w oddzielnych sekcjach (rozsprzęgnięte UX)
**Opis:** Edycja treści członka (imię/rola/bio/foto) jest w sekcji "Members content and order", a zarządzanie social linkami — w osobnej sekcji "Social links". Aby zarządzać wszystkim dla jednego członka trzeba scrollować między dwiema sekcjami.
**Rekomendacja:** Scalić social links wewnątrz każdego accordion/panelu per-member.

#### UX-03 — Spotlight: brak wskaźnika który członek jest "lead"
**Opis:** W wariancie spotlight, zawsze Member 1 (index 0) jest wyróżnionym "lead". Nie ma żadnej wizualnej wskazówki w edytorze (badge, ikona spotlight). Użytkownik może nie wiedzieć, że "Member 1" to zawsze lead.
**Rekomendacja:** Dodać badge "Spotlight Lead" przy pierwszym memberze gdy aktywny wariant to spotlight.

#### UX-04 — Spotlight: "Columns" selector jest misleading
**Opis:** Kontrolka "Columns" jest widoczna dla wariantu spotlight, ale ma minimalny efekt (tylko wartość "1" zmienia układ rest-panelu, wartości 2/3/4 są identyczne). Użytkownik może spędzić czas próbując różnych wartości bez widocznej zmiany.
**Rekomendacja:** Ukryć lub wyłączyć "Columns" dla wariantu spotlight albo wyjaśnić scope kontrolki.

#### UX-05 — Wizard: tylko imiona pierwszych 3 członków (brak roli / bio)
**Opis:** Wizard eksponuje jedynie imiona dla pierwszych 3 członków. Użytkownik konfigurujący przez Wizard traci informację o roli, bio i linkach (domyślne placeholdery). Brak szybkiego dostępu do roli — kluczowego pola dla sekcji "Meet the team".
**Rekomendacja:** Dodać pole "Role" obok "Name" dla każdego z 3 primary members w Wizard.

#### UX-06 — Wizard: zmiana wariantu nie aktualizuje Members count do sensownej wartości
**Opis:** Zmiana wariantu z "Cards" na "Spotlight" w Wizard nie resetuje liczby członków. Spotlight z 12 członkami działa technicznie, ale semantycznie spotlight zakłada 1 lead + kilku supporting.
**Rekomendacja:** Przy zmianie na spotlight, auto-ustaw count na 3 (1 lead + 2 supporting) jeśli obecna wartość > 6.

#### UX-07 — Photo URL — brak walidacji i brak Media Library picker
**Opis:** Pole "Photo URL" to prosty input bez walidacji formatu URL. Wpisanie niepoprawnego URL wyświetla uszkodzony obraz zamiast inicjału fallback (przeglądarka obsługuje `onerror` implicit, ale komponent nie — dopiero gdy `photo.trim().length === 0`).
**Rekomendacja (1):** Dodać walidację inline (regex URL lub sprawdzenie prefiksu `http`).
**Rekomendacja (2):** Dodać przycisk "Pick image" otwierający Asset Picker.

#### UX-08 — Social link "Remove" bez potwierdzenia
**Opis:** Social link "Remove" usuwa link natychmiast. Brak undo.
**Rekomendacja:** Przynajmniej krótki "confirm" lub undo toast.

#### UX-09 — Add member button na samym dole długiej listy (12 członków)
**Opis:** "Add member" button jest na dole sekcji "Members content". Przy 12 członkach oznacza to scrollowanie przez ~48 pól zanim dotrze się do przycisku.
**Rekomendacja:** Dodać "Add member" również na górze sekcji, lub użyć sticky footer w sekcji.

#### UX-10 — Social link URL domyślnie "#" — mylące
**Opis:** Nowy social link ma `url: "#"` zamiast pustego stringa. W preview kliknięcie linku scrolluje do góry strony (href="#"). Użytkownik może nie zauważyć że URL wymaga uzupełnienia.
**Potwierdzono Playwright:** `textbox "https://..." [ref=e2699]: "#"` — potwierdzone.
**Rekomendacja:** Default URL = `""` (pusty) lub wyświetlić placeholder "Dodaj URL".

#### UX-11 — Zmiana Members count niszczy dane poza nowym limitem (bez ostrzeżenia)
**Opis:** Zmiana count z 3 na 2 i z powrotem na 3 powoduje bezpowrotną utratę danych member 3. "Ewa Zielinska" (z wypełnionymi polami) zostaje zastąpiona przez "Team Member 3" (domyślne dane). Nie ma ostrzeżenia ani możliwości cofnięcia.
**Potwierdzono Playwright:** count 3→2→3, member 3 zmienił się z "Ewa Zielinska" na "Team Member 3".
**Ryzyko:** Wysoki — szczególnie przy przypadkowej zmianie selecta.
**Rekomendacja:** Dodać ostrzeżenie przy redukcji count: *"Zmniejszenie liczby członków usunie ostatnie [N] profili. Kontynuować?"*

---

## 6. Braki funkcjonalne

#### BF-01 — Brak tła sekcji (section background)
**Priorytet:** Wysoki
**Opis:** Widget nie ma kontrolki tła sekcji. Sekcja "Meet the team" często wymaga kontrastowego tła (dark section, gradient). Wrapper `<section>` ma zawsze przezroczyste tło.
**Rekomendacja:** Dodać `sectionBackground` (color/gradient) do style lub jako osobne pole.

#### BF-02 — Brak `loading="lazy"` na avatarach
**Priorytet:** Średni
**Lokalizacja:** `core/widgets/core/team.tsx:360`
**Opis:** `<img>` renderuje bez `loading="lazy"`. Przy sekcji z 12 członkami below-the-fold, wszystkie zdjęcia ładują się natychmiast.
**Naprawa:** Dodać `loading="lazy"` do `<img>` w komponencie `Avatar`.

#### BF-03 — Brak opcji `headingLevel` dla tytułu sekcji
**Priorytet:** Średni
**Opis:** Tytuł sekcji jest hardcoded jako `<h3>`. Brak opcji wyboru poziomu nagłówka (H2/H3/H4) — zależnie od kontekstu strony.

#### BF-04 — Spotlight: brak możliwości wyboru lead member (zawsze index 0)
**Priorytet:** Średni
**Opis:** Wariant spotlight zawsze wyróżnia `members[0]`. Jedynym sposobem zmiany lead jest "Move up". Nie ma opcji "Set as spotlight lead" per-member.
**Rekomendacja:** Dodać pin/star "Set as lead" albo osobne pole `spotlightLeadId`.

#### BF-05 — Brak kontrolki typografii nagłówka (wyrównanie / rozmiar)
**Priorytet:** Średni
**Opis:** Header ma hardcoded `text-center` i `text-2xl`. Brak opcji wyrównania (left/center/right) ani rozmiaru tytułu (xl/2xl/3xl).

#### BF-06 — Brak `target="_blank"` / `rel="noopener"` na social linkach
**Priorytet:** Średni
**Opis:** Linki social nie mają `target="_blank"` — otwierają się w tym samym oknie, przerywając sesję użytkownika na stronie.

#### BF-07 — Brak walidacji kontrastu kolorów (WCAG)
**Priorytet:** Średni
**Opis:** Użytkownik może ustawić `cardSurface` i `cardBorder` identyczne z kolorem tekstu, czyniąc treść niewidoczną. Brak wskaźnika kontrastu (4.5:1 WCAG AA).

#### BF-08 — Brak pola `eyebrow` w header
**Priorytet:** Niski
**Opis:** Header ma tylko `title` i `description` — brak pola `eyebrow` (nad-tytułu, np. "Our team"). Inne widgety (CTA Banner, Hero) mają eyebrow.

#### BF-09 — Brak CTA pod sekcją
**Priorytet:** Niski
**Opis:** Sekcja "Meet the team" często zawiera link "Dołącz do nas" / "See all positions". Widget nie obsługuje CTA.

#### BF-10 — Brak opcji `borderWidth` dla kart
**Priorytet:** Niski
**Opis:** Karty mają hardcoded `border` (1px). Brak możliwości zmiany grubości obramowania.

#### BF-11 — Limit 12 członków bez paginacji lub "load more"
**Priorytet:** Niski
**Opis:** `teamMemberMax = 12`. Brak paginacji ani infinite scroll dla większych zespołów.

#### BF-12 — Brak `alt` fallback z kontekstem roli zdjęcia
**Priorytet:** Niski
**Opis:** Avatar `<img>` ma `alt={name}` — poprawne, ale brak kontekstu ("photo of"). Skromne, ale poniżej najlepszych praktyk dostępności (np. `alt="Photo of ${name}"`).

#### BF-13 — Compact-list: bio ukryte w wąskich viewportach (brak klasy)
**Priorytet:** Niski
**Opis:** W wariancie compact-list na bardzo wąskich ekranach (< sm), layout jest pionowy (`flex-col`). Bio jest widoczne — ale na małym ekranie 3-linia bio + role + linki + avatar może być bardzo gęste. Brak opcji ukrycia bio na mobile.

---

## 7. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet | Status |
|---|---------|----------|-----------|--------|
| A1 | `<section>` bez `aria-label` ani `aria-labelledby` | WCAG 1.3.1 | Wysoki | Bug |
| A2 | `<h3>` hardcoded — zaburzona hierarchia nagłówków | WCAG 1.3.1 | Wysoki | Bug |
| A3 | `<article>` member bez `aria-label` | WCAG 4.1.2 | Średni | Bug |
| A4 | Social links bez `target="_blank"` — przerywają nawigację | UX | Średni | BF |
| A5 | `loading="lazy"` brak na avatarach | Performance | Średni | BF |
| A6 | Avatar span (inicjał) `aria-hidden="true"` — brak alt text w `<article>` | WCAG 1.1.1 | Niski | — |
| A7 | Brak walidatora kontrastu kolorów | WCAG 1.4.3 | Średni | BF |
| A8 | `alt={name}` na avatarze — poprawne, brak kontekstu roli | WCAG 1.1.1 | Niski | BF |

---

## 8. Porównanie Admin vs Frontend

Pełne wyniki w sekcji 3.8 — wszystkie zachowania są identyczne w admin canvas i na froncie.

| Aspekt | Admin Canvas | Frontend | Zgodność |
|--------|-------------|----------|----------|
| Cards layout (3 kol.) | ✓ | ✓ | ✓ Zgodne |
| Compact List layout | ✓ | ✓ | ✓ Zgodne |
| Spotlight (lead + rest) | ✓ | ✓ | ✓ Zgodne |
| Avatar inicjał fallback | ✓ | ✓ | ✓ Zgodne |
| Social links render | ✓ | ✓ | ✓ Zgodne |
| Header conditional | ✓ | ✓ | ✓ Zgodne |
| Kolory kart (border/bg) | ✓ | ✓ | ✓ Zgodne |
| aria-label na section | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |
| H3 hierarchy | ✗ Brak H1/H2 | ✗ Brak H1/H2 | ✓ Zgodne (oba mają bug) |
| Social links target="_blank" | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |
| loading="lazy" na img | ✗ Brak | ✗ Brak | ✓ Zgodne (oba mają bug) |

---

## 9. Podsumowanie — macierz priorytetów

### Błędy do naprawy natychmiast

| ID | Opis | Plik |
|----|------|------|
| BUG-04 | Brak `aria-label` na `<section>` | `team.tsx:471` |
| BUG-05 | H3 hardcoded — zaburzona hierarchia nagłówków | `team.tsx:483` |
| BUG-06 | Social links bez `target="_blank"` + `rel="noopener"` | `team.tsx:383` |
| BUG-03 | `spotlightRestColumnsClassMap` — "Columns" bezużyteczne w spotlight | `team.tsx:58–63` |

### Pilne ulepszenia UX

| ID | Opis |
|----|------|
| UX-01 | Confirm dialog przy Remove member |
| UX-11 | Ostrzeżenie przy redukcji count (niszczy dane bez ostrzeżenia) |
| UX-02 | Social links wewnątrz accordion per-member (nie osobna sekcja) |
| UX-03 | Spotlight: badge "Spotlight Lead" dla Member 1 |
| UX-07 | Photo URL → walidacja + Media Library picker |

### Braki funkcjonalne (priorytet)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Tło sekcji (color/gradient) |
| BF-02 | Średni | `loading="lazy"` na avatarach |
| BF-03 | Średni | Heading level konfigurowalny |
| BF-04 | Średni | Spotlight — wybór lead member |
| BF-06 | Średni | Social links — target="_blank" |
| BF-07 | Średni | Walidator kontrastu WCAG |

---

## 10. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 8 |
| Problemy UX edytora | 11 |
| Braki funkcjonalne | 13 |
| Problemy dostępności | 8 |
| **Łącznie** | **40** |

---

## 11. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `team-00-login.png` | Panel logowania admin |
| `team-01-page-created.png` | Strona TEST-TEAM-0516 po utworzeniu |
| `team-02-widget-added.png` | Widget Team dodany do strony |
| `team-03-wizard-tab.png` | Wizard tab — layout/count/names (domyślne 3 members) |
| `team-04-visual-editor.png` | Visual editor — widok po kliknięciu "Continue to layout" |
| `team-05-compact-list-variant.png` | Compact List variant — canvas preview |
| `team-06-spotlight-variant.png` | Spotlight variant — canvas preview (Anna jako lead) |
| `team-07-avatar-fallback.png` | Avatar inicjał fallback (pusty Photo URL → "A") |
| `team-08-4-columns.png` | Cards — 4 kolumny |
| `team-09-colors-section.png` | Card style section — color pickers + Clear |
| `team-10-social-links.png` | Social links sekcja — Add/Remove linków |
| `team-11-no-header.png` | Widget bez nagłówka (header usunięty z DOM) |
| `team-12-advanced-tab.png` | Advanced tab — tokens + raw payload JSON |
| `team-13-spotlight-columns-bug.png` | Spotlight: columns=4 nie zmienia układu rest-panelu (BUG-03) |
| `team-14-page-published.png` | Strona opublikowana — status "Published" |
| `team-15-frontend-cards.png` | Cards variant — frontend (localhost:3000) |
| `team-16-frontend-compact-list.png` | Compact List — frontend |
| `team-17-frontend-spotlight.png` | Spotlight — frontend (Anna jako lead) |
| `team-18-wizard-full.png` | Wizard tab — pełny widok (po powrocie do Wizard) |
| `team-19-invalid-photo-url.png` | Niepoprawny Photo URL — broken image (brak walidacji) |
| `team-20-canvas-final.png` | Canvas — finalny widok Cards z domyślnymi danymi |

---

## Status po TASK-256, TASK-289 i TASK-332 (audit 2026-05-23)

- `TASK-256-06-04`: shared Team baseline now owns the historical section label,
  heading semantics, safe-link output, spotlight columns/count truthfulness,
  member-count confirmation, lazy avatar loading, and basic invalid-photo
  fallback behavior.
- `TASK-289`: Team-specific product and editor scope is now closed through the
  member IA, spotlight lead, photo authoring, section presentation, and compact
  mobile density leaves below.
- `TASK-332`: the later shared accessibility reopen is now closed with explicit
  member-card labels, contextual avatar alt text, and unchanged decorative
  initials fallback semantics.

### Finalny status historycznych findingow

#### Bugs

| Finding | Final status | Evidence |
|---------|--------------|----------|
| BUG-01 | Zamkniete przez shared `TASK-256-06-04` | resolvery `columns/gap/radius` sa teraz truthy i jawnie akceptuja wartosci domyslne |
| BUG-02 | Zamkniete przez shared `TASK-256-06-04` | nowy member i clear-photo flow nie polegaja juz na trwalym `photo: ""` jako runtime fallbacku |
| BUG-03 | Zamkniete przez shared `TASK-256-06-04` | Spotlight supporting grid respektuje `1..4` kolumny truthfully |
| BUG-04 | Zamkniete przez shared `TASK-256-06-04` | runtime `<section>` ma etykiete dostepnosciowa |
| BUG-05 | Zamkniete przez shared `TASK-256-06-04` | Team header wyszedl z hardcoded `<h3>` na shared bounded heading baseline; `TASK-289-04` dodaje tylko align/title-size |
| BUG-06 | Zamkniete przez shared `TASK-256-06-04` | social links i Team CTA ida przez shared safe-link attrs z `_blank` + `rel` |
| BUG-07 | Zamkniete przez shared `TASK-332` | member cards now expose explicit accessible labels while initials fallback remains decorative and lazy/safe media baseline is preserved. |
| BUG-08 | Zamkniete przez shared `TASK-256-06-04` | runtime nie wykonuje juz zbednej podwojnej normalizacji memberow |

#### UX

| Finding | Final status | Evidence |
|---------|--------------|----------|
| UX-01 | Zamkniete przez `TASK-289-01` | usuniecie membera wymaga teraz jawnego potwierdzenia w panelu membera |
| UX-02 | Zamkniete przez `TASK-289-01` | social links zostaly przeniesione do panelu konkretnego membera |
| UX-03 | Zamkniete przez `TASK-289-02` | Spotlight ma badge aktywnego leadu oraz akcje `Set as spotlight lead` |
| UX-04 | Zamkniete przez shared `TASK-256-06-04` | columns w Spotlight sa truthfully zsynchronizowane z runtime zamiast udawac identyczne wyniki |
| UX-05 | Zamkniete przez shared `TASK-256-06-04` | Wizard pokazuje quick-setup dla imienia i roli pierwszych trzech osob |
| UX-06 | Zamkniete przez shared `TASK-256-06-04` | zmiana na `spotlight` z wiekszych konfiguracji normalizuje count do `3` |
| UX-07 | Zamkniete wspolnie przez shared `TASK-256-06-04` i `TASK-289-03` | runtime fail-closed dla niepoprawnych URL-i pozostaje shared, a Visual dodaje picker, preview, direct URL feedback, i clear-photo recovery |
| UX-08 | Zamkniete przez `TASK-289-01` | usuniecie social linku wymaga teraz potwierdzenia |
| UX-09 | Zamkniete przez `TASK-289-01` | `Add member` jest dostepny na gorze i dole listy |
| UX-10 | Zamkniete przez shared `TASK-256-06-04` | nowe social links startuja z pustym URL i `TASK-289-01/03` zachowuje ten baseline |
| UX-11 | Zamkniete przez shared `TASK-256-06-04` | redukcja member count potwierdza destrukcyjne obciecie wypelnionych profili |

#### Braki funkcjonalne

| Finding | Final status | Evidence |
|---------|--------------|----------|
| BF-01 | Zamkniete przez `TASK-289-04` | Team ma bounded `sectionBackground` w schema/editor/runtime |
| BF-02 | Zamkniete przez shared `TASK-256-06-04` | avatar `<img>` renderuje `loading="lazy"` |
| BF-03 | Zamkniete przez shared `TASK-256-06-04` | heading level wyszedl z hardcoded baseline; `TASK-289-04` nie przejal shared semantic ownera |
| BF-04 | Zamkniete przez `TASK-289-02` | `spotlightLeadId` pozwala wybrac lead bez reorder jako workaround |
| BF-05 | Zamkniete przez `TASK-289-04` | Team header ma bounded `align` i `titleSize` |
| BF-06 | Zamkniete przez shared `TASK-256-06-04` | social links otwieraja external destinations przez shared new-tab safe-link contract |
| BF-07 | Zamkniete przez `TASK-289-04` | Visual pokazuje lokalne contrast advisories dla Team surface/card kolorow |
| BF-08 | Zamkniete przez `TASK-289-04` | header dostal pole `eyebrow` |
| BF-09 | Zamkniete przez `TASK-289-04` | Team renderuje opcjonalne CTA z shared safe-link behavior |
| BF-10 | Zamkniete przez `TASK-289-04` | Team cards maja bounded `cardBorderWidth` token |
| BF-11 | Zamkniete decyzja produktowa przez `TASK-289-05` | Team zachowuje explicit max-12 contract; editor/docs kieruja wieksze katalogi do wielu sekcji Team lub innej listing surface |
| BF-12 | Zamkniete przez shared `TASK-332` | avatar images now use contextual `Photo of {name[, role]}` alt wording without adding widget-local authoring fields. |
| BF-13 | Zamkniete przez `TASK-289-05` | `compactMobileBio` pozwala ukryc bio wizualnie na mobile w `compact-list` |

#### Accessibility

| Finding | Final status | Evidence |
|---------|--------------|----------|
| A1 | Zamkniete przez shared `TASK-256-06-04` | Team section ma juz runtime accessible label |
| A2 | Zamkniete przez shared `TASK-256-06-04` | header nie jest juz hardcoded `<h3>` |
| A3 | Zamkniete przez shared `TASK-332` | each member card now exposes an explicit accessible label derived from the member identity. |
| A4 | Zamkniete przez shared `TASK-256-06-04` | Team links korzystaja z shared safe-link/new-tab policy |
| A5 | Zamkniete przez shared `TASK-256-06-04` | avatar images lazy-load zgodnie z report findingiem |
| A6 | Zamkniete przez shared `TASK-332` | initials fallback stays `aria-hidden` while the member-card label carries the accessible identity contract. |
| A7 | Zamkniete przez `TASK-289-04` | Team editor daje lokalne contrast advisories |
| A8 | Zamkniete przez shared `TASK-332` | avatar `<img>` now uses contextual `Photo of ...` alt wording instead of bare author-only text. |

#### Pozostale ustalenia raportowe

| Finding | Final status | Evidence |
|---------|--------------|----------|
| Admin/public parity | No new `TASK-289` work | historyczny raport potwierdzil parity, ale biezaca closure evidence opiera sie na targeted runtime/editor regressions, nie na dedykowanym parity comparatorze |
| Obecne bounds (`min 1`, `max 12`, `max 5 social`) | No action | obecne granice pozostaja intencjonalne i sa dalej pokryte schema/test contracts |

### Targeted evidence for the 2026-05-22 closure audit

- `bun test tests/unit/widgets/validator.test.ts` passed after adding Team schema
  coverage for `spotlightLeadId`, header presentation fields, CTA, section
  background, border width, and `compactMobileBio`.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`,
  `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`,
  `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`, and
  `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts tests/vitest/widgets/styleNoneTokens.test.tsx`
  passed on the finalized TASK-289 worktree state.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run lint`, and
  `set -a && source .env && set +a && bun run gates:coderso` passed in the
  dedicated Team worktree.
- `bun run scan:security:strict` still exits non-zero only because local
  scanner tooling is incomplete: `semgrep` and `trivy` are missing from
  `$PATH`, while the installed `gitleaks` binary rejects the repo script
  subcommands `git` and `dir`. `bun audit` still ran successfully inside the
  command.

*Raport wygenerowany na podstawie analizy kodu (`team.tsx`, `TeamEditors.tsx`) i testow Playwright (sesja `team-audit`, strona `/test-team-0516`) — 2026-05-16. Zaktualizowany o finalny status TASK-256/TASK-289 podczas closure auditu 2026-05-22.*
