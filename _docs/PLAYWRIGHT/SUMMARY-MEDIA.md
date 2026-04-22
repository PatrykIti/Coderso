# Raport UX/QA — sekcja Media (Admin UI)

**Data testów:** 2026-04-22
**Tester:** Claude (Playwright CLI)
**Środowisko:** http://localhost:5173/admin/media
**Zalogowany jako:** patryk.ciechanski@patrykiti.pl

---

## Przetestowane przepływy

- Widok siatki (grid) z istniejącymi plikami
- Przełącznik widoku grid/lista
- Filtry typów: All Files, Images, Documents, Audio
- Wyszukiwarka plików po nazwie
- Kliknięcie pliku → panel "Media Details"
- Edycja metadanych (Alt Text, Title, Caption, Original File Name)
- Sekcja File Information (Size, Dimensions, Type, Uploaded)
- Sekcja Usage — gdzie dany plik jest używany
- Przyciski podglądu obrazka (Open in new tab)
- "Copy URL", "Replace", "Delete Permanently"
- "Load More Assets"
- "Media settings" — tryb dostępu Public/Internal
- "Upload New" — natywny file picker
- Checkbox "Open details after upload"

---

## Bugi

### [BUG-1] KRYTYCZNY: Brak przycisku Save i feedbacku po edycji metadanych

**Gdzie:** Panel "Media Details" → sekcja Metadata (Alt Text, Title, Caption, Original File Name)

**Co się dzieje:** Po wypełnieniu pól Alt Text, Title, Caption nie pojawia się żaden przycisk "Save" ani "Update". Metadane zapisują się automatycznie po utracie focusu (autosave na blur), ale nie ma absolutnie żadnego feedbacku wizualnego — brak toast, brak wskaźnika "Zapisano", brak animacji. Użytkownik nie ma pewności czy zmiany zostały zachowane.

Uwaga: autosave DZIAŁA — Alt Text "Placeholder hero image" zapisał się poprawnie (widoczny w nazwie pliku po przeładowaniu). Problem jest wyłącznie w braku potwierdzenia.

**Kierunek naprawy UI:** Dodać toast "Metadane zapisane" lub małą animowaną ikonę "✓ Saved" przy każdym polu które właśnie zapisało swoje dane. Wzorzec: Google Docs / Notion — small "Saved" text w rogu lub inline przy polu.

---

### [BUG-2] ŚREDNI: Dimensions pokazuje "—" zamiast wymiarów obrazka

**Gdzie:** Panel "Media Details" → sekcja File Information → pole "Dimensions"

**Co się dzieje:** Dla plików PNG pole Dimensions wyświetla myślnik zamiast rozdzielczości (np. 415×66). Wymiary są dostępne — potwierdziło to kliknięcie "Open in new tab" które otwiera plik z tytułem strony "652f0989...png (415×66)".

**Kierunek naprawy UI:** Przy zapisie pliku lub przy otwarciu panelu szczegółów — pobrać wymiary obrazka i wyświetlić w sekcji File Information. Format: `415 × 66 px`.

---

### [BUG-3] ŚREDNI: Filtr Documents/Audio — brak empty state, "Load More" nadal widoczny

**Gdzie:** Lista plików → filtry zakładek Documents, Audio

**Co się dzieje:** Po przełączeniu na "Documents" lub "Audio" (gdzie nie ma żadnych plików) obszar siatki jest pusty — brak komunikatu "Brak dokumentów" czy "No audio files yet". Jednocześnie przycisk "Load More Assets" pozostaje widoczny mimo że nic nie ma do załadowania.

**Kierunek naprawy UI:** Gdy filtr nie zwraca wyników — pokazać empty state z ikoną i tekstem, np. "Brak plików tego typu. Przeciągnij pliki tutaj lub kliknij Upload." oraz ukryć przycisk "Load More Assets".

---

### [BUG-4] ŚREDNI: "Copy URL" — brak feedbacku po skopiowaniu

**Gdzie:** Panel "Media Details" → przycisk "Copy URL"

**Co się dzieje:** Kliknięcie "Copy URL" nie daje żadnego feedbacku — brak toast "URL skopiowany", brak zmiany ikony, brak zmiany tekstu przycisku. Użytkownik nie wie czy URL trafił do schowka.

**Kierunek naprawy UI:** Standardowy pattern: po kliknięciu przycisk zmienia się na "Copied!" przez ~2 sekundy (zmiana tekstu + ikona checkmark), po czym wraca do "Copy URL". Alternatywnie: toast w rogu ekranu.

---

### [BUG-5] NISKI: "Load More Assets" widoczny gdy wszystkie pliki załadowane

**Gdzie:** Lista plików → dół strony

**Co się dzieje:** Przycisk "Load More Assets" jest widoczny nawet gdy wszystkie dostępne pliki zostały już wyświetlone. Po kliknięciu nic się nie zmienia (nie pojawia się nowe pliki), ale przycisk zostaje.

**Kierunek naprawy UI:** Po załadowaniu ostatniej strony — ukryć przycisk lub zastąpić go komunikatem "Wszystkie pliki załadowane". Opcjonalnie: pokazać liczbę plików ("Wyświetlono 7 z 7").

---

### [BUG-6] NISKI: Usage links — kliknięcie nie nawiguje do miejsca użycia

**Gdzie:** Panel "Media Details" → sekcja "Usage (3 locations)" → przyciski z miejscami użycia

**Co się dzieje:** Sekcja Usage poprawnie wyświetla listę miejsc gdzie plik jest użyty (np. "Homepage Hero Section — Landing page module"). Kliknięcie na takie miejsce nie nawiguje do edytora tej strony/posta — strona pozostaje na /admin/media.

**Kierunek naprawy UI:** Każde usage entry powinno być linkiem/przyciskiem który otwiera edytor danego zasobu (strony, posta, widgetu). Jeśli nie ma jeszcze routingu — jako minimum: pokazać tooltip z pełną ścieżką lub wyłączyć wizualny "cursor: pointer" żeby nie sugerować klikalności.

---

## Problemy UX

### [UX-1] Nazwy plików to UUID — nieczytelne w siatce i na liście

**Gdzie:** Cała biblioteka mediów — siatka plików, panel Details

**Problem:** Wszystkie pliki mają nazwy UUID (np. `652f0989-97b0-4306-b681-8c3edc4a9005.png`). Oryginalna nazwa jest przechowywana w polu "Original File Name" w metadanych (np. "image.png"), ale nie jest wyświetlana w siatce ani jako główna nazwa w panelu. Pole "Title" w metadanych domyślnie zawiera UUID zamiast oryginalnej nazwy.

**Kierunek naprawy UI:** W siatce — wyświetlać Original File Name lub Title (jeśli jest ustawiony) zamiast UUID. W panelu Details — pole Title powinno domyślnie przyjmować wartość Original File Name przy pierwszym uploadzie. UUID może być widoczny jako "Storage ID" w sekcji technicznej (collapsed).

---

### [UX-2] Alt Text — brak ostrzeżenia o braku dla pliku graficznego

**Gdzie:** Panel "Media Details" → pole "Alt Text"

**Problem:** Alt Text jest kluczowy dla dostępności (screen readery) i SEO. Pole jest puste dla większości plików, ale nie ma żadnego wskaźnika że to problem — brak badge "Missing alt text", brak wizualnego wyróżnienia pola.

**Kierunek naprawy UI:** Przy otwieraniu Details dla obrazka bez Alt Text — wyróżnić pole wizualnie (np. żółte/pomarańczowe obramowanie, badge "Accessibility: missing alt text"). Opcjonalnie: w siatce pokazać ikonę ostrzeżenia na miniaturce pliku bez Alt Text.

---

### [UX-3] Brak multi-select / bulk delete / bulk download

**Gdzie:** Siatka plików

**Problem:** Nie można zaznaczyć wielu plików jednocześnie. Brak checkboxów przy plikach, brak "Select all", brak paska akcji grupowych (bulk delete, bulk move, bulk download). Każdy plik musi być usunięty osobno.

**Kierunek naprawy UI:** Dodać tryb multi-select (np. przez Checkbox widoczny po hover lub przez dedykowany przycisk "Select" w toolbarze). Po zaznaczeniu ≥1 pliku — pojawia się pasek akcji z "Usuń zaznaczone (X)", "Pobierz zaznaczone". Wzorzec: Google Drive, Cloudinary.

---

### [UX-4] Drag-and-drop zona i siatka plików — brak wizualnego rozróżnienia

**Gdzie:** Główny obszar biblioteki

**Problem:** Strefa drag-and-drop ("Drag and drop files here...") i siatka istniejących plików są w tym samym obszarze bez wyraźnej granicy. Przy mniejszym ekranie lub dużej liczbie plików strefa upload może być trudna do odnalezienia.

**Kierunek naprawy UI:** Wyraźnie oddzielić strefę uploadu od siatki plików. Opcja 1: upload zona na górze (collapsed do paska z przyciskiem expand), pliki poniżej. Opcja 2: upload strefa jako floating button lub dedicated sidebar. Wzorzec: Cloudinary — upload bar u góry, grid poniżej.

---

### [UX-5] "Open details after upload" checkbox — niewidoczne miejsce w UI

**Gdzie:** Toolbar → mały checkbox między filtrami a widokiem

**Problem:** Checkbox "Open details after upload" jest małym elementem w pasek filtrów — łatwy do przeoczenia. Użytkownik uploadując pliki masowo może nie wiedzieć że ta opcja istnieje.

**Kierunek naprawy UI:** Przenieść tę opcję do "Media settings" jako trwałe ustawienie (zapisywane per-user lub globalnie), albo wyświetlić ją jako opcję w upload dialog po wybraniu pliku.

---

## Co działa dobrze ✓

| Funkcja | Ocena |
|---|---|
| Grid z miniaturkami i metadanymi (rozmiar, typ) | Czytelny, szybki przegląd |
| Wyszukiwarka real-time po nazwie | Działa poprawnie i szybko |
| Filtr typów (All, Images, Documents, Audio) | Logiczny podział |
| Przełącznik widok grid/lista | Dostępny |
| Autosave metadanych na blur | Dane są zapisywane (brak tylko feedbacku) |
| Sekcja "Usage" z miejscami użycia pliku | Bardzo przydatna funkcja — unikalna wartość |
| Przycisk "Open in new tab" otwiera oryginalny plik | Szybki podgląd pełnej wersji |
| "Delete Permanently" — wyraźna etykieta z "Permanently" | Komunikuje nieodwracalność akcji |
| "Replace" — możliwość podmiany pliku bez zmiany ID | Przydatne dla utrzymania istniejących powiązań |
| Media settings — kontrola dostępu Public/Internal | Dobra kontrola bezpieczeństwa |
| "Upload New" → bezpośredni natywny file picker | Szybka ścieżka bez zbędnych kroków |
| Checkbox "Open details after upload" | Przydatna opcja dla edytorów dbających o metadane |
| Badge typów (PNG, image) | Czytelne oznaczenie formatu |
| Informacje o dacie uploadu | Przydatny kontekst historyczny |

---

## Screenshoty

- `media-library-grid.png` — widok siatki z 7 plikami
- `media-library-list.png` — widok listy (po przełączeniu)
- `documents-filter-no-empty-state.png` — filtr Documents bez empty state (bug)
- `media-details-panel.png` — panel szczegółów z Metadata, File Info, Usage
- `metadata-no-save-button.png` — edycja Alt Text bez przycisku Save (bug)
- `media-settings.png` — dialog ustawień dostępu (Public/Internal)
- `media-grid-final.png` — końcowy stan biblioteki
