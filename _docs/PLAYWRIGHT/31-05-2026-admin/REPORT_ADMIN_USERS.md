# Admin Users - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/users`. Źródła: `core/admin/ui/users/UsersRolesPage.tsx`,
`UserFilters.tsx`, `UserList.tsx`, `UserDetailsDrawer.tsx`, `UserEditor.tsx`,
`InviteUserDialog.tsx`, `RoleEditor.tsx`.

## Co faktycznie kliknięto

- Wejście w `Users` z sekcji Admin sidebar.
- Search `Patryk` w polu users search; tabela zawęziła się do jednego wiersza.
- Klik wiersza użytkownika; prawy panel szczegółów uzupełnił dane usera.
- `Invite User`; dialog otworzył się, a `Send Invitation` był zablokowany przy
  pustym formularzu.
- `Create Role` / `Create role`; dialog roli otworzył się w bezpiecznym probe,
  bez zapisu.
- Menu akcji wiersza; widoczne były `View profile`, `Edit user`,
  `Reset password`, `Deactivate user`, `Delete user`.
- `Edit user`; dialog edycji usera otworzył się, bez zapisu.

Nie klikano finalnie: delete, deactivate, save user/role, reset password.

## Co działało

- Lista ładuje realne dane i reaguje na search.
- Zaznaczenie wiersza zmienia panel szczegółów.
- Dialog Invite User ma poprawny title/description i podstawową walidację:
  submit pustego formularza jest disabled.
- Dialog Edit User pokazuje dane użytkownika i pola status/role.
- Dialog Role Editor ma poprawny title/description i pozwala podejrzeć scope
  uprawnień bez zapisu.

## Co nie działało / co jest ryzykowne

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| `Reset password` jest no-op | `UsersRolesPage.tsx` przekazuje `onResetPassword={() => undefined}` do listy i drawera | user klika akcję bezpieczeństwa i nie dostaje efektu ani feedbacku |
| Ikona filtra obok selectów nie ma handlera | `UserFilters.tsx` renderuje ghost button z ikoną `Filter`, bez `onClick` | wygląda jak dodatkowy panel filtrów, ale nic nie robi |
| Switches w `Email notifications` są lokalne/statyczne | `UserDetailsDrawer.tsx` ma `Switch defaultChecked` bez zapisu | user może założyć, że zmienia preferencje usera |
| `Deactivate user`, `Delete user`, `Delete role` wywołują mutacje bez confirm dialogu | `handleToggleStatus`, `handleDeleteUser`, `handleDeleteRole` od razu wołają API | łatwo wykonać destrukcyjną akcję z menu wiersza |
| Mobile details sheet nie ma semantycznego `SheetTitle` | mobile `SheetContent` w `UsersRolesPage.tsx`, zawartość `UserDetailsDrawer` używa zwykłego `h3` | błąd/warning Radix i gorsza dostępność na mobile |

## Dlaczego

Widok miesza gotowe, produkcyjne flow (`save user`, `invite user`, `delete user`)
z placeholderami (`reset password`, filter button, notification switches).
W UI wszystkie wyglądają podobnie aktywnie, więc użytkownik nie ma sygnału,
które akcje są realne.

## Jak naprawić

- `Reset password`: dodać backend/API flow lub ukryć/disable do czasu
  implementacji; po kliknięciu musi być toast albo dialog z wynikiem.
- `Deactivate/Delete`: dodać confirm dialog z nazwą użytkownika/roli i testy
  regresyjne dla cancel/confirm.
- Filter icon: albo otwiera advanced filters drawer, albo znika.
- Notification switches: podłączyć do modelu user preferences albo oznaczyć
  jako read-only.
- Mobile sheet: dodać `SheetTitle`/`SheetDescription`, ewentualnie przez
  `VisuallyHidden`.
