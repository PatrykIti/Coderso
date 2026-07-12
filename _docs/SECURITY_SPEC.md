# Security Spec (v1)

Zakres: podstawowe zabezpieczenia w core. Rozszerzenia przez pluginy.

## Middleware (core)

- Request ID: generowany per request, logowany.
- Rate limiting: bucket-based limits dla auth/admin/public (admin nie limituje zalogowanych uzytkownikow).
  - Buckety: `auth`, `admin_read`, `admin_write`, `public_read`, `public_write`, `assistant`.
  - Auth: limit po `email + IP` (identifier) z domieszka `User-Agent`.
  - Public: read ma wyzszy limit niz write.
  - Admin: authenticated bypass, anonimowe requesty nadal limitowane.
- CORS: tylko zaufane originy dla admina.
  - `Access-Control-Allow-Origin` is emitted from configured trusted origins or
    literal `*`; raw request origin casing is not reflected back as the header
    value.
  - Wildcard origins do not emit `Access-Control-Allow-Credentials`.
- CSRF: token dla POST/PUT/DELETE w admin.
  - Token pobierany z `GET /admin/api/auth/csrf`.
  - UI dodaje `X-CSRF-Token` do mutacji.
- Bot protection (reCAPTCHA v3):
  - `POST /auth/login` i `POST /auth/reset` uzywaja wlasnego auth/captcha flow.
  - Publiczne `POST /forms/:id/uploads` i `POST /forms/:id/submissions` uzywaja
    tego samego Forms access evaluatora, form-bound HMAC nonce
    (`__nl_form_nonce`, `FORM_SUBMIT_NONCE_SECRET`, TTL domyslnie 10 minut) i
    backend-owned captcha policy.
  - Wspolny verifier nonce dla Forms i publicznego zapisu rezerwacji akceptuje
    tylko dodatni, skonczony TTL, ktorego przeliczenie na milisekundy nie
    przekracza `Number.MAX_SAFE_INTEGER`; brak, invalid albo arithmetic-overflow
    konfiguracji wraca do stalego TTL 10 minut zamiast wylaczac wygasanie nonce.
    Osobny token odczytu slotow zachowuje wlasny kontrakt.
  - Cookie zalogowanego admina nie zmienia publicznego URL-a w internal bypass:
    public mode nadal wymaga nonce, dokladnie jednego naliczenia `public_write` i
    bezwarunkowej inspekcji bajtow uploadu, ale aktualny evaluator ustawia dla tej
    uwierzytelnionej publicznej sesji `requireCaptcha=false`. Anonimowe publiczne
    requesty zachowuja skonfigurowana CAPTCHA policy; public mode nie pobiera admin
    CSRF tokenu.
  - Internal forms require an admin session with `forms:write` plus CSRF or an
    API key with `forms.submit`; captcha is skipped by default.
  - Kazdy public upload/submission request nalicza bucket `public_write`
    dokladnie raz. Uploady wielu plikow sa osobnymi requestami; adapter publiczny
    i route handler nie moga naliczac tego samego requestu ponownie.
  - Score thresholds per action (login/reset/public_write).
  - Moze byc wlaczone w dev (opcja `enforceOnLocalhost`).
  - Konfiguracja reCAPTCHA jest backend-owned i pochodzi z
    `security.settings.botProtection`; klucze reCAPTCHA nie sa bootstrapowane z
    ENV. Publiczny endpoint zwraca wylacznie safe `siteKey`, a `secretKey`
    pozostaje backend-only.
- Security headers:
  - Content-Security-Policy (basic)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
- HTTPS w produkcji (HSTS zalecany).

## Container runtime

- Production Docker runner images must run as a non-root user.
- Current core runtime image copies app files as `bun:bun` and starts
  `server/prod.ts` as `USER bun`.
- Build stages may use root for dependency installation/build steps, but the
  final runtime process must not run as root.

## Release Gate Security Checks (Coderso)

Security gate automation is defined in:
- `_docs/CODERSO_RELEASE_GATES.md`
- `tests/security/codersoSecurityGate.test.ts`

Mandatory baseline verified by gate suite:
- anonymous public submission modes (`forms`, `booking`) retain their configured
  captcha path; authenticated public Forms requests retain nonce, exactly-one
  `public_write`, and upload-byte inspection while the current evaluator sets
  `requireCaptcha=false`,
- internal submission modes require session or API key scope,
- nonce contracts reject missing/tampered tokens,
- default rate-limit and bot-protection thresholds remain hardened.

Related gate suites executed by runner:
- `tests/unit/security/rateLimit.test.ts`
- `tests/vitest/forms/submissionNonce.test.ts`
- `tests/unit/server/publicBookingApi.test.ts` when `DATABASE_URL` is available

### CI and Local Security Gate (SAST/SCA/Secrets/CVE)

Automated CI gate blocks PRs on critical/high findings:
- SAST: Semgrep (`.semgrep.yml` + OWASP/security packs).
- SCA/CVE: Bun audit plus Trivy filesystem lockfile scans (`.trivyignore` for time-boxed exceptions).
- Misconfiguration: Trivy config scan for Docker/IaC-style files.
- Secrets: Trivy filesystem secret scan plus Gitleaks history and worktree scans (`.gitleaks.toml` allowlist config).
- SARIF uploads use `github/codeql-action/upload-sarif@v4` and require
  `actions: read`, `contents: read`, and `security-events: write` permissions.
- Gitleaks Action v2 is configured through environment variables, not `with`
  inputs. CI sets `GITHUB_TOKEN`, `GITLEAKS_CONFIG=.gitleaks.toml`, disables PR
  comments, and leaves the action SARIF artifact upload enabled.
- Trivy CI uses two action invocations: a non-blocking SARIF generation step
  with `exit-code: "0"` and `limit-severities-for-sarif: true`, followed by a
  blocking table-output gate with `exit-code: "1"` for HIGH/CRITICAL findings.
  This keeps Code Scanning uploads available while making failing findings
  visible in the Actions log.
- CI security scanning runs inside `.github/workflows/coderso-pr-gates.yml`
  after the Vitest and Bun lanes pass, and before the final Coderso release
  gates job.

Local runbook:
```bash
pip install semgrep
semgrep --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit --config p/nodejs --config p/typescript
bun audit --audit-level high
trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .
trivy config --severity MEDIUM,HIGH,CRITICAL --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next .
trivy fs --scanners secret --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .
gitleaks git --config .gitleaks.toml --redact=100 .
gitleaks dir --config .gitleaks.toml --redact=100 .
```

Convenience package scripts wrap the same scanner commands when the CLIs are
available on `PATH`:
```bash
bun run scan:security
bun run scan:security:strict
bun run scan:security:image
bun run scan:semgrep
bun run scan:semgrep:strict
bun run scan:audit
bun run scan:audit:strict
bun run scan:trivy
bun run scan:trivy:strict
bun run scan:trivy:vuln
bun run scan:trivy:vuln:strict
bun run scan:trivy:config
bun run scan:trivy:config:strict
bun run scan:trivy:secret
bun run scan:trivy:secret:strict
bun run scan:gitleaks
bun run scan:gitleaks:strict
bun run scan:gitleaks:history
bun run scan:gitleaks:history:strict
bun run scan:gitleaks:worktree
bun run scan:gitleaks:worktree:strict
bun run scan:sbom
```

`scan:security` uses `scripts/run-security-scan.ts` and runs every configured
scanner even if one scanner reports findings. Advisory mode prints all scanner
output and exits successfully unless a scanner cannot run. `scan:security:strict`
uses the same matrix but fails on blocking Semgrep findings, HIGH/CRITICAL Bun
audit or Trivy vulnerability findings, MEDIUM/HIGH/CRITICAL Trivy misconfig
findings, or Gitleaks leaks. Use advisory scripts for local triage and strict
scripts for release/CI-style verification.

Container image scanning is opt-in because it requires a built image:
```bash
SECURITY_SCAN_IMAGE=coderso:local bun run scan:security:image
```

Trivy local scan scope:
- Owner: Platform/Security.
- Reason: Trivy local SCA and secret scope should match the non-runtime path exclusions from `.semgrep.yml`. `_docs/` contains documentation, reference fixtures, and vendored UI snapshots; `node_modules`, `dist`, `build`, `.next`, and `.git` are generated/dependency/build/history output paths rather than source-of-truth runtime lockfiles. Git history is covered separately by Gitleaks.
- Scope: local `scan:trivy`, `scan:security`, and strict package scripts skip `_docs`, `node_modules`, `dist`, `build`, `.next`, and `.git` for filesystem scans. Trivy config scans skip `_docs`, `node_modules`, `dist`, `build`, and `.next`.
- Expiry/review: review this exclusion by 2026-07-14 or when `_docs/` starts carrying runtime-installed packages.
- Ticket: scanner baseline follow-up from `TASK-174` closure / changelog 643.

Gitleaks local scan scope:
- Owner: Platform/Security.
- Reason: `gitleaks git` owns Git history scanning, while `gitleaks dir` owns current worktree scanning. `.git` internals are excluded from directory scanning to avoid duplicate object scanning; vendored Gutenberg UI snapshots and generated output paths stay allowlisted.
- Scope: `.gitleaks.toml` allowlists `.git`, `node_modules`, `_docs/UI/gutenberg-trunk`, `dist`, `build`, and `.next`.
- Expiry/review: review this exclusion by 2026-07-14 or when generated/vendor paths start carrying deployable source.
- Ticket: `TASK-217` scanner baseline hardening.

Semgrep local suppressions:
- Owner: Platform/Security.
- Rule: `javascript.express.security.cors-misconfiguration.cors-misconfiguration`.
- Location: `core/server/middleware/cors.ts`.
- Reason: `Access-Control-Allow-Origin` is emitted from a value selected out of configured trusted origins or literal `*`; raw request origin casing is not reflected after validation. Semgrep cannot infer the trusted-origin map.
- Expiry/review: review by 2026-07-14 or when CORS configuration is refactored.
- Ticket: `TASK-176-04` / scanner baseline follow-up.

### Konfiguracja runtime (Admin UI)

- Wszystkie ustawienia middleware sa trzymane w DB (`settings.key = security.settings`).
- reCAPTCHA v3 jest konfigurowana w `security.settings.botProtection`; publiczny
  endpoint zwraca wylacznie safe `siteKey`, a `secretKey` pozostaje
  backend-only.
- Zmiany wchodza w zycie bez restartu (runtime config).
- Zakres konfigurowalny z panelu:
  - requestId (enabled, headerName)
  - csrf (enabled, headerName, tokenTtlMinutes)
  - cors (allowedOrigins, allowCredentials, allowedMethods, allowedHeaders, maxAgeSeconds)
  - rateLimit (enabled, bucket limits)
  - botProtection (reCAPTCHA v3, thresholds, enforceOnLocalhost)
  - headers (frameOptions, referrerPolicy, CSP, HSTS, itd.)
  - session (ttlDays, maxPerUser, singleSession)
  - loginAlerts (notifyOnNewDevice, notifyOnNewLocation)
  - plugins (safeMode)
  - validation (rejectUnknownFields)

### Browser cache dla Settings

- Admin Settings moze uzywac tylko redacted browser cache
  (`settings:redacted`) dla nie-sekretnych wartosci UX i boolean-only
  configured flags.
- Cache payload jest allowlistowany, schema-versioned i walidowany przeciwko
  kluczom `password`, `secret`, `token`, `accessKey`, `connectionString` oraz
  `apiKey`.
- Raw SMTP/storage/integration/webhook/API-key credentials, bot-protection
  secret, provider keys, session/csrf material i inne sekrety nie moga trafic
  do `localStorage`, debug payloadow ani cache-bus eventow.
- Credential-bearing Email Settings and Integrations endpoints return only
  configured flags for SMTP passwords and provider secrets such as
  `resend.apiKey`.
- Credential-bearing Settings endpoints pozostaja uncached w browser storage;
  mutacje moga co najwyzej zaktualizowac redacted configured flags.

Uwaga: header CSRF jest weryfikowany na podstawie tokenu z prefiksem timestamp (`<ts>.<token>`),
co pozwala egzekwowac TTL bez dodatkowych kolumn w DB.

## Input validation

- JSON schema validation dla payloadow admin API.
- Odrzucenie nadmiarowych pol (strict).

## Internal service layer

- Internal layer nie jest publiczny, ale wciaz wymaga walidacji i RBAC.
- Brak bezposredniego dostepu z zewnatrz.

### Custom Screens admin API (TASK-054-22-02)

- Endpointy (internal):
  - `GET /admin/api/custom-screens`
  - `GET /admin/api/custom-screens/:id`
  - `POST /admin/api/custom-screens`
  - `PATCH /admin/api/custom-screens/:id`
  - `DELETE /admin/api/custom-screens/:id`
- RBAC: `content:read` dla odczytu, `content:write` dla mutacji.
- Rate-limit: `admin_read` / `admin_write`.
- Brak public write; nonce/HMAC/reCAPTCHA nie dotyczy.

### Redirects admin API and public runtime

- Endpointy CRUD sa internal-only:
  - `GET /admin/api/redirects`
  - `POST /admin/api/redirects`
  - `PATCH /admin/api/redirects/:id`
  - `DELETE /admin/api/redirects/:id`
- Auth/RBAC:
  - admin session cookie,
  - `settings:read` dla listy,
  - `settings:write` dla create/update/delete.
- CSRF:
  - wymagany dla `POST`, `PATCH`, i `DELETE`.
- Rate-limit:
  - `admin_read` / `admin_write` dla CRUD,
  - public redirect lookup korzysta z public request path i nie dodaje public
    write surface.
- Validation:
  - strict schema odrzuca unknown fields,
  - `fromPath` i `toPath` sa ograniczone do wewnetrznych sciezek,
  - absolute/protocol-relative/backslash destinations sa odrzucane, aby
    zapobiec open redirect,
  - self-loop i redirect-chain loop sa blokowane.
- Runtime hardening:
  - public lookup wykonuje tylko wlaczone rekordy i nie ujawnia admin payloadow,
  - public API, preview i site assets nie sa shadowowane przez redirect rows,
  - loop lub unsafe legacy target fail-closed przez HTTP `508`.
- Anti-abuse:
  - nonce/HMAC/reCAPTCHA nie dotycza, bo nie dodano public write.

## File uploads

- Limit size per file.
- Dozwolone MIME types sa porownywane z kanonicznym typem ustalonym z bajtow,
  nie z nazwy pliku ani deklarowanego `Content-Type`.
- Skanowanie antivirus (opcjonalnie; plugin).
- Sekrety storage (S3/Azure) przechowywane sa zaszyfrowane w DB.
- Master key do szyfrowania: `MEDIA_SECRET_MASTER_KEY` (ENV, poza DB).

### Form `file` field & public upload route (TASK-516-07)

The `file` form-field type accepts values on the PUBLIC submission path, so it is
validated as an **owned media reference**, never as a free path/URL/bytes:

- `POST /forms/:id/uploads` is form-scoped and reuses the form's OWN submission
  access gate. Public mode requires the current server-owned form to remain published,
  uses the runtime-issued HMAC form nonce and one
  `public_write` rate-limit charge keyed by form id. Anonymous public requests
  retain the configured CAPTCHA policy; for an authenticated public session the
  current evaluator sets `requireCaptcha=false`. Internal mode uses its
  session/CSRF or API-key contract. Neither grants `media:write`. Byte
  canonicalization runs for anonymous, cookie-bearing, session, API-key,
  captcha-on, and captcha-off requests alike; authentication state never disables
  inspection. Draft/archived runtime projection mints no nonce, including preview. A
  narrow current status/access read immediately before dispatch is the authorization
  linearization point: state drift observed there rejects the request; later drift does
  not retroactively cancel an already authorized in-flight request. Per-field `accept` (MIME
  allowlist, `image/*` wildcards via the shared `mimeMatchesAccept` leaf) and
  write-valid `maxSizeMb` (`1..100`) are enforced against the canonical result in
  `mediaService.uploadMedia` via a `constraints` param.
- Root and stripped-admin Forms writes share one response boundary. Stable domain errors
  keep their named code/status; every unmapped executor failure becomes fixed
  `internal_error`/500 before serialization, so non-production responses cannot expose a
  dependency message, stack, cause, connection string, or arbitrary details.
- The submitted value is stored/accepted only as a media ROW id (or id array for
  `multiple`). `submissionService` normalizes the value to an id/array, then the
  DB-backed backstop `verifyFileReferences` re-resolves each id via `getMediaById`
  and rejects unknown/cross-origin ids, wrong MIME, or oversize as
  `form_payload_invalid` — defence-in-depth even if the upload path was bypassed.
- Uploaded rows are tracked with a `"submission"` media-usage variant.

The same byte-authoritative create/replace contract selects one of nine canonical
profiles: PNG/JPEG/GIF/WebP/BMP are passive-inline candidates; PDF, strict UTF-8
plain text, safe standalone SVG, and explicitly allowed octet-stream are
attachment-only. Active/ambiguous markup, conflicting/truncated signatures, and
policy mismatches fail before storage/DB. Original filename remains bounded
display/download metadata only. Safe SVG and octet-stream each require an exact
canonical allowlist entry; a wildcard alone cannot authorize them.

Every local/S3/Azure media `GET`/`HEAD` is a final core-proxied response with
server-owned `Content-Type`, safe `Content-Disposition`,
`X-Content-Type-Options: nosniff`, and an exact persisted length on `HEAD`.
Asynchronous GET bodies stay provider-neutral and streamed; Bun may use chunked
framing, and any runtime-synthesized GET length must equal persisted size. Provider
URLs and provider response metadata never bypass this boundary. A legacy persisted
MIME/key mismatch, or a passive-inline byte-prefix mismatch, falls back to an
octet-stream `.bin` attachment rather than inline. Canonical attachment
MIME/key pairs remain attachments; delivery does not promote them to inline
based on a prefix.

Public Forms uploads create media before the final submission. A visitor who
abandons the flow can therefore leave an unreferenced media row/object. TTL or
pending-upload cleanup remains the explicit TASK-516-07 residual; TASK-536 does
not claim it as implemented.

### Form theme colors on the public render path (TASK-516-01)

`forms.settings.theme` color tokens flow through `PATCH /forms/:id` into the
PUBLIC Form block/section runtime inline `style`. The direct write and
persisted-read boundaries use the Bun-free canonical parser in
`core/services/theme/cssColorContract.ts`; the retained Form Embed bridge uses
that same owner through `resolveClearableCssColorValue`. Form is the explicit
TASK-516 end-to-end `inherited-render` exception, so canonical `currentColor` and
`inherit` are accepted together with the ordinary safe color grammar. The
builder canvas, runtime preview, resolver, and public renderer must keep that
same profile instead of narrowing or widening it per consumer.

Fixed write objects are strict: unknown keys and out-of-enum values fail route
validation with `validation_error` before service logic. The schema pattern and
128-code-unit cap are structural guards, not a semantic CSS parser; the shared
parser still rejects controls/non-ASCII input, invalid function arity and numeric
ranges, and dangerous or unknown functions before persistence or inline-style
emission. Field-by-field fail-soft normalization remains only for
non-destructive legacy/read defense, never as raw pass-through. Present-only
emission still omits unauthored keys.

### Master key (storage secrets)

`MEDIA_SECRET_MASTER_KEY` to klucz master do szyfrowania/odszyfrowywania sekretow
S3/Azure zapisywanych w DB. Bez niego runtime nie odszyfruje rekordow.
Storage secrets use AES-256-GCM with 12-byte IVs and explicit 16-byte
authentication tags; decrypt paths reject malformed IV/tag lengths before
authentication.

Akceptowane formaty (32 bajty):
- 64‑znakowy hex
- base64 o dlugosci 32 bajtow
- dokladnie 32 znaki ASCII

Przyklady generowania:

```bash
# 32 bajty w base64
openssl rand -base64 32

# 32 bajty w hex (64 znaki)
openssl rand -hex 32
```

Rotacja klucza:
- Po zmianie klucza musisz ponownie wpisac wszystkie sekrety w Admin UI
  (zostana zaszyfrowane nowym kluczem).
- Jesli zmienisz klucz bez ponownego zapisu sekretow, konfiguracja storage
  stanie sie nieczytelna do czasu ich ponownej edycji.

## Email encryption (PII)

- Emails w `users` sa trzymane jako:
  - `email_hash` (HMAC-SHA256) do lookupu,
  - `email_encrypted` (AES-256-GCM) do odczytu w UI,
  - `email` jest nadpisywany hash-em dla kompatybilnosci.
- Wymagane ENV: `PII_HASH_KEY`, `PII_ENC_KEY` (32 bajty).
- Bez kluczy system powinien fail-fast.
- Email encryption uses 12-byte IVs and explicit 16-byte AES-GCM authentication
  tags; malformed IV/tag lengths are rejected before decrypting.

## Secrets

- Nigdy nie logujemy tokenow/hasel.
- ENV tylko po stronie serwera.
- Opcjonalny pepper do hasel: `AUTH_PASSWORD_PEPPER` (rotacja wymaga resetu hasel).
- Hasla SMTP sa szyfrowane w DB (AES-256-GCM) tym samym master key.
- Resend API keys sa konfigurowane jako encrypted integration secret
  `resend.apiKey`, redagowane jako `re_...`, i nigdy nie sa zapisywane w Email
  Settings ani zwracane do admin browser payloadow.
- Resend email egress uzywa stalego backend-only endpointu
  `https://api.resend.com/emails` z `Authorization: Bearer ...`, wymaganym
  `User-Agent`, opcjonalnym `Idempotency-Key` ograniczonym do 256 znakow, i bez
  konfigurowalnego `baseUrl`.
- Delivery logs moga zapisywac provider, recipient, subject, status, message id
  i redagowany/blokowany blad, ale nie credential payloady ani upstream bearer
  material.
- Klucze providerow LLM (np. OpenAI/OpenRouter) traktujemy jak sekrety:
  - trzymane poza frontendem i poza plain text w logach,
  - redagowane w audit metadata oraz error payloadach.

## Post rich-text rendering

- Post editor previews and public post runtime must not pass raw user HTML to
  React `dangerouslySetInnerHTML`.
- Rich-text content is normalized through `sanitizePostRichTextHtml` and rendered
  as React nodes through the post rich-text renderer.
- Allowed formatting is limited by `postRichTextSchema.ts`; scripts, event
  handlers, unsafe URLs, forbidden elements, and malformed unsupported tags are
  stripped before render.

## Pages embed rendering

- Page v2 embed blocks may render sanitized inline embed markup only through
  `sanitizePageEmbedHtml`, backed by the shared rich-text sanitizer policy.
- The Pages embed allowlist is intentionally narrow: textual layout tags and
  safe links only. Script-capable tags, event handlers, unsafe URLs, forms,
  frames, and unknown attributes are stripped before public render.
- Sanitized inline embed markup is rendered as tokenizer-derived React nodes,
  not through `dangerouslySetInnerHTML`; anchor attributes are rebuilt from the
  sanitized allowlist.
- Provider embeds must use hardened first-party resolver output such as the
  YouTube iframe URL resolver; arbitrary iframe HTML from page data is not a
  public runtime contract.

## Pages editor text and ids

- Page v2 block and section ids are generated from Web Crypto only
  (`randomUUID` or `getRandomValues`) and fail closed when secure randomness is
  unavailable.
- Duplicate page slug suffixes use the same secure random fragment helper; do
  not use `Math.random()` for Page identifiers, slugs, preview tokens, or other
  user-visible collision guards.
- Page editor inline text commits remain plain text. The commit sanitizer uses
  scanner/token handling to drop complete and unterminated HTML comments,
  dangerous element content, element-shaped tags, remaining raw angle brackets,
  and control characters before values re-enter the Page document.
- Prototype or reference HTML in `_docs/UI` must construct dynamic text with
  DOM nodes and `textContent`; do not interpolate DOM text into `innerHTML`.

## Pages authoring sanitizer boundary

- `core/services/pages/pageAuthoringSanitizers.ts` owns browser-safe sanitizer
  helpers for Page authoring URL, media URL, CSS color, CSS background, and
  CSS string escaping. Admin authoring modules, Page document normalizers,
  responsive CSS emission, and Page renderer sinks must reuse these helpers
  instead of accepting raw strings at render or persistence boundaries.
- Page authoring link normalization is Page-owned through
  `normalizeAuthoringSafeHref`; Page Editor canvas code must not import
  widget-core helpers for link sanitization.
- Link sinks (`href`, list item hrefs, button hrefs) allow safe relative,
  hash, `http:`, `https:`, `mailto:`, and `tel:` values only. Media sinks
  (`src`, `image`, `url`, gallery item sources, iframe source output from
  trusted runtime bindings) allow safe relative or `http(s)` values and reject
  script-capable protocols.
- CSS sinks (`style.background`, `backgroundImage`, block `textColor`,
  block `style.surfaceTint` (TASK-524-02 — the independent, alpha-capable glass
  glow tint, sanitized via `sanitizeAuthoringCssColor` at the write boundary,
  present-only/omitted on a bad value so it fails closed to the reference-literal
  CSS fallback and is emitted only as the already-validated `--surface-glow`/
  `--deco-ring`/`--orb-color` custom properties, never a raw declaration — at both
  the inline base and the per-breakpoint `pageResponsiveCss.ts` retarget),
  block/section accent, block border colors, responsive CSS custom property
  values) are normalized through color/background policies before persistence
  and escaped before `url("...")` emission. Gradient authoring composes
  linear/radial CSS from ordered sanitized stops and re-validates the final
  string; arbitrary `url()`/function escapes are not accepted. Block background
  images use the same media URL policy as section background images and paint
  only escaped `url("...")` values. `url(javascript:...)`, expression-like CSS,
  protocol-relative media, and event-handler payloads fail closed to `null` or
  the documented default.
- The supported Page admin color control now commits through the shared
  canonical `authoring` profile. This browser adapter is not the backend trust
  boundary: persistence and rendering still re-check through the independent
  legacy Page sanitizer. That sanitizer allows only
  `var(--color-primary|secondary|accent|bg|surface|text|border)` for token
  references and rejects arbitrary `var()` expressions, URLs, delimiters, and
  unsafe functions. Its separate alphabetic named-value branch still retains
  current backend compatibility for values including `currentColor` and
  `inherit`, and its functional branch is not yet the shared parser's semantic
  range contract. Do not claim server-side shared-parser enforcement from the
  admin control alone. TASK-539-02-L01 owns importing the shared parser while
  retaining the exact seven-token filter and Page-specific
  background/composite rules.
- Page text marks (`heading`/plain `text`/`quote` `props.marks`) stay as
  bounded JSON ranges, not raw HTML. Color/highlight mark colors normalize
  through the CSS color sanitizer; link mark hrefs normalize through the Page
  authoring link sanitizer. Stored marks are re-normalized before render, and
  the renderer emits only React `<strong>`, `<em>`, safe `<a rel="nofollow
  noreferrer">`, or validated `<span>` segments without broadening the
  rich-text `span/style` allowlist.
- Page Editor clipboard paste treats every fragment as untrusted input. The
  `coderso/page-fragment@v1` payload is browser/session local, is never a
  persistence format, regenerates ids on paste, and re-runs Page document
  normalization before insertion.
- Native Page badge block colors (`props.background`, `props.textColor`) reuse
  the same CSS color sanitizer, and badge icons are fixed allowlist tokens
  (`check`, `sparkles`, `star`, `zap`, `shield`, `heart`) mapped to local
  components. Unknown icons normalize to `null`; no dynamic component lookup or
  string-evaluated icon render is allowed.
- Renderers keep defense-in-depth sanitization even when upstream
  normalization already ran. New Page v2 render sinks must add regression
  coverage in the Vitest sanitizer/XSS suites and keep local Semgrep/security
  scans clean without scanner suppressions.

## Pages custom-SVG sanitizer and renderer boundary (TASK-522, TASK-538)

- Treat every `customSvg` Page block `svg` value as untrusted author text. The Page
  write normalizer and renderer both call the same dependency-free sanitizer; the
  second call is a defence-in-depth boundary for legacy or externally modified rows.
  A 24 KiB isomorphic byte cap applies before parsing. Invalid, malformed, or
  over-limit input fails closed to a neutral placeholder rather than partially
  rendered markup.
- `svgSanitizerPolicy.ts` is the single immutable, closed policy for accepted tag names,
  source attribute names, namespaces, and local references. Its exported collections
  are frozen. Author-controlled `class` and `style` are excluded at every element, and
  no author-class exception or author-selected attribute expansion is permitted.
- `buildSafeSvgTree` consumes sanitizer output through a strict parser with no browser
  error recovery. It rechecks the closed policy, entities, namespaces, and local
  references; enforces 2,048 element nodes, depth 64, and 8,192 decoded text characters;
  and returns a deeply frozen plain-data tree. Any sanitizer/parser disagreement also
  fails closed.
- The renderer creates React elements only from that tree. A complete, explicit
  source-attribute-to-React-prop map copies only present safe values, so neither an
  arbitrary prop spread nor author-data `dangerouslySetInnerHTML` is part of the
  `customSvg` branch.
- Before root layout attributes are removed, the renderer snapshots a trusted aspect
  ratio from an exact finite four-number `viewBox`, with positive finite `width` and
  `height` as the fallback. It then removes root `x`, `y`, `width`, `height`, and
  `transform`, sets a renderer-owned `width: 100%`, clamps the ratio to 1/8..8, and
  caps block size at 1,024 px. Safe descendant drawing geometry remains available.
- The renderer-owned wrapper clips overflow, applies `contain: layout paint`, and
  disables pointer events; the root SVG also clips overflow and disables pointer
  events. These controls are fixed renderer props and cannot be overridden by author
  markup.
- Verification covers write-to-render behavior, editor rendering, and the published
  and preview runtime paths. Closure additionally requires narrow- and wide-viewport
  browser smoke to confirm contained geometry, click-through behavior outside the
  complete Page block frame, and zero console errors; test evidence must remain
  redacted and must not document an actionable reproduction.
- Decoration/tilt/surface/hover/marquee/composition/layer config values are
  reject-unknown allowlisted enums (`normalizeEnum`, fail-CLOSED) + `readNumber`
  clamps; colors run through `readSafeColor`. They reach CSS only as bounded numbers /
  validated colors / fixed class + data-attribute tokens — never string interpolation.
  The block-tilt runtime is a STATIC dependency-free IIFE reading only validated DOM
  `data-*`/CSS custom properties, emitted via static-`__html` `dangerouslySetInnerHTML`,
  never interpolating stored data.

## Page canvas background color boundary (TASK-523)

- `settings.background` (per-page canvas background) is a CSS sink and reaches the page
  `<Root>` inline `style.background`. It is validated by the SINGLE color/gradient path
  `sanitizeAuthoringCssBackground` at BOTH write (`normalizeSettings`) AND render
  (`PageDocumentRender`, defence in depth — React SSR does not block a `;`-delimited CSS
  injection in a `style` value). A value that fails the sanitizer returns `null` and the
  key is dropped (fail-soft); no raw stored string ever reaches a CSS declaration.
- **Gradient hardening.** `isSafeAuthoringCssGradient` rejects any `url(` token AND is a
  SINGLE-gradient guard (`isSingleGradientLayer`: exactly one gradient head + its balanced
  parens, with nothing after the matching close paren). The gradient charset excludes
  `;`/`{`/`}`/`<`/`>`/`:` (no declaration or `</style>` breakout). This closes the nested
  `radial-gradient(circle,url(//x))` case and, per-layer, the `url()`-layer fetch surface.
- **Multi-layer background allowlist (TASK-531 — the one new attack surface).**
  `sanitizeAuthoringCssBackground` now ACCEPTS a COMMA-SEPARATED list of safe gradient/color
  layers (glow-over-gradient — the reference `.cta-card`/`art-*` look) via
  `isSafeAuthoringCssBackgroundLayers`. The relaxation is an **ALLOWLIST applied per
  top-level comma-split layer** (NOT a loosened regex, NOT a denylist), NOT a widening of
  `isSingleGradientLayer` (unchanged — still the per-layer guard, now called PER layer):
  - a **whole-value tripwire pre-pass** runs FIRST and fails closed on any
    `url(`/`image-set(`/`image(`/`element(`/`cross-fade(`/`@import`/`expression(`/
    `behavior:`/`-moz-binding`/`javascript:`/`vbscript:`/`data:` anywhere in the value;
  - the value is split at **depth-0 commas only** (a comma inside a gradient's own parens
    stays with its layer — never a naive `split(",")`);
  - EVERY split layer must independently pass `isSafeAuthoringCssColor` OR
    `isSafeAuthoringCssGradient`, so a `url(...)`/`image-set(...)`/non-color-non-gradient
    layer fails (a `url()` layer is neither), and the layer count is capped at
    `PAGE_BG_MAX_LAYERS` (6);
  - the whole value is length-capped at `PAGE_CSS_VALUE_MAX_LENGTH` (512) BEFORE any regex
    runs (algorithmic-complexity / ReDoS defence — the `rgb()`/`hsl()` charset patterns also
    dropped a redundant leading `\s*` that could backtrack); it fails CLOSED on any bad
    layer / over-cap / tripwire hit. This keeps `linear-gradient(...),
    url(//evil.example/beacon.png)` and every `url()`/`javascript:`/`@import`/`expression(`
    layer REJECTED (asserted by the TASK-523 outbound-beacon suite, which stays green). The
    single-layer fast path is UNCHANGED (byte-identical), so no existing single-layer
    document changes behavior. The hardening is a single-writer change in
    `pageAuthoringSanitizers.ts` and applies to EVERY caller of
    `sanitizeAuthoringCssBackground` (page canvas background + all TASK-522/531 background
    authoring).
- **Two render boundaries relax in lockstep on the SAME validator.** A multi-layer value
  must PAINT, so both render paths re-gate through `isSafeAuthoringCssGradient(safe) ||
  isSafeAuthoringCssBackgroundLayers(safe)` — never a value the write boundary rejects:
  1. the SSR inline-style path (`toGradientBackground`, `pageRendererV2.tsx`), whose output
     lands in a React-escaped `CSSProperties` object; and
  2. the per-device RAW `<style>` path (`pageResponsiveCss.ts`), which emits declarations
     UN-escaped via `dangerouslySetInnerHTML` — there the whole-value tripwire baked into
     `isSafeAuthoringCssBackgroundLayers` is LOAD-BEARING. That module keeps
     `isSafeCssGradient` as the single-layer alias and routes multi-layer through a separate
     `isSafeCssBackgroundValue` helper with a code-comment FORBIDDING a naive re-bind of
     `isSafeCssGradient` to the multi-layer validator without the tripwire pre-pass. Both
     boundaries reuse the exported validator, so a value one accepts is exactly what the
     write boundary accepts (a per-device `url()`/`@import`/over-cap override emits NO rule +
     an `unsafe_background_value` diagnostic).
- **Colored glow box-shadow (TASK-531) is a STRUCTURED spec, never a raw string.**
  `PageGlow` (`{ color, blur?, spread?, x?, y? }`) on both `PageBlockStyleV2` and
  `PageSectionStyleV2` is present-only, reject-unknown (`assertKnownKeys` +
  `additionalProperties:false` in all three style schemas), and REQUIRES a valid `color`
  (sanitized via `sanitizeAuthoringCssColor` at write — an invalid/absent color OMITS the
  whole glow, fail-soft). The numeric fields are clamped at write (`PAGE_GLOW_BLUR_CLAMP`
  0..120, `PAGE_GLOW_SPREAD_CLAMP` -40..80, `PAGE_GLOW_OFFSET_CLAMP` ±80). At BOTH render
  boundaries the shared pure `composeGlowBoxShadow` (`pageGlow.ts`) RE-sanitizes the color
  and RE-clamps the numbers into a FIXED `"<x>px <y>px <blur>px <spread>px <color>"`
  template (defence in depth) — it NEVER interpolates a raw author string, so no arbitrary
  `box-shadow` token (which could smuggle a `url()`) can be emitted; a bad color composes to
  nothing. The editor client mutation guard (`sanitizePageEditorControlValue`) also routes
  the nested length-3 `style.glow.color` control path through `sanitizeAuthoringCssColor`, so
  even optimistic client preview state never holds an unsanitized glow color.

## Declarative interactivity boundary (TASK-534)

TASK-534 adds a family of declarative interactivity (switcher/tabs block, filterable
gallery, scroll-hint block, noise overlay, magnetic button). It introduces **no new
route, RBAC, HTTP method, DB migration, or `PAGE_DOCUMENT_SCHEMA_VERSION` bump**, and no
new attacker-authored MARKUP sink (unlike 522's `customSvg`). Every input surface is
fail-closed:

- **Enums** — `switcher.variant` and `scrollHint.glyph` run through `normalizeEnum`
  (fail-CLOSED to the default on an out-of-set write). `magnetic`, `noiseOverlay`, and
  `filterable` are `readBoolean`-coerced present-only flags. `switcher.activeIndex` is
  clamped to the tab count.
- **Free-text labels** (switcher tab labels, scrollHint `label`) render as **escaped
  React TEXT nodes**, never `dangerouslySetInnerHTML` — no markup breakout.
- **Gallery category tokens** — each `category` is a SPACE-SEPARATED SET of single kebab
  tokens matched against `^[\w-]{1,48}$`; any out-of-pattern token is DROPPED fail-soft
  at BOTH write (`normalizeBlockProps`) AND render, so the value emitted into
  `data-category`/`data-filter` can never break out of the attribute. The runtime match
  is a `cat.split(" ").indexOf(f)` token compare — no substring false positive, no
  `innerHTML`/`eval`.
- **Noise overlay** paints a STATIC self-generated SVG-turbulence data-URI
  (`pageInteractivityGlyphs.tsx`) — no author color, no asset fetch, no relaxation of
  `sanitizeAuthoringCssBackground`.
- **Runtime** — all three interactivity clauses live in the SINGLE
  `PAGE_EFFECTS_RUNTIME_SOURCE` static, dependency-free IIFE emitted via static-`__html`
  `dangerouslySetInnerHTML`; they read ONLY validated DOM `data-*`/CSS custom properties
  and NEVER interpolate stored data (no `${`, `eval`, `Function(`, or `innerHTML` sink),
  and are idempotent via the existing per-window init flag.
- **Allowlist** — every new key joins its `assertKnownKeys` allowlist AND the strict
  `pageDocumentV2JsonSchema` (`additionalProperties: false`) in lockstep with a
  round-trip test; an unknown prop throws `PageDocumentError` (fail-closed read trap).

## Assistant security baseline (v1)

- Konfiguracja limitow asystenta jest trzymana w global settings:
  - `assistant.quotas.requestsPerMinute`
  - `assistant.quotas.requestsPerDay`
- Runtime quota enforcement (TASK-101-07):
  - per-user minute/day request counters sa egzekwowane przed retrieval/provider call
  - optional global request limits i optional LLM token budget sa wspierane przez runtime quota layer
  - przekroczenia zwracaja:
    - `assistant_rate_limited` (HTTP 429)
    - `assistant_budget_exceeded` (HTTP 429)
- `assistant.defaultMode=llm-guide` jest dozwolony tylko gdy:
  - `assistant.llm.enabled=true`
  - `assistant.llm.provider != none`
- Gdy provider nie jest skonfigurowany, runtime wraca do bezpiecznego `docs-only`.
- OpenAI/OpenRouter credentials sa pobierane tylko na backendzie przez Integrations runtime config:
  - integration id: `openrouter`
  - `apiKey` (secret) jest szyfrowany w DB i nigdy nie trafia do frontend payloadow
  - `baseUrl`, `siteUrl`, `appName` sa opcjonalne i nie sa traktowane jako sekrety
- Sciezka `llm-guide` ma guardrails:
  - timeout requestu (`assistant.llm.timeoutMs`)
  - limity tokenow (`assistant.llm.maxInputTokens`, `assistant.llm.maxOutputTokens`)
  - retry-once tylko dla bledow retryable (HTTP 429/5xx)
  - brak snippets -> brak wywolania provider API i fallback do `docs-only`
- Official assistant runtime korzysta z fixed source root `docs` i DB-seeded corpus.
- Official assistant corpus z root `docs/` jest dopuszczony do runtime dopiero po seedzie do DB.
- Brak gotowego DB corpus dla official docs nie moze fallbackowac do filesystem.

### Assistant API runtime (TASK-101-03)

- Endpointy:
  - `GET /admin/api/assistant/status`
  - `POST /admin/api/assistant/chat`
  - `POST /admin/api/assistant/reindex`
  - `POST /admin/api/assistant/actions/plan`
  - `POST /admin/api/assistant/actions/dry-run`
  - `POST /admin/api/assistant/actions/execute`
- RBAC:
  - `settings:read` dla `status` i `chat`
  - `settings:write` dla `reindex`
- Input hardening:
  - `chat.message` max 2000 znakow
  - control chars sa usuwane przed retrieval
  - blokowane markery prompt-injection:
    - `<system>`
    - `</system>`
    - `ignore previous instructions`
    - `developer message`
    - `prompt injection`
- Error mapping:
  - `assistant_disabled`
  - `assistant_index_missing`
  - `assistant_reindex_failed`
  - `assistant_message_invalid`
  - `assistant_rate_limited`
  - `assistant_budget_exceeded`
  - `assistant_action_plan_invalid`
  - `assistant_action_plan_not_ready`
  - `assistant_action_idempotency_required`
  - `assistant_action_actor_required`
  - `assistant_action_dependency_missing`
  - `assistant_action_dependency_conflict`
  - mapped errors zawieraja `requestId` w payload `error.details.requestId`
- Chat response telemetry:
  - przy sukcesie `llm-guide` odpowiedz zawiera `llm.provider`, `llm.model`, `llm.providerRequestId`, `llm.usage`
  - przy fallbacku lub trybie `docs-only` pole `llm` ma wartosc `null`
- Observability:
  - in-memory metrics: request/error/fallback/no-hit/latency
  - audit events:
    - `assistant.mode.fallback`
    - `assistant.provider.failure`
- Reindex:
  - triggerowany recznie endpointem `POST /assistant/reindex`
  - opcjonalny boot reindex przez `assistant.docs.reindexOnBoot=true`
  - dla backendu `db` reindex uruchamia ingest `docs/` do tabel:
    - `assistant_docs`
    - `assistant_doc_chunks`
    - `assistant_doc_ingest_runs`
  - sukces reindex logowany jako audit event `assistant.docs.reindex`

### Assistant action engine runtime (TASK-101-09)

- Endpointy sa internal-only:
  - `POST /admin/api/assistant/actions/plan`
  - `POST /admin/api/assistant/actions/dry-run`
  - `POST /admin/api/assistant/actions/execute`
- RBAC:
  - `plan` / `dry-run`: `settings:read` + `content:read`
  - `execute`: `settings:write` + `content:write` + `content:publish`
  - reviewed site-builder intake planning and `site-kit.*` dry-run additionally
    require `solution-kits:read`; `site-kit.*` execution additionally requires
    `solution-kits:write`
  - `site-kit.*` actions require `llmAvailable=true`; they must not run as docs-only fallback
- CSRF:
  - wszystkie action endpoints wymagaja `X-CSRF-Token`
- Rate-limit:
  - action endpoints uzywaja bucketa `assistant`
- Hardening:
  - brak public write surface,
  - brak arbitralnego kodu,
  - blueprint/provider shadow drafts pozostaja capability-id only: unknown ids
    reject, provider action arrays reject, a produkcyjny provider planning dla
    generic CMS/admin mutations nadal pozostaje na `cms_operation_draft`,
  - plan payload przechodzi strict top-level validation i wewnetrzna walidacje typed planu,
  - planner output przechodzi strict nested `actionPlanSchema` przed dry-run/execute,
  - provider draft output is untrusted and operation-draft-only: provider `actions[]`, arbitrary executor inputs, malformed drafts, unknown fields, null/missing ambiguous `resourceKey`, and secret-like keys cannot produce executable actions; TASK-189-05 removed provider draft repair from active planning,
  - provider planning prompt packages are built by `providerPlanningContext.ts` with bounded docs/resource/runtime context and redacted through `assistantRedaction.ts` before provider calls,
  - assistant operation policy (`core/services/assistant/operationPolicy/adminSurfacePolicies.ts`) marks admin/settings/security/tool surfaces as `live-gated` or `live-read-only` unless a typed action contract exists,
  - settings, users, roles, backups, redirects, import/export, API keys, webhooks, email, storage, and integrations remain non-executable from LLM Guide prompts until a typed contract is added,
  - secret-bearing admin surfaces set `secrets.redacted=true` and `providerAllowed=false` in policy so provider-facing prompt/schema generation has an explicit denylist source,
  - CMS action mapping checks `assistantOperationPolicy` before returning executable typed actions, and destructive/bulk/provider mismatch guards use `operationPolicy/safetyPolicy.ts`,
  - follow-up planning state is bounded, expires, rejects secret-like text, and resolves pronouns/count words through `operationPolicy/followUpPolicy.ts` before targets are re-resolved from trusted catalogs,
  - legacy CMS resource registry, provider action-array adaptation, provider draft repair, duplicated provider local-first guard lists, and planner-owned CMS/admin resource branches are removed from active planning; policy helpers are the local source of truth before strict schema validation,
  - TASK-189 final validation keeps targeted assistant Vitest suites green after provider action-array removal and exact policy identity remediation,
  - provider draft execution through `planAssistantActionsWithProviderDraft` requires provider availability, accepts only strict CMS operation drafts, validates exact policy resource identity when supplied, and falls back to deterministic local planning on provider failures or unsafe mismatches,
  - provider structured output is selected by provider/model capability profile and remains provider-agnostic at the planner boundary,
  - OpenAI and OpenRouter direct credentials are read from encrypted integration config for production and from test-only env vars only in opt-in live tests,
  - `LLM Guide` mode routes through `/assistant/actions/plan`; docs-only mode remains on `/assistant/chat`,
  - `responseKind=docs` and `responseKind=inspection` are non-mutating and cannot execute actions,
  - `responseKind=action_plan` requires strict typed actions before dry-run/execute,
- blueprint composition conflicts remain non-executable: when the local setup planner or shadow comparison selects the composed blueprint path, blocking route/schema/resource collisions, media missing/ambiguous/upload/delete gates, manifest permission gaps, and gated domains downgrade the result into `needs_input` or `gated` with typed questions instead of returning partial executable actions,
  - generic CMS mutation mapping can only emit existing typed action contracts and never bypasses `actionRegistry.ts`, per-action permissions, dry-run, execute idempotency, or domain service revalidation,
  - surface hints and CMS filters are allowlisted planner fields and cannot encode arbitrary DB paths or privileged settings,
  - assistant planning state is short-lived, bounded, advisory-only, contains candidate summaries only, and is revalidated/re-resolved server-side before mutation planning,
  - assistant conversation UI state is browser-local, bounded, expiring, and must not store cookies, CSRF tokens, provider keys, raw provider prompts, form submissions, access logs, or secret-like settings,
  - provider draft assumptions are redacted before they appear in action plan metadata/review UI,
  - `context.includeResourceCatalog=true` hydratuje tylko server-side bounded/redacted resource catalog,
  - client-supplied `context.resourceCatalog` i inne unknown context fields sa odrzucane,
  - resource catalog includes bounded page, post, entry, media, commerce, solution-kit, menu, content type, custom screen, listing, form, and SEO summaries plus optional read/support summaries for retained legacy template rows, but never raw page/post/entry data payloads; custom screen summaries may include only the persisted canonical `collectionRole` / `compositionKey` metadata, not browser-authored aliases,
  - resource catalog nie zawiera form submissions, entry values, post raw data, media signed URLs, commerce payment secrets, provider credentials, API key material ani secret-like config keys,
  - detail-page binding resolution is read-only and document-driven: it uses safe
    dot-path access against validated bindings, blocks secret-like entry field
    paths, and reuses the existing detail-route/content-list/form runtime seams
    instead of arbitrary object traversal or a parallel public-write contract,
  - generic CMS inspection plans are read-only: they can expose bounded candidate metadata, have `actions: []`, and are not executable through dry-run/execute,
  - `context.runtimeSnapshot` jest advisory-only i nie moze zastapic RBAC w route/domain services,
  - active admin surface context is server-hydrated before planning; page/custom-screen hydration requires `content:read`, retained legacy template support summaries require `widgets:read`, and missing resources clear the active surface context,
  - runtime snapshot nie zawiera user email/name, role names, raw permissions, session ids, cookies, CSRF tokens ani access logs,
  - contract-only future action families in `actionFamilyContracts.ts` are documentation/type contracts only; they are rejected by strict action plan schema/provider operation-draft mapping until preview/execute adapters and route/domain permission checks land,
  - `custom-screen.delete` is internal-only, requires server-side resource catalog planning context plus `content:write` for execute, and revalidates target id/name/prefix before deletion,
  - `page.delete` is internal-only, requires active page context plus `content:write` and `content:publish` for execute, and revalidates target id/title/slug/status before deletion,
  - maintenance-only `widget-template.delete` is internal-only, accepts only an exact already stored legacy row plus `widgets:write`, and revalidates target id/name/status/category; it exposes no create/insert authoring,
  - `entry.delete` is internal-only, requires active entry route context plus `content:write` and `content:publish` for execute, and revalidates optional content type/title/slug/status expectations before deletion,
  - `content-type.delete` is internal-only, requires exact server-side catalog target resolution and blocks when the catalog reports existing entries,
  - `listing-query.delete` and `listing-template.delete` are internal-only, require active context or exact server-side catalog target resolution plus `content:write` for execute, and block when reviewed Page or retained legacy-template reference scans find surviving references,
  - `form.delete` and `form.archive` are internal-only, require active context or exact server-side catalog target resolution plus `forms:write` for execute, count submissions before mutation, block hard delete when submissions exist, and never expose raw submission payloads,
  - `menu.item.delete` is internal-only, requires exact server-side catalog target resolution plus `menus:write` for execute, deletes through the menu tree service, and preserves unrelated menu items,
  - `seo.document.delete` is internal-only, requires exact server-side catalog target resolution plus `content:write` for execute, deletes only the SEO document, and never deletes the page or entry target,
  - `page.update` is internal-only, requires active page context plus `content:write` and `content:publish` for execute, revalidates page id/title/slug/status, and preserves unrelated Page v2 sections/settings,
  - active Page context is internal-only and read-only, revalidates page identity through `pageService`, and no longer hydrates widget-template references from Page data,
  - maintenance-only `widget-template.update` and `widget-template.block.patch` are internal-only, require an exact already stored legacy row plus `widgets:write`, revalidate identity, preserve unrelated data, and cannot create a resource or advertise reusable-template authoring,
  - `custom-screen.update` and V4 screen document actions (`custom-screen.section.add`, `custom-screen.block.add`, `custom-screen.block.patch`, `custom-screen.block.move`, `custom-screen.block.remove`, `custom-screen.binding.set`, `custom-screen.list-view.patch`) are internal-only, require active custom screen context plus `content:write` for execute, revalidate screen id/name/status/content type where applicable, preserve unrelated sections/blocks/bindings/list settings, persist canonical collection-link metadata only through `customScreenService`, and never expose raw entry values,
  - counted multi-target CMS plans are allowed only when trusted context resolves the exact expected target count and every target maps to a strict typed action; mismatched, broad, or partially invalid bulk prompts return `needs_input`,
  - explicit multi-create CMS plans require locally validated `mutation.patch.items[]` definitions and reject secret-like keys before mapping to typed upsert/create actions,
  - assistant execution cache invalidation broadcasts only known admin cache keys derived from strict action inputs or sanitized `resourceId`; provider text, target labels, secrets, submissions, cookies, CSRF tokens, and arbitrary client cache keys are never broadcast,
  - `entry.update`, `form.update`, `listing-query.update`, `listing-template.update`, `menu.item.update`, and `seo.document.update` are internal-only, require exact active context or server-side catalog target resolution plus the owning resource write permission, reject unknown update fields, and preserve unrelated data/config/tree fields,
  - assistant review/result UI is admin-only, reflects backend preview/execute decisions, requires preview before execute, renders destructive/blocked states, and redacts secret-like dynamic text from preview/result payloads,
  - `entry.upsert-draft` is the first promoted future action; it is internal-only, draft-only, requires `content:write` for execute, and delegates to existing entry services without publishing,
  - `menu.item.upsert` is internal-only, requires `menus:write` for execute, rejects unsafe/external hrefs, and delegates to existing menu services,
  - `seo.document.upsert` is internal-only, requires `content:write` for execute, validates explicit `page`/`entry` targets, and delegates to existing SEO services,
  - `media.reference.attach` is internal-only, requires `media:read` plus `content:write` for execute, accepts existing media ids only, supports entry targets in the first adapter slice, and never transports raw upload bytes,
  - `listing-query.filters.patch` is internal-only, requires `content:write` for execute, and updates only existing listing query `filters` while preserving unrelated query config,
  - `listing-template.card.patch` is internal-only, requires `content:write` for execute, and updates only existing listing template `config.card` while preserving unrelated template config,
  - `page.widget.patch` is retired for Pages after TASK-417; Page mutations are internal-only `page.upsert` sections or metadata-only `page.update`, require the owning content permissions, reject unknown Page v2 fields, and do not route Page writes through widget validators,
  - `form.automation.upsert` is internal-only, requires `forms:write` for execute, supports safe non-webhook form actions first, and leaves webhook automation disabled until secret handling is explicit,
  - lead capture blueprint creates public forms through existing Forms runtime; it does not add a new public write endpoint or bypass form nonce/access hardening,
  - booking blueprint is gated as `needs_input` and does not create booking resources until booking action adapters and public booking hardening are explicit,
  - product inquiry blueprint can create public inquiry forms through existing Forms runtime; checkout/payment remains gated until commerce/payment adapters are explicit,
  - editorial content hub blueprint creates a page with posts-feed only and does not create or mutate post records,
  - solution-kit refinement remains gated until installed-kit resource context is server-derived; client-supplied installed resource maps are not trusted,
  - dry-run and execute routes request per-action permissions from `actionFamilyContracts.ts` before delegating to executor services,
  - contract-only families declare intended schema owners, permissions, anti-abuse notes, and secret-handling rules before implementation,
  - preview metadata strings from `actionDiffService.ts` redact secret-like `key=value` fragments before they are returned to admin UI/API clients,
  - composed blueprint review metadata is schema-normalized under
    `metadata.blueprintComposition`, derived only from local capability graph /
    matcher state, rejects unknown fields, and redacts secret-like diagnostic
    strings before returning primary/adjunct/gated choices or reuse/conflict
    summaries to the admin UI,
  - blueprint composition diagnostics serialize only prompt hashes, selected
    capability ids, action type/count traces, conflict summaries, no-duplicate
    decisions, candidate scores, and provider-draft shape; raw prompts,
    provider snippets, secret-like keys, signed URLs, and provider-authored
    executable payloads stay redacted/non-executable,
  - assistant redaction treats signed-url-like metadata keys as sensitive,
  - `execute` wymaga `idempotencyKey`,
  - idempotency jest persystowane w tabeli `assistant_action_executions` i scope’owane przez actor/plan/hash,
  - ponowne uzycie idempotency key z innym actor/plan/hash zwraca `assistant_action_idempotency_conflict`,
  - execute response idempotency diagnostics expose only `replayed` plus `scope=actor_plan_hash`,
  - assistant action metrics are aggregate-only and track execute count, failed action count, and replay count without storing action payloads,
  - fresh execute persistence writes sanitized undo manifest items with resource provenance and fingerprints for future cleanup planning,
  - undo manifest snapshots are redacted before persistence and must not store provider keys, sessions, CSRF tokens, API keys, form submissions, or secret-like settings,
  - metadata akcji trafia do audit log przez `assistant.actions.execute`
- Declared production capability set:
  - `docs-only` remains read-only and cannot mutate resources,
  - `LLM Guide` mutates only through strict typed actions after plan/dry-run/review/execute,
  - executable business setup covers catalog-family packs, lead capture site, product inquiry catalog, portfolio case study, editorial content hub, and `site-kit.recommend` / `site-kit.install` / `site-kit.validate`,
  - booking resources, checkout/payment, webhook form automation, fine-grained existing Page section/block patch actions beyond `page.upsert` / `page.update`, bulk/sample entry creation, field patching, and installed solution-kit refinements remain gated follow-up capabilities,
  - executor reuse’uje obecne serwisy domenowe zamiast direct DB writes.

## API Keys (v1)

- API keys sa hashowane (argon2id), plaintext nie trafia do DB.
- Kazdy klucz ma `prefix` (pierwsze 6 znakow) do szybkiego lookupu.
- `lastUsedAt` aktualizowane przy kazdym poprawnym uzyciu klucza.
- Secret jest zwracany tylko raz (create/rotate) i nie da sie go odzyskac.
- Revoke ustawia `revokedAt` i uniemozliwia dalsze uzycie.

## Webhooks (v1)

- Podpisywanie requestow webhookow: HMAC SHA256.
- Naglowki:
  - `X-Coderso-Signature` (hex HMAC)
  - `X-Coderso-Timestamp` (ms timestamp)
  - `X-Coderso-Event` (nazwa eventu)
  - `X-Coderso-Delivery` (delivery id)
- Kompatybilnosc migracyjna: delivery nadal wysyla rownolegle legacy
  `X-Nextless-*` headers do czasu zamkniecia okna migracji konsumentow.
- Payload do podpisu: `${timestamp}.${body}`.
- Sekrety webhookow sa szyfrowane w DB (AES-256-GCM) z tym samym master key.

## Backups (v1)

- Wszystkie route backupow sa `internal` (`/admin/api/*`), cookie sesyjny admina;
  reads wymagaja `backups:read`, writes (create/restore/prune/schedule) wymagaja
  `backups:write` + `enforceCsrf` + bucket `admin_write`. Zaden nowy permission
  nie jest wprowadzany.
- Scheduler (`core/server/jobs/backupScheduler.ts`) dziala jako **system actor**
  bez requestu: brak CSRF (nie jest request-driven), a jego zapisy audytowane sa
  z `actorId: null` i `metadata.source: "scheduler"`. Jest opt-in poza produkcja
  (`BACKUP_SCHEDULER_ENABLED`) i single-flight (in-process flag + Postgres
  advisory lock), zeby wiele instancji na wspoldzielonej DB nie odpalalo backupow
  rownolegle.
- Restore jest **destrukcyjny** i confirmation-gated: wymaga `{ "confirm": true }`
  (strict schema, `confirm: false`/brak/unknown keys → 400) zarowno na route jak
  i w serwisie. Artefakt jest strict-parsowany fail-closed (walidacja
  `version: 1`, reject unknown top-level keys) **przed** jakimkolwiek zapisem,
  a caly restore idzie w jednej `db.transaction` (all-or-nothing, wspoldzieli
  `importConfigTx`). Sekrety pozostaja zaszyfrowane bo restore ustawien idzie
  przez seam `importConfig`.
- Sekrety/PII: artefakty backupu **nigdy** nie zawieraja credentiali storage
  (czytane tylko przez `getStorageSettingsInternal()`); `artifactPath` jest
  redagowany do klientow, a `artifactKey` (klucz obiektu remote) jest
  server-internal i zwracany jako `null`. Bledy uploadu remote sa zawijane do
  `backup_upload_failed` — surowy tekst bledu adaptera/credentiale nigdy nie
  trafiaja do pol widocznych dla klienta ani do logow (`sanitizeBackupError`
  usuwa sciezki cwd + backup-dir).
- Backupy pozostaja **non-LLM-executable** (patrz nota wyzej: settings/users/
  roles/backups/... nie sa wykonywalne z LLM Guide bez typed contract).

## Audit logs (v1.0)

- Logowanie zdarzen admin: login, publish, plugin install, settings update.
- Metadata jest czyszczona z sekretow (token/password/secret).
- `ip` i `userAgent` zapisywane w metadata jesli dostepne.

## IP allowlist (v1.0)

- Allowlista CIDR trzymana w DB (`ip_allowlist`).
- Jesli lista jest pusta → allow all.
- Jesli lista niepusta → blokujemy `/admin/*` i `/admin/api/*` jesli IP nie pasuje.
- Wymagane sa poprawne CIDR (IPv4, mask 0-32).
- Zmiany dzialaja runtime (bez restartu).

## Access logs (v1.0)

- Logujemy requesty admin API (method, path, status, ip, userAgent, userId, durationMs).
- Dane trafiaja do `access_logs`.
- Uzywane w panelu: Security → Access Logs.
- Retencja: v1 nie ma automatycznego czyszczenia; rekomendowany pruning w v2 (np. 90 dni).

## Session policy

- Konfigurowalne w Admin UI: Settings → Security → Session Limits.
- Globalny runtime key dla TTL sesji: `auth.sessionTtlDays` (default `14`, zakres `1..365`).
- UI exposure: Settings → Security → Auth Token TTL.
- Kolejnosc source dla TTL sesji:
  - `createSession(input.ttlDays)` (explicit override)
  - `settings["auth.sessionTtlDays"]`
  - `security.settings.session.ttlDays` (fallback kompatybilnosciowy)
  - `DEFAULT_SESSION_TTL_DAYS`
- Parametry:
  - `session.ttlDays` (domyslnie 7)
  - `session.maxPerUser` (domyslnie 3)
  - `session.singleSession` (domyslnie false)
- `singleSession` uniewaznia poprzednie sesje przy nowym logowaniu.
- `session.ttlDays` pozostaje fallbackiem kompatybilnosciowym dla starszej konfiguracji.

## Password reset TTL policy

- Runtime key: `auth.resetTtlMinutes` (default `60`, zakres `5..1440`).
- Ustawienie kontroluje waznosc tokenu resetu hasla.
- Fallback: gdy key jest brakujacy/niepoprawny, runtime uzywa domyslnego `60` minut.

## Pre-auth first-run installer (v1.2)

Model zagrozen dla jedynego session-less endpointu, ktory potrafi utworzyc konto
uprzywilejowane (`POST /auth/install/admin`, Faza 1 onboardingu, TASK-482).

- **Brak CSRF przez brak sesji.** Endpoint jest z definicji session-less, wiec
  `enforceCsrf` (`core/server/middleware/csrf.ts`) pomija go celowo: SAFE_METHODS
  i kazde zadanie bez `ctx.sessionId` sa skipowane (`if (!ctx.sessionId)
  return;`). Wyjatek CSRF jest scisle ograniczony do tej jednej sciezki — kazda
  sesyjna mutacja nadal wymaga poprawnego tokenu.
- **Boundary = no-users gate.** Jedyna granica autoryzacji jest fail-closed
  precondycja „zero userow”, sprawdzana tanio przed transakcja i ponownie
  wewnatrz transakcji (TOCTOU re-check) pod `pg_advisory_xact_lock`. Lock
  serializuje rownolegle installery, wiec `count(*)` re-check pod READ COMMITTED
  jest autorytatywny; unique index na email to defence-in-depth. Powtorka →
  `install_unavailable` (409).
- **Rate-limit.** Sciezka `/auth/install/*` mapuje sie na bucket `auth`
  (prefix `/auth`); burst jest throttlowany jak login. Identyfikatorem NIE jest
  email z body (installer jest wykluczony z `identifierFromBody` w
  `httpServer.ts`), tylko IP — zeby nieznane konto nie sterowalo bucketem.
- **Strong password + strict schema.** `installAdminSchema` jest strict
  (reject-unknown), haslo `minLength 8`; walidacja przed jakimkolwiek zapisem.
- **Audit trail.** Sukces → `auth.install.admin.created` (actor = nowy admin,
  metadata email przez PII redaction seam). Zablokowana proba post-setup →
  `auth.install.blocked` (actorId `null`). `GET /auth/install/status` nie
  audytuje.
- **Self-disable.** Endpoint trwale przestaje dzialac, gdy istnieje jakikolwiek
  user (installer- lub seed-utworzony) lub gdy install-lock jest ustawiony.
- **Brak wycieku sekretow.** Odpowiedz zwraca tylko `{ id, email, name }` — nigdy
  `passwordHash`, `roleId`, tokenow ani cookie.

## Login alerts (v1.0)

- Konfigurowalne w Admin UI: Settings → Security → Login Alerts.
- Pola:
  - `loginAlerts.enabled`
  - `loginAlerts.notifyOnNewDevice`
  - `loginAlerts.notifyOnNewLocation` (proxy: zmiana IP)
- W momencie logowania porownujemy `ip` i `userAgent` z ostatnia sesja.
- Gdy ustawienia aktywne i wykryjemy zmiane, zapisujemy audit event:
  - `action = auth.login.alert`
  - `metadata = { newDevice, newLocation, lastIp, lastUserAgent }`
- Wysylka email/SMS/webhook w v2 (v1 tylko audit).

## Plugin security

- Permissions gate na API core.
- Pluginy nie maja bezposredniego dostepu do DB.

## Operational safety

- Safe mode uruchamia core bez pluginow, aby odzyskac panel admina.
  - Admin UI: Settings → Security → Plugin Safety.
  - Env override: `PLUGINS_SAFE_MODE=1` (wymusza niezaleznie od UI).
- Error boundaries w admin UI izoluje bledy pluginow.
- Auto-disable pluginu po przekroczeniu progu bledow (configurable).
  - Env: `PLUGIN_ERROR_THRESHOLD` (domyslnie 3).
- Watchdog/timeouts dla hookow i renderowania server-side.
  - Env: `PLUGIN_TIMEOUT_MS` (domyslnie 5000ms).

## Web analytics (v1)

- Public surfaces: `POST /_analytics/collect` (public-write beacon ingestion,
  TASK-483-02) and the front-end tracking snippet injected on live published
  renders (TASK-483-03). No secrets or PII are embedded in the snippet; the
  client sends only `path`, host-only `referrer`, and `navigator.language`.
- Anti-abuse: the beacon carries a per-render HMAC nonce
  (`createBeaconNonce()` / `assertBeaconNonce()`) plus the `public_write` rate
  limit and server-side bot/DNT classification. The beacon action is EXEMPT from
  `enforceBotProtection` — a token-less beacon would otherwise 400 whenever bot
  protection is enabled and kill the pipeline.
- DNT / consent: the snippet short-circuits client-side on Do-Not-Track / GPC
  before any network call; the server also honors DNT. When
  `analytics.trackingEnabled` is `false` the snippet is not injected at all.
- Preview exclusion: the snippet is never injected on admin preview renders, so
  preview traffic never pollutes the analytics tables.
- Secrets: the HMAC nonce is keyed by `ANALYTICS_BEACON_NONCE_SECRET`; the
  visitor identity hash is keyed by `ANALYTICS_IP_HASH_SECRET`. Neither secret is
  ever sent to the browser, logged, or embedded in the snippet.
- PII posture: no raw IP, no User-Agent, and no full referrer URL is ever
  persisted. Visitor identity is a salted, non-reversible daily hash —
  `HMAC-SHA256(ANALYTICS_IP_HASH_SECRET, ip|ua|dailySalt)` — so the same visitor
  is not correlatable across days and the raw inputs cannot be recovered; the
  referrer is stored host-only.
- Retention: raw pageview/session rows are pruned beyond a configurable window
  (`ANALYTICS_RETENTION_DAYS`, default 365, clamped to [30, 1095]); deleting a
  session cascades to its pageviews (FK `ON DELETE CASCADE`). The inline
  post-ingestion prune can be disabled with `ANALYTICS_PRUNE_INLINE_DISABLED=1`
  (test-safety seam for the shared remote DB — never enabled in production).
- CSP compatibility: the tracking snippet ships as an inline `<script>` IIFE and
  the codebase has NO per-render CSP nonce facility (CSP is a static
  admin-configured string, `securitySettings.headers.csp`). An admin who sets a
  custom `script-src` must allow `'unsafe-inline'` (or add the script hash) for
  the inline snippet to run. When a strict CSP without `'unsafe-inline'` is
  required, prefer the optional external-asset variant (`GET /_analytics/a.js`)
  instead of the inline snippet.
