# RAPORT: Form Embed Widget — Finalny status po TASK-269

> **Status:** Zamknięty po implementacji i rerunie owner test lanes
> **Data zamknięcia:** 2026-05-18
> **Owner task:** `TASK-269`
> **Shared follow-ups:** `TASK-310`, `TASK-311`

---

## 1. Zakres zamknięcia

Raport został zamknięty po wdrożeniu zmian w:

- `core/widgets/core/formEmbed.tsx`
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
- `core/widgets/core/formRuntimeScript.ts`
- `core/services/forms/formRuntimeResolver.ts`
- testach Vitest/Bun dla renderera, runtime scriptu, resolvera oraz konsumenta
  resolved-data

`TASK-256` pozostaje poza implementacją widget-local; shared rows U3/U4 zostały
utrzymane jako shared scope przez `TASK-310`, a przyszłe rozszerzenie modelu
pól Forms zostało nazwane fizycznie w `TASK-311`.

## 2. Finalna macierz findings

| ID | Status | Owner | Dowód / uwaga końcowa |
|---|---|---|---|
| C1 | fixed | TASK-269-03 | Przywrócono truthful contract: current source-of-truth docs opisują tylko `standard`, zamiast obiecywać nieistniejące `card` / `inline`. |
| C2 | deferred | TASK-311 | Obecny model Forms nadal nie wspiera `radio`; Form Embed renderuje unsupported diagnostic dla legacy/runtime payloadów zamiast cichego fallbacku. |
| C3 | fixed | TASK-269-01 | Wizard / Visual / Advanced nie są już aliasami jednego widoku; każdy ma osobny zakres odpowiedzialności. |
| C4 | fixed | TASK-269-01 | Editor pokazuje runtime resolver error oraz selected-form diagnostics bez otwierania preview. |
| W1 | deferred | TASK-311 | `number`, `time`, `hidden`, `file`, `range`, `rating` pozostają future Forms field-model scope; current widget renderuje unsupported diagnostic. |
| W2 | fixed | TASK-269-05 | Success behavior jest jawnie sterowalne (`hide`, `reset`, `keep`) i pokryte DOM runtime tests. |
| W3 | fixed | TASK-269-05 | Submit przechodzi w busy/loading state z przywróceniem stanu po zakończeniu. |
| W4 | fixed | TASK-269-03 | Layout ma niezależne section padding controls zamiast twardego `px-4`. |
| W5 | fixed | TASK-269-03 | Section vertical padding i internal field gap są niezależnymi controlami. |
| W6 | fixed | TASK-269-03 | `borderColor` jest konsekwentnie używany przez rendered controls. |
| W7 | fixed | TASK-269-03 | Label color ma własny bounded style field. |
| W8 | fixed | TASK-269-03 | Helper color ma własny bounded style field. |
| W9 | fixed | TASK-269-03 | Submit button background/text color są kontrolowane przez widget-local style fields. |
| W10 | fixed | TASK-269-03 | Tytuł ma bounded color / size / weight contract. |
| W11 | fixed | TASK-269-05 | Form Embed runtime mostkuje istniejący backend-owned captcha + nonce contract przez safe `siteKey` / `action` projection. |
| W12 | fixed | TASK-269-01 | Editor pokazuje field count i typy wybranego formularza. |
| W13 | fixed | TASK-269-04 | Back/Next labels są konfigurowalne. |
| W14 | fixed | TASK-269-04 | Multi-step progress indicator jest renderowany i aktualizowany w runtime. |
| W15 | verified-current | TASK-269-05 | Route owner już mapuje `successRedirectUrl -> runtime.redirectUrl`; runtime redirect path został zweryfikowany testem. |
| W16 | fixed | TASK-269-04 | Saved progress ma TTL i przeterminowany payload jest usuwany. |
| W17 | fixed | TASK-269-02 | Checkbox inline label positioning działa zgodnie z current field style contract. |
| U1 | fixed | TASK-269-01 | Tryby edytora mają rozdzielone role i własne sekcje diagnostyczne / operacyjne. |
| U2 | fixed | TASK-269-01 | Editor pokazuje field summary bez wychodzenia z widget editor. |
| U3 | fixed via shared scope | TASK-310 | Form Embed konsumuje shared color helper; CSS-variable swatch drift jest naprawiony dla tego widgetu. |
| U4 | fixed via shared scope | TASK-310 | `borderColor` ma clear control w Form Embed dzięki shared color-field contract. |
| U5 | fixed | TASK-269-01 | Draft / archived status jest widoczny w diagnostics i ostrzeżeniach. |
| U6 | fixed | TASK-269-01 | Multi-step / save-progress metadata jest widoczne w selected-form diagnostics. |
| U7 | fixed | TASK-269-04 | Multi-step navigation / submit behavior ma osobną sekcję i nie jest już „ukrytym” kontraktem. |
| U8 | fixed | TASK-269-04 | Editor wystawia `backLabel` i `nextLabel`. |
| U9 | fixed | TASK-269-01 | No-form CTA i selected-form empty state są jawne. |
| U10 | fixed | TASK-269-01 | Editor pokazuje normalization hints dla pustych `submitLabel` / `successMessage`. |
| A1 | fixed | TASK-269-03 | Wrapper sekcji ma accessible naming. |
| A2 | fixed | TASK-269-03 | Heading level jest bounded layout control, zamiast twardego `<h3>`. |
| A3 | fixed | TASK-269-02 | `label` i `input` są programowo połączone przez `htmlFor` / `id`. |
| A4 | fixed | TASK-269-02 | Controls mają stabilne DOM ids. |
| A5 | fixed | TASK-269-02 | Hidden-label controls dostają `aria-label`. |
| A6 | fixed | TASK-269-02 | Required fields mają `aria-required="true"`. |
| A7 | fixed | TASK-269-02 | Helper text jest połączony przez `aria-describedby`. |
| A8 | fixed | TASK-269-05 | Success/error nodes są live regions. |
| A9 | fixed | TASK-269-05 | Submit button ustawia i czyści `aria-busy`. |
| A10 | not-applicable-current-contract | TASK-269-02 / TASK-311 | Obecny Forms model nie wystawia grouped checkbox/radio controls; grouped semantics wrócą dopiero z field-model expansion. |

## 3. Dowód owner test lanes

### Focused Vitest lanes

- `tests/vitest/widgets/formEmbed.test.tsx`
- `tests/vitest/widgets/formRuntimeScript.test.ts`
- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `tests/vitest/forms/formRuntimeResolver.test.ts`
- `tests/vitest/content/detailPageBindingResolver.test.ts`

### Bun-owned runtime / security lanes

- `tests/integration/routes/forms.test.ts`
- `tests/integration/runtime/detail-page-runtime-lite.test.ts`
- `tests/security/codersoSecurityGate.test.ts`

### DB-backed lane

- `tests/unit/forms/submissionService.test.ts`

Ta lane wymaga `DATABASE_URL`. Jeśli środowisko lokalne nie ma dostępnej bazy,
suite może zostać uruchomiona tylko w skip-mode z odnotowanym blockerem
środowiskowym; nie jest to dowód zastępujący route/security lanes.

## 4. Parity note

Admin editor i public runtime są zsynchronizowane na poziomie current contract:

- selected form status / access / field summary
- field ids / labels / helper wiring
- multi-step navigation and progress
- submit success / error / redirect flow
- safe public captcha + nonce bridge

## 5. Named deferred scope

- `TASK-310`: shared color-field helper/adoption work outside widget-local Form
  Embed ownership
- `TASK-311`: future Forms field-model expansion for unsupported field types

No other anonymous “future” buckets remain in this report.
