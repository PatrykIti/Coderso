# TASK-414-03: Agent Provider Capabilities and Durable Sessions
# FileName: TASK-414-03-Agent-Provider-Capabilities-And-Durable-Sessions.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Agent / Designer / Providers / Persistence / Admin UX / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-02-L01; TASK-548-03-L03 must be terminal before Agent
UI replacement; TASK-547-01-L02 and TASK-547-02-L02 must be terminal before
Designer promotion; TASK-551-03-L01, TASK-551-05-L01, TASK-551-06-L01, and
TASK-551-06-L02 must be terminal before persistence implementation;
TASK-551-08-L03 must be terminal before L03 extends the shared HTTP/router
transport
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414 closure only)

---

## Overview

Replace inferred/fallback Agent behavior with verified provider/model
capabilities, bounded server tools, and DB-authoritative durable Agent sessions.
Add the persistence and Admin boundaries needed for private Designer staging,
preview, validation, review, and promotion.

This child preserves the product split established by TASK-414-02:

- **Guide:** TASK-548's provider-free, read-only documentation product. Its
  availability, corpus retrieval, and answers do not depend on an AI provider,
  Agent sessions, or Designer workspaces.
- **Agent:** available only for an explicitly configured and decryptable
  provider plus exact model whose current verified capabilities satisfy the
  requested operation. A docs answer, heuristic plan, or deterministic local
  fallback is never reported as Agent success.
- **Designer:** a separate private workspace/revision product. Generation
  requires verified capabilities; stage and preview never mutate live CMS data;
  promotion requires explicit review, validation, a lease, exact native
  permissions, and a TASK-547/native adapter.

The DB is authoritative for Agent and Designer state. Browser caches improve
navigation only and are never the source of truth.

## Locked Runtime Invariants

### Availability and provider truth

- Agent requires an explicit enabled provider configuration, decryptable server-
  side credentials, an exact configured model ID, a healthy adapter, and fresh
  capability evidence. Missing, unknown, expired, contradictory, or malformed
  capability evidence means unsupported (`false`).
- Capabilities come only from a strict verified provider API response or exact-
  model primary-source review with per-fact provenance, source revision/digest,
  immutable observation/review time, and bounded expiry. Runtime access cannot
  renew static facts; model-name substring/prefix/suffix heuristics are forbidden.
- Every provider request, metadata probe, and native-file operation uses the
  shared credential-audience-bound outbound policy: fixed official origin or
  explicitly approved HTTPS proxy profile, public DNS/peer pinning, no ambient
  proxy bypass, no credential-bearing redirect, and bounded wire/decoded bytes.
- Configured limits are ceilings. Effective limits use the minimum of the
  configured ceiling, verified provider/model limit, and server hard cap after
  reserving protocol/schema/context overhead. No `Math.max` may expand a
  provider or operator limit.
- Strict structured output is required for every CMS mutation and every
  Designer generation/validation/promotion plan. Text-only models may support
  bounded non-mutating Agent chat only when the explicit capability matrix says
  so.
- Provider failure, malformed output, missing capability, exceeded budget, or
  unavailable tool yields a machine-readable unavailable/failure state. It
  never invokes the old deterministic planner as successful Agent output.

### Server tool safety

- The server registry resolves an exact tool ID before collecting permissions,
  loading target resources, parsing provider-supplied arguments, or emitting an
  authorization diagnostic. Unknown tools fail as `assistant_tool_unknown` and
  reveal no permission/resource details.
- Each tool has strict input/output schema IDs, exact product mode, required
  permissions, owner/resource kinds, read/write classification, redaction
  policy, idempotency behavior, and hard bounds.
- One run has server-enforced caps for rounds, total actions, elapsed time,
  provider input/output tokens, tool input/output bytes, attachment projection
  bytes, and persisted response bytes. The first exhausted budget cancels
  remaining work and prevents further side effects.
- Permissions are collected from the resolved known tool plus the native target
  adapter. `assistant:use` or `designer:*` never substitutes for target RBAC.

### Durable state and concurrency

- Agent sessions, messages, runs, tool calls, resource bindings, private
  attachments/projections, Designer workspaces/revisions/staged resources/
  edges/assets/receipts/promotion runs/leases/decisions, and per-actor active
  session state are normalized DB records owned by L02.
- Every durable lifecycle root/child carries explicit owner lineage, status,
  version/etag, digest,
  timestamps, retention class, bounded payload reference, FKs, and stable cursor
  indexes appropriate to its lifecycle. Cross-owner relational edges are
  rejected by composite constraints, not only application preflight checks.
- Explicit **New** creates a new Agent session and atomically advances that
  actor's active pointer. It does not clear/reuse the current session.
- Select, reopen, archive, delete, append, run transitions, review decisions,
  leases, and promotions use transactions and optimistic version/etag checks.
  Stale writers receive a conflict; no authored state is silently overwritten.
- Every list is keyset/cursor bounded at the DB boundary. Detail payloads use
  owner-scoped point reads. There are no unbounded history/transcript/revision
  queries or N+1 attachment/tool/resource reads.

### Browser behavior

- A canonical session deep link opens the same DB session across tabs and
  resource contexts after owner/RBAC checks. The URL carries opaque session and
  resource-binding identities; a resource context is a server-verified binding,
  not a target ID, arbitrary href, or separate hidden transcript.
- Browser communication uses `BroadcastChannel` plus `cacheBus` with only safe
  identity/version/etag/invalidation envelopes. Focus, online/reconnect, and
  auth-identity changes revalidate from the server.
- `localStorage`/`sessionStorage` never stores transcripts, prompts, provider
  output, tool payloads, attachments/projections, Designer staged payloads,
  signed URLs, review decisions, or promotion material. Existing TASK-548 local
  Agent conversation snapshots are retired only after durable migration is
  live; Guide conversation state remains memory-only and Guide retrieval remains
  no-cache under TASK-548's terminal contract.
- Cross-user IDs return a non-enumerating `404`; cache keys and broadcasts are
  scoped by authenticated user identity/auth epoch.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
| --- | --- | --- |
| TASK-414-03-L01 | Provider/model capability evidence, exact effective limits, fail-closed Agent availability, strict structured output, and bounded server tool registry/planner | ⏳ To Do |
| TASK-414-03-L02 | All new Agent/attachment/Designer tables, one complete schema+migration+snapshot+journal writer, repositories, transactional state machines, bounded reads, and retention | ⏳ To Do |
| TASK-414-03-L03 | Strict shared route descriptor/pre-body/body-response successor seam after TASK-551, then Agent-only session/status/run/action routes, schemas/error mapping, canonical Agent deep links, cross-tab memory client, and durable Agent UI migration | ⏳ To Do |

**Land order:** `TASK-414-03-L01 → TASK-414-03-L02 → TASK-414-03-L03`.

After L03 is terminal, the family pauses at the explicit shared-transport
handoff while TASK-489 and then TASK-555 land. Those families consume the route
transport read-only and must leave TASK-548 generated docs plus their pure
TASK-414-02 capability contributions current. TASK-414-04 resumes only after
both terminal receipts pass a fresh reconcile; TASK-556 remains post-terminal
to the complete TASK-414 family.

L02 is the only writer of every new table and of the complete migration set.
L01 and L03 must not touch `core/db/schema.ts`, schema-domain exports, SQL,
snapshots, or `_journal.json`. L03 reads the current L01/L02 exports and must not
duplicate capability schemas, status enums, normalizers, repositories, retention
rules, or DB constraints in route/UI files. Later TASK-414 research/attachment,
resource-action, Designer, preview, promotion, import, and closure leaves consume
the L01/L02 seams read-only and own their distinct services/routes/UI/docs; L03
must not pre-claim those downstream files.

Only a later TASK-414 closure edits the parent/task-board/changelog. Changelog
1266 is pinned and no implementation leaf creates or edits it.

L03 is the sole TASK-414 successor writer of `core/server/router.ts`,
`core/server/httpServer.ts`, and `core/server/requestBody.ts` after terminal
TASK-551-08-L03, plus its focused `routeResponse.ts` and
`routePreBodyPolicy.ts` modules/tests. It preserves TASK-551's response-header,
lifecycle, security and access-log behavior while adding strict method-aware
descriptors (`GET|HEAD|POST|PUT|PATCH|DELETE`), safe decoded parameters,
terminal `/*tail`, explicit body modes/wire caps, and strict JSON/raw/empty
status+header responses. Route matching and the declared pre-body policy run
before body parsing or stream consumption. No later TASK-414 route leaf may
reopen generic server transport; every one consumes this seam read-only.

## Security Contract

- **Endpoint visibility:** this child exposes only Agent status/session/run/action
  routes, all internal under `/admin/api/assistant/*`. It adds no attachment,
  Designer, public Agent, provider-capability, or raw tool endpoint. Downstream
  attachment/Designer leaves must remain internal except any separately audited
  read-only preview transport. Guide keeps its separate TASK-548 read-only
  surface.
- **Auth model:** existing authenticated Admin session only. No API key, plugin
  token, provider token, public bearer token, or signed attachment URL can act
  as an Admin session. Provider credentials stay backend-only and decrypted only
  inside the existing integration boundary.
- **RBAC:** Agent requires `assistant:use`; research additionally requires
  `assistant:research`; Designer reads/writes/promotes require
  `designer:read`/`designer:write`/`designer:promote` respectively. Every known
  tool, resource read, mutation, preview, and promotion also requires its exact
  native permissions. Product permissions never imply Settings access. Owner
  checks apply before returning any private row.
- **CSRF:** every internal Agent POST/PUT/PATCH/DELETE, run cancel,
  archive/reopen/delete, and active-pointer selection uses the shared Admin CSRF
  middleware. GET/HEAD remain side-effect free. Downstream upload and Designer
  writes inherit the same non-negotiable requirement.
- **Pre-body order:** route match then two-tier framing rejection.
  Duplicate/conflicting `Content-Length` and CL+Transfer-Encoding are rejected
  by the Bun parser as a transport-level 400 before the app callback, without
  app response-policy headers or an app access-log record. App-visible
  `request_framing_invalid`/400 applies only to malformed framing that reaches
  the callback (for example forbidden missing/chunked framing on a policy that
  requires a declared length), and only those cases carry the frozen
  response-policy headers plus exactly one sanitized access-log record →
  wire cap (`payload_too_large`/413 only for actual cap breaches) →
  authenticated Admin session →
  owner/RBAC → rate bucket → CSRF for writes → path/root/quota checks → declared
  body parser/stream. New TASK-414 routes cannot use the legacy body-before-auth
  adapter. Unknown route/body mode or oversized/chunked input fails before
  business services and never falls back to unbounded buffering.
- **Rate-limit bucket:** `assistant` covers provider turns and Agent run/action
  starts/retries; `admin_read` covers bounded Agent status/list/detail reads;
  `admin_write` covers Agent session metadata and active-pointer writes. Later
  research, attachment, Designer generation, preview, and promotion leaves own
  their stricter exact buckets. Native execution keeps any stricter domain
  bucket as an additional limit.
- **Reject unknown:** every params/query/body/provider/tool/attachment/
  workspace/revision/decision/promotion object is strict and recursively rejects
  unknown keys before service work. IDs, cursors, MIME types, filenames,
  prompts, schemas, arrays, bytes, and diagnostic collections are bounded.
- **Anti-abuse:** no public write exists, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. Internal sessions use CSRF, same-origin checks,
  RBAC, owner isolation, quotas/budgets, MIME/magic-byte validation, malware
  scanning, redaction, review, leases, and audit. A future public write requires
  a separate task and shared nonce+signature/HMAC policy.
- **Secrets/privacy:** product status and browser payloads never expose provider
  keys, integration settings, decrypted headers, raw provider capability
  responses, internal prompts, hidden tool schemas, storage keys, malware
  details, signed URL material, or another user's existence. Private payloads
  are encrypted/redacted under the repository security/storage contracts.

## Cross-Leaf Data Flow

1. L01 resolves configured provider/model capability evidence, intersects it
   with TASK-414-02-L01's pure runtime contribution registry (never the later
   generated drift artifact), and exposes a browser-safe Agent/Designer
   availability projection plus the bounded known-tool registry.
2. L02 persists owner-scoped lifecycle state, versions/etags, immutable digests,
   and private payload references through transactions and bounded read models.
3. L03 authenticates Agent requests, validates strict route input, enforces
   product/native permissions, resolves known IDs, invokes L01/L02 services, and
   maps known machine errors without leaking existence or settings.
4. L03 Agent clients cache bounded read models in memory, broadcast safe
   invalidations, and revalidate authoritative DB state on focus/reconnect.
5. Downstream attachment and Designer leaves consume the same persistence and
   capability seams without reopening L03; Agent mutation and later Designer
   promotion reach live CMS state only through native action/TASK-547 adapter
   transaction and audit contracts.

External provider I/O never occurs inside a DB transaction. Persist an intended
run first, perform bounded provider/tool work, then transact a version-checked
result transition. Irreversible native effects occur only through the owning
transaction/outbox boundary, never before review/authorization.

## Machine-Readable Error Families

Leaves own exact errors but must preserve these families:

- availability: `assistant_provider_not_configured`,
  `assistant_model_not_configured`, `assistant_capability_unknown`,
  `assistant_capability_expired`, `assistant_structured_output_required`;
- tool/run: `assistant_tool_unknown`, `assistant_tool_forbidden`,
  `assistant_budget_exceeded`, `assistant_run_conflict`,
  `assistant_provider_failed`;
- sessions/resources: `assistant_session_not_found`,
  `assistant_session_conflict`, `assistant_session_archived`,
  `assistant_attachment_invalid`, `assistant_attachment_unavailable`;
- Designer: `designer_workspace_not_found`, `designer_revision_conflict`,
  `designer_validation_required`, `designer_review_required`,
  `designer_lease_conflict`, `designer_promotion_conflict`.

Routes centrally map these to bounded status codes. Driver/provider/internal
messages, SQL, bind values, settings, capability raw payloads, and owner IDs are
never returned.

## Acceptance Criteria

- No model-name heuristic or optimistic unknown capability can enable Agent or
  Designer.
- Effective limits can only stay equal or become smaller as configured/provider/
  server ceilings are intersected.
- Mutations and all Designer provider outputs require strict structured output.
- Unknown tools reject before permission/resource lookup, and all runs stop at
  explicit round/action/time/token/byte bounds.
- Exactly the 41 tables numbered 1-41 in L02's locked inventory, including the
  cleanup-job and restore-finalization owners, and no
  additional TASK-414 table, land atomically through its one schema/migration/
  snapshot/journal writer with owner/constraint/index/retention coverage. The
  count covers Agent/Designer persistence only; TASK-414-02-L03's separate
  8-table plugin/CMS-capability runtime overlay lands in its own migration and
  is excluded from the 41 (aggregate 49 across TASK-414).
- Explicit New/select/reopen/archive/delete and optimistic conflicts behave
  transactionally with DB authority.
- One deep-linked session remains coherent across tabs/resources using safe
  broadcasts and focus/reconnect revalidation.
- Shared route tests prove HEAD body stripping, explicit status/headers,
  JSON/raw/empty response fidelity, safe params and terminal-tail matching, and
  zero body reads before failed session/RBAC/rate/CSRF/owner preflight.
- No private conversation/attachment/Designer payload enters browser storage or
  another user's response/cache channel.
- Guide remains available, provider-free, read-only, and behaviorally unchanged
  when Agent/Designer are unavailable.
- The Designer persistence schema can represent generation, immutable revision,
  staged graph, validation, asset adoption, decision, lease, promotion evidence,
  and generation-consistent activation without mixed live CMS reads; downstream
  Designer leaves own the state machine and visible product behavior.

## Testing Requirements

Each leaf runs its exact focused lanes plus:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run gates:coderso
git diff --check
```

L02 also runs migration/schema/journal parity, repository integration,
constraint/concurrency, bounded-query, retention, and sanitized representative
`EXPLAIN (ANALYZE, BUFFERS)` evidence against small/large fixtures. L03 runs Agent
route integration/security/live matrices and client/UI tests, and hands its
real-flow scenario contract to the family runtime-smoke owner for the combined
mandatory smoke. Every touched
human-authored production/test file must remain at or below 1,000 physical lines.

## Documentation Updates Required

L01, L02, and L03 each produce an exact documentation handoff: provider
capability provenance/limits/tool budgets; data model/retention/migration/query
facts; and Agent API/session/cross-tab/error behavior respectively. The family
closure owner reconciles those receipts into internal/developer/user docs and
runtime-smoke documentation without changing product code.

Guide documentation remains under TASK-548. The Agent/Designer docs may link
Guide section IDs but must not rewrite Guide as provider-dependent or imply that
docs fallback is Agent success.
