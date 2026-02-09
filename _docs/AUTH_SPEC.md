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
- Admin UI weryfikuje sesje przez `GET /auth/me` (zwraca `user`).
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

## Admin UI (v1)

- Zarzadzanie uzytkownikami i rolami w panelu `/admin/users`.
- Operacje mutujace wymagaja `users:write` i `roles:write`.
- UI blokuje usuniecie ostatniego admina.
- Ostatni admin nie moze utracic roli admin do czasu utworzenia kolejnego.
- Uzytkownicy zapraszani startuja ze statusem `pending`.

## Password reset (v1.1)

- Token resetu w DB z TTL.
- TTL source: `settings["auth.resetTtlMinutes"]` (default `60`, zakres `5..1440`), fallback do `60`.
- Email poza zakresem v1.
- UI: `/auth/reset` wysyla email, `/auth/reset/confirm` ustawia nowe haslo.
- Bledy walidacji i nieprawidlowy token pokazywane w UI.
 - Endpointy zwracaja `{ ok: true }` bez ujawniania czy email istnieje.

## MFA (v2)

- MFA poza zakresem v1, ale UI posiada ekran OTP/recovery (wiring gotowy).
