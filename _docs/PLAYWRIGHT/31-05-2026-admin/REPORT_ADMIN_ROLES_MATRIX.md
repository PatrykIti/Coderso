# Admin Roles Matrix - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/roles`. Źródła: `core/admin/ui/roles/PermissionsMatrixPage.tsx`,
`PermissionsMatrix.tsx`, `PermissionsMatrixSearch.tsx`, `RoleEditor.tsx`.

## Co faktycznie kliknięto

- Wejście w `Roles Matrix`.
- Search `media`; tabela zawęziła widoczne grupy uprawnień do media-related.
- `Add Role`; dialog otworzył się bez zapisu.
- W dialogu `Select all`; pojawił się stan `Full access`.
- `Clear`/cancel w dialogu, bez zapisu roli.
- Jeden checkbox uprawnienia w macierzy; footer zmienił się na dirty state.
- `Cancel`; footer wrócił do `No pending permission changes.`

Nie klikano finalnie: `Save changes`, tworzenie roli, zapis pełnego dostępu.

## Co działało

- Search po grupach/uprawnieniach działa.
- Matrix renderuje role i permission groups.
- Pojedynczy toggle uprawnienia poprawnie ustawia dirty state.
- `Cancel` przywraca draft do stanu z backendu.
- Dialog `Add Role` ma title/description i guard wizualny `Full access`.

## Co nie działało / co jest ryzykowne

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| `Save changes` zapisuje masowe zmiany bez potwierdzenia | `handleSaveChanges` buduje update dla zmienionych ról i od razu woła `updateAdminRole` | jeden błędny klik może zmienić RBAC wielu ról |
| `Select all` w RoleEditor przełącza pełen dostęp bez confirm | `handleSelectAll` ustawia `fullAccess` i wszystkie permissions | UI ostrzega badge, ale nie wymusza świadomego potwierdzenia |
| Brak podsumowania diffu przed zapisem | footer pokazuje tylko dirty/clean | admin nie widzi dokładnie, które role i scopes zmienia |

## Dlaczego

Macierz działa jako draft state po stronie klienta, ale moment zapisu jest zbyt
lekki jak na RBAC. Kod ma poprawny `Cancel`, ale nie ma review step ani confirm
dla szerokich zmian.

## Jak naprawić

- Przed `Save changes` pokazać modal z listą ról i liczbą dodanych/usuniętych
  permissions.
- Dla `*`/full access wymagać dodatkowego confirm z nazwą roli.
- Dodać testy: dirty state, cancel reset, save payload dla jednej roli, save
  payload dla full access, confirm cancel.
- Rozważyć audit log event opisujący diff RBAC, nie tylko fakt zapisu.
