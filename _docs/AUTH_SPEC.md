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

### Login alerts

- Logowanie z nowego urzadzenia / nowej lokalizacji emituje powiadomienie
  oprocz rekordu audytowego `auth.login.alert`: email do wlasciciela konta
  (+ skonfigurowani `recipients`) oraz opcjonalny webhook podpisany HMAC
  (`X-Coderso-Signature` / `X-Nextless-Signature`).
- Dostarczenie jest best-effort i fire-and-forget — nigdy nie blokuje
  odpowiedzi logowania; ostatni blad dostarczenia trafia do
  `security.settings.loginAlerts.deliveryError` (read-only, sanitized).
- Webhook payload maskuje email i nie zawiera surowego IP/user-agent ani
  sekretow; `webhookSecret` pozostaje backend-only (szyfrowany w DB, API zwraca
  tylko `{ configured }`).

## First-run installer (v1.2)

Faza 1 dwufazowego onboardingu (TASK-482). Publiczny, pre-login namespace
`/auth/install/*`, ktory tworzy pierwsze uzywalne konto admina na swiezej
instalacji (`isFirstRun` = zero rekordow w `users`).

- `GET /auth/install/status` (public) — zwraca `{ available: boolean }`.
  `available` = `true` tylko gdy DB nie ma zadnego usera (`isFirstRun`); flip na
  `false` w momencie, gdy istnieje jakikolwiek user (installer- lub
  seed-utworzony). Endpoint jest session-less i odrzuca nieznane query params
  (`install_query_invalid`, 400).
- `POST /auth/install/admin` (public, session-less) — tworzy pierwszego admina
  (`name`, `email`, `password`; strict reject-unknown schema, haslo `minLength 8`).
  Konto powstaje jak w `seedAdmin()`: rola `admin` z permissions `["*"]`,
  `status: "active"`, hash argon2 — NIE przez `usersService.createUser` (ktory
  daje `pending` + losowe haslo). Odpowiedz to `{ ok: true, user: { id, email,
  name } }` (bez `passwordHash`, bez `roleId`, bez sekretow).
- **Fail-closed no-users boundary.** Precondycja no-users jest sprawdzana tanio
  przed transakcja, a nastepnie ponownie wewnatrz transakcji tworzenia
  (TOCTOU re-check pod `pg_advisory_xact_lock`), wiec dwa rownolegle installery
  nie stworza dwoch adminow ani nie zadzialaja po setupie. Powtorna proba zwraca
  `install_unavailable` (409).
- **Self-disable.** Po utworzeniu pierwszego admina `status.available` jest
  trwale `false`; installer nie pojawia sie ponownie.
- **Coexistence z `seedAdmin()`.** Env-driven `seedAdmin()` (`core/db/seed.ts`)
  pozostaje wspolistniejaca sciezka CI/Docker; installer po prostu
  self-disable'uje sie, gdy jakikolwiek user (seeded lub installer-created) juz
  istnieje. Zadnej z tych sciezek nie usuwa druga.
- Model bezpieczenstwa pre-auth: patrz `SECURITY_SPEC.md` → „Pre-auth first-run
  installer”. Kody bledow: `install_unavailable`, `install_admin_invalid`,
  `install_query_invalid`.

## Sessions

- Sessions w DB (`sessions`).
- Token w cookie, w DB trzymamy hash.
- Cookie: httpOnly, secure, sameSite=strict.
- TTL source precedence:
  - `createSession(input.ttlDays)` (explicit override)
  - `settings["auth.sessionTtlDays"]` (default `14`, zakres `1..365`)
  - `security.settings.session.ttlDays` (fallback kompatybilnosciowy)
  - `DEFAULT_SESSION_TTL_DAYS` (`7`)
- Rozstrzyganie precedencji + clamping do `1..365` zyje w jednym, czystym
  module `core/services/auth/sessionTtl.ts`
  (`resolveSessionTtlDaysFromSources`), re-eksportowanym przez
  `sessionService.ts`. Kazde zrodlo przechodzi przez `toBoundedInteger` — wartosc
  nienumeryczna / niedodatnia „przepada” i spada do nastepnego zrodla (to NIE
  jest zwykly lancuch `??`), a wartosci dodatnie sa clampowane do `1..365`.
- Kreator instalacji (Advanced → Security) zapisuje wylacznie kanoniczny klucz
  `auth.sessionTtlDays` (nigdy `security.session.ttlDays`) oraz przeniesiony
  `auth.resetTtlMinutes`; `security.session.ttlDays` pokazuje tylko jako
  advisory override, a „efektywny TTL” wylicza tym samym resolverem co runtime.

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
