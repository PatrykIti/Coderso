# Auth Spec (v1)

Zakres: auth do panelu admina i API admina.

Poza zakresem v1:
- konta uzytkownikow publicznych (frontend). To zapewniaja pluginy lub v1.1+.

## Login

- Email + haslo.
- Haslo hashowane (argon2id rekomendowane).
- Po poprawnym loginie tworzymy session cookie (httpOnly).
- UI pokazuje bledy walidacji pod polami i alert ogolny przy `auth_failed`.
- Po sukcesie przekierowanie do `/admin`.
- Admin UI weryfikuje sesje przez `GET /auth/me`.
- `GET /auth/me` zwraca redacted current-user payload:
  `{ user: { id, email, name, permissionSnapshot } }`.
- `permissionSnapshot` zawiera tylko effective permission ids oraz bezpieczne
  role labels: `{ permissions: string[], roles: { id, slug, name }[] }`.
- Endpoint odrzuca nieznane query params i nie zwraca session ids, tokenow,
  password hashy, cookie, API key secrets ani zaszyfrowanych PII.
- CSRF token pobierany przez `GET /auth/csrf` i uzywany w mutacjach (`X-CSRF-Token`).

## Sessions

- Sessions w DB (`sessions`).
- Token w cookie, w DB trzymamy hash.
- Cookie: httpOnly, secure, sameSite=strict.
- TTL source precedence:
  - `createSession(input.ttlDays)` (explicit override)
  - `settings["auth.sessionTtlDays"]` (default `14`, zakres `1..365`)
  - `security.settings.session.ttlDays` (fallback kompatybilnosciowy)
  - `DEFAULT_SESSION_TTL_DAYS` (`7`)

## Logout

- Ustawia `revoked_at` i uniewaznia session.

## Roles i permissions

- Role: admin, editor, viewer.
- Permissions jako lista stringow w `roles.permissions`.
- Middleware sprawdza access per route.
- Admin UI korzysta z permission snapshot z `/auth/me` jako jednego zrodla dla
  `can(permission)`, sidebar route visibility i route guards. Backend 403
  pozostaje defense-in-depth i wymusza odswiezenie snapshotu po stale permission
  failure.
- Admin shell nie wykonuje globalnych odczytow ustawien, theme cache,
  custom-screen shortcuts ani solution-kit context bez odpowiedniego read
  permission w snapshotcie.

## Admin UI (v1)

- Zarzadzanie uzytkownikami i rolami w panelu `/admin/users`.
- `/admin/users` jest widoczne, gdy snapshot zawiera `users:read` albo
  `roles:read`; brak obu uprawnien fail-closed przed pobraniem list.
- Widok pobiera tylko zasoby pokryte snapshotem:
  `users:read` laduje users, `roles:read` laduje roles i permission catalog.
- Mutacje userow wymagaja `users:write` oraz `roles:read`, gdy zmieniaja
  przypisanie roli. Mutacje roli wymagaja `roles:write`.
- Zaproszenia userow sa login-capable: admin nie wpisuje hasla innej osoby,
  tylko wysyla email z jednorazowym linkiem do ustawienia hasla.
- Admin reset hasla uzywa `POST /admin-users/:id/password-reset`, wymaga
  `users:write`, CSRF oraz skonfigurowanego email delivery, i zapisuje audit
  event bez tokenu.
- UI blokuje usuniecie ostatniego admina.
- Ostatni admin nie moze utracic roli admin do czasu utworzenia kolejnego.
- Uzytkownicy zapraszani startuja ze statusem `pending`.

## Password reset (v1.1)

- Token resetu w DB z TTL.
- TTL source: `settings["auth.resetTtlMinutes"]` (default `60`, zakres `5..1440`), fallback do `60`.
- Nowy token uniewaznia poprzednie niewykorzystane tokeny dla tego usera.
- Token jest hashowany w DB; plaintext wystepuje tylko w jednorazowym linku
  email i nie jest zwracany do API clienta, audit logow ani delivery logs.
- Email delivery korzysta z Settings -> Email. Gdy email nie jest
  skonfigurowany, admin invite/reset zwraca blokujacy `email_not_configured`.
- UI: `/auth/reset` wysyla email, `/auth/reset/confirm` ustawia nowe haslo i
  aktywuje tylko konta `pending`.
- Bledy walidacji i nieprawidlowy token pokazywane w UI.
- Token errors mapuja sie na stabilne kody:
  `set_password_token_invalid`, `set_password_token_expired`,
  `set_password_token_used`.
- Publiczny reset request zwraca `{ ok: true }` bez ujawniania czy email
  istnieje, po przejsciu globalnej kontroli konfiguracji email.

## MFA (v2)

- MFA poza zakresem v1, ale UI posiada ekran OTP/recovery (wiring gotowy).
