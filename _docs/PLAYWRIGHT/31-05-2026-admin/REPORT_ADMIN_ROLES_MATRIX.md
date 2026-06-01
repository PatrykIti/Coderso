# Admin Roles Matrix - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/roles`. Źródła: `core/admin/ui/roles/PermissionsMatrixPage.tsx`,
`PermissionsMatrix.tsx`, `PermissionsMatrixSearch.tsx`, `RoleEditor.tsx`.

## Co faktycznie kliknięto

### Druga fala E2E - 2026-06-01

- Przez dialog `Create new role` utworzono testową rolę
  `QA Admin Matrix 20260601050816` z trzema uprawnieniami:
  `users:read`, `roles:read`, `audit:read`.
- Jako admin w `/admin/roles` wyszukano `View settings`, kliknięto checkbox
  `View settings for QA Admin Matrix 20260601050816` i zapisano macierz;
  `PATCH /admin-roles/:id` zwrócił `200`.
- Następnie cofnięto tę samą zmianę w macierzy i zapisano ponownie; rola wróciła
  do pierwotnych trzech uprawnień.
- Jako restricted user z tą rolą otwarto `/admin/roles`: kolumna roli była
  widoczna, `Add Role` było aktywne, checkboxy dały się przełączać lokalnie,
  a `Save changes` aktywował się po zmianie.
- Restricted user próbował zapisać zmianę `View settings`; backend zwrócił
  `403 forbidden`, więc RBAC API działa, ale UI pozwala dojść do błędnego
  submitu.
- Po zakończeniu testu rola została usunięta przez UI z `/admin/users` po
  wcześniejszym usunięciu testowego usera.

### Pierwsza fala - 2026-05-31

- Wejście w `Roles Matrix`.
- Search `media`; tabela zawęziła widoczne grupy uprawnień do media-related.
- `Add Role`; dialog otworzył się bez zapisu.
- W dialogu `Select all`; pojawił się stan `Full access`.
- `Clear`/cancel w dialogu, bez zapisu roli.
- Jeden checkbox uprawnienia w macierzy; footer zmienił się na dirty state.
- `Cancel`; footer wrócił do `No pending permission changes.`

W pierwszej fali nie klikano finalnie `Save changes`, tworzenia roli ani zapisu
pełnego dostępu. W drugiej fali wykonano create role i save matrix na
jednorazowej roli testowej oraz przywrócono stan.

## Co działało

- Search po grupach/uprawnieniach działa.
- Matrix renderuje role i permission groups.
- Pojedynczy toggle uprawnienia poprawnie ustawia dirty state.
- `Cancel` przywraca draft do stanu z backendu.
- Dialog `Add Role` ma title/description i guard wizualny `Full access`.
- Pozytywny save macierzy działa dla admina: dodanie i usunięcie
  `settings:read` zapisało się przez `PATCH /admin-roles/:id`.
- API poprawnie odrzuca zapis macierzy dla restricted usera bez `roles:write`.
- Po `TASK-356-01` UI ma denied/read-only/editable mode: brak `roles:read` nie
  wykonuje roles/catalog fetch, a `roles:read` bez `roles:write` pozwala
  wyszukiwac i ogladac matrix bez aktywnego `Add Role`, checkbox toggles,
  bulk toggles ani `Save changes`.
- Stale `403 permission_denied` na load/save odswieza permission snapshot; save
  403 zostawia dirty draft i pokazuje refresh-required copy.

## Co nie działało / co jest ryzykowne

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| Roles Matrix nie jest bramkowany uprawnieniami użytkownika | `PermissionsMatrixPage.tsx` nie przyjmuje permissions/current user, a `AdminApp.tsx` renderuje `<PermissionsMatrixPage />` bez kontekstu RBAC | restricted user może lokalnie zmieniać checkboxy i klikać save, dopiero API zwraca 403 |
| `Add Role` jest aktywne dla restricted usera | brak `can("roles:write")` w topbar actions | user dostaje aktywny create dialog mimo braku prawa do zapisu |
| `Save changes` zapisuje masowe zmiany bez potwierdzenia | `handleSaveChanges` buduje update dla zmienionych ról i od razu woła `updateAdminRole` | jeden błędny klik może zmienić RBAC wielu ról |
| `Select all` w RoleEditor przełącza pełen dostęp bez confirm | `handleSelectAll` ustawia `fullAccess` i wszystkie permissions | UI ostrzega badge, ale nie wymusza świadomego potwierdzenia |
| Brak podsumowania diffu przed zapisem | footer pokazuje tylko dirty/clean | admin nie widzi dokładnie, które role i scopes zmienia |

Status po `TASK-356-01`:

- Pierwsze dwa problemy z tabeli sa zamkniete w kodzie i Vitest: Roles Matrix
  konsumuje shared permission snapshot, a restricted `roles:read` user dostaje
  searchable read-only matrix bez lokalnego dirty state i bez aktywnego
  role-create/save flow.
- Playwright CLI pass `task-356-01-roles-readonly` potwierdzil ten sam kontrakt
  w realnym UI: tymczasowy `roles:read`-only user zalogowal sie na
  `/admin/roles`, `Add Role` bylo disabled, `Save changes` bylo nieobecne,
  checkbox/bulk toggles byly disabled, forced click nie ustawil dirty state, a
  search nadal dzialal. Fixture user/role zostaly usuniete po tescie; lokalny
  screenshot: `.tmp/task-356-01-roles-readonly.png`.
- Pozostale problemy sa nadal celowo w rodzinie `TASK-356`: diff review
  (`TASK-356-02`), high-risk/full-access confirm (`TASK-356-03`) i audit diff
  (`TASK-356-04`).

## Dlaczego

Macierz działa jako draft state po stronie klienta, ale moment zapisu jest zbyt
lekki jak na RBAC. Kod ma poprawny `Cancel`, ale nie ma review step ani confirm
dla szerokich zmian.

## Jak naprawić

- Dodać backendowy/current-user `can(permission)` do route shell i przekazać go
  do `PermissionsMatrixPage`; dla braku `roles:write` matrix powinien być
  read-only, a `Add Role`/`Save changes` ukryte albo disabled.
- Przed `Save changes` pokazać modal z listą ról i liczbą dodanych/usuniętych
  permissions.
- Dla `*`/full access wymagać dodatkowego confirm z nazwą roli.
- Dodać testy: dirty state, cancel reset, save payload dla jednej roli, save
  payload dla full access, confirm cancel.
- Rozważyć audit log event opisujący diff RBAC, nie tylko fakt zapisu.
