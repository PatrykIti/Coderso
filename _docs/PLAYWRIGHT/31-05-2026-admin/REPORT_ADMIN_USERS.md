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
- Po `TASK-355-03` pozostałe problemy z raportu należały do kolejnych liści:
  `TASK-355-02` reset/invite login-capable, `TASK-355-03` destructive confirms,
  `TASK-355-04` filters/notifications, `TASK-355-05` mobile a11y.

### Status po TASK-355-02 - 2026-06-01

- Naprawiono problemy `Reset password` no-op oraz login-capable invite:
  `Reset password` otwiera confirm dialog i wysyła email przez
  `POST /admin-users/:id/password-reset`.
- `Invite User` i create-mode w `UserEditor` tworzą `pending` usera oraz
  wysyłają jednorazowy set-password link przez skonfigurowany email delivery;
  dialog pozostaje otwarty przy `email_not_configured` lub błędzie SMTP.
- Usunięto normalną ścieżkę ustawiania cudzego hasła przez admin HTTP
  `password`; create/update schemas odrzucają to pole.
- Tokeny resetu są hashowane, TTL-bound, single-use, unieważniają poprzednie
  aktywne tokeny i mapują błędy na `set_password_token_invalid`,
  `set_password_token_expired`, `set_password_token_used`.
- Pozostałe problemy z raportu nadal należą do kolejnych liści:
  `TASK-355-03` destructive confirms, `TASK-355-04` filters/notifications,
  `TASK-355-05` mobile a11y.

### Status po TASK-355-03 - 2026-06-01

- Naprawiono problem destrukcyjnych akcji bez confirm dialogu: deactivate,
  delete user i delete role wymagają teraz wspólnego `ConfirmActionDialog` z
  nazwą/adresem celu.
- Re-aktywacja usera wymaga confirm, gdy konto ma high-risk role albo UI nie ma
  `roles:read` i nie może zweryfikować ryzyka.
- Duplicate role działa bez confirm tylko dla zwykłych ról; role z `*` albo
  high-risk permissions wymagają potwierdzenia i wysyłają `sourceRoleId` /
  `sourceRoleName` jako metadane audytu, nie jako dane trwałe roli.
- Backend emituje audyty dla `admin.user.disable`, `admin.user.enable`,
  `admin.user.delete`, `admin.role.duplicate` i `admin.role.delete`; role errors
  mapują się na stabilne `ApiError`.
- Pozostałe problemy z raportu nadal należą do kolejnych liści:
  `TASK-355-04` filters/notifications i `TASK-355-05` mobile a11y.

### Status po TASK-355-04 - 2026-06-01

- Zaawansowany filter icon nie wygląda już jak działająca ukryta funkcja:
  przycisk jest disabled, ma `aria-label`, `title` z powodem i stabilne
  `data-no-op-control`.
- Widoczne filtry search, role i status pozostają realnie podpięte do listy;
  role filter nadal jest niedostępny w partial `users:read` bez `roles:read`.
  Ten leaf nie dodaje server-query API dla Users, tylko zamyka fałszywy
  advanced-filter affordance.
- Notification switches w user details są disabled/read-only z jawną kopią, że
  delivery rules są zarządzane w Settings/workspace policy; nie wyglądają jak
  lokalny zapis preferencji.
- Shared no-op audit gate obejmuje Users advanced filters oraz oba notification
  controls i wymusza disabled state z jawnym powodem.
- Po `TASK-355-04` pozostały problem z raportu należy do `TASK-355-05`
  mobile a11y.

## Dlaczego

Widok miesza gotowe, produkcyjne flow (`save user`, `invite user`, `delete user`)
z placeholderami (`reset password`, filter button, notification switches).
W UI wszystkie wyglądają podobnie aktywnie, więc użytkownik nie ma sygnału,
które akcje są realne.

## Jak naprawić

- Przestać hardcodować default write permissions w `UsersRolesPage`; źródłem
  prawdy powinien być backendowy `can(permission)` z `/auth/me` albo osobnego
  endpointu efektywnych uprawnień.
- `Reset password`: zrealizowane w `TASK-355-02`; dalsza pełna weryfikacja
  klikana z mailbox fixture należy do final evidence pass.
- Invite User: zrealizowane w `TASK-355-02`; wymaga skonfigurowanego email
  delivery i nie zwraca tokenu do browsera ani raportów.
- `Deactivate/Delete`: zrealizowane w `TASK-355-03`; dalsza pełna weryfikacja
  klikana cleanup fixture należy do final evidence pass.
- Filter icon: zrealizowane w `TASK-355-04` jako truthful unavailable state;
  realne filtry search/role/status pozostają aktywne.
- Notification switches: zrealizowane w `TASK-355-04` jako read-only managed
  state bez lokalnego submitu.
- Mobile sheet: dodać `SheetTitle`/`SheetDescription`, ewentualnie przez
  `VisuallyHidden`.
