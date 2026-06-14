# Audyty tasków — index

Katalog na audyty driftu **kontraktów zadań** (`_docs/_TASKS/*`) względem audytów
produktowych (`_docs/AUDIT/*`) i kodu. Konwencja nazw plików:
`<obszar>-<czego-dotyczy>-<data>.md`; raporty zbiorcze z prefiksem `_`.

## 2026-06-11 — drift tasków TASK-420..453 (Pages Editor V2) — ✅ wyremediowane

**Remediacja 2026-06-11:** wszystkie znaleziska HIGH/MEDIUM/LOW z tego audytu zostały
naprawione w plikach `_docs/_TASKS/*` (workflow 10 klastrów + checkery; szczegóły w nagłówku
raportu zbiorczego). Znaleziska „Obalone" pozostały bez zmian — zgodnie z uzasadnieniami
weryfikatorów.

Weryfikacja, czy rodziny remediacyjne TASK-420..TASK-453 są poprawnie rozpisane względem
audytów z 2026-06-10 i kodu (HEAD `ae9dcc44`). Workflow 73 agentów: 34 audytorów per rodzina
+ 3 kontrole przekrojowe + adwersaryjna weryfikacja każdego znaleziska HIGH/MEDIUM.
Wynik: 7× OK, 22× MINOR_DRIFT, 8× DRIFT; 19 znalezisk potwierdzonych (2 HIGH, 12 MEDIUM,
5 LOW), 17 obalonych, 35 LOW niezweryfikowanych.

| Plik | Zakres |
|---|---|
| [`_DRIFT_SUMMARY-tasks-420-453-2026-06-11.md`](./_DRIFT_SUMMARY-tasks-420-453-2026-06-11.md) | **Raport zbiorczy:** werdykty per rodzina, znaleziska HIGH/MEDIUM, ustalenia empiryczne o kodzie, wzorce systemowe, rekomendowana kolejność poprawek |
| [`pages-editor-v2-tasks-cross-families-drift-2026-06-11.md`](./pages-editor-v2-tasks-cross-families-drift-2026-06-11.md) | Szczegóły: rodziny cross-cutting TASK-420..425, 451..453 + kontrole przekrojowe (board-sync / pokrycie / własność) |
| [`pages-editor-v2-tasks-sections-drift-2026-06-11.md`](./pages-editor-v2-tasks-sections-drift-2026-06-11.md) | Szczegóły: rodziny per sekcja TASK-426..436 (hero, content, feature-grid, media-split, timeline, gallery, comparison, faq, testimonials, cta, custom) |
| [`pages-editor-v2-tasks-blocks-drift-2026-06-11.md`](./pages-editor-v2-tasks-blocks-drift-2026-06-11.md) | Szczegóły: rodziny per blok TASK-437..450 (heading, text, button, image, video, list, card, divider, spacer, statistic, quote, container, columns, group) |

Każde znalezisko w plikach szczegółowych zawiera: plik zadania, cytat z taska (claim),
stan rzeczywisty, dowody `plik:linia`, werdykt weryfikatora adwersaryjnego i sugerowaną
poprawkę. Sekcje „Obalone" dokumentują zgłoszenia odrzucone w adwersaryjnej weryfikacji —
celowo zachowane, żeby kolejne audyty nie zgłaszały ich ponownie.
