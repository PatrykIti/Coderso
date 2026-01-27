# TASK-004-02: Auth Advanced Endpoints (CSRF, OTP, Reset)
# FileName: TASK-004-02_Auth_Advanced_Endpoints_CSRF_OTP_Reset.md

**Priority:** High
**Category:** Core/Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-004-01, TASK-004-03, TASK-020
**Status:** Done (2026-01-27)

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

**Token generation (example):**

```ts
const token = crypto.getRandomValues(new Uint8Array(32));
const csrfToken = Buffer.from(token).toString(\"base64url\");
const tokenHash = sha256(csrfToken);
await setCsrfToken(sessionId, tokenHash);
return { token: csrfToken };
```

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

**Payload precedence:**
- Jesli przekazano `recoveryCode`, ignoruj `code`.\n
- Wymagaj min length 6 dla `code`, min length 8 dla `recoveryCode`.\n

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

**Example helper (pseudo):**

```ts
export function hashToken(token: string) {
  return createHash(\"sha256\").update(token).digest(\"hex\");
}
```

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

**Table indexes (recommended):**
- unique `password_resets_token_hash_idx` on `token_hash`.\n
- index `password_resets_expires_at_idx` on `expires_at`.\n

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

**Reset flow notes:**
- Token jest jednorazowy: `consumeResetToken()` ustawia `used_at`.\n
- Po użyciu tokenu zawsze revoke wszystkie sesje.\n
- Nie zwracaj informacji czy email istnieje (anti‑enumeration).\n

**File:** `core/server/validation/authSchemas.ts`

Dodaj:
- `authResetSchema` (email)
- `authResetConfirmSchema` (token + password)

**Validation rules:**
- `email` format (simple regex) + min length.\n
- `password` min 8 znakow.\n
- `token` min 32 znakow.\n

---

## Example tests (outline)

**Unit: passwordResetService**\n
- `createResetToken` zapisuje hash i TTL.\n
- `consumeResetToken` odrzuca expired/used token.\n

**Unit: authRoutes**\n
- `/auth/csrf` -> zwraca token i zapisuje hash.\n
- `/auth/reset` -> zwraca ok dla nieistniejacego emaila.\n
- `/auth/reset/confirm` -> aktualizuje haslo i revoke sesje.\n

**Integration**\n
- `POST /auth/reset` + `POST /auth/reset/confirm` happy path.\n

---

## Migration example (Drizzle)

**New migration file (example name):**\n
`core/db/migrations/0007_add_password_resets_and_csrf.sql`

```sql
-- add csrf_token_hash to sessions
ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "csrf_token_hash" text;

CREATE INDEX IF NOT EXISTS "sessions_csrf_token_hash_idx"
  ON "sessions" ("csrf_token_hash");

-- password_resets table
CREATE TABLE IF NOT EXISTS "password_resets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_token_hash_idx"
  ON "password_resets" ("token_hash");
CREATE INDEX IF NOT EXISTS "password_resets_expires_at_idx"
  ON "password_resets" ("expires_at");
```

**Notes:**\n
- `gen_random_uuid()` wymaga extension `pgcrypto` (docelowo w init).\n
- Jeśli nie ma `pgcrypto`, użyj `uuid-ossp` lub Drizzle `defaultRandom()`.\n

---

## Service implementation outline (passwordResetService)

**File:** `core/services/auth/passwordResetService.ts`

```ts
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/client";
import { passwordResets } from "../../db/schema";

const TOKEN_BYTES = 32;
const TTL_MS = 60 * 60 * 1000;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createResetToken(userId: string) {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.insert(passwordResets).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function findResetToken(token: string) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash));
  return row ?? null;
}

export async function consumeResetToken(token: string) {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date())
      )
    );

  if (!row) return null;

  await db
    .update(passwordResets)
    .set({ usedAt: new Date(), updatedAt: new Date() })
    .where(eq(passwordResets.id, row.id));

  return row.userId;
}
```

---

## Tests (detailed templates)

### `tests/unit/auth/passwordResetService.test.ts`

```ts
import { expect, test } from "bun:test";
import { createResetToken, consumeResetToken } from "../../../core/services/auth/passwordResetService";

test("createResetToken returns token and persists hash", async () => {
  const { token } = await createResetToken("user-id");
  expect(token.length).toBeGreaterThan(10);
});

test("consumeResetToken invalidates token", async () => {
  const { token } = await createResetToken("user-id");
  const userId = await consumeResetToken(token);
  expect(userId).toBe("user-id");
  const second = await consumeResetToken(token);
  expect(second).toBeNull();
});
```

### `tests/unit/auth/authRoutes.test.ts`

```ts
import { expect, test } from "bun:test";
import { registerAuthRoutes } from "../../../core/server/routes/authRoutes";

// build fake router, call handlers directly to validate shape
```

### `tests/integration/routes/auth.test.ts`

```ts
// spin httpServer.ts and hit /admin/api/auth/reset + confirm
```

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
