# TASK-536-04-L01: Nested Reject-Unknown and Public-Write Ownership

# FileName: TASK-536-04-L01-Nested-Reject-Unknown-And-Public-Write-Ownership.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-04
**Priority:** Critical
**Category:** Public Forms API / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-536-03-L02
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Own one access/anti-abuse and bounded-transport executor for both real Forms-write
mounts, wire the already-tested media-delivery handler into the production server, and
remove the duplicate upload limiter call. Replace the overloaded requireCaptcha result
with an explicit discriminated decision; media byte validation is no longer represented
here. This leaf does not implement nested JSON schemas despite the historical filename;
that single-writer work is isolated in L02.

## Source ownership

This leaf is the only TASK-536 writer of:

- core/server/httpServer.ts;
- core/server/requestBody.ts;
- core/services/forms/submissionAccess.ts;
- core/services/forms/submissionNonce.ts (only canonical wire parsing in the shared
  Forms/Booking nonce verifier);
- core/server/routes/formsRoutes.ts;
- core/server/publicFormsApi.ts.

It may import the existing shared CSRF helper and owns changed-behavior/compatibility
updates in `tests/unit/server/publicFormsApi.test.ts`, the existing
`tests/vitest/server/requestBody.test.ts`, the new
`tests/integration/server/formsWriteMounts.test.ts`, the direct Bun-free
`tests/vitest/forms/submissionAccess.test.ts` suite, and the affected
`tests/vitest/forms/submissionNonce.test.ts` and
`tests/security/codersoSecurityGate.test.ts` expectations before validation. It must not
edit the L03-owned `tests/unit/server/publicFormsUploadApi.test.ts` (read-only gate),
`publicSite.tsx`, `mediaDelivery.ts`, csrf.ts, mediaService.ts, formSchemas.ts,
`tests/integration/routes/forms.test.ts`, other tests, docs, task indexes, or changelog
files. It also owns a one-case full-server
assertion that `/media/*` dispatches to the TASK-536-02 handler; it may not re-baseline
that handler's direct suite.

The TASK-536 post-audit adds one narrow error-parity remediation to this existing writer
seam: `mapFormError` must map `media_file_invalid` to the canonical 400 response already
used by the stripped-admin wrapper. Its direct map assertion belongs in the already-owned
`tests/unit/server/publicFormsApi.test.ts`; root-versus-stripped HTTP parity belongs in
the already-owned `tests/integration/server/formsWriteMounts.test.ts`. The L02-owned
`tests/integration/routes/forms.test.ts` remains read-only. The existing media-service
`arrayBuffer()` rejection corpus remains the source proof that this domain error is
reachable; this fix must not duplicate or weaken byte inspection. Both changed suites
are already mandatory in this leaf's validation gate below.

## Implementation Pseudocode

~~~ts
type SubmissionAccessDecision =
  | { allow: true; mode: "public"; principal: "anonymous" | "session";
      requireFormNonce: true; requireCaptcha: boolean;
      requireSessionCsrf: false; rateBucket: "public_write" }
  | { allow: true; mode: "internal"; principal: "session";
      requireFormNonce: false; requireCaptcha: false;
      requireSessionCsrf: true; rateBucket: "admin_write" }
  | { allow: true; mode: "internal"; principal: "apiKey";
      requireFormNonce: false; requireCaptcha: false;
      requireSessionCsrf: false; rateBucket: "admin_write" }
  | { allow: false; reason: "auth_required" | "forbidden" };

type FormWriteRatePlan = Readonly<{
  bucket: "public_write" | "admin_write";
  identity: { ip?: string; userAgent?: string; identifier: string; userId?: string };
  isAuthenticated: boolean;
}>;

const UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER = "forms_write_invalid_target";

export const SUBMISSION_ACCESS_MODE_VALUES = ["public", "internal"] as const;
export type SubmissionAccessMode = (typeof SUBMISSION_ACCESS_MODE_VALUES)[number];

evaluateSubmissionAccess(input) {
  public anonymous -> allow + form nonce + configured captcha + public_write;
  public session -> allow + form nonce + public_write; do not bypass nonce because a
    cookie exists; preserve the current authenticated captcha decision explicitly;
  public bearer token -> treat as public anonymous, never an integrity bypass;
  internal session -> allow + shared CSRF + forms:write + internal/admin bucket;
  internal API key with forms.submit -> allow + internal/admin bucket, no cookie CSRF;
  otherwise stable auth_required/forbidden;
}

prepareFormWriteTarget(routeContext, serverDerivedMatch) {
  attach the session and invoke the access-target form loader exactly once;
  return a discriminated found/missing/invalid-mode target; normalize a valid
    submissionAccess only inside the found branch rather than throwing before rate charge;
  return immutable form + mode target without authenticating an API key, checking scope,
    enforcing CSRF/RBAC, or dispatching a handler;
}

resolveFormWriteRatePlan(routeContext, targetResult) {
  malformed/decode-invalid/oversized/missing-form/invalid-mode/load-failure target ->
    public_write fail-safe with exact server-owned identifier
    UNRESOLVED_FORM_WRITE_RATE_IDENTIFIER, never attacker URL/form bytes and no userId;
  public target, including cookie session or bearer header -> public_write with exact
    `{ ip, userAgent, identifier: canonical form.id }`, no userId, not authenticated;
  internal target + coherent session -> admin_write with userId and authenticated bypass;
  internal target without session, including missing/invalid bearer -> admin_write with
    `{ ip, userAgent, identifier: canonical form.id }`, no userId, not authenticated;
}

authorizePreparedFormWrite(req, routeContext, target) {
  // Called only after the one limiter invocation.
  public -> evaluate as anonymous/session while ignoring any bearer; nonce remains required;
  internal coherent session -> enforce shared CSRF first, then forms:write RBAC;
  internal without session -> authenticate API key and require forms.submit scope;
  return immutable form + final access descriptor for the handler or stable 401/403;
}

executePreparedFormWrite(req, ctx) {
  first consume every path representation the generic router would match for the existing
    POST `/forms/:id/uploads|submissions` routes (the same trailing/double-slash
    normalization and non-empty segment split); never use a narrower regex that can fall through;
  before decoding require the encoded id segment's UTF-8 byte length to be at most 108
    bytes (enough for every byte of a canonical 36-byte UUID to be percent-encoded), then
    decodeURIComponent exactly once and require
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    decode failure, encoded length >108, or malformed decoded id is still handled here;
    charge the fail-safe public_write plan exactly once, then return mapped
    form_invalid/400 rather than falling through to a generic admin route;
  try target = await prepareFormWriteTarget(routeContext, match);
  catch any safe cookie/session-resolution or access-target-load error:
    charge the unresolved sentinel public_write plan exactly once before mapping/rethrowing;
    never continue to form load after attach-session failure, and never run auth/body/handler;
  if target is missing: charge fail-safe public_write exactly once using the unresolved
    sentinel, then return form_not_found/404; never authenticate a bearer or read the body;
  if target mode is invalid: charge the same fail-safe plan exactly once, then return
    form_invalid/400 with zero auth/body/handler work;
  ratePlan = resolveFormWriteRatePlan(routeContext, target);
  invoke checkRateLimit exactly once before API-key verification, scope checks, CSRF,
    RBAC, body parsing, nonce/captcha, or handler work;
  prepared = await authorizePreparedFormWrite(req, routeContext, target);
  // Internal session ordering intentionally preserves current middleware:
  // limiter -> CSRF -> RBAC. Internal API keys are limiter -> verification -> scope.
  configuredStorageMax = await load the internal storage settings for upload only;
  if configuredStorageMax is null, non-integer, unsafe, or <= 0:
    throw mapped media_storage_unavailable/503 before reading req.body or dispatching a handler;
  body = await parseRequestBody(req, {
    maxBytes: match.kind === "submission"
      ? 1024 * 1024
      : min(configuredStorageMax, 100 * 1024 * 1024) + 64 * 1024,
    rejectDuplicateKeys: upload fixed transport keys,
    tooLargeCode: match.kind === "upload"
      ? "media_file_too_large"
      : "form_payload_too_large",
  });
  attach body + immutable prepared descriptor;
  dispatch to upload/submission handler with prepared access so it cannot drift/reload;
}

handleApi(req, apiPrefix) {
  after common request-id/CORS/security headers/IP policy, derive stripped pathname;
  call executePreparedFormWrite BEFORE generic parse/rate/CSRF;
  if matched, append common headers + access log and return; never fall through;
}

handlePublicFormsApi(req, ctx) {
  preserve the current publicSite compatibility wrapper around the same executor;
}

setParsedOwnValue(payload, key, value) {
  Object.defineProperty(payload, key, {
    value, enumerable: true, writable: true, configurable: true,
  });
  // Re-definition keeps legacy last-value-wins for unwatched duplicates while names
  // such as __proto__ remain own data and never invoke Object.prototype setters.
}

assertFormSubmissionNonce(formId, nonce, now) {
  split into exactly two segments;
  require timestampRaw matches canonical unsigned decimal grammar, parses to a safe
    integer, and String(timestamp) === timestampRaw;
  require signature is exactly 64 lowercase hexadecimal characters;
  preserve TTL/future-skew checks, form/scope binding, and timing-safe HMAC comparison;
  inherited Booking wrapper receives the identical canonical rejection behavior;
}

handleFormAttachmentUploadRoute(ctx) {
  validate transport and consume prepared form/access/field;
  if requireFormNonce:
    assert nonce;
  if requireCaptcha:
    enforce bot protection;
  // no checkRateLimit and no sniffContent flag
  uploadMedia(file, canonical constraints);
}

handleFormSubmissionRoute(ctx) {
  consume the same prepared result;
  before normalizeSubmissionBody, when the raw object is an explicit envelope whose
    `data` member is a non-array object, reject every top-level key except exactly
    `data`, `formNonce`, and `captchaToken`; JSON `{ data: {}, bogus: true }` is a 400,
    never a value that normalization can launder;
  preserve the existing flat JSON/form-urlencoded adapter: when there is no explicit
    object-valued `data` envelope, ordinary field keys remain dynamic and
    `__nl_form_nonce` continues to map to formNonce;
  independently enforce requireFormNonce and requireCaptcha;
  keep stable error mapping;
}
~~~

The prepared descriptor is request-local, immutable, and bound to the exact form ID.
"Load exactly once" in this leaf means the executor's access-target loader: route
handlers must not reload/re-evaluate access. The existing `submissionService.submitForm`
may retain its separate existence/field/media DB backstop; that defense-in-depth service
and its tests are outside L01 ownership and are not counted as a second access load.
Do not accept a caller-supplied access mode or browser access flag. Direct handler tests
construct preparation through the same helper rather than inventing a bypass. No
downstream helper can charge a bucket a second time.
`formsRoutes.ts` owns a module-private `WeakSet` of descriptors and exports a narrow
`createPreparedFormWriteDescriptor(...)` factory used by the executor. Handler guards
require WeakSet membership, exact kind, exact route ID, frozen form/access data, and
object identity; a structurally identical plain object is fabricated and rejected.

The raw explicit-envelope allowlist is a transport compatibility guard owned here because
normalization currently precedes L02 schema validation. It does not validate dynamic
submission field names or values; L02's strict normalized envelope and resolved-field
service validation remain authoritative. Do not apply the fixed-key allowlist to the
legacy flat form-urlencoded/JSON representation.

`parseRequestBody(req, options?)` remains backward compatible when no options are
provided. With a cap it checks `Content-Length`, streams at most max+1 bytes, cancels on
overflow, and reconstructs JSON/urlencoded/multipart parsing from those bounded bytes;
missing/chunked/lying lengths cannot bypass it. Duplicate `fieldName`, `file`,
`formNonce`, or `captchaToken` multipart entries reject as `invalid_form`/400 instead of
last-value-wins. Form-urlencoded and multipart parsers define dynamic keys as enumerable
own data properties rather than bracket-assigning into an ordinary object. This preserves
valid flat field names such as `__proto__`, `constructor`, and `toString` without changing
the payload prototype; duplicate unwatched keys retain their existing last-value behavior.

## Security Contract

- **Visibility:** current POST /forms/:id/uploads and /submissions only; public mode is
  nonce-protected, internal mode remains authenticated/scoped.
- **Auth/RBAC:** internal session requires forms:write; internal API key requires
  forms.submit; public mode never grants media:write.
- **CSRF:** internal session writes enforce shared CSRF. Public-mode requests, including
  cookie-bearing ones, enforce the form nonce instead of switching integrity modes.
- **Rate/anti-abuse:** exactly one selected bucket charge in the shared executor; every
  public-mode write requires nonce and the configured captcha policy, with no byte-check
  coupling. Public identities always omit `userId` and retain the form id in `identifier`.
  The charge precedes API-key verification, scope checks, CSRF, RBAC, body parsing, and
  handler work. Malformed IDs and missing forms receive one fail-safe `public_write`
  charge before their 400/404 response.
  Requests rejected by the server's outer host policy or the stripped-admin mount's IP
  allowlist never reach this executor and therefore remain owned by those outer policies.
- **Validation:** strict transport/nested schemas and service field/media ownership
  remain authoritative; prepared access is server-created and form-ID-bound.

## Errors and compatibility

Stable 401/403/429, form_nonce_invalid/expired, bot-protection, and mapped form/media
errors remain. Oversized submissions return additive `form_payload_too_large`/413;
oversized uploads retain `media_file_too_large`/413. Invalid upload storage maxima fail
before body consumption with `media_storage_unavailable`/503. One valid request with a
maxRequests=1 public_write bucket succeeds; the next equivalent request gets 429.
Handlers fail closed without the server-created prepared descriptor.

## Regression-test shape

This leaf updates only its owned public Forms, access, request-body, full-mount, and
security-gate suites before its source gate.
Required matrix:

- upload and submission each invoke public_write once through the real public adapter;
- malformed/decode-invalid/oversized IDs, missing forms, access-load failures, and invalid
  persisted modes invoke fail-safe public_write once with exact identifier
  `forms_write_invalid_target` before returning; invalid internal API keys, missing scopes, missing auth, CSRF
  failure, and RBAC failure each invoke their selected bucket once before rejection;
- with public_write maxRequests=1, two distinct malformed/oversized targets share the
  unresolved sentinel (first 400, second 429); after bucket reset, two distinct valid UUIDs
  for missing forms also share it (first 404, second 429). Invalid persisted mode and
  access-load failure assert the same exact plan with one loader call and zero
  API-key/CSRF/RBAC/body/handler work. A separate attach-session failure uses the same
  sentinel with zero form-loader/API-key/CSRF/RBAC/body/handler calls;
- maxRequests=1 permits the first upload and rejects the second;
- direct route-handler unit tests inject/acknowledge outer limiter ownership;
- direct request-body plus root/stripped-mount regressions send flat JSON,
  form-urlencoded, and multipart magic field names, asserting `Object.hasOwn`, exact
  values, an unchanged ordinary prototype, and no loss before dispatch/persistence;
- the nonce suite and security gate reject appended segments, leading-zero/noncanonical
  timestamps, unsafe/out-of-range timestamps, wrong-length/non-hex/uppercase signatures,
  and prove the Booking wrapper inherits the same failures; valid Forms and Booking tokens,
  TTL, future skew, and signature tampering remain covered;
- anonymous public requires nonce and configured captcha;
- public-mode authenticated-cookie requests still require the form nonce;
- public-mode authenticated-cookie requests pass no `userId` to the limiter and preserve
  the exact `{ ip, userAgent, identifier: form.id }` key inputs;
- valid or invalid bearer/API-key credentials presented to a public form remain a public
  principal: they cannot bypass its nonce, configured captcha decision, or public_write
  bucket through the real executor;
- internal-mode session enforces CSRF and forms:write;
- internal session rejection preserves exact limiter -> CSRF -> RBAC order; an invalid
  CSRF token must not execute RBAC, while a valid token reaches RBAC;
- internal-mode session invokes admin_write once with authenticated bypass: two requests
  still succeed when maxRequests=1; internal API keys invoke admin_write without bypass,
  so the first scoped request succeeds and the second equivalent request returns 429;
- valid/invalid API-key scopes preserve internal behavior;
- both public and stripped admin mounts traverse the same executor; matched admin writes
  never traverse generic parse/rate/CSRF, yet retain request-id/CORS/security headers and
  access logging;
- through upload and submission on both mounts, assert the injected access-target loader
  runs exactly once and the handler consumes the identical immutable descriptor; do not
  count the submission service's documented DB backstop as an access reload. Direct handlers given an
  absent descriptor, a fabricated caller descriptor, a wrong kind, or a mismatched form
  ID must fail before field lookup, nonce/captcha, submit/upload, or any second load;
- the root public wrapper keeps its current JSON/error behavior and does not acquire the
  admin IP allowlist, access-log, CORS, or request-ID wrapper merely because the executor
  is shared;
- full `Bun.serve` wiring requests
  `/media/%00unavailable/11111111-2222-3333-4444-555555555555` and expects the
  TASK-536-02 handler's 400 boundary response after its security/rate hook, with
  loadAccessMode/findRecord/adapter resolution at zero and no legacy storage I/O. This
  fallback-shaped path is intentionally impossible for the old `handleMedia` to classify
  safely and therefore proves the production dispatch changed;
- 1 MiB submission and configured/capped upload max+64 KiB reject header-declared,
  chunked, and deceptive-length overflow before handler work; multipart duplicates fail;
- direct request-body tests use controlled `ReadableStream` pull/cancel counters: a
  declared oversized Content-Length performs zero pulls; missing/lying lengths and an
  oversized first chunk stop/cancel immediately on crossing max+1; exact max succeeds;
  source review proves retained chunks are bounded to max+1 rather than concatenating an
  unbounded body before checking. Duplicate watched multipart keys return
  `invalid_form`/400 with zero handler work;
- null, zero, negative, fractional, unsafe-integer, and non-finite upload storage maxima
  return media_storage_unavailable/503 before any body read or handler call;
- explicit-envelope JSON rejects unknown top-level keys before normalization, while the
  existing flat form-urlencoded/JSON submission representation remains compatible;
- malformed/non-UUID Forms-write paths return form_invalid/400 from the shared executor,
  never fall through to the generic router, and preserve the mount's existing wrapper:
  stripped-admin retains request-id/CORS/security headers + access logging, while the root
  publicSite wrapper remains public JSON and does not gain admin-only IP/log/header policy;
- trailing/double-slash forms accepted by generic `matchRoute` are consumed by the shared
  executor too; malformed percent encoding, oversized IDs, and non-UUID IDs fail 400
  without generic parsing/handlers; pin 108 encoded UTF-8 bytes as accepted and 109 as
  rejected: a canonical UUID whose 36 ASCII bytes are all percent-encoded is the 108-byte
  case and must reach exactly one form lookup; a 109-byte segment must fail before decode,
  form lookup, body pull, or generic parse. Source review pins the explicit byte-length
  branch before `decodeURIComponent`, because 400 alone cannot distinguish it from UUID
  regex rejection;
- L01 exports the runtime submission-access values consumed by L02 instead of leaving a
  route-local enum mirror;
- every access mode still reaches unconditional byte canonicalization;
- stable error response codes remain mapped.

TASK-536-05-L01 may add cross-contract security cases later but cannot re-baseline this
access/rate-ownership matrix.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/submissionAccess.test.ts \
  tests/vitest/forms/submissionNonce.test.ts \
  tests/vitest/server/requestBody.test.ts
set -a && source .env && set +a && bun test --parallel=1 --timeout=15000 \
  tests/unit/server/publicFormsApi.test.ts \
  tests/unit/server/publicFormsUploadApi.test.ts \
  tests/integration/server/formsWriteMounts.test.ts \
  tests/security/codersoSecurityGate.test.ts
bun run gates:coderso
~~~

Re-run a named failure alone before declaring it real.

## Acceptance criteria

- Exactly one production public_write call is reachable per public Forms request.
- Every matched Forms write that passes outer host/IP mount policy and reaches the shared
  executor is charged exactly once before API-key verification,
  CSRF/RBAC, body parsing, or handler work; malformed/missing targets use fail-safe
  public_write, and internal session order remains limiter -> CSRF -> RBAC.
- Access/captcha state cannot influence media byte validation.
- Public-mode cookies do not bypass nonce; internal-mode sessions do not bypass CSRF.
- Public bearer credentials confer no integrity or limiter bypass; internal sessions keep
  the documented admin limiter bypass while internal API keys remain admin_write-limited.
- Both real mounts share exactly one mode-selected Forms security executor. The
  stripped-admin mount retains its existing common headers/IP/access-log wrapper; the root
  public mount retains its existing public JSON wrapper without adding admin-only policy.
- Body limits are enforced before unbounded parser allocation with stable 413 errors.
- Explicit submission envelopes reject unknown fixed keys before normalization; legacy
  flat submissions keep their dynamic field compatibility.
- Every Forms-write path shape is consumed once, including a malformed ID that fails 400
  without generic-router fallback.
- No endpoint, permission, scope, or nonce format is added.
