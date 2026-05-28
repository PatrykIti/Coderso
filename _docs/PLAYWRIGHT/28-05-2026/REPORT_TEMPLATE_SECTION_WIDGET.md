# RAPORT: Template Section Widget — audyt current-state (Wizard / Visual / Advanced)

> **Status:** Zakończony — przetestowany na żywej instancji lokalnej
> **Data:** 2026-05-28
> **Sesja Playwright:** `claude-28-05-template-section` (oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/56a31dad-cf02-4671-89f4-15ecd77fa67f` (strona „Contract Test - template-section")
> **Fixture public:** http://localhost:3000/ctr-template-section-2305
> **Referencja formatu:** `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md`
> **Referencja historyczna (smoke):** `_docs/PLAYWRIGHT/27-05-2026/REPORT_TEMPLATE_SECTION_WIDGET.md`

> **Uwaga o screenshotach:** w tym przebiegu audyt opierał się na snapshotach
> dostępności (accessibility tree) i inspekcji DOM przez `eval`, a nie na plikach
> PNG. Jeżeli gdziekolwiek pojawiają się nazwy plików zrzutów, są to wyłącznie
> lokalne etykiety przechwyceń Playwright — same pliki PNG nie są commitowane do
> repo i nie stanowią wymaganego evidence.

---

## 1. Przegląd widgetu

**Typ:** `template-section`
**Kategoria:** `layout`
**Opis:** „Render a reusable widget template as a page section." — widget renderuje
zapisany szablon widgetów (`widget-template`) jako sekcję strony.
**Warianty:** tylko `default` (brak wyboru wariantu; `editorCapabilities.visualOwnsVariantSelection = true`).

**Pliki źródłowe:**
- `core/widgets/core/templateSection.tsx` — renderer (`TemplateSectionBlock`), schema, normalizacja, kontrakt edytora.
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` — edytory Wizard / Visual / Advanced.
- `core/admin/ui/widgets/hooks/useWidgetTemplates.ts` + `core/admin/services/widgetTemplatesClient.ts` — pobieranie listy szablonów (`GET /admin/api/widget-templates`).

### 1.1 Model danych (`TemplateSectionData`)

| Sekcja | Pola |
|--------|------|
| (root) | `templateId` (string), `templateName` (string) |
| **metadata** | `category`, `previewLabel`, `version` |
| **resolved** | `blocks[]` (rozwiązane bloki szablonu), `error` (`template_missing` / `template_unpublished` / `template_loop`) |

`resolved.*` jest polem WYNIKOWYM — wypełnianym przez runtime przy renderze, nie przez edytor.

### 1.2 Tryby edytora (wg kontraktu)

- **Wizard** — sekcja `template-section.wizard.template-setup`; zapisuje `templateId`, `templateName`.
- **Visual** — `active-template` (read-only `templateId`/`templateName`) + `presentation-fields` (zapisuje `metadata.previewLabel`, `metadata.category`; read-only `metadata.version`).
- **Advanced** — `template-diagnostics`, `runtime-payload`, `runtime-rules` — wszystkie bez `writablePaths` (czysto read-only / informacyjne).

W panelu admina Wizard jest uruchamiany przyciskiem **„Run setup again"**, natomiast
Visual i Advanced to zakładki w prawym panelu. Variant cards nie występują (jeden wariant).

---

## 2. Metoda i zakres faktycznego testu

Co **zostało faktycznie wykonane** w tej sesji:

1. Logowanie do admina (`patryk.ciechanski@patrykiti.pl`) — OK.
2. Otwarcie fixture page w trybie edycji.
3. **Wizard:** otwarcie selektora szablonów, odczyt całej listy, wybór 3 różnych szablonów (`My Test Template`, `main-footer`, `test`), reset do „No template", przejście „Finish setup and open Visual".
4. **Visual:** wpisanie wartości w `Preview label` i `Category`, obserwacja podglądu na kanwie, weryfikacja sekcji „Active template".
5. **Advanced:** odczyt wszystkich sekcji read-only, weryfikacja zgodności diagnostyki ze stanem in-memory.
6. **Persystencja w UI:** weryfikacja zachowania wartości przy przełączaniu zakładek (Visual → Advanced).
7. **Frontend:** otwarcie public route w osobnej karcie, inspekcja DOM (`data-template-section*`), sprawdzenie overflow i statusu.
8. Inspekcja API listy szablonów (`GET /admin/api/widget-templates`) dla statusów i liczby bloków.
9. Po testach: reload edytora i odrzucenie zmian (`beforeunload` → accept), aby przywrócić fixture do stanu wyjściowego (patrz §9).

Czego **NIE wykonano** (świadomie) — patrz §8 (ograniczenia/fixture-gap):
- Nie publikowano ani nie zapisywano zmian na współdzielonym fixture.
- Nie udało się zweryfikować stanu „ready" (rozwiązany szablon z blokami) na froncie — brak opublikowanego szablonu w danych (patrz §8).
- Nie weryfikowano responsywności mobilnej szablonu w stanie populated (brak danych).

---

## 3. Tryb Wizard — wyniki

Struktura: nagłówek „Wizard" / „Template section", pole „Widget type: template-section",
sekcja **„Template setup"** z jednym selektorem `Template selection` (Radix `Select`),
panel **„Live preview"** oraz przycisk **„Finish setup and open Visual"**.

### 3.1 Co działa

- **Selektor szablonów** ładuje listę z API i pokazuje 8 opcji: „No template" + 7 szablonów.
- **Wybór szablonu** natychmiast utrwala się w combobox (`My Test Template` → `main-footer` → `test`).
- Po wyborze pojawia się **karta szablonu** z nazwą, **badge statusu** (np. `Draft`) oraz opisem, gdy istnieje (np. `main-footer` → „Footer all pages").
- Opcja **„No template"** poprawnie resetuje wybór (czyści `templateId`/`templateName`/`resolved`).
- **„Finish setup and open Visual"** przełącza do zakładki Visual i przenosi wybrany szablon (po wyborze `test` → Visual pokazuje „Active template: test").
- Wartość przeżywa przejście Wizard → Visual → Advanced (persystencja in-memory potwierdzona).

### 3.2 Co jest mylące / ograniczone

- **Live preview NIGDY nie renderuje realnej zawartości szablonu.** Dla każdego wybranego szablonu — także tych, które mają bloki w bazie (`test`, `main-footer` mają po 1 bloku) — podgląd pokazuje tylko etykietę + komunikat **„This template has no blocks yet."** Resolucja bloków nie zachodzi w edytorze. Opis panelu „Reflects the current Wizard state through the shared widget renderer" jest przez to **mylący** — sugeruje pełny render, którego nie ma.
- W selektorze **wszystkie dostępne szablony mają status `Draft`** (potwierdzone przez API). Wizard pozwala wybrać draft, ale nie sygnalizuje, że draft nie wyrenderuje się na opublikowanej stronie publicznej (tylko w preview — patrz alert w Advanced).

### 3.3 Lista szablonów (z `GET /admin/api/widget-templates`)

| Nazwa | Status | Liczba bloków |
|-------|--------|---------------|
| Template-420f0b92-6507-49b0-84bd-339f0c6eff6b | draft | 0 |
| My Test Template | draft | 0 |
| test | draft | 1 |
| main-footer (opis: „Footer all pages") | draft | 1 |
| test2 | draft | 0 |
| test1 | draft | 0 |
| test (drugi wpis, inny id) | draft | 1 |

**Wniosek:** 0 opublikowanych szablonów; część szablonów jest pusta (0 bloków). To wprost ogranicza możliwość weryfikacji stanu populated (§8).

---

## 4. Tryb Visual — wyniki

Sekcje widget-specyficzne: **„Active template"** (summary, read-only) oraz
**„Template presentation"** (`Preview label`, `Category`). Dodatkowo edytor-shell
dokłada współdzielone sekcje **„Block layout"** i **„Device visibility"** (§6).

### 4.1 Co działa

- **„Active template"** poprawnie odzwierciedla stan: gdy brak szablonu → „No template selected yet. Run setup to choose one before editing presentation labels."; po wyborze → „Active template: test".
- **`Preview label`** (input): wpisanie wartości działa natychmiast i **aktualizuje podgląd na kanwie** — etykieta placeholdera zmieniła się z „test" na wpisane „Audyt Podgląd 2805". Potwierdza to logikę `resolveTemplateLabel` (priorytet: `previewLabel` > `templateName` > „Template section").
- **`Category`** (input): przyjmuje tekst i utrzymuje wartość; wartość jest zachowywana między zakładkami.
- Wartości obu pól przetrwały przełączenie do Advanced (Preview label widoczny w diagnostyce — persystencja UI potwierdzona).

### 4.2 Co jest mylące / ograniczone

- **`Category` nie ma żadnego widocznego efektu w edytorze.** Kategoria renderuje się tylko jako „chip" w stanie `ready` (gdy są rozwiązane bloki), do którego edytor nigdy nie dochodzi. W placeholderze (`TemplateSectionPlaceholder`) kategoria nie jest pokazywana. W praktyce użytkownik wpisuje `Category` „w ciemno" — nie da się jej podejrzeć w adminie. Dodatkowo `Category` **nie jest** echo-wana w diagnostyce Advanced (tam są tylko `previewLabel` i `version`).
- **`metadata.version`: niespójność kontrakt ↔ UI.** Kontrakt deklaruje `metadata.version` jako `readOnlyPath` sekcji `presentation-fields` (Visual), ale **pole nie jest renderowane nigdzie w Visual** — pojawia się tylko w Advanced (read-only, „Not configured"). Co więcej, `version` jest read-only we wszystkich trybach, więc **nie istnieje żaden edytor do jego ustawienia** — wartość może trafić tu wyłącznie z surowych danych / normalizacji.
- Visual, tak jak Wizard, **nie pokazuje realnej zawartości szablonu** (ten sam root cause: brak resolucji bloków w edytorze).

---

## 5. Tryb Advanced — wyniki

Sekcje widget-specyficzne: **„Resolved template"**, **„Resolved content summary"**,
**„Runtime behavior"** (statyczny alert). Plus współdzielone „Block layout summary"
i „Visibility summary" (§6). **Cały tryb jest read-only** — brak jakiegokolwiek pola edycyjnego (zgodne z kontraktem: puste `writablePaths`).

### 5.1 Co działa

- Diagnostyka poprawnie odzwierciedla stan in-memory:
  - `Template selection: test`, `Template name: test`,
  - `Preview label: Audyt Podgląd 2805` (przeniesione z Visual — persystencja potwierdzona),
  - `Version: Not configured`,
  - `Resolved blocks: 0 blocks`, `Resolution error: No resolution problem detected.`
- „Resolved content summary" → „No content blocks resolved." — spójne z faktem, że edytor nie rozwiązuje bloków.
- „Runtime behavior" (alert): „This widget renders the selected template blocks in order. Draft templates will only render in preview mode." — poprawnie opisuje regułę draft/preview.

### 5.2 Co jest mylące / ograniczone

- **„Resolved blocks: 0 blocks" mimo że wybrany szablon `test` ma 1 blok w bazie.** Diagnostyka raportuje stan nierozwiązany edytora, a nie to, co faktycznie wyrenderuje runtime. Dla sekcji „dla troubleshootingu" jest to mylące — nie pomaga zdiagnozować realnego renderu.
- **Wewnętrzna sprzeczność diagnostyki:** „Resolution error: No resolution problem detected." dla szablonu **draft**, podczas gdy sąsiedni alert „Runtime behavior" ostrzega, że draft wyrenderuje się tylko w preview. Diagnostyka daje fałszywe „wszystko OK", ignorując bramkę publikacji szablonu.
- **`Category` nie jest w ogóle wystawiana** w diagnostyce (jest tylko `Template selection`, `Template name`, `Preview label`, `Version`, `Resolved blocks`, `Resolution error`).

---

## 6. Współdzielone kontrolki bloku (obserwacje — poza kontraktem template-section)

Edytor-shell dokłada do Visual i Advanced kontrolki wspólne dla wszystkich widgetów
(nie należą do kontraktu `template-section`):

- **Block layout** (Visual) / **Block layout summary** (Advanced): `Content width = default`, `Top/Bottom padding = MD`, `Top/Bottom margin = None`.
- **Device visibility** (Visual): przełączniki Desktop / Tablet / Mobile — w odczytanym stanie wszystkie `aria-checked=false` (unchecked), z etykietą „Hidden".
- **Visibility summary** (Advanced): „Shown on: **Hidden on all devices**".

**Obserwacja (do follow-upu w warstwie współdzielonej, nie w template-section):**
podsumowanie „Hidden on all devices" stoi w sprzeczności z faktem, że widget **realnie
renderuje się na public route** (widoczny na desktopie 1280px — patrz §7). Wskazuje to na
niejednoznaczność/możliwą inwersję semantyki etykiet w współdzielonej sekcji widoczności.
Nie jest to problem renderera `template-section` i nie był dalej drążony w tym audycie.

---

## 7. Frontend (public route) — wyniki

**URL:** http://localhost:3000/ctr-template-section-2305 · **HTTP:** `200`.

Stan **opublikowany** fixture nie ma wybranego szablonu, więc front renderuje placeholder:

```html
<div class="rounded-lg border border-dashed bg-muted/20 p-4 text-sm"
     data-template-section="" data-template-section-state="empty">
  <p ...>Template section</p>
  <p ...>Template section</p>
  <p ...>Select a widget template to render here.</p>
</div>
```

- `data-template-section = ""` (pusty `templateId`) ✓
- `data-template-section-state = "empty"` ✓
- Etykieta = „Template section" (fallback, bo brak `previewLabel` i `templateName`) ✓
- Komunikat = „Select a widget template to render here." (poprawny dla pustego `templateId`) ✓
- **Brak horyzontalnego overflow** (`scrollWidth = innerWidth = 1280`) ✓
- Widget jest **widocznie wyrenderowany** na desktopie (kontekst do obserwacji widoczności w §6).

Stan public odpowiada więc renderowi placeholdera (`TemplateSectionPlaceholder`) i jest
zgodny ze stanem placeholdera obserwowanym w podglądzie admina.

---

## 8. Czego NIE udało się zweryfikować — ograniczenia / fixture-gap

- **Brak opublikowanego szablonu w danych** (wszystkie 7 to `draft`). W połączeniu z regułą
  „draft renderuje się tylko w preview" oznacza to, że **nie da się obecnie zweryfikować stanu
  `ready`** (rozwiązany szablon z realnymi blokami) na opublikowanej stronie publicznej. To
  klasyczny **fixture-gap**, analogiczny do komercyjnych widgetów z 27-05.
- **Brak resolucji bloków w edytorze** sprawia, że ani Wizard, ani Visual, ani Advanced
  nie są w stanie pokazać realnej zawartości szablonu — testowano wyłącznie ścieżkę placeholdera.
- **Nie testowano ścieżek błędów** `template_missing` / `template_loop` na żywym froncie
  (wymagałyby spreparowanego, opublikowanego szablonu / zapętlonego template-section).
- **Nie publikowano zmian** na współdzielonym fixture (świadoma decyzja — patrz §9), więc nie
  weryfikowano propagacji `previewLabel`/`category` na front w stanie populated.
- **Responsywność mobilna** szablonu w stanie populated — nie testowana (brak danych do renderu).

---

## 9. Higiena fixture (cleanup)

Wszystkie interakcje w edytorze były **in-memory** — panel pokazywał „Unsaved changes”,
co potwierdza brak autosave/zapisu. Po testach wykonano `reload` edytora i potwierdzono
dialog `beforeunload` (accept), aby **odrzucić niezapisane zmiany**. Po reloadzie edytor wrócił
do stanu wyjściowego (kanwa: „Select a widget template to render here.", Visual: „No template
selected yet…", brak „Unsaved changes"). Fixture pozostawiono w stanie pierwotnym; nie klikano
Publish/Save.

---

## 10. Porównanie Admin Preview ↔ Frontend

| Aspekt | Admin (preview/kanwa) | Frontend (public) | Zgodność |
|--------|-----------------------|-------------------|----------|
| Render pustego stanu (brak `templateId`) | Placeholder „Select a widget template…" | Placeholder „Select a widget template…" | ✓ Zgodne |
| `data-template-section-state` | `empty` | `empty` | ✓ Zgodne |
| Etykieta z `previewLabel` | Aktualizuje etykietę placeholdera | (niezweryfikowane na froncie — nie publikowano) | n/d |
| Realna zawartość szablonu (bloki) | Nigdy nie renderowana w edytorze | Nie do zweryfikowania (brak published template) | — (oba ograniczone) |
| Overflow poziomy | brak | brak | ✓ Zgodne |

**Wniosek:** w jedynym dostępnym do weryfikacji stanie (placeholder / pusty `templateId`)
admin i front są spójne. Stanu populated nie da się porównać z powodu fixture-gap (§8).

---

## 11. Podsumowanie

### 11.1 Co działa (potwierdzone testem)

- Logowanie, otwarcie fixture, ładowanie edytora (Wizard/Visual/Advanced).
- Wizard: lista szablonów z API, wybór, badge statusu, opis, reset „No template", przejście do Visual.
- Visual: `Active template` (read-only summary), `Preview label` (aktualizuje podgląd na kanwie), `Category` (przyjmuje i utrzymuje wartość).
- Advanced: kompletna, poprawna diagnostyka read-only odzwierciedlająca stan in-memory; statyczny alert runtime.
- Persystencja wartości między zakładkami (in-memory).
- Public route: `200`, poprawny render placeholdera, brak overflow, spójne `data-*`.

### 11.2 Co nie działa / jest mylące

| # | Obserwacja | Obszar |
|---|------------|--------|
| 1 | Podgląd (Wizard i Visual) nigdy nie renderuje realnych bloków szablonu — zawsze placeholder, nawet dla szablonów z blokami | Edytor / preview |
| 2 | Opis „Reflects the current Wizard state through the shared widget renderer" jest mylący (brak realnego renderu) | Wizard UX |
| 3 | `Category` nie ma widocznego efektu w adminie i nie jest echo-wana w Advanced | Visual / Advanced |
| 4 | `metadata.version` deklarowane w kontrakcie (Visual readOnly), ale nie renderowane w Visual; brak edytora do jego ustawienia gdziekolwiek | Kontrakt ↔ UI |
| 5 | Advanced „Resolved blocks: 0" mimo bloków w bazie — diagnostyka nie odzwierciedla realnego renderu | Advanced / diagnostyka |
| 6 | Sprzeczność: „No resolution problem detected." dla szablonu draft, przy alercie „draft tylko w preview" | Advanced / diagnostyka |
| 7 | Wszystkie szablony to `draft` → brak możliwości weryfikacji stanu `ready` na froncie (fixture-gap) | Dane / fixture |
| 8 | (Współdzielone) „Visibility summary: Hidden on all devices" przy realnie widocznym widgecie na froncie — możliwa inwersja semantyki | Kontrolka współdzielona |

### 11.3 Uwaga końcowa o uczciwości raportu

Jeżeli coś nie zostało przetestowane, jest to wyraźnie zaznaczone w §8. Wszystko, co
zostało przetestowane w ścieżce placeholdera (pusty/draft template), **działa zgodnie z
oczekiwaniami renderera**; jedyne „twarde" defekty to mylące podglądy i niespójności
diagnostyki/kontraktu opisane w §11.2 — nie zaobserwowano crasha ani błędu blokującego
ani w adminie, ani na froncie.
