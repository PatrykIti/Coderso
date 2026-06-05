# Security for Developers

Coderso installs plugins and ships content live against a database with no core rebuild, so a single weak endpoint or a leaked key has real blast radius. This page covers the security-by-default rules every contributor must follow, plus the scanners that catch mistakes before they merge.

## The golden rules

1. **Never roll your own anti-abuse flow.** Public write endpoints reuse the shared access evaluators plus the existing nonce/signature and captcha patterns. No weaker one-offs.
2. **Secrets stay on the backend, encrypted.** Provider keys, storage credentials, and privileged settings never reach the browser cache, `localStorage`, or debug/error payloads.
3. **Validate schema-first.** Reject unknown fields and normalize input at the boundary before any service logic runs.
4. **Security policy is runtime config, not code.** RBAC, CSRF, and rate limiting are stored in the DB and editable from the Admin UI — don't hardcode bypasses.

## Protecting public write endpoints

Any endpoint that accepts writes from anonymous visitors must layer the established protections — in this order, never fewer:

| Layer | What it does |
|-------|--------------|
| Shared access evaluators | Decide whether the request mode is allowed at all |
| HMAC nonce | Proves the request came from a real, recent page render |
| Captcha | reCAPTCHA v3 on the public path |

Public form submission requires an HMAC nonce (`__nl_form_nonce`, signed with `FORM_SUBMIT_NONCE_SECRET`, default 10-minute TTL via `FORM_SUBMIT_NONCE_TTL_MINUTES`) **plus** reCAPTCHA v3. This applies to the public submit paths such as `POST /auth/login`, `POST /auth/reset`, and `POST /forms/:id/submissions`.

When a form runs in internal mode (`submission_access=internal`), the request must instead carry an admin session or an API-key scope, and the captcha step is skipped — the session/key is the proof of trust.

reCAPTCHA v3 is configured from Admin Settings -> Security at runtime. The
server reads bot-protection keys from backend-owned `security.settings`; only
the public site key is ever projected to the browser.

Outbound webhooks are signed with HMAC-SHA256 in the `X-Coderso-Signature` header (hex digest over `${timestamp}.${body}`). Legacy `X-Nextless-*` headers are still emitted during migration.

> Plugins get the same treatment for free: any plugin route using `POST|PUT|PATCH|DELETE` must declare a `permission`, or registration fails with `plugin_route_permission_required`. See [./runtime-model.md](./runtime-model.md) for the plugin runtime.

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

**CSRF** tokens are fetched from `GET /admin/api/auth/csrf` (also `GET /auth/csrf`) and sent in the `X-CSRF-Token` header on every `POST`/`PUT`/`DELETE`.

**Rate-limit buckets** are `auth`, `admin_read`, `admin_write`, `public_read`, `public_write`, and `assistant`. Authenticated admins bypass limits; anonymous traffic is always limited.

**Sessions** are `httpOnly`, `secure`, `sameSite=strict`, with TTL controlled by `auth.sessionTtlDays` (default 14).

## Strict, schema-first validation

Input validation happens at the route boundary, schema-first: **reject unknown fields and normalize** before handing data to a service. Routes are orchestration-only — they parse and validate, then call a domain service and translate domain errors into a uniform `ApiError` via the `map*Error` convention (e.g. `mapMenuError` in `core/server/routes/menuRoutes.ts`). Keep validation there; don't trust input deeper in the stack.

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

It runs `tests/security/*` (captcha path required for public forms/booking, internal mode requires session or API-key scope, nonce contract enforced with tamper rejection, hardened default rate-limit and bot protection). Write your security tests in the Bun lane — see [./testing.md](./testing.md). CI also runs Semgrep, Trivy, and Gitleaks with SARIF upload and blocks PRs on HIGH/CRITICAL findings.

## Reporting a vulnerability

Found a vulnerability? **Do not open a public issue.** Follow the private vulnerability reporting policy in [`SECURITY.md`](../../SECURITY.md) at the repo root; the security contact links also live in `.github/ISSUE_TEMPLATE/`.

## Where to go deeper

- [`_docs/SECURITY_SPEC.md`](../../_docs/SECURITY_SPEC.md) — the exhaustive security model and threat surface.
- [`_docs/RBAC_SPEC.md`](../../_docs/RBAC_SPEC.md) — full permission catalog and enforcement rules.
- [`_docs/AUTH_SPEC.md`](../../_docs/AUTH_SPEC.md) — sessions, CSRF, nonces, and credential handling.
- Sibling pages: [./testing.md](./testing.md) (where security suites and the gate run) and [./runtime-model.md](./runtime-model.md) (the no-restart model and plugin runtime).
