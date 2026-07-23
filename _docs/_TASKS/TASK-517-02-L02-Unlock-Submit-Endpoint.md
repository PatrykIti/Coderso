# TASK-517-02-L02: Public `POST /entries/:id/unlock` Submit Endpoint

# FileName: TASK-517-02-L02-Unlock-Submit-Endpoint.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-02
**Priority:** High
**Category:** Server Routes / Security / Public Runtime
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Creates NEW `core/server/publicEntryUnlockApi.ts` exporting
`handlePublicEntryUnlockApi(req, ctx)`, and wires its dispatch into `handlePublicRequest`
alongside `handlePublicFormsApi`. Verifies a submitted password server-side against the
narrow hash (517-01-L02) with `verifyPassword`, and on success sets the per-entry HMAC
unlock cookie (517-02-L01) + `302` back to the entry detail. Mirrors the forms public-POST
endpoint end-to-end (rate-limit, reject-unknown validation, uniform failure).

## Grounded anchors

- Mirror `handlePublicFormsApi` (`core/server/publicFormsApi.ts`): path-regex match + POST
  guard (`:73-77`), `checkRateLimit("public_write", { ip, userAgent, identifier }, security.rateLimit)`
  (`:81`), `parseRequestBody(req)` (`core/server/requestBody.ts`), `parseCookies` (`:46`).
  Dispatched from `handlePublicRequest` (`publicSite.tsx:1521`
  `handlePublicFormsApi(req, {url, ip, userAgent, security})`), returning early when
  non-null.
- **`jsonResponse`/`errorResponse` are NON-exported file-locals with a DIFFERENT signature —
  NOT importable (grounded, mirrors L03's parseCookies treatment):** `jsonResponse` (`publicFormsApi.ts:29`)
  and `errorResponse` (`publicFormsApi.ts:35`) are module-LOCAL `const`s (also duplicated in
  `publicBookingApi.ts:38/44`), NOT exported anywhere, so they CANNOT be imported into the new
  `core/server/publicEntryUnlockApi.ts`. Their real shape is `errorResponse(error: unknown)` — a
  SINGLE argument that is an `ApiError`/`Error` object (it calls `toErrorResponse(error)` and reads
  `error.status`), NOT `errorResponse(code, status)`. So neither the `(code, status)` call shape
  nor a bare numeric `401`/`405` matches the real helper. The implementer must EITHER (a) construct
  errors the real way — `throw new ApiError("entry_unlock_failed", <msg>, 401)`
  (`errorHandler.ts` `ApiError`) and wrap the handler in try/catch, then return via a LOCAL copy of
  `errorResponse(err)` (mirroring `publicFormsApi.ts`'s pattern) — OR (b) export a canonical
  `jsonResponse`/`errorResponse` pair and import it. Do NOT present them as ready-to-import
  `(code, status)` helpers.
- Rate-limit bucket `"public_write"` in `core/server/middleware/rateLimit.ts`
  (`checkRateLimit` `:48`).
- Validation: `validate(schema, payload)` from `core/server/validation/schemaValidator.ts:38`
  (Ajv `strict:true` `:7`; every public POST schema is `additionalProperties:false`, e.g.
  `taxonomySchemas.ts:7`). Unknown key → `ApiError("validation_error", …, 400)`.
- Hash fetch: `getEntryAccessPasswordHash(entryId)` (517-01-L02). Verify:
  `verifyPassword(hash, submitted)` (`core/services/auth/password.ts:12` — HASH FIRST;
  argon2id, deliberately slow). On the `hash === null` branch, run a DUMMY
  `verifyPassword(DUMMY_ARGON2_HASH, submitted)` and discard the result so both branches pay
  the same argon2 cost (timing-equalized existence protection — see pseudocode).
- Unlock token: `createEntryUnlockToken(entryId)` (517-02-L01). Cookie NAME hash:
  `hashEntryCookieId(entryId)` — imported read-only from 517-02-L01's `entryUnlockToken.ts`
  (the SINGLE owner/definition; 517-02-L03 imports the same one so WRITE and READ names
  byte-match). Cookie flags mirror
  `buildSessionCookieOptions` (`core/services/auth/sessionService.ts:53`:
  `{ httpOnly:true, secure:(NODE_ENV==='production' unless COOKIE_SECURE override),
  sameSite:"strict", path:"/", maxAge }`) + `createCookieValue` flag ordering
  (`httpServer.ts:93`: `name=value; Path; Max-Age; SameSite; HttpOnly; Secure`). NOTE: the
  entry-detail path is the raw Bun handler (`new Response(...)`), so this endpoint builds
  its OWN `Set-Cookie` header string reusing the same flag ordering.

## Implementation pseudocode

```ts
// core/server/publicEntryUnlockApi.ts
// NOTE: jsonResponse/errorResponse are file-local non-exported consts in publicFormsApi.ts
// (:29/:35) with signature errorResponse(error: unknown) — NOT (code, status). Add a local
// copy of errorResponse here (or export a canonical pair) and construct failures as ApiError,
// then wrap the handler body in try/catch → errorResponse(err). See Grounded anchors.
const errorResponse = (error: unknown) =>                            // LOCAL copy, mirrors publicFormsApi.ts:35
  new Response(JSON.stringify(toErrorResponse(error)),
    { status: error instanceof ApiError ? error.status : 500,
      headers: { "Content-Type": "application/json" } });

const UNLOCK_RE = /^\/entries\/([^/]+)\/unlock$/;
const unlockSchema = {
  type: "object",
  properties: {
    password: { type: "string", minLength: 1, maxLength: 256 },
    // return path is accepted (same-origin validated) so the strict validator does not 400
    // the real prompt form which POSTs { password, returnPath } — see 517-02-L03:
    returnPath: { type: "string", maxLength: 2048 },
  },
  required: ["password"],
  additionalProperties: false,
} as const;

// Fixed precomputed argon2id hash of a throwaway constant, used ONLY to equalize timing on
// the null-hash branch (dummy verify, result discarded) so a non-existent/non-password entry
// pays the same argon2 cost as a wrong password on a real entry. Never matches a real submit.
const DUMMY_ARGON2_HASH = /* precomputed via hashPassword("<random-throwaway>") at module load or a pinned literal */;

export async function handlePublicEntryUnlockApi(
  req: Request,
  ctx: { url: URL; ip: string; userAgent: string; security: SecurityConfig }
): Promise<Response | null> {
  const m = UNLOCK_RE.exec(ctx.url.pathname);
  if (!m) return null;                                  // not our route → let dispatch continue
  const entryId = decodeURIComponent(m[1]);
  try {
  if (req.method !== "POST") throw new ApiError("method_not_allowed", "Method Not Allowed", 405);

  checkRateLimit("public_write", { ip: ctx.ip, userAgent: ctx.userAgent, identifier: entryId }, ctx.security.rateLimit);

  const body = await parseRequestBody(req);
  validate(unlockSchema, body);                         // reject-unknown → 400 on extra keys (throws ApiError)
  const submitted = (body as { password: string }).password;

  // UNIFORM FAILURE (body AND timing): wrong password, no hash (no password/no entry),
  // non-password entry all return the SAME 401 shape AND pay the SAME argon2 cost — never
  // confirm which entries exist by body OR by latency. Redirect target is derived from a
  // safe same-origin referer/param, else "/" (never an open redirect).
  const hash = await getEntryAccessPasswordHash(entryId);   // null if no entry / no password
  // TIMING-EQUALIZED: when hash === null we would otherwise short-circuit to ok=false
  // WITHOUT running argon2 (verifyPassword is @node-rs/argon2id, deliberately slow, tens of
  // ms — password.ts:12). A wrong-password-on-a-real-entry then costs argon2-time while a
  // non-existent/non-password entry returns near-instantly, letting a latency-probing client
  // distinguish "a password entry exists here" from "nothing here" despite the identical 401
  // body. So on the null branch run a DUMMY argon2 verify against a fixed precomputed hash and
  // discard the result, so BOTH branches pay the same argon2 cost before the identical 401:
  const ok = hash
    ? await verifyPassword(hash, submitted)
    : (await verifyPassword(DUMMY_ARGON2_HASH, submitted), false);   // dummy verify, discard → false
  if (!ok) {
    // ONE uniform failure (401 neutral body + re-prompt), identical body AND timing for all
    // "cannot unlock" causes so existence is not leaked by response OR by latency:
    throw new ApiError("entry_unlock_failed", "Unable to unlock entry", 401);
  }

  const token = createEntryUnlockToken(entryId);
  const cookieName = `entry_unlock_${hashEntryCookieId(entryId)}`;   // hashEntryCookieId imported from 517-02-L01 (single owner)
  const secure = resolveCookieSecure(ctx.security);                  // COOKIE_SECURE / NODE_ENV
  const maxAge = resolveUnlockCookieMaxAgeSeconds();                 // = token TTL
  const setCookie =
    `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Strict; HttpOnly${secure ? "; Secure" : ""}`;

  // Return path source-of-truth = the validated `returnPath` body field (517-02-L03's prompt
  // form emits it), which is FULLY attacker-controlled. resolveSafeEntryReturnPath REUSES the
  // grounded, proven same-origin validator rather than re-inventing a weaker hand-rolled
  // startsWith allowlist. NEVER an attacker-supplied absolute/protocol-relative URL.
  //
  // resolveSafeEntryReturnPath(candidate, req, url) — PINNED contract (REUSE, do not hand-roll):
  //   1. If candidate is null/empty → fall through to Referer → "/".
  //   2. Validate the candidate through the SAME same-origin URL-origin-compare core already used
  //      on the public forms POST redirect path: normalizeFormSuccessRedirectUrl
  //      (core/services/forms/formRedirects.ts) — it does `new URL(trimmed, BASE)` then requires
  //      `url.origin === BASE`, returning `pathname+search+hash`. The URL-parse+origin-compare
  //      technique STRUCTURALLY rejects protocol-relative (//evil.com), backslash-normalized
  //      (/\evil.com, \evil.com), embedded-scheme (https://evil.com) and encoded-double-slash
  //      (%2f%2fevil.com) vectors WITHOUT hand-maintaining each case. Wrap in try/catch — any
  //      throw (invalid / cross-origin) → REJECT and fall through. Do NOT ship a parallel
  //      hand-rolled startsWith allowlist (it is easy to get subtly wrong — decodes once, misses
  //      double-encoded %252f%252f or browser-stripped tab/newline vectors).
  //      RECOMMENDED: extract the URL-origin-compare core into a shared `safeSameOriginPath` util
  //      and have BOTH the forms endpoint (normalizeFormSuccessRedirectUrl) and this unlock
  //      endpoint consume it, so there is a SINGLE audited same-origin gate.
  //   3. Fallback: Referer header, re-validated by the SAME same-origin validator against
  //      ctx.url's origin; else "/". The fallback is never attacker-controlled beyond that gate.
  const redirectTo = resolveSafeEntryReturnPath((body as { returnPath?: string }).returnPath, req, ctx.url);
  return new Response(null, { status: 302, headers: { Location: redirectTo, "Set-Cookie": setCookie } });
  } catch (err) {
    return errorResponse(err);                          // ApiError → its .status; else 500 (real errorResponse shape)
  }
}
```

Dispatch in `handlePublicRequest` (BEFORE the content-route match, alongside forms):
```ts
const unlockResponse = await handlePublicEntryUnlockApi(req, { url, ip, userAgent, security });
if (unlockResponse) return unlockResponse;
```

**Design notes.** Keyed by `:id` (not slug) so the endpoint never leaks slugs. The
redirect target is resolved from the validated `returnPath` body field (the single
source-of-truth, emitted by 517-02-L03's prompt form and accepted by `unlockSchema`) to a
SAFE same-origin path by REUSING the grounded, proven same-origin validator rather than
re-inventing a weaker hand-rolled allowlist — `returnPath` is fully attacker-controlled and
security-load-bearing, so `resolveSafeEntryReturnPath` runs the candidate through the SAME
URL-origin-compare core already used on the public forms POST redirect path
(`normalizeFormSuccessRedirectUrl`, `core/services/forms/formRedirects.ts`: `new URL(trimmed, BASE)`
then `url.origin === BASE`, returning `pathname+search+hash`). That URL-parse+origin-compare
technique STRUCTURALLY rejects `//evil.com`, `/\evil.com`, `\evil.com`/`\\evil.com`,
`https://evil.com`, and `%2f%2fevil.com` without hand-maintaining each case (a hand-rolled
`startsWith` list is easy to get subtly wrong — it decodes once and can miss double-encoded
`%252f%252f` or browser-stripped tab/newline vectors). RECOMMENDED: extract the origin-compare
core into a shared `safeSameOriginPath` util consumed by BOTH the forms endpoint and this unlock
endpoint (single audited same-origin gate). It falls back to a same-origin-re-validated Referer
then `/` — never an attacker-supplied absolute/protocol-relative URL (no open-redirect). See the
PINNED contract in the pseudocode. `hashEntryCookieId` is
imported read-only from 517-02-L01's `entryUnlockToken.ts` (the single owner of the cookie-id
hash); it is a short stable hash of the entry id (keeps the cookie name opaque + bounded)
and MUST byte-match the READ side in 517-02-L03 — see 517-02-L01. The token itself still
binds the full entry id. Uniform 401 failure — identical body AND argon2 timing (via the
dummy-verify on the null-hash branch) — for every "cannot unlock" cause (wrong password,
null hash, non-password entry) so a probing client cannot distinguish "entry exists but
wrong password" from "entry does not exist" by response OR latency. bot/DNT-neutral; no
captcha in v1 (add only if abuse observed — noted as an open follow-up in 517-03 closure).

## Security Contract (restatement — route-touching)

- **Visibility:** public POST `/entries/:id/unlock` (new `handlePublicEntryUnlockApi`,
  dispatched before content-route match, POST-guarded).
- **Rate-limit:** `public_write` bucket, `identifier: entryId`.
- **Validation:** `unlockSchema` `additionalProperties:false` (reject-unknown 400) — accepts
  `{ password, returnPath? }` (the prompt form's `returnPath` is a declared property so the
  strict validator does NOT 400 the real form); body via `parseRequestBody`; params are
  string-typed. `returnPath` is same-origin validated by `resolveSafeEntryReturnPath` before
  use.
- **HMAC/cookie:** success sets `entry_unlock_<hash>` = HMAC token (517-02-L01), flags
  `HttpOnly; Secure(per COOKIE_SECURE/NODE_ENV); SameSite=Strict; Path=/; Max-Age=<TTL>`.
- **Uniform failure (body + timing):** wrong password / null hash / non-password entry →
  identical 401 body AND identical argon2 cost — the null-hash branch runs a dummy
  `verifyPassword(DUMMY_ARGON2_HASH, submitted)` so latency does not distinguish
  "password entry exists here" from "nothing here". No existence leak by response OR by
  timing. Hash fetched ONLY via the narrow loader; NEVER returned to the client.
- **No open redirect:** `Location` is a validated same-origin path only, via
  `resolveSafeEntryReturnPath` REUSING the grounded `normalizeFormSuccessRedirectUrl`
  URL-origin-compare core (`formRedirects.ts`: `new URL(trimmed, BASE)` + `url.origin === BASE`
  → `pathname+search+hash`; recommended extracted into a shared `safeSameOriginPath` util shared
  with the forms endpoint), falling back to same-origin-re-validated Referer then `/`. This
  structurally rejects the backslash / protocol-relative / encoded-double-slash / embedded-scheme
  vectors — NOT a parallel hand-rolled `startsWith` allowlist.

## Regression-test shape

- Endpoint-level assertions folded into the flow suite 517-02-L04 (Bun) — this leaf's
  endpoint is exercised there (rate-limit hit, reject-unknown, wrong/right, uniform
  failure, cookie flags). No separate unit file (route wiring is Bun-runtime).
- **Open-redirect guard assertions (add to 517-02-L04):** on a successful unlock, assert the
  302 `Location` falls back to a SAFE path (never the attacker host) for each of
  `//evil.com`, `/\evil.com`, `\\evil.com`, `\evil.com`, `https://evil.com`, `%2f%2fevil.com`,
  and a leading-control-char variant (e.g. `"\t//evil.com"`); and assert a legitimate
  `/blog/post-1` returnPath IS honored. This pins `resolveSafeEntryReturnPath`'s allowlist so a
  leading-slash-only regression is caught.
- **Lane:** Bun (`tests/integration/routes/*` — the existing route-test dir — and/or
  `tests/integration/runtime/*` for the full `handlePublicRequest` flow; there is NO
  `tests/integration/site/` dir).

## Hard Invariants

1. `public_write` rate-limit + `additionalProperties:false` validation on every request.
2. Hash read ONLY via `getEntryAccessPasswordHash`; verified with `verifyPassword(hash,
   submitted)` (hash first); hash NEVER sent to the client.
3. Uniform 401 failure for all "cannot unlock" causes — identical BODY **and** identical
   argon2 TIMING (dummy `verifyPassword(DUMMY_ARGON2_HASH, submitted)` on the null-hash
   branch), so neither the response nor its latency leaks entry existence.
4. Success → per-entry HMAC cookie (`HttpOnly; Secure; SameSite=Strict; Path=/;
   Max-Age=TTL`) + `302` to a validated same-origin detail path (no open redirect), validated by
   REUSING `normalizeFormSuccessRedirectUrl`'s URL-origin-compare core (recommended shared
   `safeSameOriginPath` util) — NOT a parallel hand-rolled allowlist.
5. Dispatched from `handlePublicRequest` before the content-route match; returns `null`
   when the path is not `^/entries/:id/unlock$`.
