# TASK-414-04: Controlled Web Research And Private Multimodal Attachments
# FileName: TASK-414-04-Controlled-Web-Research-And-Private-Multimodal-Attachments.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Agent / Designer / Research / Private Inputs / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-03 terminal; TASK-548 terminal
**Related Tasks:** TASK-414-02, TASK-414-05, TASK-414-06
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Give Agent an explicitly enabled, provider-neutral web-research tool and give
Agent plus Designer one shared private multimodal-input path without turning
either input into a public Media record, a trusted provider payload, or an
unbounded network/parser surface. Designer upload is independently authorized
against a Designer workspace and never depends on an Agent session.

The web provider is independent from the AI provider. The first adapter uses
Brave LLM Context and Brave Web Search behind `WebResearchProvider`.
Playwright is never a search provider; it may render one already-selected
JavaScript-heavy result only inside the same outbound-network policy and a
disposable sandbox. Raw Brave responses, fetched bodies, rendered DOM, and
provider-ready attachment bytes are transient. Durable Agent state may contain
only the synthesized message and bounded citation identity/provenance/digests.

Private inputs use a dedicated quarantine and lifecycle. They are scanned
through a private ClamAV socket, extracted by an isolated Apache Tika 3.x
worker, and matched against an exact MIME + extension + magic/structure
allowlist. Native file forwarding is permitted only after a clean scan and an
exact fresh provider/model capability match; otherwise Agent receives the
bounded normalized projection. Unknown capability is unsupported.

Uploads use the exact pinned `@fastify/busboy@3.2.0` streaming parser installed
by L01 and the terminal TASK-414-03-L03 pre-body/raw-stream transport. Route
match, wire cap, Admin session, owner/RBAC, rate limit, CSRF and root quota all
pass before the first multipart byte is consumed. The parser streams one file
part directly to private quarantine with backpressure; `Request.formData()`,
`File`, whole-body buffers and chunk arrays are forbidden.

TASK-414-03 remains the sole writer for Agent/shared-private-input/Designer
tables, migrations, exact provider/model capabilities, typed root ownership,
tool-run persistence, and lifecycle registration seams. This child consumes
those terminal exports and must not create a second persistence, scanner, or
model-inference contract.

## Product Boundaries

- Guide never searches the web, accepts attachments, calls an AI provider, or
  inherits Agent evidence after an Agent failure.
- Agent research is optional. An unavailable Brave integration disables web
  research without disabling provider-backed Agent work that needs no web tool.
- Search and safe fetch never receive browser cookies, Admin session headers,
  provider keys other than the server-owned Brave credential, or arbitrary
  request headers.
- A private attachment is rooted at exactly one owner-matched Agent session or
  Designer workspace. Product-specific authorization remains independent; an
  attachment ID never grants or widens access.
- An attachment is not a Media asset and has no public/signed browser URL. A
  later explicit Media import remains a separate native Media workflow with its
  own permissions, validation, provenance, and review.
- Extracted text and native file bytes are untrusted evidence, never executable
  instructions, CMS target IDs, permissions, action payloads, or HTML.
- No tool I/O occurs inside a database transaction. Durable state transitions
  use the TASK-414-03 optimistic run/session and attachment contracts.

## Sub-Tasks

| Order | ID | Exclusive responsibility | Status |
|---:|---|---|---|
| 1 | TASK-414-04-L01 | Provider-neutral web research, Brave adapter, safe fetch, citation projection, optional selected-result renderer | ⏳ To Do |
| 2 | TASK-414-04-L02 | Shared private-input store, typed Agent/Designer roots, pre-authorized backpressured streaming multipart quarantine, scan, extraction, projections, lifecycle, and routes | ⏳ To Do |
| 3 | TASK-414-04-L03 | Agent tool orchestration, capability enforcement, research routes/client, and Agent-only UI | ⏳ To Do |

Land strictly in this order. L01 owns all outbound web primitives. L02 owns all
private file primitives and attachment HTTP routes. L03 composes them through
TASK-414-03's tool/capability/session seams and is the only leaf in this child
that edits Agent UI. No leaf edits shared route/navigation mounts; the
TASK-414 parent assigns those mounts to TASK-414-09-L03.

L01 is the only package/lock writer and pins both renderer-compatible
`playwright-core` and `@fastify/busboy@3.2.0`; L02 consumes them read-only. L02
owns only its narrow multipart handler and consumes the generic
router/pre-body/raw-response seam from terminal TASK-414-03-L03. It must not
edit or duplicate `router.ts`, `httpServer.ts`, `requestBody.ts`, lifecycle,
signal, parser, response or package infrastructure.

## Shared Limits

These are hard server ceilings, not UI defaults. Configuration and provider
limits may only reduce them; orchestration always selects the smallest
applicable value.

| Resource | Ceiling |
|---|---:|
| Research query | 400 UTF-8 characters / 50 words |
| Search results considered | 20 |
| Durable citations per answer | 12 |
| Safe-fetched selected pages | 4 |
| Safe-fetch redirects | 3 |
| Safe-fetch response | 2 MiB / 8 seconds |
| Sandboxed rendered result | 1 selected URL, 64 requests, 4 MiB, 12 seconds |
| Attachment | 25 MiB |
| Attachments per run / live root | 8 / 32 live |
| Total attachment bytes per run | 64 MiB |
| Extracted text per file/run | 250,000 / 500,000 characters |
| Research/tool rounds and calls | 3 rounds / 8 calls |
| Concurrent research runs | 1 per actor, 2 installation-wide |

## Security Contract

- **Visibility:** all management, upload, status, deletion, research-run, and
  cancellation endpoints are internal authenticated Admin routes. Research is
  under `/admin/api/assistant/*`; shared uploads are under the exact
  `/admin/api/private-inputs/{agent-sessions|designer-workspaces}/*` families.
  There is no public search, attachment, byte-delivery, or tool-write endpoint.
- **Auth:** authenticated Admin session only. Actor, typed root owner,
  provider credentials, and capability facts are resolved server-side. No API
  key or attachment URL grants access.
- **RBAC:** Agent operations require `assistant:use`; web research additionally
  requires `assistant:research`. Agent-root attachment operations require exact
  actor-owned session membership. Designer-root upload/delete require
  `designer:write`, status requires `designer:read`, and all require exact
  actor-owned workspace; no Agent permission/session is required. Provider/
  integration configuration remains `settings:write` and native CMS actions
  retain their own permissions.
- **CSRF:** required for every internal POST/PUT/PATCH/DELETE, including multipart
  upload, research start/cancel, and attachment deletion. GET status reads are
  side-effect free.
- **Rate limits:** dedicated `assistant-research` and `private-input-upload` buckets
  with per-actor and installation-wide concurrency, byte, provider-call, and
  daily budgets.
  Ordinary Agent endpoints retain their own `assistant` bucket.
- **Validation:** recursive reject-unknown JSON schemas; exact multipart field
  allowlist; bounded opaque IDs; exact MIME/extension/magic or OOXML-structure
  tuples; strict provider response normalization; safe URL/DNS/redirect/type/
  byte/time policy; no caller-provided capability or permission fields.
- **Upload transport:** exact one file/zero fields/one part, finite header and
  boundary limits, 64 MiB + 64 KiB hard wire cap, and two-tier shared framing
  rejection: duplicate/conflicting `Content-Length` and CL+Transfer-Encoding
  are a Bun parser 400 before the app callback, without app response-policy
  headers or an app access-log record; app-visible
  `request_framing_invalid`/400 applies only to malformed framing that reaches
  the callback (for example forbidden missing/chunked framing on a non-stream
  policy) and only those cases carry the frozen response-policy headers plus
  exactly one sanitized access-log record; `payload_too_large`/413 only for
  actual cap breaches; missing/chunked length on this stream policy stays
  bounded by the independent wire/file byte counters; and direct backpressured
  quarantine streaming. Any
  auth/preflight denial reads zero body bytes. Limit, malformed boundary,
  disconnect, abort, store error or parser error destroys the exact partial
  quarantine object and emits no accepted attachment.
- **Anti-abuse:** there is no public write, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. Idempotency, optimistic session/run revisions,
  scan-job leases, bounded retries, and purge leases prevent replay/resource
  exhaustion. Any future public endpoint requires a new contract.
- **Secrets/privacy:** Brave and AI keys stay encrypted backend-only. Never put
  keys, cookies, CSRF/session values, raw provider/search bodies, fetched page
  bodies, rendered DOM, quarantined bytes, extracted private text, private
  object keys, ClamAV/Tika diagnostics, or native provider upload handles in
  browser storage, public/cache payloads, logs, screenshots, task evidence, or
  audit summaries.

## Error Contract

Known domain errors are machine-readable and map centrally at route boundaries:

- `assistant_web_research_unavailable`, `assistant_web_provider_invalid`,
  `assistant_web_provider_rate_limited`, `assistant_research_budget_exceeded`;
- `assistant_research_url_forbidden`, `assistant_research_redirect_forbidden`,
  `assistant_research_fetch_limit`, `assistant_research_content_type_invalid`;
- `assistant_attachment_invalid`, `assistant_attachment_type_unsupported`,
  `assistant_attachment_type_mismatch`, `assistant_attachment_too_large`;
- `assistant_attachment_malware_detected`, `assistant_attachment_encrypted`,
  `assistant_attachment_macro_forbidden`, `assistant_attachment_archive_limit`;
- `assistant_attachment_scan_unavailable`,
  `assistant_attachment_extraction_unavailable`,
  `assistant_attachment_projection_unavailable`,
  `assistant_attachment_not_ready`, `assistant_attachment_expired`;
- `assistant_session_not_found`, `assistant_session_conflict`,
  `assistant_tool_run_conflict`, and `assistant_tool_run_cancelled`.

Provider, DNS, socket, parser, storage, and driver messages never cross the
route boundary. Malware/type/policy rejection is not retried as a provider
fallback.

## Acceptance Criteria

- Web research uses only `WebResearchProvider`; Brave is not coupled to the AI
  provider setting or provider adapter.
- Playwright cannot discover/search results and can render only one selected
  result under the safe-fetch network policy.
- Every private/loopback/link-local/metadata/unsafe redirect and DNS-rebinding
  fixture fails before a request reaches that address.
- Durable state contains synthesized Agent output plus bounded citation
  metadata/digests, never raw Brave/page/rendered bodies.
- Every accepted attachment passes exact tuple validation, private quarantine,
  ClamAV scan, and isolated bounded extraction before Agent/model access.
- Fragmented multipart boundaries and slow/backpressured writes succeed without
  whole-body buffering; max+1, extra field/part/file, malformed headers and
  disconnect/abort fail with exact partial-object cleanup and no scan/provider
  dispatch.
- A Designer-only user can upload to an owned workspace, while Agent and
  Designer roots cannot be confused, rebound, or enumerated across owners.
- Encrypted, legacy Office, macro-enabled, generic archive, MIME-confused,
  malformed, malware, and archive-bomb fixtures fail closed and are purged.
- Exact fresh model capability controls native forwarding. Unknown/stale/model-
  family inference cannot authorize a modality.
- Guide has zero web/file affordances and no Agent tool state.
- Every touched production/test file is at most 1,000 physical lines.

## Testing Requirements

Each leaf runs its exact commands. Child integration additionally runs:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
bun run check:admin-boundary
git diff --check
```

L03 hands at least five scenario/action contracts to TASK-414-11-L01's one
shared `task-414` adapter: safe web citations, blocked SSRF/redirect, clean
document projection, rejected malware/type-confusion upload, and exact native-
versus-projection modality behavior. Cover Agent light/dark, narrow/wide,
visible status/evidence effects, zero console errors, and scoped cleanup. L03
does not register a suite or create a wrapper/helper/worker/Playwright/DB/report
loop.

## Documentation Updates Required

This child writes no shared documentation. It hands product/capability receipts
to TASK-414-02-L02, the sole writer of `docs/develop/assistant.md`, the
capability-extension cookbook, and `docs/guide/` Agent research/attachment/
provider setup pages. It separately hands architecture/security/data/media/
audit facts to TASK-414-11-L01 for that leaf's enumerated non-corpus closeout
documents. Only TASK-414-11-L01 writes task state and changelog 1266.
