# Security for Developers

Coderso installs plugins and ships content live against a database with no core rebuild, so a single weak endpoint or a leaked key has real blast radius. This page covers the security-by-default rules every contributor must follow, plus the scanners that catch mistakes before they merge.

## The golden rules

1. **Never roll your own anti-abuse flow.** Public write endpoints reuse the shared access evaluators plus the existing nonce/signature and captcha patterns. No weaker one-offs.
2. **Secrets stay on the backend, encrypted.** Provider keys, storage credentials, and privileged settings never reach the browser cache, `localStorage`, or debug/error payloads.
3. **Validate schema-first.** Reject unknown fields and normalize input at the boundary before any service logic runs.
4. **Security policy is runtime config, not code.** RBAC, CSRF, and rate limiting are stored in the DB and editable from the Admin UI — don't hardcode bypasses.

## Protecting public write endpoints

Any endpoint that accepts writes from anonymous visitors must layer the established
protections selected by the shared evaluator:

| Layer | What it does |
|-------|--------------|
| Shared access evaluators | Decide whether the request mode is allowed at all |
| HMAC nonce | Proves the request came from a real, recent page render |
| Captcha | reCAPTCHA v3 when required by the shared policy |

Public form file uploads and submissions use an HMAC nonce (`__nl_form_nonce`,
signed with `FORM_SUBMIT_NONCE_SECRET`, default 10-minute TTL via
`FORM_SUBMIT_NONCE_TTL_MINUTES`) plus the backend-owned reCAPTCHA policy. The
shared verifier used by Forms and public booking submissions accepts only a
positive finite TTL whose millisecond conversion does not exceed
`Number.MAX_SAFE_INTEGER`; absent, invalid, or overflowing configuration falls
back to 10 minutes rather than disabling nonce expiry. The separate booking-slots
read token retains its own contract. The
protected Forms paths are `POST /forms/:id/uploads` and
`POST /forms/:id/submissions`; login/reset use their separate auth/captcha flow.
Each public upload or submission request is charged to `public_write` exactly
once. A multi-file form issues one upload request per file and then one final
submission request.

When a form runs in internal mode (`submission_access=internal`), the request
must instead carry an admin session with `forms:write` plus CSRF, or an API key
with `forms.submit`; captcha is skipped by default. An authenticated cookie on a
public URL does not turn that request into an internal bypass: the request still
requires the form nonce, receives exactly one `public_write` charge, and undergoes
upload-byte inspection. The current evaluator sets `requireCaptcha=false` for
that authenticated public session; anonymous public requests retain the
configured CAPTCHA policy.

reCAPTCHA v3 is configured from Admin Settings -> Security at runtime. The
server reads bot-protection keys from backend-owned `security.settings`; only
the public site key is ever projected to the browser.

Outbound webhooks are signed with HMAC-SHA256 in the `X-Coderso-Signature` header (hex digest over `${timestamp}.${body}`). Legacy `X-Nextless-*` headers are still emitted during migration.

> Plugins get the same treatment for free: any plugin route using `POST|PUT|PATCH|DELETE` must declare a `permission`, or registration fails with `plugin_route_permission_required`. See [./runtime-model.md](./runtime-model.md) for the plugin runtime.

## Media byte and delivery boundary

Media identity is derived from complete bytes, never from the multipart filename
or declared `Content-Type`. Create and replace share one nine-profile contract:
PNG/JPEG/GIF/WebP/BMP use their canonical extensions and may be inline only after
passive-byte confirmation; PDF, strict UTF-8 text, safe standalone SVG, and
explicitly allowed octet-stream are attachment-only. Active or ambiguous markup,
polyglots, truncated/conflicting signatures, and effective-policy mismatches fail
before storage or database writes. Safe SVG and octet-stream each require an
exact canonical allowlist entry; wildcard-only policy is insufficient.

Every local, S3, or Azure runtime media response is proxied by core. Successful
`GET`/`HEAD` responses set server-owned `Content-Type`, safe
`Content-Disposition`, and `X-Content-Type-Options: nosniff`; `HEAD` also exposes
the exact persisted `Content-Length`. Asynchronous GET delivery remains streamed, so
Bun may use chunked framing; a runtime-synthesized GET length must be exact. The browser
is never redirected to a provider URL. A legacy persisted MIME/key
mismatch, or a passive-inline byte-prefix mismatch, degrades to an octet-stream
`.bin` attachment instead of inline. Canonical attachment MIME/key pairs remain
attachments; the prefix check never promotes them to inline.
Provider metadata written to the remote object is defense in depth, not the final
authority.

The public Forms upload route does not grant `media:write`. It resolves the form
and file field, applies field size/accept limits to the canonical byte identity,
and returns only an owned media-row reference. Byte inspection runs in public,
session, API-key, captcha-on, and captcha-off modes alike.
Public upload/submission may cross authorization only when the current server-owned form
is observed as both published and public. Draft/archived runtime projection, including preview, returns
no nonce. After the
single `public_write` charge, the executor rejects an initially unpublished form before
body parsing. Its narrow current status/access read immediately before dispatch is the
authorization linearization point: drift observed there rejects the stale request, while
later drift does not retroactively cancel an already authorized in-flight request.
Both Forms-write mounts retain stable named domain errors and redact every unknown
executor failure to a fixed `internal_error` response without message, stack, cause, or
dependency details, regardless of runtime mode.

## Secrets and provider keys

Secrets are backend-only and encrypted at rest. Do **not** log tokens or passwords, and never put secrets, provider keys, or privileged settings into browser cache, `localStorage`, or debug payloads.

| Concern | How it's protected |
|---------|--------------------|
| Storage (S3/Azure), SMTP, webhook secrets | AES-256-GCM (12-byte IV, 16-byte auth tag) under `MEDIA_SECRET_MASTER_KEY` (ENV, 32 bytes). Rotation requires re-entering secrets |
| PII email | `email_hash` (HMAC-SHA256 lookup) + `email_encrypted` (AES-256-GCM); keys `PII_HASH_KEY` and `PII_ENC_KEY` (fail-fast if missing) |
| Passwords | Optional pepper `AUTH_PASSWORD_PEPPER` (rotating it forces password resets) |
| API keys | Hashed with argon2id; plaintext never stored; secret shown once; 6-char prefix kept for lookup; revoke sets `revokedAt` |
| LLM provider keys | Read backend-only from encrypted integration config (e.g. integration id `openrouter`, `apiKey` encrypted); redacted in audit metadata and error payloads |

These keys are critical infrastructure ENV values, applied at boot only:

```
MEDIA_SECRET_MASTER_KEY   # master key for media/provider secret encryption (32 bytes)
PII_ENC_KEY               # AES-256-GCM key for email encryption (32 bytes)
PII_HASH_KEY              # HMAC key for email lookup hash (32+ bytes)
AUTH_PASSWORD_PEPPER      # optional password pepper
FORM_SUBMIT_NONCE_SECRET  # HMAC secret for public form nonces
```

Audit log metadata is stripped of secrets before it's written; `ip` and `userAgent` are retained.

## RBAC, CSRF, and rate limiting (runtime-configurable)

All of this middleware reads its config from the DB at runtime — there is no restart when an admin changes a policy.

```
core/server/middleware/{cors,csrf,rateLimit,securityHeaders,requestId}.ts
```

These read the JSON stored under `settings.key = security.settings`, so CORS, CSRF, rate limits, security headers, and bot protection are all reconfigurable from the Admin UI live.

**RBAC** permissions are `domain:action` strings — for example `content:read`, `content:write`, `content:publish`, `settings:read`, `settings:write`, `users:write`, `roles:write`, and `audit:read` (Admin only). The `auth` middleware checks the session; the `rbac` middleware checks the permission per route; the UI hides sections a user can't access. Enforce on the server regardless of what the UI shows.

**CSRF** tokens are fetched from `GET /admin/api/auth/csrf` (also
`GET /auth/csrf`) and sent in the `X-CSRF-Token` header on internal session-backed
writes. Public Forms upload/submission URLs use their form nonce contract even
when the browser also carries an authenticated cookie; API-key writes do not use
session CSRF.

**Rate-limit buckets** are `auth`, `admin_read`, `admin_write`, `public_read`,
`public_write`, and `assistant`. An authenticated session may follow the internal
admin policy, but it does not bypass a request selected as public mode. Exactly
one layer owns each selected bucket charge.

**Sessions** are `httpOnly`, `secure`, `sameSite=strict`, with TTL controlled by `auth.sessionTtlDays` (default 14).

## Strict, schema-first validation

Input validation happens at the route boundary, schema-first: **reject unknown
fields before normalization or service work**. Fixed unknown keys return
`validation_error`; they are not silently laundered by a normalizer. Routes are
orchestration-only — they parse and validate, then call a domain service and
translate domain errors into a uniform `ApiError` via the `map*Error` convention
(e.g. `mapMenuError` in `core/server/routes/menuRoutes.ts`). Read normalizers may
remain fail-soft for already persisted legacy documents, and sensitive direct
write services should assert the same strict shape again before their first
write.

## Scanners

Run the scanners locally before you push. The aggregate command runs everything:

```bash
bun run scan:security          # advisory: runs all scanners, succeeds unless one can't run
bun run scan:security:strict   # fail-fast, release-style
```

Individual scanners, all verbatim from `package.json`:

| Tool | Command | Covers |
|------|---------|--------|
| Semgrep (SAST) | `bun run scan:semgrep` / `scan:semgrep:strict` | `.semgrep.yml` + `p/owasp-top-ten`, `p/security-audit`, `p/nodejs`, `p/typescript` |
| Bun audit (SCA/CVE) | `bun run scan:audit` / `scan:audit:strict` | `bun audit --audit-level high` |
| Trivy | `bun run scan:trivy` / `scan:trivy:strict` | vuln + config + secret (sub-scans `scan:trivy:vuln`, `scan:trivy:config`, `scan:trivy:secret`, each with `:strict`) |
| Gitleaks (secrets) | `bun run scan:gitleaks` / `scan:gitleaks:strict` | history + worktree (`scan:gitleaks:history`, `scan:gitleaks:worktree`); config `.gitleaks.toml` |
| Image scan | `bun run scan:security:image` | opt-in; needs a built image via `SECURITY_SCAN_IMAGE` |
| SBOM | `bun run scan:sbom` | CycloneDX output to `.tmp/security-sbom.cdx.json` |

Trivy filesystem scans skip `_docs`, `node_modules`, `dist`, `build`, `.next`, and `.git`.

Any change to a scanner allowlist or config must record the **owner, reason, expiry, and ticket** — no silent suppressions.

## The security release gate

Beyond raw scanners, the `security` release gate proves the public-write hardening still holds:

```bash
bun run gates:coderso:security          # security gate only
bun scripts/coderso-release-gates.ts --gate security
```

It runs `tests/security/*` (configured captcha policy for anonymous public Forms
upload/submission and booking, the current authenticated-public-session CAPTCHA
exception without weakening nonce, exactly-one `public_write`, or byte inspection,
internal mode requiring session or API-key scope, nonce tamper rejection, and
hardened default rate-limit/bot protection). Write security tests in the Bun lane
— see [./testing.md](./testing.md).
CI also runs Semgrep, Trivy, and Gitleaks with SARIF upload and blocks PRs on
HIGH/CRITICAL findings.

## Reporting a vulnerability

Found a vulnerability? **Do not open a public issue.** Follow the private vulnerability reporting policy in [`SECURITY.md`](../../SECURITY.md) at the repo root; the security contact links also live in `.github/ISSUE_TEMPLATE/`.

## Where to go deeper

- [`_docs/SECURITY_SPEC.md`](../../_docs/SECURITY_SPEC.md) — the exhaustive security model and threat surface.
- [`_docs/RBAC_SPEC.md`](../../_docs/RBAC_SPEC.md) — full permission catalog and enforcement rules.
- [`_docs/AUTH_SPEC.md`](../../_docs/AUTH_SPEC.md) — sessions, CSRF, nonces, and credential handling.
- Sibling pages: [./testing.md](./testing.md) (where security suites and the gate run) and [./runtime-model.md](./runtime-model.md) (the no-restart model and plugin runtime).
