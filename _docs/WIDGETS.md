# Widgets Spec (v1)

Specyfikacja bazowych widgetow core i modelu konfiguracji, ktory musi byc
stosowany rowniez przez widgety z pluginow i addonow.

## Cele

- Latwy start dla nietechnicznych uzytkownikow.
- Spolny UX konfiguracji dla wszystkich widgetow.
- Wersja v1 core pozwala zbudowac pelnoprawna strone.

---

## Lista widgetow w core v1

Wymagane:
- Hero section
- Flexible timeline/compare (bez dat; porownanie etapow/procesu)
- Newsletter signup
- Kontakt (formularz + dane kontaktowe)
- Menu/Nawigacja
- Stopka (linki, dane, social)

---

## Model konfiguracji (obowiazkowy)

Kazdy widget musi wspierac 3 tryby konfiguracji:

1) Wizard (kreator)
- Pytania prowadza uzytkownika do wyboru wariantu.
- Minimalna liczba pol.
- Na koncu zapis do wspolnego modelu danych widgetu.

2) Visual (warianty + podglad)
- Uzytkownik wybiera wariant na podstawie podgladu.
- Pokazujemy tylko pola zwiazane z wybranym wariantem.

3) Advanced
- Pelna kontrola: spacing, marginesy, alignment, layout, responsywnosc.
- Tryb zaawansowany dostepny zawsze po wstepnej konfiguracji.

Zasady:
- Kazdy tryb mapuje do tego samego modelu danych.
- Uzytkownik moze w kazdej chwili przelaczyc sie na Advanced.
- Przejscie do Advanced nie resetuje danych.

---

## Kontrakty widgetu (v1)

Kazdy widget powinien zdefiniowac:
- `variants`: lista wariantow (np. hero: centered, split, media-left).
- `schema`: JSON schema danych widgetu.
- `defaults`: bezpieczne domyslne wartosci.
- `fields`: pola widoczne w Wizard/Visual/Advanced.

---

## UX i spojnosc

- Nazewnictwo i uklad pol spojne w kazdym widgetcie.
- Minimalna liczba pol w Wizard.
- Visual pokazuje realny preview (miniatury lub skeletony).
- Advanced zapewnia kontrole nad spacing i typografia.

---

## Przyklad: Hero section (warianty)

- centered: tytul + opis + CTA
- split: tekst + obraz obok
- media-left: obraz po lewej, tekst po prawej

Kazdy wariant ma wlasne pola, ale zapisuje do wspolnego modelu.
