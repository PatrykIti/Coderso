Sprawdziłem. Krótko: mamy fundamenty w CMS, ale ten pełny prompt w wersji “jak Mabudo” nie zostanie dziś odtworzony w 100% bez
  rozszerzenia blueprintu house-projects.

  Obecny asystent potrafi utworzyć bazowy katalog projektów domów, ale nie wszystkie szczegółowe pola, filtry, karty i sekcje z
  promptu są dziś skonfigurowane w presetach.

  Co mamy i zadziała
  Dla takiego promptu planner zwraca ready i mapuje go na:

  - intentId: house-projects-catalog
  - intentFamily: catalog_showcase
  - akcje:
      - setting.content-route.upsert
      - content-type.upsert
      - custom-screen.upsert
      - listing-query.upsert
      - listing-template.upsert
      - page.upsert

  Czyli system umie dziś utworzyć:

  - publiczną stronę katalogu /projekty-domow,
  - route szczegółów /projekty-domow/:slug,
  - content type house-projects,
  - dedykowany Admin UI screen House Projects,
  - listing query,
  - listing template grid,
  - stronę publiczną z listingiem.

  To jest obsłużone w core/services/assistant/blueprints/catalogFamilyBlueprint.ts i presecie core/services/assistant/blueprints/
  catalogFamilyPresets.ts.

  Co obecnie zawiera model house-projects
  Aktualny preset tworzy pola:

  - title
  - slug
  - summary
  - description
  - heroImage
  - gallery
  - areaM2
  - rooms
  - bathrooms
  - floors
  - priceFrom
  - location
  - projectStatus

  To pokrywa bazowy katalog projektów domów, ale nie pełną strukturę podobną do Mabudo.

  Czego brakuje względem promptu “jak mabudo.com”
  Na mabudo.com/projekty są filtry: powierzchnia, kondygnacje, liczba pokoi, styl, dach i garaż. Na kartach widać też pakiety cenowe
  typu start/PLUS/finish oraz cenę projektu. Źródła: https://mabudo.com/projekty/, https://mabudo.com/.

  W naszym obecnym presecie brakuje pól:

  - kod projektu typu MAB001,
  - cena projektu,
  - cena pakietu start,
  - cena pakietu plus,
  - cena pakietu finish,
  - typ domu / kondygnacje jako enum,
  - styl domu,
  - typ dachu,
  - garaż jako enum,
  - technologia budowy,
  - czas realizacji,
  - poziom energooszczędności,
  - isPromoted,
  - isNew,
  - displayOrder.

  Filtry
  Silnik filtrów jest wystarczająco elastyczny. Mamy widget listing-filters, który wspiera m.in.:

  - search,
  - checkbox,
  - radio,
  - range,
  - date-range,
  - sort.

  To jest w core/widgets/core/listingFilters.tsx i core/services/search/filterContract.ts.

  Ale obecny preset house-projects ma tylko te dostępne facety:

  - areaM2 jako range,
  - rooms jako checkbox,
  - projectStatus jako checkbox.

  Brakuje facetów dla:

  - kondygnacji,
  - stylu,
  - dachu,
  - garażu,
  - ceny projektu,
  - ceny start/plus/finish,
  - technologii,
  - energooszczędności.

  Dodatkowo: w bazowym setupie house-projects-catalog filtry nie są automatycznie dodawane do pierwszej akcji page.upsert. Filtry
  pojawiają się dziś głównie przez refinement flow typu “dodaj filtry po metrażu i liczbie pokoi”.

  Karty katalogu
  Obecny listingTemplateConfig pokazuje głównie:

  - summary,
  - area,
  - rooms,
  - status,
  - location.

  Nie pokazuje jeszcze:

  - ceny start,
  - ceny plus,
  - ceny finish,
  - ceny projektu,
  - liczby łazienek,
  - typu dachu,
  - garażu,
  - kondygnacji,
  - kodu projektu.

  Czyli karta “Mabudo-like” wymaga rozszerzenia listingTemplateConfig.

  Strona publiczna
  Mamy page.upsert, content-list, listing-filters, form-embed i inne widgety. Technicznie CMS ma mechanizmy, żeby zbudować stronę
  katalogową.

  Ale obecny blueprint generuje raczej prostą stronę katalogu: intro + listing. Nie tworzy jeszcze pełnego landing page z sekcjami:

  - “Twój dom w 3 prostych krokach”,
  - przewagi technologii prefabrykowanej,
  - porównanie czasu budowy,
  - realizacje/zaufanie,
  - testimonial/evidence,
  - kontakt/sprzedaż.

  Widgeti do takich sekcji częściowo istnieją, np. hero, content-list, listing-filters, form-embed, cta-banner, stats-kpi,
  testimonials, contact, ale preset ich nie układa automatycznie pod Mabudo-like landing.

  Wniosek
  System CMS ma bazowe możliwości, żeby to osiągnąć, ale obecny house-projects-catalog preset wymaga rozszerzenia.

  Najdokładniej:

  - Tak, mamy: content model, custom Admin UI screen, listing query/template, public page, detail routes, content-list widget,
    listing-filters widget, form-embed, action flow.
  - Częściowo mamy: filtry i karty, ale tylko dla części pól.
  - Nie mamy jeszcze w presecie: pełnego modelu Mabudo-like, pakietów cenowych start/plus/finish, pełnych filtrów, bogatej karty
    projektu i landing sections.

  Najlepszy następny krok to zrobić mały subtask rozszerzający HOUSE_PROJECTS_CATALOG_PRESET: dodać brakujące pola, pełne facety,
  rozszerzyć listingTemplateConfig, a page.upsert dla tego presetu od razu wyposażyć w listingFilters i lepszy układ strony.
