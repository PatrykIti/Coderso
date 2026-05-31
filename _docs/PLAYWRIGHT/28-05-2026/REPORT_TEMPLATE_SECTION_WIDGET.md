# RAPORT: Template Section Widget — audyt gap-close (wyczerpujące klikanie kontrolek + dowód na fixture placeholder-only)

> **Status:** Zakończony
> **Data:** 2026-05-29 (upgrade audytu z 2026-05-28 — domknięcie luki „nowszej fali" re-audytu)
> **Sesja Playwright:** `claude-29-05-template-section-gap-close` (izolowana, oddzielna od innych agentów)
> **Środowisko:** http://localhost:5173/admin · http://localhost:3000
> **Fixture admin:** `/admin/pages/56a31dad-cf02-4671-89f4-15ecd77fa67f` (strona „Contract Test - template-section", status **Published**)
> **Fixture public:** http://localhost:3000/ctr-template-section-2305
> **Pliki źródłowe:**
> - `core/widgets/core/templateSection.tsx` — renderer (`TemplateSectionBlock`), `TemplateSectionPlaceholder`, schema, normalizacja, kontrakt edytora, `resolveTemplateLabel` / `resolvePlaceholderMessage`.
> - `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` — edytory Wizard / Visual / Advanced.
> - `core/services/widgets/templateSectionRuntime.ts` — runtime-owa resolucja szablonu (źródło stanów `template_missing` / `template_unpublished` / `template_loop`).
> - `core/server/publicSite.tsx` (≈ l. 527–556, 1365–1377) — hydratacja bloku `template-section` na publicznej trasie.
> - `core/admin/ui/widgets/hooks/useWidgetTemplates.ts` + `core/admin/services/widgetTemplatesClient.ts` — lista szablonów (`GET /admin/api/widget-templates`).

> **Cel tego upgrade'u:** poprzedni raport (28-05) był rzetelny, ale nie przeszedł nowszej, wyczerpującej
> fali re-audytu. Ten przebieg **klika realnie każdą dostępną kontrolkę** fikstury (selektor szablonów ze
> wszystkimi opcjami, reset „No template", Finish setup, oba pola Visual, wszystkie wiersze read-only
> Advanced) oraz — ponieważ fikstura jest **z natury placeholder-only** — dowodzi tego **mocniejszym
> evidence** (inspekcja DOM + API + lektura ścieżki runtime), a nie tylko stwierdzeniem. Sekcje jasno
> oddzielają: **przetestowane / działa / nie działa / nie-do-zweryfikowania / niuanse UX**.

> **Metodyka i bezpieczeństwo fixture:** weryfikacja oparta o realne kliknięcia w żywym edytorze + inspekcję
> DOM (`eval`) + odczyt API z kontekstu zalogowanej sesji. **Nie** klikałem „Save draft" ani „Publish" —
> wszystkie edycje to ulotny stan React (panel pokazywał „Unsaved changes"). Po testach wykonałem `reload`
> i **zaakceptowałem dialog `beforeunload`**, aby odrzucić zmiany; potwierdziłem powrót fikstury do stanu
> wyjściowego (§9). Zrzutów PNG **nie** zapisywałem — wszystkie etykiety przechwyceń byłyby wyłącznie
> lokalne w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence w repo.

> **Status remediacji (2026-05-30, TASK-343-12):** zamknięto drift
> truthfulness bez dodawania nowego endpointu resolucji. Admin preview pozostał
> świadomie placeholder-only, ale placeholder i Advanced mówią to wprost przez
> `admin_preview_unresolved` zamiast sugerować rozwiązane bloki. Advanced
> rozróżnia `template_unpublished`, `template_missing`, `template_loop`,
> `template_empty`, resolved oraz brak wyboru, a `metadata.category` i
> `metadata.version` są widoczne w diagnostyce/Visual zgodnie z własnością.
> Szczegóły walidacji są w changelogu TASK-343-12. Istniejąca publiczna
> fixture ma `visibility.devices: []`, więc po shared visibility fix publiczny
> route ukrywa blok; publiczny smoke wykonano na krótkotrwałej stronie z
> poprawną widocznością i usunięto ją po teście.

---

## 1. Przegląd widgetu (skrót)

**Typ:** `template-section` · **Kategoria:** `layout`.
**Opis:** „Render a reusable widget template as a page section." — widget renderuje zapisany szablon
widgetów (`widget-template`) jako sekcję strony.
**Warianty:** wyłącznie `default` (brak kart wariantu; `editorCapabilities.visualOwnsVariantSelection = true`).

### 1.1 Model danych (`TemplateSectionData`)

| Sekcja | Pola |
|--------|------|
| (root) | `templateId` (string), `templateName` (string) |
| **metadata** | `category`, `previewLabel`, `version` |
| **resolved** | `blocks[]`, `error` (`template_missing` / `template_unpublished` / `template_loop`) |

`resolved.*` to pole **wynikowe** — wypełnia je runtime przy renderze publicznym (`publicSite.tsx` →
`resolveTemplateSectionRuntimeData`), **nigdy edytor** (patrz N1).

### 1.2 Tryby edytora (wg kontraktu `editorContract`)

- **Wizard** — sekcja `template-section.wizard.template-setup`; `writablePaths: ["templateId","templateName"]`.
- **Visual** — `active-template` (read-only `templateId`/`templateName`, summary) + `presentation-fields`
  (`writablePaths: ["metadata.previewLabel","metadata.category"]`, `readOnlyPaths: ["metadata.version"]`).
- **Advanced** — `template-diagnostics`, `runtime-payload`, `runtime-rules` — **wszystkie `writablePaths: []`**
  (w 100% read-only / informacyjne).

W panelu admina **Wizard** uruchamia się przyciskiem „Run setup again" (nie jest zakładką), a **Visual** /
**Advanced** to zakładki w prawym panelu. Brak kart wariantu (jeden wariant).

### 1.3 Logika renderu i resolucji (kluczowa dla zrozumienia całej fikstury)

- **Renderer** (`TemplateSectionBlock`): jeśli `resolved.error` LUB brak rozwiązanych bloków → render
  `TemplateSectionPlaceholder` (stan `data-template-section-state="empty"`). Dopiero przy faktycznych
  `resolved.blocks` → stan `ready` (z `data-template-section-category` / `-version` i mapowaniem podbloków).
- **Etykieta** (`resolveTemplateLabel`): priorytet `metadata.previewLabel` → `templateName` → „Template section".
- **Komunikat placeholdera** (`resolvePlaceholderMessage`): pusty `templateId` → „Select a widget template to
  render here."; inaczej zależnie od `resolved.error`: `template_missing` → „Template not found…",
  `template_unpublished` → „Template is not published yet.", `template_loop` → „Template loop detected…",
  brak błędu → „This template has no blocks yet.".
- **Runtime** (`templateSectionRuntime.ts`): pusty id → `blocks:[]`; id w stosie → `template_loop`; brak
  szablonu → `template_missing`; **`!preview && status !== "published"` → `template_unpublished`**; inaczej
  bloki szablonu.
- **Trasa publiczna** (`publicSite.tsx` l. 1370) renderuje **opublikowane dane strony** z `preview=false`.
  Wniosek: **szablon draft na publicznej stronie zawsze da `template_unpublished`** (placeholder), a stan
  `ready` jest osiągalny tylko dla **opublikowanego** szablonu wskazanego w **opublikowanych** danych strony.

---

## 2. Stan fikstury w momencie audytu

| Aspekt | Wartość zaobserwowana |
|--------|------------------------|
| Status strony fikstury | **Published** |
| `templateId` w danych opublikowanych | **pusty** (`""`) |
| Render na froncie | placeholder, `data-template-section-state="empty"` |
| Stan edytora przy wejściu | „Setup complete" → zakładka **Visual**, „No template selected yet…" |
| Wskaźnik zapisu przy wejściu | **„All changes saved"** (brak „Unsaved changes") — czysta fikstura |

**Lista szablonów (`GET /admin/api/widget-templates` → HTTP 200, 7 pozycji, z zalogowanej sesji):**

| Nazwa | Status | Liczba bloków | Category | Opis |
|-------|--------|---------------|----------|------|
| Template-420f0b92-6507-49b0-84bd-339f0c6eff6b | `draft` | 0 | Content | „Reusable hero layout" |
| My Test Template | `draft` | 0 | Layout | — |
| test (`5361ca2a-…2718c`) | `draft` | **1** | Layout | — |
| main-footer (`4053fd91-…a6fb`) | `draft` | **1** | Layout | „Footer all pages" |
| test2 | `draft` | 0 | Layout | — |
| test1 | `draft` | 0 | Layout | — |
| test (drugi wpis, inny id) | `draft` | **1** | layout | — |

**Wniosek (twardy fakt z API):** **0 opublikowanych szablonów** (7/7 to `draft`); część jest pusta (0 bloków).
To wprost zamyka możliwość weryfikacji stanu `ready` na froncie (§7) i czyni fiksturę **placeholder-only**.

---

## 3. Co przetestowano w tym audycie (zakres realnych interakcji)

**Wizard:** otwarcie selektora i odczyt **wszystkich 8 opcji**; wybór `test` (1 blok w bazie); wybór
`main-footer` (1 blok + opis); reset „No template"; ponowny wybór `test`; przycisk „Finish setup and open
Visual"; obserwacja karty szablonu (nazwa + badge statusu + opis) i panelu „Live preview".

**Visual:** sekcja „Active template" (pusta vs wypełniona); wpis do `Preview label` z obserwacją etykiety na
kanwie; wpis do `Category` z obserwacją (braku) efektu na kanwie i atrybutach DOM; weryfikacja, że pole
`version` **nie jest renderowane** w panelu Visual; obserwacja współdzielonych sekcji „Block layout" /
„Device visibility".

**Advanced:** odczyt wszystkich 6 wierszy diagnostyki + „Resolved content summary" + alert „Runtime
behavior"; weryfikacja, że tryb **nie ma żadnej edytowalnej kontrolki** (`input/textarea/select/button`
liczone = 0); weryfikacja przeniesienia `Preview label` z Visual (persystencja in-memory).

**Dowód placeholder-only (mocniejsze evidence):** dla **każdego** wybranego szablonu — także tych z
**1 blokiem w bazie** (`test`, `main-footer`) — kanwa pozostaje `state="empty"` z komunikatem „This template
has no blocks yet."; potwierdzone odczytem `data-template-section*` z DOM oraz lekturą kodu edytora
(każdy wybór ustawia `resolved: undefined`).

**Frontend (public):** render placeholdera, atrybuty `data-template-section*`, brak overflow na 1280 i 375 px,
widoczność widgetu, konsola.

**Higiena:** reload + akceptacja `beforeunload` → odrzucenie zmian, weryfikacja powrotu do stanu wyjściowego.

---

## 4. Co DZIAŁA — szczegóły zweryfikowane w DOM

### 4.1 Wizard

| Kontrola / ścieżka | Test | Efekt |
|--------------------|------|-------|
| Selektor „Template selection" | otwarcie listy | dokładnie **8 opcji**: „No template" + 7 szablonów z API ✓ |
| Wybór `test` | klik opcji | `data-template-section` = `5361ca2a-…2718c`, etykieta kanwy „test"; `hasUnsaved=true` (in-memory) ✓ |
| Karta wybranego szablonu | po wyborze `test` | nazwa „test" + **badge „Draft"** ✓ |
| Karta z opisem | wybór `main-footer` | nazwa „main-footer" + badge „Draft" + **opis „Footer all pages"** ✓ |
| Reset „No template" | klik „No template" | `templateId` → `""`, etykieta → „Template section", komunikat → „Select a widget template to render here.", combobox → „No template" ✓ |
| „Finish setup and open Visual" | klik | przełącza na zakładkę **Visual** (`[selected]`), niesie wybór → „Active template: test" ✓ |
| „Live preview" (panel Wizard) | obserwacja | wiernie odbija stan kanwy (zawsze placeholder — patrz N1) ✓ |

### 4.2 Visual

| Kontrola / ścieżka | Test | Efekt |
|--------------------|------|-------|
| „Active template" (summary, read-only) | brak / wybór | bez szablonu „No template selected yet. Run setup…"; po wyborze „Active template: test" ✓ |
| `Preview label` → `metadata.previewLabel` | wpis „Audyt Podglad 2905" | **etykieta kanwy aktualizuje się na żywo** (środkowy wiersz placeholdera: „test" → „Audyt Podglad 2905") — potwierdza priorytet `resolveTemplateLabel` ✓ |
| `Category` → `metadata.category` | wpis „Marketing-AUDYT" | input **utrzymuje** wartość; persystuje między zakładkami (patrz N3 co do braku efektu) ✓ |
| Lista inputów template-section w Visual | inspekcja | dokładnie **2**: „Preview label", „Category" (poza nimi tylko globalny „Find components…") ✓ |

### 4.3 Advanced (w 100% read-only)

Po wpisaniu w Visual `Preview label = "Audyt Podglad 2905"` i wybraniu `test`, diagnostyka pokazała:

| Wiersz | Wartość | Komentarz |
|--------|---------|-----------|
| Template selection | `test` | ✓ |
| Template name | `test` | ✓ |
| **Preview label** | **`Audyt Podglad 2905`** | **przeniesione z Visual → persystencja in-memory potwierdzona** ✓ |
| Version | `Not configured` | (jedyne miejsce, gdzie `version` w ogóle się pojawia — read-only) |
| Resolved blocks | `0 blocks` | (mimo 1 bloku w bazie — patrz N2) |
| Resolution error | `No resolution problem detected.` | (dla szablonu draft — patrz N4) |
| Resolved content | `No content blocks resolved.` | spójne z brakiem resolucji w edytorze |
| Runtime behavior (alert) | „This widget renders the selected template blocks in order. Draft templates will only render in preview mode." | poprawnie opisuje regułę draft/preview |

**Liczba edytowalnych kontrolek widget-specyficznych w Advanced = 0** (potwierdzone `eval`-em). Zgodne z
kontraktem (`writablePaths: []` we wszystkich trzech sekcjach Advanced).

### 4.4 Frontend (public `/ctr-template-section-2305`)

| Test | Wynik |
|------|-------|
| HTTP | `200`, tytuł „Contract Test - template-section" ✓ |
| `data-template-section` | `""` (pusty `templateId` w danych opublikowanych) ✓ |
| `data-template-section-state` | `empty` ✓ |
| `data-template-section-category` / `-version` | **nieobecne** (renderowane wyłącznie w stanie `ready`) ✓ — spójne z kodem renderera |
| Treść placeholdera | „Template section" (fallback label) + „Select a widget template to render here." ✓ |
| Overflow poziomy @1280 | brak (`scrollWidth == innerWidth == 1280`) ✓ |
| Overflow poziomy @375 | brak (`scrollWidth == innerWidth == 375`), widget widoczny (szer. 375) ✓ |
| Konsola frontu | **0 błędów, 0 ostrzeżeń** ✓ |

### 4.5 Konsola admina

0 błędów / 0 ostrzeżeń (jedyny wpis: info React DevTools).

---

## 5. Co NIE działa / jest mylące / wymaga uwagi (niuanse UX/UI)

| # | Obszar | Obserwacja |
|---|--------|-----------|
| **N1 — edytor NIGDY nie renderuje realnej zawartości szablonu (placeholder-only) + mylący opis** | Edytor / preview | Każdy wybór szablonu w `TemplateSelectField` ustawia `resolved: undefined` (kod l. 80, 89), więc ani Wizard, ani Visual, ani „Live preview" nie rozwiązują bloków. **Dowód:** po wyborze `test` (1 blok w bazie) i `main-footer` (1 blok) kanwa pozostała `state="empty"` z „This template has no blocks yet." — nigdy `ready`. Mimo to opis panelu Wizard obiecuje „Reflects the current Wizard state through the **shared widget renderer**", co sugeruje pełny render, którego nie ma. **Mylący opis + realne ograniczenie podglądu.** |
| **N2 — Advanced „Resolved blocks: 0" mimo bloków w bazie** | Advanced / diagnostyka | Diagnostyka raportuje **stan in-memory edytora** (nierozwiązany, bo N1), a nie to, co wyrenderuje runtime. Dla `test`/`main-footer` (po 1 bloku w API) Advanced pokazuje „0 blocks" i „No content blocks resolved.". Sekcja reklamowana jako „for troubleshooting" **nie pomaga** zdiagnozować realnego renderu. |
| **N3 — `Category` nie ma żadnego widocznego efektu w adminie i nie jest echo-wana w Advanced** | Visual / Advanced | `metadata.category` renderuje się **tylko** w stanie `ready` (jako chip obok bloków), do którego edytor nie dochodzi (N1). W placeholderze `category` nie jest pokazywana (`data-template-section-category` = nieobecny — potwierdzone w DOM po wpisaniu „Marketing-AUDYT"). Dodatkowo Advanced **nie wystawia** `category` (są tylko Template selection/name, Preview label, Version, Resolved blocks, Resolution error). Użytkownik wpisuje `Category` „w ciemno". |
| **N4 — wewnętrzna sprzeczność diagnostyki dla szablonu draft** | Advanced / diagnostyka | „Resolution error: **No resolution problem detected.**" dla szablonu `test` o statusie **draft**, podczas gdy sąsiedni alert „Runtime behavior" ostrzega, że **draft wyrenderuje się tylko w preview**. Diagnostyka daje fałszywe „wszystko OK", ignorując bramkę publikacji (na publicznej trasie ten sam draft dałby `template_unpublished`). |
| **N5 — `metadata.version`: niespójność kontrakt ↔ UI; brak edytora w ogóle** | Kontrakt ↔ UI | Kontrakt deklaruje `metadata.version` jako `readOnlyPath` sekcji Visual `presentation-fields`, ale **pole nie jest renderowane w Visual** (potwierdzone: panel Visual nie zawiera „Version"). Pojawia się **tylko** w Advanced jako read-only („Not configured"). `version` jest read-only **we wszystkich trybach** → **nie istnieje żaden edytor do jego ustawienia**; wartość może trafić tu wyłącznie z surowych danych / normalizacji. |
| **N6 — (współdzielone, poza kontraktem template-section) „Visibility summary: Hidden on all devices" przy realnie widocznym widgecie** | Kontrolka współdzielona | Sekcja „Device visibility" (Visual) ma przełączniki Desktop/Tablet/Mobile z etykietą „Hidden" (wszystkie niezaznaczone), a Advanced podsumowuje „Shown on: **Hidden on all devices**" — mimo że widget **realnie renderuje się** na froncie (desktop 1280 i mobile 375). Wskazuje na możliwą inwersję/niejednoznaczność semantyki etykiet w warstwie współdzielonej. **Nie jest to problem renderera `template-section`** i nie był dalej drążony. |

**Nie wykryto** żadnego błędu konsoli (admin i front: 0/0), żadnego crasha ani twardego buga renderowania.
Wszystkie kontrolki Wizard/Visual reagują i (tam, gdzie ma to sens — etykieta z `Preview label`) aktualizują
podgląd na żywo. „Twarde" usterki to wyłącznie **mylące podglądy/diagnostyka i niespójności kontrakt↔UI**
opisane wyżej, nie błędy blokujące.

---

## 6. Porównanie Admin (kanwa) vs Frontend

| Aspekt | Admin (kanwa/preview) | Frontend (public) | Zgodność |
|--------|-----------------------|-------------------|----------|
| Render pustego `templateId` | placeholder „Select a widget template…" | placeholder „Select a widget template…" | ✓ Zgodne |
| `data-template-section-state` | `empty` | `empty` | ✓ Zgodne |
| Etykieta z `previewLabel` | aktualizuje etykietę placeholdera na żywo | (niezweryfikowane — nie publikowano; danych opublikowanych nie zmieniałem) | n/d |
| `data-template-section-category` / `-version` | nieobecne (placeholder) | nieobecne (placeholder) | ✓ Zgodne |
| Realna zawartość szablonu (bloki) | **nigdy** nie renderowana w edytorze (N1) | nie do zweryfikowania (brak published template) | — (oba ograniczone) |
| Overflow poziomy | brak | brak (1280 i 375) | ✓ Zgodne |
| Widoczność widgetu | widoczny w preview | widoczny (desktop + mobile) | ✓ Zgodne |

**Wniosek:** w jedynym dostępnym do weryfikacji stanie (placeholder / pusty `templateId`) admin i front są
spójne. Stanu `ready` (populated) nie da się porównać z powodu fixture-gap (§7).

---

## 7. Czego NIE dało się zweryfikować (uczciwe ograniczenia — z nazwą kontrolki i powodem)

- **Stan `ready` na froncie (rozwiązany szablon z realnymi blokami) — NIE-DO-ZWERYFIKOWANIA.**
  **Powód (dwie niezależne bramki):** (1) w API **0 opublikowanych szablonów** (7/7 `draft`), a publiczna
  trasa renderuje z `preview=false` → każdy draft daje `template_unpublished` (placeholder „Template is not
  published yet."); (2) opublikowane dane strony fikstury mają **pusty `templateId`**, więc resolucja nawet
  nie startuje. Domknięcie wymagałoby **opublikowania szablonu** ORAZ **ustawienia + opublikowania**
  `templateId` na współdzielonej fiksturze — **świadomie pominięte** (mutacja shared fixture). To klasyczny
  **fixture-gap**.
- **Komunikat `template_unpublished` na żywym froncie — NIE-DO-ZWERYFIKOWANIA bez publikacji.**
  Logikę potwierdziłem lekturą `templateSectionRuntime.ts` + `publicSite.tsx`, ale wywołanie jej na żywej
  publicznej stronie wymaga opublikowanej strony z `templateId` wskazującym na szablon draft — czyli
  ponownie mutacji fikstury.
- **Stany błędów `template_missing` / `template_loop` — NIE-DO-ZWERYFIKOWANIA w tej fiksturze.**
  `template_missing` wymaga opublikowanej strony wskazującej na **usunięty** szablon; `template_loop` —
  szablonu zawierającego `template-section` z odwołaniem do samego siebie (rekurencja). Żadnego z tych
  scenariuszy nie da się odtworzyć bez preparowania danych/publikacji.
- **Pole `metadata.version` — NIE-DO-USTAWIENIA z UI (nie tylko nie-do-zweryfikowania).** Jak w N5: brak
  jakiegokolwiek edytowalnego kontrolera dla `version` w którymkolwiek trybie. Nie mogłem wprowadzić
  wartości i zaobserwować jej propagacji.
- **Trwałość po zapisie / propagacja `previewLabel`+`category` na front — świadomie pominięte.** Nie
  klikałem „Save draft"/„Publish", więc nie weryfikowałem persystencji po przeładowaniu ani propagacji na
  opublikowaną stronę. (Zweryfikowano natomiast spójność w obrębie sesji Wizard→Visual→Advanced.)
- **Responsywność szablonu w stanie populated** — niemożliwa (brak danych do renderu `ready`).
- **Współdzielone sekcje wrappera (Block layout, Device visibility)** — poza zakresem kontraktu
  `template-section`; obserwacja N6 odnotowana, ale nie drążona ani nie modyfikowana trwale.

---

## 8. Podsumowanie

- **template-section to fikstura placeholder-only — i tym razem jest to udowodnione, nie tylko stwierdzone.**
  Edytor z założenia nie rozwiązuje bloków (`resolved: undefined` przy każdym wyborze), co potwierdziłem
  realnie: dwa szablony z **1 blokiem w bazie** (`test`, `main-footer`) i tak dają kanwę `state="empty"` z
  „This template has no blocks yet.". API pokazuje **0/7 opublikowanych** szablonów, a opublikowana strona
  ma **pusty `templateId`** — stąd front renderuje placeholder.
- **Co działa (potwierdzone klikaniem + DOM):** pełny selektor szablonów (8 opcji), badge statusu „Draft",
  opis w karcie, reset „No template", „Finish setup and open Visual" z carry-over, `Preview label`
  aktualizujący etykietę kanwy na żywo, `Category` przyjmujące/utrzymujące wartość, pełna read-only
  diagnostyka Advanced wiernie odbijająca stan in-memory (z persystencją `previewLabel` Visual→Advanced),
  poprawny render placeholdera na froncie bez overflow (1280 i 375), 0/0 w konsoli admina i frontu.
- **Najważniejsze realne znaleziska:** N1 (placeholder-only + mylący opis „shared widget renderer"),
  N2 (Advanced „0 blocks" mimo bloków w bazie), N4 (sprzeczność „No resolution problem detected." dla
  draftu), N5 (`version` w kontrakcie/Visual readOnly, ale nierenderowane i nieedytowalne nigdzie),
  N3 (`category` bez widocznego efektu i bez echa w Advanced).
- **Nie-do-zweryfikowania (fixture-gap, nazwane w §7):** stan `ready` na froncie oraz komunikaty
  `template_unpublished` / `template_missing` / `template_loop` — wszystkie wymagają publikacji szablonu i/lub
  mutacji współdzielonej fikstury, czego świadomie nie wykonałem.
- **Higiena:** po testach `reload` + akceptacja `beforeunload` → fikstura wróciła do stanu wyjściowego
  (kanwa „Select a widget template to render here.", brak „Unsaved changes"). Nie klikano Save/Publish.

---

## 9. Higiena fixture (cleanup)

Wszystkie interakcje były **in-memory** — po pierwszej edycji panel pokazywał „Unsaved changes". Po testach
wykonałem `reload`; przeglądarka wyświetliła dialog `beforeunload` („Leave site?"), który **zaakceptowałem**
(`dialog-accept`), aby odrzucić niezapisane zmiany. Po przeładowaniu zweryfikowałem `eval`-em:
`data-template-section-state="empty"`, `templateId=""`, etykieta „Template section", komunikat „Select a
widget template to render here.", **brak „Unsaved changes"** (status „All changes saved"). Fikstura w stanie
pierwotnym; **nie** klikano Publish/Save.

---

## 10. Screenshoty (etykiety lokalne)

> W tym audycie **nie** zapisywałem zrzutów PNG — całą weryfikację oparłem o snapshoty dostępności
> (`snapshot`) oraz inspekcję DOM/API (`eval`). Ewentualne pliki PNG byłyby **wyłącznie lokalnymi
> etykietami** przechwyceń w `.playwright-cli/` (katalog ignorowany przez Git), nie są wymaganym evidence
> i nie zostały dołączone do repo.
