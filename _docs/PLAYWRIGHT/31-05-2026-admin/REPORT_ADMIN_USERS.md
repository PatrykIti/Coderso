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

| Problem | Dowód z audytu | Skutek | Status |
| --- | --- | --- | --- |
| UI nie zna efektywnych uprawnień bieżącego usera | `authClient.AuthUser` miał tylko `id/email/name`; `AdminApp.tsx` renderował `<UsersRolesPage />` bez permissions; `UsersRolesPage` domyślnie ustawiał `users/roles` read+write | restricted user widział aktywne write-actions, które backend odrzucał 403 | Zamknięte w `TASK-355-01` |
| `Reset password` jest no-op | `UsersRolesPage.tsx` przekazywał `onResetPassword={() => undefined}` do listy i drawera | user klikał akcję bezpieczeństwa i nie dostawał efektu ani feedbacku | Zamknięte w `TASK-355-02` |
| Invite User nie pozwala ustawić hasła | `InviteUserDialog.tsx` miał tylko name/email/role, mimo że `adminUsersClient.ts` i service obsługiwały `password` | nie dało się pełnie stworzyć login-capable usera samym UI bez zewnętrznego resetu/API fixture | Zamknięte w `TASK-355-02` przez set-password email flow |
| Ikona filtra obok selectów nie ma handlera | `UserFilters.tsx` renderował ghost button z ikoną `Filter`, bez `onClick` | wyglądało jak dodatkowy panel filtrów, ale nic nie robiło | Zamknięte w `TASK-355-04` jako disabled unavailable state |
| Switches w `Email notifications` są lokalne/statyczne | `UserDetailsDrawer.tsx` miał `Switch defaultChecked` bez zapisu | user mógł założyć, że zmienia preferencje usera | Zamknięte w `TASK-355-04` jako read-only managed state |
| `Deactivate user`, `Delete user`, `Delete role` wywołują mutacje bez confirm dialogu | potwierdzone na fixture; handlery od razu wołały API | łatwo było wykonać destrukcyjną akcję z menu wiersza | Zamknięte w `TASK-355-03` |
| Mobile details sheet nie ma semantycznego `SheetTitle` | mobile `SheetContent` w `UsersRolesPage.tsx`, zawartość `UserDetailsDrawer` używała zwykłego `h3` | błąd/warning Radix i gorsza dostępność na mobile | Zamknięte w `TASK-355-05` |

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

### Status po TASK-355-05 - 2026-06-01

- Mobile details sheet ma teraz semantyczny, wizualnie ukryty `SheetTitle` i
  `SheetDescription` w wrapperze `SheetContent` z `UsersRolesPage`.
- Opis ma wariant dla wybranego usera i fallback, gdy user nie jest jeszcze
  wybrany, więc loading/empty state nadal spełnia kontrakt dialogu.
- Shared `drawer-sheet-a11y-gate` otwiera Users mobile sheet i sprawdza
  `aria-labelledby`, `aria-describedby` oraz brak Radix warningów.
- Wszystkie problemy z tabeli ryzyk Users zostały przypisane i zaadresowane w
  `TASK-355-01` through `TASK-355-05`; finalna przeklikana ewidencja została
  dopisana w `TASK-360-07`.

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
- Mobile sheet: zrealizowane w `TASK-355-05` przez wizualnie ukryte
  `SheetTitle`/`SheetDescription` oraz warning-free regression gate.

## Finalna weryfikacja - 2026-06-02

- Subagent Playwright smoke `codex-02-06-admin-final-areas` otworzył
  `/admin/users` i realnie kliknął search, role/status filters, disabled
  advanced filters, `Invite User`, `Create Role` oraz row actions.
- `Delete user` otworzył destrukcyjny confirm z target userem i irreversible
  warningiem. Kliknięto `Cancel`; po cancel nie pojawił się mutujący request.
- Final console dla tego smoke'a: 0 errors, 0 warnings. Oczekiwany był tylko
  pre-login `401 /admin/api/auth/me` oraz React DevTools info.
- Dodatkowy końcowy pass `codex-02-06-physical` oraz niezależny Claude pass
  `claude-02-06-admin-physical` ponownie otworzyły `/admin/users` przez
  fizyczne kliknięcie sidebaru. Claude raportuje PASS, 0 console errors/
  warnings i requesty po loginie `200`.
- Status raportu: wszystkie Users findings są zamknięte w `TASK-355-01`
  through `TASK-355-05`; ten finalny smoke jest ewidencją `TASK-360-07`.
