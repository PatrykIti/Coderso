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
- Timeline (bez dat; etapy/proces w formie osi)
- Compare timeline (porownanie dwoch procesow na jednej osi)
- Newsletter signup
- Kontakt (formularz + dane kontaktowe)
- Menu/Nawigacja
- Stopka (linki, dane, social)

---

## Model konfiguracji (obowiazkowy)

Kazdy widget musi wspierac 3 tryby konfiguracji:

1) Wizard (kreator)
- Pytania prowadza uzytkownika do wyboru wariantu (auto).
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

## Dokumentacja widgetow

Szczegoly dla kazdego widgetu znajduja sie w `_docs/_WIDGETS/`:

- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_WIDGETS/CONTACT.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`

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
