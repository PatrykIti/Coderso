# Sesja audytu kontraktu widgetów — 23-05-2026 22:18 → 24-05-2026

## Cel

Ujednolicić kontrakt edytora widgetów (Wizard / Visual / Advanced). Po falach funkcjonalnych TASK-256 ↔ TASK-335 same widgety działają, ale **nazewnictwo sekcji i podział treści między zakładkami rozjechał się** — te same koncepty (np. nagłówek sekcji, kolory, „normalizacja") pojawiają się pod różnymi tytułami w różnych widgetach, a niektóre widgety w ogóle wypadają z konwencji `<WidgetEditorSection>`.

## Co zawiera katalog

| Plik / katalog | Zawartość |
|----------------|-----------|
| `REPORT_COMMON_CONTRACT.md` | **Główny raport** — drift statystyczny, kanon nazw, kanoniczna kolejność sekcji, lista 18 TASK-336+ |
| `REPORT_<WIDGET>_WIDGET.md` (×38) | Raporty per widget — sekcje per zakładka, mapowanie na kanon, kolizje, rekomendacje |
| `screenshots/<widget>-editor.png` (×38) | Pełne zrzuty edytora każdego widgetu na świeżej stronie testowej (mode=visual) |
| `_raw/<widget>.txt` (×38) | Surowe wyciągi DOM z Playwright (sekcje, kontrolki, stan tabs) |
| `README.md` | Ten plik — przewodnik po katalogu |

## Metoda

1. **Świeże, izolowane sesje Playwright** (`contract-admin-pc`, `contract-front-pc`) — niezależne od innych agentów pracujących równolegle na tej maszynie.
2. **38 świeżych stron testowych** w `/admin/pages/` utworzonych przez API `POST /admin/api/pages`, slug `/ctr-<widget>-2305`, każda z jednym blokiem tego typu (`editor.wizardCompleted: true`, `editor.mode: "visual"`).
3. **DOM scan** — Playwright `eval()` po `[data-widget-editor-section]` ekstrahuje id/title/control count + sygnalizuje karty „spoza kontraktu".
4. **Code scan** — parser rekursywny `core/admin/ui/widgets/editors/*Editors.tsx` zlicza wszystkie `title="…"` w głównych funkcjach editora ORAZ w komponentach pomocniczych, które one wywołują.
5. **Crossover** — porównanie DOM × kod wykryło, że kilkanaście widgetów ma helpery renderowane w 3 zakładkach jednocześnie (np. `posts-feed` ma 6 sekcji widocznych w Wizard, Visual i Advanced identycznie).

## Najważniejsze findingi

1. **`Variant`** — 18 wariantów nazewnictwa tego samego konceptu (`Variant`, `Variant and layout structure`, `Variant and pane ratio`, …).
2. **`Section header`** — 4 nazwy (`Header copy` × 8, `Section header` × 6, `Section copy` × 2, `Copy` × 3).
3. **`Colors`** — 9 nazw (`Colors and emphasis`, `Colors and Borders`, `Colors, Borders, Typography`, …).
4. **`Diagnostics`/`Runtime payload`** — 8 wariantów, część w Visual zamiast Advanced.
5. **`Normalization and safeguards`** — 4 warianty, kanon de facto już ustanowiony.
6. **`Raw payload snapshot`** — 16/38 stosuje konwencję, 7 widgetów nie ma w ogóle.
7. **7 widgetów krytycznie naruszających kontrakt** (`tabs`, `accordion`, `posts-feed`, `listing-filters`, `search-box`, `form-embed`, `footer`) — albo używają shared helpers we wszystkich 3 zakładkach (Wizard ≡ Visual ≡ Advanced), albo nie używają `<WidgetEditorSection>` w ogóle.
8. **14 widgetów ma pustą zakładkę Wizard** — pokazują tylko nagłówek + przycisk „Continue to layout and styling". Wymaga decyzji: realny Wizard z stepami albo wycofać zakładkę.

Pełna analiza: `REPORT_COMMON_CONTRACT.md`.

## Następne kroki rekomendowane

1. **Zaakceptować kanon** (§6 raportu wspólnego).
2. **Otworzyć serię TASK-336+** (18 zadań w §7 raportu wspólnego, każde scope'owane do 1–3 widgetów).
3. Dodać runtime guard w `WidgetEditorControls.tsx` (dev-only warning gdy tytuł sekcji odbiega od whitelist).
4. Dodać test integracyjny scanujący wszystkie 38 widgetów (`testing/widgets/contractDriftTest.ts`).

## Sesje Playwright

```
contract-admin-pc  — sesja admin (http://localhost:5173/admin), zalogowana jako patryk.ciechanski@patrykiti.pl
contract-front-pc  — sesja frontend (http://localhost:3000) — przygotowana, nie używana w tej sesji audytu
```

Inny agent równolegle używa sesji `widget-audit` i `widget-front-audit` — nasze sesje są niezależne.
