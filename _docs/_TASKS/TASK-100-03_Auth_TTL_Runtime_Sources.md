# TASK-100-03: Auth TTL Runtime Sources
# FileName: TASK-100-03_Auth_TTL_Runtime_Sources.md

**Priority:** High  
**Category:** Core/Auth + Core/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-100-01, TASK-020-10  
**Status:** Done (2026-02-09)

---

## Overview

Przenosimy TTL do runtime settings i usuwamy hardcoded wartosci tam, gdzie to mozliwe.
Dotyczy to sesji logowania i tokenow resetu hasla.

---

## TTL Precedence Policy

### Session TTL (`createSession`)

1. `input.ttlDays` (explicit override)
2. `settings["auth.sessionTtlDays"]`
3. `security.settings.session.ttlDays` (kompat)
4. `DEFAULT_SESSION_TTL_DAYS`

### Reset token TTL (`createResetToken`)

1. `settings["auth.resetTtlMinutes"]`
2. `DEFAULT_RESET_TTL_MS / 60000`

---

## Pseudo-Implementation

```ts
// core/services/auth/sessionService.ts
async function resolveSessionTtlDays(inputTtl?: number): Promise<number> {
  if (isValidPositiveInt(inputTtl)) return clamp(inputTtl, 1, 365);

  const globalTtl = await getSetting("auth.sessionTtlDays");
  if (isValidPositiveInt(globalTtl)) return clamp(globalTtl, 1, 365);

  const security = await getSecuritySettings();
  if (isValidPositiveInt(security.session.ttlDays)) {
    return clamp(security.session.ttlDays, 1, 365);
  }

  return DEFAULT_SESSION_TTL_DAYS;
}

export async function createSession(input: CreateSessionInput) {
  const ttlDays = await resolveSessionTtlDays(input.ttlDays);
  // existing create flow...
}
```

```ts
// core/services/auth/passwordResetService.ts
async function resolveResetTtlMinutes(): Promise<number> {
  const configured = await getSetting("auth.resetTtlMinutes");
  if (isValidPositiveInt(configured)) return clamp(configured, 5, 1440);
  return 60;
}

export async function createResetToken(userId: string) {
  const ttlMinutes = await resolveResetTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  // existing insert...
}
```

---

## Physical Files

| File | Action | Notes |
| --- | --- | --- |
| `core/services/auth/sessionService.ts` | update | ttl resolver + precedence policy |
| `core/services/auth/passwordResetService.ts` | update | runtime reset TTL |
| `core/server/routes/authRoutes.ts` | update | remove route-level ttl assumptions |
| `tests/unit/auth/sessionService.test.ts` | update | precedence and bounds coverage |
| `tests/unit/auth/passwordResetService.test.ts` | update | reset ttl from settings |

---

## Acceptance Criteria

- `createSession()` korzysta z policy precedence, bez hardcoded default-only behavior.
- `createResetToken()` nie ma stalego TTL bez sprawdzenia settings.
- Brak regresji dla istniejacego `security.settings.session.ttlDays`.
- Testy pokrywaja granice zakresow TTL.

---

## Testing Requirements

- Session tests:
  - explicit override > settings > security settings > default
  - clamp dla wartosci granicznych
- Reset tests:
  - configured value used
  - fallback to default when invalid/missing
- Route auth smoke:
  - login flow nadal ustawia cookie maxAge zgodnie z resolved TTL

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (TTL precedence policy)
- `_docs/AUTH_SPEC.md` (session/reset TTL source)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-100-03-auth-ttl-runtime-sources.md`
