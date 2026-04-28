# Content Modeling Cookbook (v1)

Praktyczne, WordPress‑like wzorce modelowania tresci. Te przepisy pozwalaja
zbudowac realne serwisy bez wiedzy technicznej.

## Zasady ogolne

1. **Zacznij od typow tresci** (Content Types) – to odpowiednik "Custom Post Types".
2. **Zdefiniuj pola** dla typow: teksty, media, relacje.
3. **Wlacz kategorie/tagi** tam gdzie beda pomagaly w porzadkowaniu.
4. **Zaplanuj relacje** miedzy typami (np. Testimonials → Projects).
5. **Uzupelnij dane** i wykorzystaj widgety w Page Builderze.

---

## Posts vs Entries (kiedy czego uzywac)

- `Posts` (`/admin/posts`) to gotowy workflow redakcyjny pod artykuly/blog:
  - lista wpisow + szybkie akcje publikacji,
  - Gutenberg-like block editor (rich text, inserter, list view, revisions),
  - metadata/SEO/taxonomy jak w klasycznym "Wpisy" (WordPress-like),
  - reserved content type `post` tworzony automatycznie przez system.
  - fallback: `posts.editor.mode=classic` lub awaryjnie `?editor=classic` na trasie edytora.
- `Entries` (`/admin/advanced/entries`) to workflow generyczny dla Twoich wlasnych typow tresci z Engine
  (np. Services, Projects, Team, Testimonials, Products bez checkout).

Praktyczna zasada:
1. Uzyj `Posts`, gdy chcesz klasyczne artykuly/aktualnosci.
2. Uzyj `Entries`, gdy modelujesz dane biznesowe pod custom widgety/listingi.

---

## Wzorzec 1: Mabudo‑style (uslugi + realizacje)

**Cel:** strona firmy z uslugami i portfolio.

### Typy tresci

**Services**
- `title` (text, required)
- `summary` (text)
- `body` (richtext)
- `icon` (media)
- `cover` (media)
- `order` (number)

**Projects**
- `title` (text, required)
- `summary` (text)
- `body` (richtext)
- `gallery` (media, multiple)
- `service` (relation → Services)
- `client` (text)
- `year` (number)

**Testimonials**
- `author` (text, required)
- `role` (text)
- `quote` (richtext)
- `avatar` (media)
- `project` (relation → Projects)

### Taxonomie
- **Projects**: kategorie "Metal", "Wood", "Custom".
- **Services**: tagi (np. "premium", "express").

### Jak to uzyc w UI

1. W Content Type Editorze wlacz kategorie dla **Projects** i tagi dla **Services**.
2. Dodaj pola zgodnie z lista powyzej.
3. W Entry Editorze wybieraj kategorie i tagi w panelu po prawej.
4. W Page Builderze:
   - widget **Service List** filtruje po tagach,
   - widget **Project Grid** filtruje po kategorii.

---

## Wzorzec 2: Church / Parish (ogloszenia + wydarzenia)

**Cel:** serwis parafii z aktualnosciami i kalendarzem.

### Typy tresci

**Announcements**
- `title` (text, required)
- `body` (richtext)
- `publishedAt` (text or datetime)
- `importance` (select: low/normal/high)

**Events**
- `title` (text, required)
- `startAt` (text or datetime)
- `endAt` (text or datetime)
- `location` (text)
- `description` (richtext)
- `announcement` (relation → Announcements)

### Taxonomie
- **Announcements**: kategorie np. "Liturgia", "Wspolnota", "Pomoc".
- **Events**: tagi np. "katecheza", "pielgrzymka".

### Jak to uzyc w UI

1. Tworz ogloszenie, nastepnie powiaz wydarzenie przez pole relation.
2. Widget **Upcoming Events** moze wyswietlac tylko wydarzenia z tagiem.
3. Widget **Announcements List** filtruje po kategorii.

---

## Wzorzec 3: B2B Agency (case studies + klienci)

**Cel:** strona agencji z case studies i lista klientów.

### Typy tresci

**Clients**
- `name` (text, required)
- `logo` (media)
- `website` (text)
- `industry` (text)

**Case Studies**
- `title` (text, required)
- `summary` (text)
- `body` (richtext)
- `client` (relation → Clients)
- `cover` (media)
- `results` (richtext)

### Taxonomie
- **Case Studies**: kategorie (np. "SaaS", "E‑commerce", "Healthcare").
- **Case Studies**: tagi (np. "SEO", "Redesign", "Performance").

### Jak to uzyc w UI

1. Dodaj klienta, potem case study powiazane relacja.
2. W Page Builderze widget **Case Studies** filtruje po kategorii/tagach.
3. Widget **Client Logos** bierze dane z typu **Clients**.

---

## Najczestsze wskazowki

- **Nazwy pol** powinny byc w kebab‑case i jednoznaczne.
- **Help text** w polu dodawaj dla mniej oczywistych informacji.
- **Relacje** trzymaj proste (jedna relacja w jedna strone, reszta w UI).
- **Taxonomie** uzywaj tylko tam, gdzie maja sens (nie wszedzie).

---

## Minimalny check‑list

1. Typy tresci stworzone.
2. Pola i relacje skonfigurowane.
3. Kategorie/tagi wlaczone i uzupelnione.
4. Widoki w Page Builderze z gotowymi widgetami.
