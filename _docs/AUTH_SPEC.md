# Auth Spec (v1)

Zakres: auth do panelu admina i API admina.

Poza zakresem v1:
- konta uzytkownikow publicznych (frontend). To zapewniaja pluginy lub v1.1+.

## Login

- Email + haslo.
- Haslo hashowane (argon2id rekomendowane).
- Po poprawnym loginie tworzymy session cookie (httpOnly).

## Sessions

- Sessions w DB (`sessions`).
- Token w cookie, w DB trzymamy hash.
- Cookie: httpOnly, secure, sameSite=strict.
- TTL domyslnie 7-14 dni.

## Logout

- Ustawia `revoked_at` i uniewaznia session.

## Roles i permissions

- Role: admin, editor, viewer.
- Permissions jako lista stringow w `roles.permissions`.
- Middleware sprawdza access per route.

## Password reset (v1.1)

- Token resetu w DB z TTL.
- Email poza zakresem v1.

## MFA (v2)

- MFA poza zakresem v1.
