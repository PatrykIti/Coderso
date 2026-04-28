# Raport UX/QA — sekcja Commerce (Admin UI, Beta)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/coderso/commerce
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Co to jest i co przetestowano

Commerce to katalog produktów — manager produktów z polami Identity (title/slug/status/excerpt/description), Pricing (amount w minor units + currency + compare-at), Stock (state + quantity), Collections (assignment) i Media IDs (picker niedostępny). Produkty mają status Draft/Published/Archived i są konsumowane przez widgety runtime. Etap Beta.

**Przetestowane przepływy:**

- Lista produktów — empty state "No products yet. Create your first product to start cataloging."
- Toolbar listy: New product, Search products (textbox), tabs All/Published/Draft/Archived z licznikami
- Kolumny tabeli: Product / Status / Price / Stock / Updated / Actions
- "New product" → strona /admin/coderso/commerce/new z formularzem
- Edytor produktu: 3-panelowy layout
  - Lewy sidebar: "Product context" — Status, Changes, Product ID, Updated, Published
  - Środek: Identity / Pricing / Stock sekcje
  - Prawy sidebar: Collections + Media IDs (complementary)
- Tabs na środku: Context / Details
- Toolbar edytora: Back to list / Discard / Publish / Save changes
- Identity fields: Title (auto-generuje Slug), Slug, Status (combobox Draft/Published/Archived), Excerpt, Description
- Pricing: Amount (minor units, textbox), Currency (textbox), Compare-at amount (textbox)
- Stock: State (combobox "In stock"), Quantity (textbox)
- Collections: "No collections yet. Create collections from the Commerce API/UI flow." — bez przycisku Create
- Media IDs: textbox comma-separated + disclaimer "Media picker integration will be added in runtime widget flow."
- Save changes → toast "Saved — Product saved successfully." ✓
- Publish → 409 Conflict (BUG-1)
- Zmiana Status dropdown → Save changes → 409 Conflict (BUG-1)
- Row menu "..." → Edit / Delete
- Delete → natychmiastowe, bez potwierdzenia

---

## Bugi

### [BUG-1] KRYTYCZNY: Save/Publish po pierwszym zapisie zwraca 409 Conflict

**Gdzie:** Edytor produktu → "Save changes" (po drugim kliknięciu) / "Publish"

**Co się dzieje:** Pierwsze kliknięcie "Save changes" tworzy produkt (POST `/admin/api/commerce/products`) → sukces, toast "Product saved successfully", URL dostaje UUID. **Każde kolejne kliknięcie "Save changes" lub "Publish"** — endpoint nadal uderza `POST /admin/api/commerce/products` (tworzy nowy), trafia na istniejący slug, dostaje **409 Conflict**. W UI: czerwony banner "Commerce editor error — Commerce product slug already exists". Konsekwencja: **nie da się opublikować wcześniej utworzonego produktu ani zaktualizować pól z edytora**. Każdy edit wymaga usunięcia i utworzenia od nowa.

**Kierunek naprawy UI:** Problem leży w warstwie formularza — po pierwszym zapisie edytor musi zmienić strategię z CREATE (POST /products) na UPDATE (PATCH /products/{id}). Aktualnie wydaje się że state edytora nie dociąga ID po zapisie albo handler submit nie rozróżnia between-modes. Na poziomie UI: przycisk "Save changes" po pierwszym zapisie powinien emitować PATCH z aktualnym productId (widocznym w prawym sidebar Product context: `Product ID: 4cef4eba-...`). Dopóki backend/frontend kontrakt nie jest naprawiony — nawigacja do `/commerce/{uuid}` po Save zapewnia właściwy state, ale Publish z tej strony też łamie się tak samo. Fix priorytetowy: bez niego Commerce nie jest używalny w produkcji.

---

### [BUG-2] KRYTYCZNY: Delete product — natychmiastowe, brak potwierdzenia, brak toast

**Gdzie:** Lista produktów → menu "..." → "Delete"

**Co się dzieje:** Kliknięcie "Delete" usuwa produkt natychmiastowo bez dialogu potwierdzenia ani toast. Czwarta sekcja z tym samym wzorcem (po Forms, Listings, Custom Screens). Dla produktów to szczególnie niebezpieczne — mogą być powiązane z zamówieniami, koszykami, widgetami runtime.

**Kierunek naprawy UI:** Radix AlertDialog: "Usuń produkt [nazwa]?" + "Ta operacja jest nieodwracalna. Produkt zostanie usunięty z katalogu; widgety używające go przestaną go renderować." + przyciski "Usuń" (czerwony) / "Anuluj". Toast sukcesu po usunięciu. Dodatkowo: walidacja referencji (czy produkt jest w jakiejś kolekcji/zamówieniu) — jeśli tak, warning "Produkt jest w X kolekcjach i Y zamówieniach. Usunięcie może mieć efekt uboczny." Wspólny komponent AlertDialog dla Commerce, Forms, Listings, Custom Screens.

**TASK-216 status:** List-owned delete is closed for the current Commerce v1
contract. Row and bulk delete now go through `ConfirmActionDialog`, execute only
after explicit confirmation, refresh the product list in the background, and use
the shared Commerce list toast adapter. Deeper reference warnings for orders or
future checkout records remain a separate service-contract follow-up because
Commerce v1 does not expose those reference counts.

---

### [BUG-3] ŚREDNI: "Amount (minor units)" — surowy tech term w UI klienta

**Gdzie:** Edytor produktu → Pricing → pole "Amount (minor units)"

**Co się dzieje:** Etykieta pola mówi "Amount (minor units)". "Minor units" to wewnętrzna reprezentacja monetarna (cents/grosze) — użytkownik wpisuje `9999`, system pokazuje `€99.99`. Użytkownik nie komercyjny musi domyślić się że 9999 = 99.99 EUR. Łatwa pomyłka rzędu wielkości (np. wpisanie `99` zamiast `9900` → produkt za 99 centów zamiast 99 euro).

**Kierunek naprawy UI:** Ukryć "minor units" z UI — pokazać zwykłe pole cena z formatowaniem waluty (np. `€ 99.99` z separatorem dziesiętnym). Konwersja do minor units po stronie frontend submit handler. Pod polem live-preview "Cena netto: €99.99". Alternatywnie jeśli minor units jest potrzebne dla dev-ów: toggle "Pokaż raw minor units" z label "Advanced" — domyślnie off. Spójne z regułą "kody techniczne nie przeciekają do UI" z Forms (BUG-3).

---

### [BUG-4] ŚREDNI: Collections "Create collections from the Commerce API/UI flow" — dead instruction

**Gdzie:** Edytor produktu → prawy sidebar → Collections section

**Co się dzieje:** Empty state collections zawiera tekst: "No collections yet. Create collections from the Commerce API/UI flow." — ale nie ma żadnego linku ani przycisku "Create collection". Gdzie jest "Commerce API/UI flow"? Użytkownik nie wie gdzie pójść. Nie ma tego w sidebarze (Commerce prowadzi do listy produktów), nie ma w Settings.

**Kierunek naprawy UI:** Albo (a) dodać bezpośrednio przycisk "Create collection" otwierający inline dialog/modal z polami Name + Description + Slug (spójne z jak kategorie działają w Widget Library), albo (b) link "Zarządzaj kolekcjami →" prowadzący do dedykowanej strony kolekcji. Dodatkowo: pod Commerce w sidebarze dodać pod-pozycję "Collections" (jak Coderso ma Engine/Entries/Screens/Widgets/Forms). Nie zostawiać ślepych instrukcji.

---

### [BUG-5] ŚREDNI: "Media picker integration will be added in runtime widget flow" — developer TODO w produkcji

**Gdzie:** Edytor produktu → prawy sidebar → Media IDs section

**Co się dzieje:** Pod polem "Media IDs" disclaimer: "Comma-separated IDs. Media picker integration will be added in runtime widget flow." — jawnie komunikuje że funkcja nie jest gotowa. Użytkownik ma wpisać UUIDs ręcznie (skąd ma je wziąć? przez Media library → devtools?).

**Kierunek naprawy UI:** Zastąpić textbox picker mediów — dokładnie tak jak w edytorze Entries (gdzie Media field używa Browse media pickera z miniaturkami). Użyć tego samego komponentu Media Picker który już istnieje w Entries — nie tworzyć osobnego flow dla Commerce. Do czasu gotowego pickera — ukryć sekcję Media IDs (feature flag) lub oznaczyć jasno "Beta feature" z info-banerem "Media picker dostępny wkrótce. Tymczasowo: skopiuj UUID z Media library."

---

### [BUG-6] ŚREDNI: Row menu ma tylko Edit/Delete

**Gdzie:** Lista produktów → menu "..."

**Co się dzieje:** Menu oferuje wyłącznie Edit i Delete. Brak: Duplicate (tworzenie wariantu — w komercji bardzo częste), Publish/Unpublish (bez wchodzenia do edytora), Archive (separate od Delete), "View in storefront" (otwarcie frontend preview), "Copy SKU/ID", bulk actions. Trzecia sekcja z ubogim menu (po Forms, Listings).

**Kierunek naprawy UI:** Rozszerzyć menu o Duplicate, Publish/Unpublish (zależnie od aktualnego statusu), Archive (miękkie usunięcie — schowaj z All, zostaw w Archived), View in storefront (link z tokenem preview), Copy Product ID (dla integracji widgetów). Dodatkowo: bulk select na tabeli (checkbox per row + header) + bulk actions (Publish all selected / Archive / Delete). Wzorzec Pages/Posts — ten sam komponent row actions menu.

**TASK-216 status:** The list-owned subset is closed. The row menu now supports
Edit, Publish, Move to draft, Archive, and confirmed Delete; the table supports
checkbox selection, visible-row bulk Publish/Move to draft/Archive/Delete,
shared pagination, and partial-failure feedback. Duplicate, storefront preview,
Copy Product ID, SKU/tax/variant, and collection-management behavior remain
outside TASK-216 and should stay in dedicated Commerce editor/product-model
follow-ups.

---

### [BUG-7] NISKI: Publish button + Status dropdown — dwa sposoby publikacji

**Gdzie:** Edytor produktu → toolbar "Publish" + Identity → combobox Status (Draft/Published/Archived)

**Co się dzieje:** Są dwa niezależne miejsca zmiany statusu: (a) przycisk "Publish" w toolbarze (zmienia status na Published i zapisuje), (b) combobox Status w Identity (zmienia wartość pola, wymaga Save changes). Niejasne co ma pierwszeństwo, czy są synchronizowane. Oba zresztą łamią się na BUG-1.

**Kierunek naprawy UI:** Wybrać jeden punkt kontroli statusu. Rekomendacja: zostawić combobox Status w Identity (bardziej granular — Draft/Published/Archived), usunąć przycisk "Publish" z toolbara. W toolbarze pozostawić tylko "Save changes" z napisem dynamicznym zależnie od aktualnego stanu (np. "Zapisz i opublikuj" gdy Status=Published, "Zapisz szkic" gdy Status=Draft). Eliminuje confusion co robi co. Wzorzec Pages/Posts — tam Publish zmienia status i zapisuje w jednym ruchu.

---

## Problemy UX

### [UX-1] Brak pól standardowych dla komercyjnego produktu: SKU, Tax, Variants, Weight

**Gdzie:** Edytor produktu — formularz

**Problem:** Dla realnego e-commerce produkt zazwyczaj ma: **SKU** (stock keeping unit — unikalny kod), **Tax class** (VAT 23%/8%/0%/reduced), **Variants** (rozmiar S/M/L, kolor, itd.), **Weight/Dimensions** (dla wysyłki), **Barcode** (EAN/UPC), **Meta title/description** (SEO), **Vendor/Brand**. Aktualnie Commerce ma tylko Title/Slug/Status/Excerpt/Description/Amount/Currency/Compare-at/State/Quantity — to wystarcza na digital product ale nie na fizyczny.

**Kierunek naprawy UI:** Rozszerzyć formularz o sekcje: **Inventory** (SKU, Barcode), **Shipping** (Weight, Dimensions), **Tax** (Tax class dropdown z konfigurowalnej listy), **Variants** (table: attribute → values → SKU → price override per variant), **SEO** (meta title, meta description — wzorzec z Posts SEO fields). Status Beta sugeruje że feature rośnie — przed exit z Beta te pola są kluczowe dla większości use-cases. Spójne z field schema patterns — użyć Engine → custom fields mechanizmu żeby użytkownik mógł rozszerzać sobie sam (custom product type) zamiast zahardcodowania.

---

### [UX-2] Currency jako wolny textbox, nie dropdown ISO-4217

**Gdzie:** Edytor produktu → Pricing → pole "Currency"

**Problem:** Currency jest wolnym textboxem — użytkownik może wpisać "eur", "€", "Euro", "EUR", "euros" — brak walidacji. To prowadzi do inconsistent data w bazie (produkt w "EUR" obok produktu w "eur"). Frontend widgetów musi handlować każdy wariant.

**Kierunek naprawy UI:** Zastąpić textbox combobox z listą ISO-4217 (EUR, USD, PLN, GBP, …) — top 10 najczęściej używane + search dla reszty. Symbol waluty obok ($€£zł) dla łatwej identyfikacji. Defaulting na walutę z Settings sklepu (żeby nowy produkt dziedziczył). Spójne z wzorcem combobox używanym w innych miejscach.

---

### [UX-3] Stock "State" — combobox bez kontekstu opcji

**Gdzie:** Edytor produktu → Stock → combobox "State"

**Problem:** Widziałem tylko domyślną wartość "In stock". Combobox sugeruje więcej opcji ale nie otwierałem go (scope czasu). Jeśli są to "In stock / Out of stock / Pre-order / Backorder" — to jest dobry basic stan. Brakuje natomiast: threshold "low stock" (poniżej X jednostek), notyfikacji przy niskim stanie, unit (szt./kg/m²), backorder rules.

**Kierunek naprawy UI:** Rozszerzyć Stock o: Low stock threshold (input number), Notify when below (checkbox + email), Unit (szt./kg/m² — combobox). Też: Allow backorder (switch — "Pozwól zamawiać gdy brak na stanie") + Expected restock date (data picker). Spójne z wzorcem config gdzie każde ustawienie ma opis co robi.

---

### [UX-4] Amount bez live-preview sformatowanej ceny

**Gdzie:** Edytor produktu → Pricing → pole Amount

**Problem:** Gdy wpiszesz `9999` w minor units z walutą `EUR`, formularz nie pokazuje nigdzie `= €99.99` jako live preview. Sformatowana cena pojawia się dopiero na liście produktów. Łatwo pomylić się o rząd wielkości (9999 vs 99999) bez feedbacku podczas wpisywania.

**Kierunek naprawy UI:** Pod polem Amount pokazywać live-preview formatted: gdy user wpisze 9999 w EUR — pod polem grey text "Cena: €99.99". Aktualizowane w real-time przy zmianie currency lub amount. Razem z BUG-3 (Amount terminology) — to jedno rozwiązanie: zastąp "minor units" polem z formatterem waluty który przyjmuje 99.99 i sam konwertuje do minor units przed zapisem.

---

### [UX-5] "Configure product identity, pricing, stock, and collection assignments" — promise bez fulfill

**Gdzie:** Edytor produktu → nagłówek "New product" + paragraph pod

**Problem:** Paragraph pod heading obiecuje 4 rzeczy: identity, pricing, stock, collection assignments. Collections w rzeczywistości mają empty state (BUG-4), a formularz pomija Tax, SKU, Variants (UX-1). Obietnica w copy jest szersza niż rzeczywistość.

**Kierunek naprawy UI:** Albo rozszerzyć formularz do poziomu obietnicy (realne commerce features), albo zmienić copy na aktualny stan: "Configure basic product details. Collections and variants coming soon." — jasna komunikacja dla użytkowników beta że są ograniczenia. Link "Roadmap" do dokumentacji z planowanymi fieldami.

---

### [UX-6] Brak info-banner "Beta" w samej sekcji

**Gdzie:** /admin/coderso/commerce — nagłówek

**Problem:** Jak w Listings (UX-6) — "Beta" badge tylko w sidebarze. Wchodząc do sekcji brak ostrzeżenia że funkcja może się zmienić, ma ograniczenia i jawne TODO (BUG-5). Użytkownik który zainwestuje czas w konfigurację produktów nie wie że API/UI są niedojrzałe.

**Kierunek naprawy UI:** Ten sam wzorzec co rekomendacja dla Listings: dyskretny żółty info-banner w nagłówku Commerce: "Commerce w fazie Beta. Pola Tax/Variants/Media picker w przygotowaniu. Zgłaszaj uwagi w [link]." Globalna reguła dla wszystkich Beta sekcji — użyć wspólnego komponentu BetaBanner.

---

### [UX-7] Product context sidebar pokazuje surowe UUID bez tooltipa/copy

**Gdzie:** Edytor produktu → lewy sidebar "Product context" → Product ID

**Problem:** Po zapisie Product ID wyświetla się jako pełny UUID `4cef4eba-7836-409c-b9aa-1b07fa5194f3`. Brak przycisku "Copy" do schowka (pomocne przy integracji widgetów), brak tooltip/label co to jest. Również "Published —" jest niejasne — prawdopodobnie data publikacji, ale myślnik myli (czy to "nie opublikowano" czy "brak daty"?).

**Kierunek naprawy UI:** Product ID: skrócić wizualnie (pierwsze 8 znaków + truncate + "...") z tooltipem pełnym UUID i ikoną copy-to-clipboard po prawej. Na click copy → mini toast "ID skopiowany". Published: zamiast myślnika pokazywać "Jeszcze nie opublikowano" gdy brak daty, lub czytelną datę gdy jest. Spójne z wzorcem "Not created" używanym dla nie-zapisanego produktu.

---

### [UX-8] "Changes: Saved" w Product context — niejasny sygnał

**Gdzie:** Edytor produktu → lewy sidebar "Product context" → pole Changes

**Problem:** Widżet "Changes: Saved" pokazuje status zmian. Niejasne: czy zawsze "Saved" oznacza zapisane, czy to auto-save wskaźnik, czy zmienia się na "Unsaved" gdy edytujesz. Nie przetestowałem zmieniając pole bez save — ale użytkownik widząc stale "Saved" nie wie co to oznacza.

**Kierunek naprawy UI:** Trzy stany wizualne: (a) "Zapisano" (zielony, gdy brak dirty state), (b) "Niezapisane zmiany" (żółty, gdy user coś zmienił), (c) "Zapisywanie..." (szary, podczas zapisu). Ikona kropki kolorowa obok statusu. Dodatkowo: tooltip "Ostatni zapis: HH:MM" z datą ostatniego udanego save. Analogicznie do "UNSAVED CHANGES" w Pages editor.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Search products textbox w toolbarze | W przeciwieństwie do Forms/Listings tu search jest od razu |
| Tabs All/Published/Draft/Archived z licznikami | Szybki filtr po statusie bez kombinowania dropdownów |
| Toast "Product saved successfully" po Save changes | W przeciwieństwie do Forms/Listings/Custom Screens — tu save daje feedback ✓ |
| Title auto-generuje Slug | Spójne z Pages/Posts/Engine |
| Amount → formatted price (€99.99) na liście | Prawidłowa konwersja minor units → display |
| Stock quantity w kolumnie listy ("in stock (10)") | Szybka orientacja stanu magazynu |
| Product context sidebar z ID/Updated/Published timestamps | Profesjonalny meta panel (mimo UX-7) |
| Layout 3-panelowy: context + form + assignments | Logiczny podział informacji |
| Status combobox z Draft/Published/Archived | Pełny cykl życia produktu |
| Compare-at amount — osobne pole | Standard dla promocji (pokazywanie "przekreślonej" ceny) |
| Back to list / Discard / Publish / Save changes — pełny toolbar | Kompletny zestaw akcji |
| Empty state listy z CTA "Create your first product" | Przyjazne onboarding |
| Nazwane stany w sidebar: "Not created" dla Product ID, "Saved" dla Changes | Lepsze niż puste pola |
| URL po save: /commerce/{uuid} | Deep-linkable |
| 409 error pokazywany userowi z wiadomością | Lepsze niż silent fail (mimo że BUG-1 sam w sobie krytyczny) |

---

## Screenshoty

- `commerce-empty.png` — empty state listy produktów
- `new-product-editor.png` — edytor nowego produktu (Identity/Pricing/Stock/Collections/Media IDs)
- `product-saved.png` — po Save changes: toast "Product saved successfully", Product ID w sidebar
- `publish-error.png` — błąd 409: "Commerce editor error — Commerce product slug already exists"
- `commerce-list.png` — lista z Test Product (Draft, €99.99, in stock 10)
- `row-menu.png` — menu wiersza: Edit / Delete

---

## Błędy z konsoli (runtime)

```
POST /admin/api/commerce/products → 409 Conflict (po pierwszym save, każde kolejne Save/Publish)
```
