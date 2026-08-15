# TASK-517-02-L02: Public `POST /entries/:id/unlock` Submit Endpoint

# FileName: TASK-517-02-L02-Unlock-Submit-Endpoint.md

**Parent Task:** TASK-517
**Parent Subtask:** TASK-517-02
**Priority:** High
**Category:** Server Routes / Security / Public Runtime
**Estimated Effort:** Medium
**Status:** ✅ Done
**Completed:** 2026-08-14

---

## Scope

Executable leaf. Creates NEW `core/server/publicEntryUnlockApi.ts` exporting
`handlePublicEntryUnlockApi(req, ctx)`, and wires its dispatch into `handlePublicRequest`
alongside `handlePublicFormsApi`. Verifies a submitted password server-side against the
narrow hash (517-01-L02) with `verifyPassword`, and on success sets the per-entry HMAC
unlock cookie (517-02-L01) + `302` back to the entry detail. Mirrors the forms public-POST
endpoint end-to-end (rate-limit, reject-unknown validation, uniform failure).

## Grounded anchors

- Mirror `handlePublicFormsApi` (`core/server/publicFormsApi.ts:548`): it is dispatched from
  `handlePublicRequest` (`publicSite.tsx:686-692`
  `handlePublicFormsApi(req, { url, ip, userAgent, security })`) and returns early when it
  does not match. The forms write path matches its route inside the executor
  (`matchFormWritePath`, `publicFormsApi.ts:206-233`, which includes the SAFE
  `decodeURIComponent` precedent @ `:223-228` — mirror that for the entry id, see LOW b).
  `parseRequestBody(req)` is exported from `core/server/requestBody.ts:137`.
- **`jsonResponse`/`errorResponse` are NON-exported file-locals with a DIFFERENT signature —
  NOT importable (grounded, mirrors L03's parseCookies treatment):** `jsonResponse`
  (`publicFormsApi.ts:163`) and `errorResponse` (`publicFormsApi.ts:174-177`) are module-LOCAL
  `const`s, NOT exported anywhere, so they CANNOT be imported into the new
  `core/server/publicEntryUnlockApi.ts`. The real `errorResponse(error: unknown)` maps the
  error via `mapFormWriteBoundaryError` then returns `jsonResponse(toErrorResponse(mapped),
  mapped.status)` — it takes ONE argument, NOT `(code, status)`. So neither a `(code, status)`
  call shape nor a bare numeric `401`/`405` matches the real helper. The implementer must EITHER
  (a) construct errors the real way — `throw new ApiError("entry_unlock_failed", <msg>, 401)`
  (`core/server/errorHandler.ts`) and wrap the handler in try/catch, then return via a LOCAL copy
  of `errorResponse(err)` (mirroring `publicFormsApi.ts:174-177`) — OR (b) export a canonical
  `jsonResponse`/`errorResponse` pair and import it. Do NOT present them as ready-to-import
  `(code, status)` helpers.
- Rate-limit bucket `"public_write"` in `core/server/middleware/rateLimit.ts:9-10`
  (`checkRateLimit` @ `:48`).
- Validation: `validate(schema, payload)` from `core/server/validation/schemaValidator.ts:38`
  (Ajv `strict:true` @ `:7`; every public POST schema is `additionalProperties:false`). Unknown
  key → `ApiError("validation_error", …, 400)`.
- Hash fetch: `getEntryAccessPasswordHash(entryId)` (517-01-L02, exported from
  `core/services/content/entryReadService.ts` — import it directly from there, NOT from the
  `entryService` barrel, so `entryService.ts` stays untouched). Verify: `verifyPassword(hash,
  submitted)` (`core/services/auth/password.ts:12` — HASH FIRST; argon2id, deliberately slow).
  On the `hash === null` branch, run a DUMMY `verifyPassword(DUMMY_ARGON2_HASH, submitted)` and
  discard the result so both branches pay the same argon2 cost (timing-equalized existence
  protection — see pseudocode + LOW a).
- Unlock token: `createEntryUnlockToken(entryId)` + `hashEntryCookieId(entryId)` +
  `resolveEntryUnlockTtlMs()` (all from 517-02-L01's `core/services/content/entryUnlockToken.ts`
  — the SINGLE owner/definition; 517-02-L03 imports the same `hashEntryCookieId` so WRITE and READ
  names byte-match). Cookie flags mirror `buildSessionCookieOptions`
  (`core/services/auth/sessionService.ts:53-68`: `{ httpOnly:true, secure:(NODE_ENV==='production'
  unless COOKIE_SECURE override), sameSite:"strict", path:"/", maxAge }`) + `createCookieValue`
  flag ordering (`httpServer.ts:93`: `name=value; Path; Max-Age; SameSite; HttpOnly; Secure`).
  NOTE: the entry-detail path is the raw Bun handler (`new Response(...)`), so this endpoint builds
  its OWN `Set-Cookie` header string reusing the same flag ordering.

## Implementation pseudocode

```ts
// core/server/publicEntryUnlockApi.ts
// NOTE: jsonResponse/errorResponse are file-local non-exported consts in publicFormsApi.ts
// (:163/:174-177) with signature errorResponse(error: unknown) — NOT (code, status). Add a local
// copy of errorResponse here (or export a canonical pair) and construct failures as ApiError,
// then wrap the handler body in try/catch → errorResponse(err). See Grounded anchors.
const errorResponse = (error: unknown) =>                            // LOCAL copy, mirrors publicFormsApi.ts:174-177
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

// LOW (a): DUMMY_ARGON2_HASH MUST be produced by the LIVE hashPassword (Argon2id
// defaultOptions, password.ts:4-10) so its embedded m/t/p params are byte-identical to real
// entry hashes — never a hand-pinned literal with different params (which would skew the
// timing-equalization). Resolve lazily on first null-hash branch so module load stays cheap.
let dummyHashPromise: Promise<string> | null = null;
const resolveDummyArgon2Hash = () =>
  (dummyHashPromise ??= hashPassword("entry-unlock-dummy-throwaway"));   // LIVE hashPassword

export async function handlePublicEntryUnlockApi(
  req: Request,
  ctx: { url: URL; ip: string; userAgent: string; security: SecurityConfig }
): Promise<Response | null> {
  const m = UNLOCK_RE.exec(ctx.url.pathname);
  if (!m) return null;                                  // not our route → let dispatch continue
  try {
  if (req.method !== "POST") throw new ApiError("method_not_allowed", "Method Not Allowed", 405);

  // LOW (b): SAFE decode — a malformed %-sequence in the path segment makes decodeURIComponent
  // throw URIError → 500. Mirror matchFormWritePath's try/catch (publicFormsApi.ts:223-228):
  let entryId: string;
  try {
    entryId = decodeURIComponent(m[1]!);
  } catch {
    throw new ApiError("validation_error", "Invalid entry id", 400);
  }

  checkRateLimit("public_write", { ip: ctx.ip, userAgent: ctx.userAgent, identifier: entryId }, ctx.security.rateLimit);

  const body = await parseRequestBody(req);
  validate(unlockSchema, body);                         // reject-unknown → 400 on extra keys (throws ApiError)
  const submitted = (body as { password: string }).password;

  // UNIFORM FAILURE (body AND timing): wrong password, no hash (no password/no entry),
  // non-password entry all return the SAME 401 shape AND pay the SAME argon2 cost — never
  // confirm which entries exist by body OR by latency. Redirect target is derived from a
  // safe same-origin returnPath (see resolveSafeEntryReturnPath), else "/" (never an open redirect).
  const hash = await getEntryAccessPasswordHash(entryId);   // null if no entry / no password
  // TIMING-EQUALIZED: when hash === null we would otherwise short-circuit to ok=false
  // WITHOUT running argon2 (verifyPassword is @node-rs/argon2id, deliberately slow — password.ts:12).
  // A wrong-password-on-a-real-entry then costs argon2-time while a non-existent/non-password
  // entry returns near-instantly, letting a latency-probing client distinguish "a password entry
  // exists here" from "nothing here" despite the identical 401 body. So on the null branch run a
  // DUMMY argon2 verify (against a LIVE-hashPassword-produced hash) and discard the result, so
  // BOTH branches pay the same argon2 cost before the identical 401:
  const ok = hash
    ? await verifyPassword(hash, submitted)
    : (await verifyPassword(await resolveDummyArgon2Hash(), submitted), false);   // dummy verify, discard → false
  if (!ok) {
    // ONE uniform failure (401 neutral body + re-prompt), identical body AND timing for all
    // "cannot unlock" causes so existence is not leaked by response OR by latency:
    throw new ApiError("entry_unlock_failed", "Unable to unlock entry", 401);
  }

  const token = createEntryUnlockToken(entryId);
  const cookieName = `entry_unlock_${hashEntryCookieId(entryId)}`;   // hashEntryCookieId imported from 517-02-L01 (single owner)
  // LOW (c): grounded secure/maxAge — NO invented resolveCookieSecure/resolveUnlockCookieMaxAgeSeconds:
  const secureOverride = process.env.COOKIE_SECURE;
  const secure = secureOverride !== undefined
    ? secureOverride !== "false"
    : process.env.NODE_ENV === "production";                        // sessionService.ts:56-60 (COOKIE_SECURE override)
  const maxAge = Math.floor(resolveEntryUnlockTtlMs() / 1000);      // 517-02-L01 exported; default 12 h
  const setCookie =
    `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Strict; HttpOnly${secure ? "; Secure" : ""}`;

  // Return path source-of-truth = the validated `returnPath` body field (517-02-L03's prompt
  // form emits it), which is FULLY attacker-controlled. resolveSafeEntryReturnPath validates it
  // as a SAME-ORIGIN path against the REQUEST origin — never a raw URL.
  //
  // resolveSafeEntryReturnPath(candidate, req, url) — PINNED contract (do NOT hand-roll a weak
  // startsWith allowlist, and do NOT claim reuse of normalizeFormSuccessRedirectUrl):
  //   1. If candidate is null/empty → fall through to Referer → "/".
  //   2. Validate the candidate as a SAME-ORIGIN absolute-path against the ACTUAL request origin:
  //      require `candidate.startsWith("/")` AND NOT `candidate.startsWith("//")`, then
  //      `const parsed = new URL(candidate, url.origin)` and require `parsed.origin ===
  //      url.origin`, returning `parsed.pathname + parsed.search + parsed.hash`. Any parse error
  //      or origin mismatch → REJECT and fall through.
  //   WHY NOT reuse normalizeFormSuccessRedirectUrl: it hard-codes a PLACEHOLDER base
  //      `FORM_REDIRECT_BASE = "https://coderso.local"` (`formRedirects.ts:1`) and the WHATWG
  //      parser normalizes backslash to `//`, so it does NOT "structurally reject backslash
  //      vectors" — a `/\evil.com` candidate is normalized to `//evil.com` (origin mismatch) and
  //      only then rejected by accident of the origin compare. Do not rely on that. The explicit
  //      single-leading-slash + NOT `//` + origin-compare-against-the-real-origin gate above is the
  //      authoritative check and rejects `//evil.com`, `/\evil.com`, `\evil.com`, `https://evil.com`,
  //      and `%2f%2fevil.com` (percent-decode first, then the same gate) WITHOUT a placeholder base.
  //   3. Fallback: Referer header, re-validated by the SAME same-origin validator against
  //      url.origin; else "/". The fallback is never attacker-controlled beyond that gate.
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

**Design notes.** Keyed by `:id` (not slug) so the endpoint never leaks slugs. The redirect
target is resolved from the validated `returnPath` body field (the single source-of-truth,
emitted by 517-02-L03's prompt form and accepted by `unlockSchema`) to a SAFE same-origin path by
an explicit origin-tied validator — `returnPath` is fully attacker-controlled and
security-load-bearing, so `resolveSafeEntryReturnPath` requires a single leading `/` (not `//`),
parses against the REAL request origin, and requires `origin === url.origin`, falling back to a
same-origin-re-validated Referer then `/` — never an attacker-supplied absolute/protocol-relative
or backslash URL (no open redirect). Do NOT reuse `normalizeFormSuccessRedirectUrl`
(`formRedirects.ts:3-24`) as-is: it hard-codes a placeholder base and its backslash behavior is
WHATWG normalization, not a structural reject. `hashEntryCookieId` is imported read-only from
517-02-L01's `entryUnlockToken.ts` (the single owner of the cookie-id hash); it is a short stable
hash of the entry id (keeps the cookie name opaque + bounded) and MUST byte-match the READ side in
517-02-L03 — see 517-02-L01. The token itself still binds the full entry id. Uniform 401 failure —
identical body AND argon2 timing (via the dummy-verify on the null-hash branch, whose hash is
produced by the LIVE `hashPassword`) — for every "cannot unlock" cause (wrong password, null hash,
non-password entry) so a probing client cannot distinguish "entry exists but wrong password" from
"entry does not exist" by response OR latency. bot/DNT-neutral; no captcha in v1 (add only if
abuse observed — noted as an open follow-up in 517-03 closure).

## Security Contract (restatement — route-touching)

- **Visibility:** public POST `/entries/:id/unlock` (new `handlePublicEntryUnlockApi`,
  dispatched before content-route match, POST-guarded).
- **Rate-limit:** `public_write` bucket, `identifier: entryId`.
- **Validation:** `unlockSchema` `additionalProperties:false` (reject-unknown 400) — accepts
  `{ password, returnPath? }` (the prompt form's `returnPath` is a declared property so the
  strict validator does NOT 400 the real form); body via `parseRequestBody`; the entry id is
  SAFE-decoded (malformed `%`-sequence → 400, never a 500). `returnPath` is same-origin validated
  by `resolveSafeEntryReturnPath` before use.
- **HMAC/cookie:** success sets `entry_unlock_<hash>` = HMAC token (517-02-L01), flags
  `HttpOnly; Secure(per COOKIE_SECURE/NODE_ENV); SameSite=Strict; Path=/; Max-Age=<TTL>` —
  `Secure` derived from the grounded `sessionService.ts:56-60` COOKIE_SECURE override, `Max-Age`
  derived from the same `resolveEntryUnlockTtlMs()` the token verifier uses (no drift).
- **Uniform failure (body + timing):** wrong password / null hash / non-password entry →
  identical 401 body AND identical argon2 cost — the null-hash branch runs a dummy
  `verifyPassword` against a LIVE-`hashPassword`-produced hash so latency does not distinguish
  "password entry exists here" from "nothing here". No existence leak by response OR by timing.
  Hash fetched ONLY via the narrow loader; NEVER returned to the client.
- **No open redirect:** `Location` is a validated same-origin path only, via
  `resolveSafeEntryReturnPath` — an explicit single-leading-slash (not `//`) + origin-compare
  against the REAL request origin, falling back to same-origin-re-validated Referer then `/`.
  This rejects the backslash / protocol-relative / encoded-double-slash / embedded-scheme vectors
  directly. It does NOT rely on `normalizeFormSuccessRedirectUrl` (which hard-codes a placeholder
  base and normalizes backslash via WHATWG parsing).

## Regression-test shape

- Endpoint-level assertions folded into the flow suite 517-02-L04 (Bun) — this leaf's endpoint is
  exercised there (rate-limit hit, reject-unknown, wrong/right, uniform failure, cookie flags,
  safe-decode 400). No separate unit file (route wiring is Bun-runtime).
- **Open-redirect guard assertions (add to 517-02-L04):** on a successful unlock, assert the 302
  `Location` falls back to a SAFE path (never the attacker host) for each of `//evil.com`,
  `/\evil.com`, `\\evil.com`, `\evil.com`, `https://evil.com`, `%2f%2fevil.com`, and a
  leading-control-char variant (e.g. `"\t//evil.com"`); and assert a legitimate `/blog/post-1`
  returnPath IS honored. This pins `resolveSafeEntryReturnPath`'s own same-origin gate (NOT the
  forms helper) so a leading-slash-only regression is caught.
- **Lane:** Bun (`tests/integration/routes/*` — the existing route-test dir — and/or
  `tests/integration/runtime/*` for the full `handlePublicRequest` flow; there is NO
  `tests/integration/site/` dir).

## Hard Invariants

1. `public_write` rate-limit + `additionalProperties:false` validation on every request; the
   entry id is SAFE-decoded (malformed encoding → 400, never 500).
2. Hash read ONLY via `getEntryAccessPasswordHash` (from `entryReadService.ts`); verified with
   `verifyPassword(hash, submitted)` (hash first); hash NEVER sent to the client.
3. Uniform 401 failure for all "cannot unlock" causes — identical BODY **and** identical argon2
   TIMING (dummy `verifyPassword` against a LIVE-`hashPassword`-produced hash on the null-hash
   branch), so neither the response nor its latency leaks entry existence.
4. Success → per-entry HMAC cookie (`HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=TTL`,
   with `Secure`/`Max-Age` derived from the grounded `sessionService.ts` COOKIE_SECURE pattern and
   `resolveEntryUnlockTtlMs()`) + `302` to a validated same-origin detail path (no open redirect),
   validated by `resolveSafeEntryReturnPath`'s explicit single-leading-slash + origin-compare gate
   — NOT by `normalizeFormSuccessRedirectUrl` (which hard-codes a placeholder base and normalizes
   backslash via WHATWG parsing).
5. Dispatched from `handlePublicRequest` before the content-route match; returns `null` when the
   path is not `^/entries/:id/unlock$`.
