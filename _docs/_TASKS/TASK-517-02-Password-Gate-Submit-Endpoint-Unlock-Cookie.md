# TASK-517-02: Password Gate — Unlock-Cookie Util + Submit Endpoint + Prompt UI

# FileName: TASK-517-02-Password-Gate-Submit-Endpoint-Unlock-Cookie.md

**Parent Task:** TASK-517
**Priority:** High
**Category:** Security / Server Routes / Public Runtime
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-08-14
**Depends on:** TASK-517-01 (landed: pure resolver, narrow `getEntryAccessPasswordHash`,
gate insertion with the two named seams `renderEntryPasswordPromptResult` +
`buildEntryUnlockContext`). Lands SECOND (01 → 02 → 03).

---

## Scope

Delivers the `password` visibility gate end-to-end: a stateless HMAC unlock-cookie
sign/verify util, a NEW public `POST /entries/:id/unlock` endpoint that verifies the
submitted password server-side and sets the cookie, the password-prompt UI served when a
password entry is locked, and the flow tests. Fills the two seams 517-01-L03 defined
(`buildEntryUnlockContext` → real cookie verification; `renderEntryPasswordPromptResult` →
real 200 prompt page). The hash is NEVER sent to the client and is read ONLY via the narrow
`getEntryAccessPasswordHash` (517-01-L02).

## Leaves

- **517-02-L01** — HMAC unlock-cookie sign/verify util (`entryUnlockToken.ts`) + the single
  owner of `hashEntryCookieId` (cookie-name hash, imported by L02/L03) + Vitest unit tests.
- **517-02-L02** — `POST /entries/:id/unlock` endpoint (`handlePublicEntryUnlockApi`):
  reject-unknown validation + `public_write` rate-limit + narrow hash fetch + `verifyPassword`
  + Set-Cookie + 302.
- **517-02-L03** — password-prompt UI + `buildEntryUnlockContext` (fills the 517-01-L03
  seams; locked-body withholding).
- **517-02-L04** — password flow Bun tests (wrong → rejected, right → unlocks, unlocked
  serves body, tampered/cross-entry cookie rejected).

## Security Contract (restatement — route-touching)

- **Endpoint visibility:** public — NEW `POST /entries/:id/unlock`, dispatched from a new
  `handlePublicEntryUnlockApi(req, ctx)` invoked in `handlePublicRequest` alongside
  `handlePublicFormsApi` (`publicSite.tsx:686-692`), BEFORE the content-route match. Match by
  regex `^/entries/([^/]+)/unlock$`, guard `req.method === "POST"`.
- **Rate-limit:** `checkRateLimit("public_write", { ip, userAgent, identifier: entryId },
  security.rateLimit)` (bucket in `core/server/middleware/rateLimit.ts:9-10`,
  `checkRateLimit` @ `:48`), mirroring `handlePublicFormsApi`
  (`publicFormsApi.ts:548`).
- **Validation:** parse body via `parseRequestBody` (`core/server/requestBody.ts`), then
  `validate(unlockSchema, body)` where `unlockSchema = { type:"object", properties:{
  password:{ type:"string", minLength:1, maxLength:256 }, returnPath:{ type:"string",
  maxLength:2048 } }, required:["password"], additionalProperties:false }` (Ajv
  `strict:true` → unknown keys throw `ApiError("validation_error", …, 400)`). `returnPath`
  is DECLARED so the strict validator accepts the prompt form's `{ password, returnPath }`
  body (517-02-L03 emits it); it is same-origin validated by `resolveSafeEntryReturnPath`
  before the 302 (never an open redirect).
- **Verify:** fetch ONLY the hash via `getEntryAccessPasswordHash(entryId)` (517-01-L02),
  then `await verifyPassword(hash, submitted)` (`core/services/auth/password.ts:12` — HASH
  FIRST, argon2id). On the `hash === null` branch run a DUMMY `verifyPassword` against a
  fixed precomputed hash (result discarded) so both branches pay the same argon2 cost —
  uniform failure is body- AND timing-identical (no existence leak by latency). The hash is
  NEVER returned to the client.
- **Unlock token = stateless HMAC** (mirror `submissionNonce.ts`): payload
  `${entryId}.${timestamp}`, `createHmac("sha256", secret).update(payload).digest("hex")`,
  dedicated env secret `ENTRY_UNLOCK_SECRET`; verify with `timingSafeEqual` on equal-length
  Buffers + TTL (recommend ~12 h) + future-skew reject. Cookie name scoped per entry
  (`entry_unlock_<hashEntryCookieId(entryId)>`) so unlocking one entry never unlocks another;
  `hashEntryCookieId` is the single exported owner in 517-02-L01's `entryUnlockToken.ts`,
  imported read-only by BOTH the write (L02) and read (L03) sides so the cookie name is
  byte-identical. Flags `HttpOnly; Secure(per COOKIE_SECURE/NODE_ENV); SameSite=Strict;
  Path=/; Max-Age=<ttl>` (mirror `buildSessionCookieOptions` shape + `createCookieValue`
  flag ordering).
- **No existence leak / uniform failure (body + timing):** a wrong password, a `null` hash
  (no password / no entry), and a non-`password` entry all return the SAME 401 failure shape
  AND the same argon2 latency (the null-hash branch runs a dummy `verifyPassword`) — do not
  confirm which entries exist by response OR by timing. On success: set the cookie + `302`
  redirect back to the same-origin entry detail path (from the validated `returnPath`).
  bot/DNT-neutral (no captcha in v1 unless abuse observed).

## Hard Invariants (subtask)

1. Hash read ONLY via `getEntryAccessPasswordHash`; NEVER sent to the client.
2. Unlock token is a stateless HMAC cookie bound to THIS entry id (no new table); verified
   with `timingSafeEqual` + TTL; cross-entry / tampered cookie rejected.
3. Submit endpoint: `public_write` rate-limit + `additionalProperties:false` reject-unknown
   (accepting the declared `password` + `returnPath`) + uniform failure — body AND argon2
   timing identical (dummy verify on the null-hash branch), no existence leak — +
   `SameSite=Strict; HttpOnly; Secure` cookie named via the shared `hashEntryCookieId`.
4. Locked password entry withholds the body and serves the prompt page; the body renders
   ONLY once the per-entry unlock cookie verifies.
5. 517-02 fills ONLY the two named seams in `publicSite.tsx` (`buildEntryUnlockContext`,
   `renderEntryPasswordPromptResult`) + adds the new endpoint dispatch — it does NOT
   re-edit the 517-01 gate insertion logic.

## Definition of done

Util + endpoint + prompt UI land in strict leaf order (L01→L04); wrong password rejected,
right password sets the cookie + unlocks, unlocked request serves the body, tampered /
cross-entry cookie rejected; endpoint carries rate-limit + reject-unknown + uniform
failure; Bun tests green; `bun --cwd core lint:types` + root `tsc` + `gates:coderso`
(semgrep: no `eval`/`new Function` in shipped source) green.
