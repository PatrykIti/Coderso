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
- CSRF: token dla POST/PUT/DELETE w admin.
  - Token pobierany z `GET /admin/api/auth/csrf`.
  - UI dodaje `X-CSRF-Token` do mutacji.
- Bot protection (reCAPTCHA v3):
  - `POST /auth/login`, `POST /auth/reset`, `POST /forms/:id/submissions` (public forms only).
  - Publiczny submit formularza wymaga dodatkowo HMAC nonce (`__nl_form_nonce`) z `FORM_SUBMIT_NONCE_SECRET` (TTL domyslnie 10 minut).
  - Internal forms (`submission_access=internal`) require admin session or API key and skip captcha by default.
  - Score thresholds per action (login/reset/public_write).
  - Moze byc wlaczone w dev (opcja `enforceOnLocalhost`).
- Security headers:
  - Content-Security-Policy (basic)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
- HTTPS w produkcji (HSTS zalecany).

## Release Gate Security Checks (Coderso)

Security gate automation is defined in:
- `_docs/CODERSO_RELEASE_GATES.md`
- `tests/security/codersoSecurityGate.test.ts`

Mandatory baseline verified by gate suite:
- public submission modes (`forms`, `booking`) require captcha path,
- internal submission modes require session or API key scope,
- nonce contracts reject missing/tampered tokens,
- default rate-limit and bot-protection thresholds remain hardened.

Related gate suites executed by runner:
- `tests/unit/security/rateLimit.test.ts`
- `tests/unit/forms/submissionNonce.test.ts`
- `tests/unit/server/publicBookingApi.test.ts`

### CI Security Gate (SAST/SCA/Secrets/CVE)

Automated CI gate blocks PRs on critical/high findings:
- SAST: Semgrep (`.semgrep.yml` + OWASP/security packs).
- SCA/CVE: Trivy filesystem scan (`.trivyignore` for time-boxed exceptions).
- Secrets: Gitleaks (`.gitleaks.toml` allowlist config).

Local runbook:
```bash
pip install semgrep
semgrep --config .semgrep.yml --config p/owasp-top-ten --config p/security-audit --config p/nodejs --config p/typescript
trivy fs --severity HIGH,CRITICAL --ignore-unfixed .
gitleaks detect --config .gitleaks.toml
```

### Konfiguracja runtime (Admin UI)

- Wszystkie ustawienia middleware sa trzymane w DB (`settings.key = security.settings`).
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

## File uploads

- Limit size per file.
- Dozwolone MIME types.
- Skanowanie antivirus (opcjonalnie; plugin).
- Sekrety storage (S3/Azure) przechowywane sa zaszyfrowane w DB.
- Master key do szyfrowania: `MEDIA_SECRET_MASTER_KEY` (ENV, poza DB).

### Master key (storage secrets)

`MEDIA_SECRET_MASTER_KEY` to klucz master do szyfrowania/odszyfrowywania sekretow
S3/Azure zapisywanych w DB. Bez niego runtime nie odszyfruje rekordow.

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

## Secrets

- Nigdy nie logujemy tokenow/hasel.
- ENV tylko po stronie serwera.
- Opcjonalny pepper do hasel: `AUTH_PASSWORD_PEPPER` (rotacja wymaga resetu hasel).
- Hasla SMTP sa szyfrowane w DB (AES-256-GCM) tym samym master key.
- Klucze providerow LLM (np. OpenRouter) traktujemy jak sekrety:
  - trzymane poza frontendem i poza plain text w logach,
  - redagowane w audit metadata oraz error payloadach.

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
- OpenRouter credentials sa pobierane tylko na backendzie przez Integrations runtime config:
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
  - `site-kit.*` actions additionally require `solution-kits:read` for planning/dry-run and `solution-kits:write` for execution
  - `site-kit.*` actions require `llmAvailable=true`; they must not run as docs-only fallback
- CSRF:
  - wszystkie action endpoints wymagaja `X-CSRF-Token`
- Rate-limit:
  - action endpoints uzywaja bucketa `assistant`
- Hardening:
  - brak public write surface,
  - brak arbitralnego kodu,
  - plan payload przechodzi strict top-level validation i wewnetrzna walidacje typed planu,
  - planner output przechodzi strict nested `actionPlanSchema` przed dry-run/execute,
  - provider draft output jest untrusted: unknown fields/actions, malformed draft i secret-like keys sa odzyskiwane jako typed questions,
  - provider planning prompt packages are built by `providerPlanningContext.ts` with bounded docs/resource/runtime context and redacted through `assistantRedaction.ts` before future provider calls,
  - provider draft execution through `planAssistantActionsWithProviderDraft` requires injected provider availability, uses strict local adapter validation, and falls back to deterministic local planning on provider failures,
  - provider draft assumptions are redacted before they appear in action plan metadata/review UI,
  - `context.includeResourceCatalog=true` hydratuje tylko server-side bounded/redacted resource catalog,
  - client-supplied `context.resourceCatalog` i inne unknown context fields sa odrzucane,
  - resource catalog nie zawiera form submissions, entry values, provider credentials, API key material ani secret-like config keys,
  - `context.runtimeSnapshot` jest advisory-only i nie moze zastapic RBAC w route/domain services,
  - active admin surface context is server-hydrated before planning; page/custom-screen hydration requires `content:read`, widget-template hydration requires `widgets:read`, and missing resources clear the active surface context,
  - runtime snapshot nie zawiera user email/name, role names, raw permissions, session ids, cookies, CSRF tokens ani access logs,
  - contract-only future action families in `actionFamilyContracts.ts` are documentation/type contracts only; they are rejected by strict action plan schema/provider draft adaptation until preview/execute adapters and route/domain permission checks land,
  - `custom-screen.delete` is internal-only, requires server-side resource catalog planning context plus `content:write` for execute, and revalidates target id/name/prefix before deletion,
  - `page.delete` is internal-only, requires active page context plus `content:write` and `content:publish` for execute, and revalidates target id/title/slug/status before deletion,
  - `widget-template.delete` is internal-only, requires active widget template context plus `widgets:write` for execute, and revalidates target id/name/status/category before deletion,
  - `entry.delete` is internal-only, requires active entry route context plus `content:write` and `content:publish` for execute, and revalidates optional content type/title/slug/status expectations before deletion,
  - `content-type.delete` is internal-only, requires exact server-side catalog target resolution and blocks when the catalog reports existing entries,
  - `listing-query.delete` and `listing-template.delete` are internal-only, require active context or exact server-side catalog target resolution plus `content:write` for execute, and block when reviewed page/widget-template reference scans find surviving references,
  - `form.delete` and `form.archive` are internal-only, require active context or exact server-side catalog target resolution plus `forms:write` for execute, count submissions before mutation, block hard delete when submissions exist, and never expose raw submission payloads,
  - `menu.item.delete` is internal-only, requires exact server-side catalog target resolution plus `menus:write` for execute, deletes through the menu tree service, and preserves unrelated menu items,
  - `seo.document.delete` is internal-only, requires exact server-side catalog target resolution plus `content:write` for execute, deletes only the SEO document, and never deletes the page or entry target,
  - `page.update` is internal-only, requires active page context plus `content:write` and `content:publish` for execute, revalidates page id/title/slug/status, and preserves unrelated page data/blocks,
  - `widget-template.update` and `widget-template.block.patch` are internal-only, require active widget template context plus `widgets:write` for execute, revalidate template id/name/status/category where applicable, and preserve unrelated reusable template blocks/settings,
  - `custom-screen.update` and `custom-screen.widget.patch` are internal-only, require active custom screen context plus `content:write` for execute, revalidate screen id/name/status/content type where applicable, preserve unrelated blocks/bindings, and never expose raw entry values,
  - `entry.upsert-draft` is the first promoted future action; it is internal-only, draft-only, requires `content:write` for execute, and delegates to existing entry services without publishing,
  - `menu.item.upsert` is internal-only, requires `menus:write` for execute, rejects unsafe/external hrefs, and delegates to existing menu services,
  - `seo.document.upsert` is internal-only, requires `content:write` for execute, validates explicit `page`/`entry` targets, and delegates to existing SEO services,
  - `media.reference.attach` is internal-only, requires `media:read` plus `content:write` for execute, accepts existing media ids only, supports entry targets in the first adapter slice, and never transports raw upload bytes,
  - `listing-query.filters.patch` is internal-only, requires `content:write` for execute, and updates only existing listing query `filters` while preserving unrelated query config,
  - `listing-template.card.patch` is internal-only, requires `content:write` for execute, and updates only existing listing template `config.card` while preserving unrelated template config,
  - `page.widget.patch` is internal-only, requires `content:write` for execute, supports top-level `upsert-block` plus selected block `patch-data`, validates widget type/data before updating page current data, and blocks unknown data paths instead of broad JSON rewrites,
  - `form.automation.upsert` is internal-only, requires `forms:write` for execute, supports safe non-webhook form actions first, and leaves webhook automation disabled until secret handling is explicit,
  - lead capture blueprint creates public forms through existing Forms runtime; it does not add a new public write endpoint or bypass form nonce/access hardening,
  - booking blueprint is gated as `needs_input` and does not create booking resources until booking action adapters and public booking hardening are explicit,
  - product inquiry blueprint can create public inquiry forms through existing Forms runtime; checkout/payment remains gated until commerce/payment adapters are explicit,
  - editorial content hub blueprint creates a page with posts-feed only and does not create or mutate post records,
  - solution-kit refinement remains gated until installed-kit resource context is server-derived; client-supplied installed resource maps are not trusted,
  - dry-run and execute routes request per-action permissions from `actionFamilyContracts.ts` before delegating to executor services,
  - contract-only families declare intended schema owners, permissions, anti-abuse notes, and secret-handling rules before implementation,
  - preview metadata strings from `actionDiffService.ts` redact secret-like `key=value` fragments before they are returned to admin UI/API clients,
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
  - booking resources, checkout/payment, webhook form automation, nested page widget patches, bulk/sample entry creation, field patching, and installed solution-kit refinements remain gated follow-up capabilities,
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
  - `X-Nextless-Signature` (hex HMAC)
  - `X-Nextless-Timestamp` (ms timestamp)
  - `X-Nextless-Event` (nazwa eventu)
  - `X-Nextless-Delivery` (delivery id)
- Payload do podpisu: `${timestamp}.${body}`.
- Sekrety webhookow sa szyfrowane w DB (AES-256-GCM) z tym samym master key.

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
