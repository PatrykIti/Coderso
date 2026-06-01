# Admin Users - raport klikany (31-05-2026)

## Zakres i źródła

Trasa: `/admin/users`. Źródła: `core/admin/ui/users/UsersRolesPage.tsx`,
`UserFilters.tsx`, `UserList.tsx`, `UserDetailsDrawer.tsx`, `UserEditor.tsx`,
`InviteUserDialog.tsx`, `RoleEditor.tsx`.

## Co faktycznie kliknięto

### Druga fala E2E - 2026-06-01

- Utworzono przez UI rolę `QA Admin Matrix 20260601050816` z uprawnieniami
  `users:read`, `roles:read`, `audit:read`.
- Utworzono przez UI testowego użytkownika
  `coderso.e2e.admin.20260601050816@example.test` i przypisano mu wyłącznie
  tę rolę.
- Ponieważ Invite User nie ma pola hasła, ustawiono znane hasło i status
  `active` kontrolowanym wywołaniem admin API na tym samym testowym userze;
  później zalogowano się tym użytkownikiem w osobnej sesji Playwright.
- W restricted session sprawdzono `/admin/users`: lista ładowała dane, ale
  `Create Role`, `Invite User`, `Edit permissions`, `Reset password` i menu
  wiersza były aktywne mimo braku `users:write`/`roles:write`.
- W restricted session wykonano kontrolowane próby `Invite User` i `Create
  Role`; oba submit requesty dostały `403 forbidden`, więc backend RBAC działa,
  ale UI nie blokuje akcji wcześniej.
- Jako admin na tym samym testowym userze realnie kliknięto: search po emailu,
  panel szczegółów, `Reset password`, `Edit user` + save, `Deactivate user`,
  `Activate user`, `Delete user`.
- Jako admin na testowej roli realnie kliknięto: menu role card, `Duplicate`,
  `Delete role` dla kopii oraz `Delete role` dla roli źródłowej po usunięciu
  usera.
- Cleanup potwierdzony API: testowy user, testowa rola i kopia roli nie
  pozostały w bazie.

### Pierwsza fala - 2026-05-31

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

W pierwszej fali nie klikano finalnie delete, deactivate, save user/role ani
reset password na realnych danych. W drugiej fali te akcje wykonano na
jednorazowym fixture user/role i posprzątano po teście.

## Co działało

- Lista ładuje realne dane i reaguje na search.
- Zaznaczenie wiersza zmienia panel szczegółów.
- Dialog Invite User ma poprawny title/description i podstawową walidację:
  submit pustego formularza jest disabled.
- Dialog Edit User pokazuje dane użytkownika i pola status/role.
- Dialog Role Editor ma poprawny title/description i pozwala podejrzeć scope
  uprawnień bez zapisu.
- Admin API poprawnie egzekwuje RBAC: restricted user dostał `403 forbidden`
  przy `POST /admin-users` i `POST /admin-roles`.
- Edycja usera, zmiana statusu active/inactive, duplicate role, delete user i
  delete role działają na kontrolowanym fixture.

## Co nie działało / co jest ryzykowne

| Problem | Dowód z kodu | Skutek |
| --- | --- | --- |
| UI nie zna efektywnych uprawnień bieżącego usera | `authClient.AuthUser` ma tylko `id/email/name`; `AdminApp.tsx` renderuje `<UsersRolesPage />` bez permissions; `UsersRolesPage` domyślnie ustawia `users/roles` read+write | restricted user widzi aktywne write-actions, które backend odrzuca 403 |
| `Reset password` jest no-op | `UsersRolesPage.tsx` przekazuje `onResetPassword={() => undefined}` do listy i drawera | user klika akcję bezpieczeństwa i nie dostaje efektu ani feedbacku |
| Invite User nie pozwala ustawić hasła | `InviteUserDialog.tsx` ma tylko name/email/role, mimo że `adminUsersClient.ts` i service obsługują `password` | nie da się pełnie stworzyć login-capable usera samym UI bez zewnętrznego resetu/API fixture |
| Ikona filtra obok selectów nie ma handlera | `UserFilters.tsx` renderuje ghost button z ikoną `Filter`, bez `onClick` | wygląda jak dodatkowy panel filtrów, ale nic nie robi |
| Switches w `Email notifications` są lokalne/statyczne | `UserDetailsDrawer.tsx` ma `Switch defaultChecked` bez zapisu | user może założyć, że zmienia preferencje usera |
| `Deactivate user`, `Delete user`, `Delete role` wywołują mutacje bez confirm dialogu | potwierdzone na fixture; `handleToggleStatus`, `handleDeleteUser`, `handleDeleteRole` od razu wołają API | łatwo wykonać destrukcyjną akcję z menu wiersza |
| Mobile details sheet nie ma semantycznego `SheetTitle` | mobile `SheetContent` w `UsersRolesPage.tsx`, zawartość `UserDetailsDrawer` używa zwykłego `h3` | błąd/warning Radix i gorsza dostępność na mobile |

### Status po TASK-355-01 - 2026-06-01

- Naprawiono pierwszy problem z tabeli: Users UI nie hardcoduje już pełnych
  uprawnień, tylko konsumuje shared permission snapshot z `TASK-360-01`.
- `/admin/users` i pozycja sidebaru są widoczne przy `users:read` albo
  `roles:read`; brak obu uprawnień kończy się access denied przed fetchami.
- Admin shell nie wykonuje już pobocznych fetchy settings/theme/custom
  screens/solution kits, jeśli restricted Users/Roles fixture nie ma
  odpowiednich read permissions.
- `users:read` bez `roles:read` pobiera wyłącznie users, ukrywa role cards i
  role filter/details, a edit/invite są niedostępne przed submit.
- `roles:read` bez `users:read` pobiera roles/catalog, ukrywa users table i
  Invite User, a role writes pozostają disabled bez `roles:write`.
- Pozostałe problemy z raportu nadal należą do kolejnych liści:
  `TASK-355-02` reset/invite login-capable, `TASK-355-03` destructive confirms,
  `TASK-355-04` filters/notifications, `TASK-355-05` mobile a11y.

## Dlaczego

Widok miesza gotowe, produkcyjne flow (`save user`, `invite user`, `delete user`)
z placeholderami (`reset password`, filter button, notification switches).
W UI wszystkie wyglądają podobnie aktywnie, więc użytkownik nie ma sygnału,
które akcje są realne.

## Jak naprawić

- Przestać hardcodować default write permissions w `UsersRolesPage`; źródłem
  prawdy powinien być backendowy `can(permission)` z `/auth/me` albo osobnego
  endpointu efektywnych uprawnień.
- `Reset password`: dodać backend/API flow lub ukryć/disable do czasu
  implementacji; po kliknięciu musi być toast albo dialog z wynikiem.
- Invite User: dodać świadomy password/set-password flow albo jasno wymusić
  zaproszenie mailowe z działającym reset tokenem; nie zostawiać UI bez drogi
  do testowalnego logowania.
- `Deactivate/Delete`: dodać confirm dialog z nazwą użytkownika/roli i testy
  regresyjne dla cancel/confirm.
- Filter icon: albo otwiera advanced filters drawer, albo znika.
- Notification switches: podłączyć do modelu user preferences albo oznaczyć
  jako read-only.
- Mobile sheet: dodać `SheetTitle`/`SheetDescription`, ewentualnie przez
  `VisuallyHidden`.
