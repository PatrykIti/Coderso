# TASK-004-02: Auth Advanced Endpoints (CSRF, OTP, Reset)
# FileName: TASK-004-02_Auth_Advanced_Endpoints_CSRF_OTP_Reset.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-01, TASK-004-03, TASK-020
**Status:** To Do

---

## Overview

Rozszerzenie auth API o endpointy wymagane przez UI wiring (TASK-025):
CSRF, OTP/recovery oraz reset hasla.

**Goals:**
- Dzialajacy `GET /auth/csrf`.
- `POST /auth/verify-otp` (na razie stub lub pelna walidacja).
- Reset hasla: `POST /auth/reset` + `POST /auth/reset/confirm`.

**Response shape (standard):**

```json
{ "ok": true }
```

lub:

```json
{ "error": { "code": "...", "message": "..." } }
```

---

## Architecture

```
core/server/routes/authRoutes.ts
core/server/validation/authSchemas.ts
core/services/auth/
  sessionService.ts
  password.ts
  userService.ts
  passwordResetService.ts   # nowy helper (tokeny resetu)
core/db/schema.ts           # tabela password_resets
```

---

## Implementation Checklist

## Implementation Order (recommended)

1) Dodaj schematy walidacji w `authSchemas.ts`.\n
2) Dodaj `password_resets` do `core/db/schema.ts` + migracja.\n
3) Zaimplementuj `passwordResetService.ts`.\n
4) Rozszerz `authRoutes.ts` o `/auth/csrf`, `/auth/verify-otp`, `/auth/reset*`.\n
5) Dodaj testy unit/integration.\n

### 1) CSRF endpoint

**File:** `core/server/routes/authRoutes.ts`

- Dodaj `GET /auth/csrf`.
- Zwracaj `{ token }`.
- Token musi byc powiazany z sesja (hash w DB lub session row).
- Wykorzystaj helper z `core/services/auth/sessionService.ts`.

**Wspolpraca z TASK-020:**
- Middleware `csrf.ts` waliduje `X-CSRF-Token` przeciw tokenowi sesji.

**Recommended storage (v1):**
- Dodaj kolumne `csrf_token_hash` do `sessions`.\n
- Helpers w `sessionService.ts`:\n
  - `setCsrfToken(sessionId, tokenHash)`\n
  - `getCsrfTokenHash(sessionId)`\n

**Status code i error:**
- Jesli brak sesji: `401 auth_required`.
- Jesli brak tokenu: `500 internal_error` (developer error).

---

### 2) OTP / Recovery endpoint

**File:** `core/server/routes/authRoutes.ts`

- Dodaj `POST /auth/verify-otp`.
- Payload:
  - `{ code: "123456" }` LUB `{ recoveryCode: "ABCD" }`.
- Na razie (v1) jesli brak skonfigurowanego MFA ->
  `throw new ApiError("mfa_not_configured", "MFA not enabled", 400)`.
- Docelowo (v2): walidacja `otp_secret` i `recovery_codes`.

**File:** `core/server/validation/authSchemas.ts`

- Dodaj schematy:
  - `authOtpSchema`
  - `authRecoverySchema`

**Error codes:**
- `mfa_not_configured` (400)\n
- `otp_invalid` (401)\n

---

### 3) Reset hasla (v1.1)

**File:** `core/services/auth/passwordResetService.ts` (nowy)

Funkcje:
- `createResetToken(userId)` -> `{ token, tokenHash, expiresAt }`
- `findResetToken(token)` -> row lub null
- `consumeResetToken(token)` -> oznacza `used_at` + zwraca userId

**Security rules:**
- Przechowuj tylko `token_hash` w DB (np. SHA-256).
- TTL 1h.
- Token jednorazowy (`used_at`).

**Token format:**
- 32 bajty random, Base64URL (bez `=`).
- Hashuj SHA-256 -> hex string.

**File:** `core/db/schema.ts`

Dodaj tabela `password_resets`:
- `id` (uuid)
- `user_id` (FK -> users.id)
- `token_hash` (string)
- `expires_at` (timestamp)
- `used_at` (timestamp | null)
- `created_at`, `updated_at`

**Sessions update:**
- Dodaj `csrf_token_hash` do `sessions`.\n
- Dodaj index po `csrf_token_hash` (opcjonalnie).\n

**Migracje:**
- Drizzle: `bun x drizzle-kit generate` -> nowy plik migracji.\n
- W testach wymagaj `bun x drizzle-kit migrate`.\n

---

### 4) Reset routes

**File:** `core/server/routes/authRoutes.ts`

- `POST /auth/reset`:
  - payload: `{ email }`
  - jesli user nie istnieje: zwroc `{ ok: true }` (bez leakow)
  - jesli istnieje: utworz token resetu i zwroc `{ ok: true }`
  - loguj audit: `auth.reset.request` (bez ujawniania tokenu)

- `POST /auth/reset/confirm`:
  - payload: `{ token, password }`
  - waliduj token + TTL
  - hashuj nowe haslo (argon2id)
  - ustaw nowe haslo w `users.password_hash`
  - revoke wszystkie sesje usera
  - loguj audit: `auth.reset.confirm`

**Required helpers (services):**
- `updatePassword(userId, hash)` w `userService.ts`.
- `revokeAllSessions(userId)` w `sessionService.ts`.

**File:** `core/server/validation/authSchemas.ts`

Dodaj:
- `authResetSchema` (email)
- `authResetConfirmSchema` (token + password)

**Validation rules:**
- `email` format (simple regex) + min length.\n
- `password` min 8 znakow.\n
- `token` min 32 znakow.\n

---

## New Files to Create

- `core/services/auth/passwordResetService.ts`
- `tests/unit/auth/passwordResetService.test.ts`
- `tests/unit/auth/authRoutes.test.ts`
- `tests/integration/routes/auth.test.ts`

---

## Testing Requirements

- [ ] `tests/unit/auth/passwordResetService.test.ts` (create/consume token).
- [ ] `tests/unit/auth/authRoutes.test.ts` (csrf + otp/reset payloads).
- [ ] `tests/integration/routes/auth.test.ts` (happy path dla resetu).

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` (reset + OTP)
- `_docs/CMS_API.md` (payloady i endpointy)
- `_docs/SECURITY_SPEC.md` (CSRF)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-advanced-endpoints.md`
- Notes: CSRF + OTP + reset endpoints.
