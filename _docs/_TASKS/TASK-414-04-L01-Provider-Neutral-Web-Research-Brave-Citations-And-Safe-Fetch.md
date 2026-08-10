# TASK-414-04-L01: Provider-Neutral Web Research Brave Citations And Safe Fetch
# FileName: TASK-414-04-L01-Provider-Neutral-Web-Research-Brave-Citations-And-Safe-Fetch.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-04
**Priority:** Critical
**Category:** Agent / Web Research / SSRF
**Estimated Effort:** Large
**Dependencies:** TASK-414-03 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Create a server-only, provider-neutral research boundary and its initial Brave
adapter. Brave LLM Context is the preferred machine-grounding endpoint; Brave
Web Search provides ranked-result discovery/fallback metadata. Neither endpoint
is an AI-provider setting. The server normalizes both into the same ephemeral
result type before any model sees the evidence.

`safeResearchFetch` may retrieve a bounded selected result only after an exact
URL/DNS policy. `sandboxResearchRenderer` is optional and may render only that
already-selected JavaScript-heavy result. It is not exposed as a search engine,
general browser, download mechanism, login client, or arbitrary URL tool.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole writer for:

- terminal TASK-414-03-L01
  `core/services/network/{outboundHttpPolicy,pinnedOutboundTransport}.ts` are
  read-only imported dependencies, never writers here;
- new `core/services/assistant/research/webResearchContracts.ts`;
- new `core/services/assistant/research/webResearchProvider.ts`;
- new `core/services/assistant/research/braveWebResearchProvider.ts`;
- new `core/services/assistant/research/safeResearchFetch.ts`;
- new `core/services/assistant/research/researchSelectionGrant.ts`;
- new `core/services/assistant/research/researchCitationProjection.ts`;
- new `core/services/assistant/research/sandboxResearchRenderer.ts`;
- new `core/services/assistant/research/researchRendererWorkerClient.ts`;
- existing `core/services/integrations/registry.ts`, only for the strict Brave
  Search integration definition and encrypted `apiKey` field;
- `core/package.json` and root `bun.lock`, only for exact pinned
  `playwright-core` compatible with the pinned browser and exact
  `@fastify/busboy@3.2.0`; the latter is installed here as the sole package-file
  writer and consumed only by TASK-414-04-L02's streaming multipart parser;
- new `docker/assistant-research-renderer/Dockerfile`;
- new `docker/assistant-research-renderer/worker.mjs`;
- new `docker/assistant-research-renderer/entrypoint.sh`;
- new `docker/assistant-research-renderer/compose.yaml`;
- new `docker/assistant-research-renderer/seccomp.json` when the verified
  terminal deployment requires an explicit Chromium profile;
- new `tests/vitest/assistant/webResearchContracts.test.ts`;
- new `tests/vitest/assistant/braveWebResearchProvider.test.ts`;
- new `tests/vitest/assistant/researchCitationProjection.test.ts`;
- new `tests/security/assistantResearchSafeFetch.test.ts`;
- new opt-in `tests/integration/assistant-live/braveWebResearchLive.test.ts`.

Forbidden: AI provider adapters/settings, `modelCapabilities.ts`, TASK-414-03
capability/session/tool/persistence owners, DB schema/migrations, Assistant UI,
Assistant/routes mounts, Media, CMS action files, shared docs/tasks/changelog,
and any file owned by another TASK-414 leaf. If the terminal integration
registry was split, re-ground its exported extension seam and amend these exact
paths before implementation; do not duplicate the registry.

Before changing package files, re-verify the terminal package registry and the
official Fastify release/npm metadata. `@fastify/busboy@3.2.0` is the frozen
contract version verified during task authoring; any later security or runtime
compatibility reason to change it requires a task-contract amendment and fresh
audit, not a floating range. Run focused Bun stream/abort/limit tests because an
npm version existing is not proof of compatibility with this repository's Bun
runtime.

## Provider Contract

```ts
export type WebResearchRequestV1 = Readonly<{
  query: string;
  locale: string | null;
  country: string | null;
  freshness: "day" | "week" | "month" | "year" | null;
  maxResults: number;
  maxContextTokens: number;
}>;

export type EphemeralWebResearchResultV1 = Readonly<{
  resultId: string;
  rank: number;
  title: string;
  url: string;
  publisher: string | null;
  publishedAt: string | null;
  snippets: readonly string[];
}>;

export type EphemeralWebResearchBatchV1 = Readonly<{
  provider: "brave";
  providerRequestId: string | null;
  retrievedAt: string;
  results: readonly EphemeralWebResearchResultV1[];
}>;

export interface WebResearchProvider {
  readonly id: string;
  search(input: WebResearchRequestV1): Promise<EphemeralWebResearchBatchV1>;
}

export type ResearchCitationV1 = Readonly<{
  citationId: string;
  title: string;
  canonicalUrl: string;
  publisher: string | null;
  retrievedAt: string;
  sourceDigest: string;
}>;

export type SafeSelectedResearchGrantV1 = Readonly<{
  grantId: string;
  batchId: string;
  resultId: string;
  canonicalUrlDigest: string;
  sourceDigest: string;
  purpose: "fetch" | "render";
  expiresAt: string;
}>;
```

Normalization recursively rejects unknown fields, controls Unicode/URL
canonicalization, limits one query to 400 UTF-8 characters/50 words, considers
at most 20 results, keeps at most 12 citations, permits at most five snippets
per result and 2,000 characters per snippet, and rejects duplicate canonical
URLs. Provider-reported URL/title/snippet fields are untrusted strings.

The Brave adapter:

- uses server-owned encrypted integration credentials in
  `X-Subscription-Token`; credentials never enter query strings;
- prefers LLM Context with server-clamped URL/token/snippet parameters and may
  use Web Search only for bounded result discovery/fallback;
- sends no actor/session/workspace/installation identity, cookies, referrer,
  Admin header, or raw
  private attachment content;
- sets safe-search and explicit locale/country only from normalized server
  policy, not arbitrary headers;
- treats 401/403, quota/429, malformed JSON, oversized response, timeout, and
  provider 5xx as typed failures; and
- never stores or logs the raw response or provider snippets.

Only the server may issue a selected-result grant. After an authenticated run
selects a known `(batchId, resultId)`, `researchSelectionGrant.ts` rehydrates the
L02 owner/session/run/batch/result rows, verifies the exact normalized URL and
source digest, and creates a random opaque single-use token whose hash is
persisted by L02. It binds run, result, URL digest, source digest, issuance,
five-minute maximum expiry, and exactly one `fetch` or `render` purpose. A
selected result needs a separate random row/token for each requested purpose;
claiming either cannot consume or authorize the other. A model/browser can name
a known `resultId` and closed purpose; it cannot submit a URL or construct/reuse
a grant. Claim and matching operation-intent persistence are transactional; a
consumed/expired/mismatched grant
fails before DNS/network work.

## Shared Outbound Policy, Safe Fetch, and Renderer Contract

TASK-414-03-L01's terminal `outboundHttpPolicy.ts` owns the reusable server-side
URL/DNS/peer/redirect decision and `pinnedOutboundTransport.ts` owns the
approved-address transport. This leaf contributes only its closed research
purpose policies and does not modify those modules.
Consumers provide a closed purpose policy with method, scheme/port, redirect,
timeout, wire/decoded-byte, content-type, request-header, response-header, and
credential-forwarding limits. The helper does not accept consumer callbacks
that can weaken forbidden IP classes, peer verification, redirect
reauthorization, or proxy bypass. TASK-414-03-L01 already registers the exact
provider completion/metadata/native-file purposes. This leaf adds
`assistant-research-fetch` and `assistant-research-render-subresource`; later
TASK-414-06-L05 and TASK-414-10-L01 contribute `webhook-delivery` and fixed-
origin Figma purposes through the same closed registration contract.

The helper returns only a short-lived in-process approved target/transport
handle bound to canonical URL, purpose, policy version/digest, resolved address
set, and expiry. It is not serializable to a browser/model, does not become a
general URL fetch service, and never logs DNS answers. Every consumer still
owns source authorization (research grant or persisted webhook profile),
method/body/content projection, and rate limits.

`safeResearchFetch` accepts only a claimed `SafeSelectedResearchGrantV1`; it
resolves the bound server-side URL and never accepts a model/browser raw URL.
The bound URL allows only `http:` or `https:` with no user-info,
fragment, nonstandard port, IP-literal host, or encoded hostname ambiguity.
For every initial request and redirect it:

1. canonicalizes the hostname with strict IDNA processing;
2. resolves A and AAAA records through an injected resolver;
3. rejects if any answer is loopback, RFC1918/private, link-local, multicast,
   unspecified, reserved/documentation/benchmark, carrier-grade NAT, IPv4-
   mapped forbidden IPv6, or cloud/container metadata space/hostname;
4. connects through a resolver/pinned-address transport that preserves TLS SNI
   and `Host`, verifies the actual peer belongs to the approved set, and does
   not perform a second uncontrolled DNS lookup;
5. repeats the complete policy for each of at most three redirects; and
6. streams for at most eight seconds with separate hard maxima of 2 MiB wire
   bytes and 2 MiB decoded bytes, aborting immediately when either counter is
   exceeded and never buffering the full response.

Accepted `Content-Encoding` values are exactly `identity`, `gzip`, and `br`.
Multiple/unknown encodings reject. Response framing follows the same two-tier
contract: duplicate/conflicting `Content-Length` and CL+Transfer-Encoding on a
fetched response are rejected by the pinned transport before the fetch
callback sees the response, so they can never become an app-visible
`request_framing_invalid`/400 with response-policy headers or an access-log
record; app-visible `request_framing_invalid` applies only to malformed
framing that reaches the fetch callback (for example forbidden missing/chunked
framing under a fixed-length response policy), and only those cases carry the
frozen response-policy headers and exactly one sanitized access-log record.
`Content-Length` above the wire cap rejects
before body read but never replaces streaming counters. Decompression is
incremental and resource-bounded; a small compressed body that expands beyond
the decoded cap aborts. Provider JSON fetches use the same separate wire/decoded
accounting rather than one ambiguous `maxBytes` option.

Accepted fetch response types are exactly `text/html`,
`application/xhtml+xml`, and `text/plain` after parameter stripping. Missing,
ambiguous, sniff-mismatched, executable, image, archive, Office, PDF, audio,
video, and `application/octet-stream` responses fail closed. Requests are GET
only, with an empty cookie jar and no authorization/referrer/origin/client IP.
Redirect credentials are never forwarded. `Content-Disposition: attachment`,
downloads, uploads, service workers, local files, `data:`, `blob:`, `file:`,
`ftp:`, WebSocket, and browser storage are forbidden.

The optional disposable renderer is a separately provisioned Node 26 worker
using one exact pinned `playwright-core` version and matching pinned Chromium
binary/container digest. It is not an in-process Bun dependency and never
downloads a browser at startup. The worker runs non-root with Chromium sandbox
enabled, read-only root, private bounded tmpfs, dropped capabilities,
`no-new-privileges`, PID/CPU/memory/file/time limits, and no network namespace.
The app and worker communicate only through a private owner/mode-checked Unix
socket with a strict length-prefixed reject-unknown protocol and per-request
nonce/digest.

The worker receives only a `SafeSelectedResearchUrlV1` issued by fetch policy.
Every browser request is intercepted before network; the worker asks the parent
safe-fetch broker to resolve/pin/fetch that exact main/subresource URL, then
fulfills the route from bounded approved bytes. WebSocket/WebRTC, downloads,
workers/service workers, navigation outside the selected redirect chain,
credentials, auth, cookies, storage/cache/extensions/permissions, local files,
and browser network fallback are aborted. Any un-intercepted request is a hard
renderer failure. One fresh context allows at most 64 approved requests, 4 MiB
aggregate decoded bytes, and 12 seconds, then returns only a 100,000-character
normalized text projection plus final approved URL/digest. It never returns
HTML, DOM, script, screenshots, cookies, storage, network logs, or paths.

Renderer startup verifies Node/Playwright/Chromium versions, executable digest,
socket owner/mode, sandbox/no-network settings, and a no-egress canary. Missing
or unhealthy provisioning exposes the exact optional capability as unavailable;
ordinary Brave result discovery and safe text fetch remain available, but
there is no silent in-process browser, direct-network, or alternate renderer
fallback. Re-verify the supported Playwright/Chromium patch and image digest
immediately before implementation and update package, lock, image, and tests in
one change.

## Durable Citation Contract

Raw Brave batches, snippets, selected bodies, renderer text, and model context
are request-scoped values and must become unreachable after synthesis. Only the
final synthesized Agent message plus `ResearchCitationV1[]` may be handed to
TASK-414-03 persistence. A citation contains no snippet/body. `sourceDigest` is
SHA-256 over canonical URL plus the exact normalized evidence bytes used for
that answer; it proves source identity/version without making the source
recoverable. Citation IDs are deterministic within the answer and reveal no
credential or private object key.

## Security Contract

- **Visibility:** service-only in this leaf; it is callable only from the
  internal authenticated research route owned by L03. No public endpoint or
  direct browser-to-Brave call is added.
- **Auth:** L03 supplies a server-authorized actor/session context. This leaf
  accepts no cookie/session/API-key/header bag from a caller; Brave credentials
  come only from encrypted integration storage.
- **RBAC:** L03 requires `assistant:use` plus `assistant:research` before calling
  this provider. `settings:write` remains required to configure Brave.
- **CSRF:** L03's research-start mutation is CSRF protected. This service does
  not weaken or replace that boundary.
- **Rate limit:** every call is charged to `assistant-research`, including
  provider retries, fetches, redirects, and optional render. At most one bounded
  retry is allowed for an idempotent provider request, never for policy errors.
- **Validation:** recursive reject-unknown provider/request/result schemas;
  exact URL/DNS/peer/redirect/type/byte/time rules; normalized locale/country/
  freshness enums; strict integration field allowlist.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA are not applicable.
  Per-actor and installation-wide concurrency and daily provider budgets are
  mandatory.
- **Renderer isolation:** the optional renderer has no direct network, uses only
  the private Unix-socket broker and current one-shot grant, and fails closed on
  startup/version/socket/sandbox/interception drift.
- **Secrets/privacy:** no keys, query-bearing provider URLs, raw responses,
  bodies, snippets, DOM, cookies, IP resolver traces, or private diagnostics in
  browser state, persistence, cache, logs, metrics, audits, or screenshots.

## Implementation Pseudocode

```ts
export async function researchWithBrave(
  input: unknown,
  deps: BraveWebResearchDeps
): Promise<EphemeralWebResearchBatchV1> {
  const request = normalizeWebResearchRequestV1(input);
  const credential = await deps.integrations.requireSecret("brave-search", "apiKey");
  const raw = await deps.http.requestJson({
    endpoint: deps.mode === "context" ? BRAVE_LLM_CONTEXT_URL : BRAVE_WEB_SEARCH_URL,
    headers: { "X-Subscription-Token": credential },
    body: projectBoundedBraveRequest(request),
    timeoutMs: 8_000,
    maxWireBytes: 2 * 1024 * 1024,
    maxDecodedBytes: 2 * 1024 * 1024,
    acceptedContentEncodings: ["identity", "gzip", "br"],
  });
  return normalizeEphemeralBraveBatchV1(raw, request.maxResults);
}

export async function safeResearchFetch(
  rawGrant: unknown,
  deps: SafeResearchFetchDeps
): Promise<SafeResearchTextV1> {
  const grant = await deps.grants.claimForFetch(rawGrant);
  let target = normalizeResearchUrl(await deps.results.resolveBoundUrl(grant));
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const approved = await deps.outboundPolicy.approve({
      purpose: "assistant-research-fetch",
      target,
      method: "GET",
      policy: SAFE_RESEARCH_FETCH_POLICY,
    });
    const response = await deps.pinnedTransport.request(approved);
    if (isRedirect(response)) {
      target = normalizeRedirect(target, response.location);
      continue;
    }
    return readApprovedResearchTextWithWireAndDecodedCaps(response, SAFE_FETCH_LIMITS);
  }
  throw domainError("assistant_research_redirect_forbidden");
}

export function persistableResearchEvidence(input: {
  answerText: string;
  usedSources: readonly EphemeralUsedSourceV1[];
}): { message: string; citations: readonly ResearchCitationV1[] } {
  return {
    message: normalizeSynthesizedAgentMessage(input.answerText),
    citations: projectBoundedCitationMetadata(input.usedSources),
  };
}
```

## Data Flow

Normalized query → encrypted Brave credential → bounded LLM Context/Web Search
request → strict ephemeral result batch → optional selected-result safe fetch
or sandbox text projection → AI synthesis outside this leaf → bounded message
and citation metadata/digest. Raw intermediate evidence is never passed to a DB
writer, browser cache, or audit serializer.

## Machine-Readable Errors

- `assistant_web_research_unavailable` — missing/disabled integration;
- `assistant_web_provider_auth_invalid` — Brave rejected the credential;
- `assistant_web_provider_rate_limited` — provider quota/429;
- `assistant_web_provider_invalid` — malformed/oversized provider response;
- `assistant_web_provider_timeout` — bounded request timeout;
- `assistant_research_url_invalid` / `assistant_research_url_forbidden`;
- `assistant_research_dns_forbidden` / `assistant_research_peer_mismatch`;
- `assistant_research_redirect_forbidden`;
- `assistant_research_content_type_invalid`;
- `assistant_research_fetch_limit` / `assistant_research_render_limit`.

L03 maps these to safe 400/403/409/413/422/429/502/503/504 responses. DNS,
transport, Brave body, provider request ID, and sandbox messages are redacted.

## Regression-Test Shape

- Provider contract tests inject LLM Context and Web Search fixtures, mutate
  every nested key/type/limit, dedupe URL variants, and prove raw responses are
  not returned by the citation projector.
- Integration registry tests prove the Brave key is encrypted/redacted,
  rejects unknown fields, and is unrelated to `assistant.llm.provider`.
- Safe-fetch tests cover IPv4/IPv6 loopback, private, link-local, CGNAT,
  multicast, unspecified, reserved, metadata hosts/IPs, IPv4-mapped IPv6,
  decimal/hex/octal/IP-literal tricks, IDNA confusion, user-info, ports, and
  prohibited schemes.
- Shared-policy tests prove closed purposes cannot weaken forbidden IP, DNS
  rebinding, peer pinning, redirects, credentials, proxy-environment, or byte/
  time controls. Research and webhook consumers reuse the same primitives but
  cannot reuse one another's purpose-bound approved handle.
- Redirect/DNS-rebinding tests approve the first host then return a forbidden
  address or mismatched peer and prove no forbidden request is sent.
- Selection tests prove only a server-issued owner/session/run/result/purpose-
  bound grant can fetch or render; run fetch→render and render→fetch with
  distinct grants, then reject cross-purpose use, either replay, expiry, raw/
  model URLs, altered digests, and cross-owner grants before resolver/transport.
- Streaming tests enforce redirect, independent wire and decoded byte caps,
  identity/gzip/br encoding allowlist, decompression expansion, time,
  content-type, and disposition limits without buffering the full response.
- Renderer tests pin package/lock/browser compatibility and prove the container
  has no direct egress; every request crosses the safe broker; it cannot search,
  navigate a second result, open WebSocket/WebRTC, persist browser state,
  download, access private hosts, exceed budgets, or return DOM. Startup drift
  makes only rendering unavailable and never selects an unsafe fallback.
- Live Brave coverage is opt-in, uses a test credential, asserts bounded source
  shape only, and prints no key/query/raw response.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/webResearchContracts.test.ts \
  tests/vitest/assistant/braveWebResearchProvider.test.ts \
  tests/vitest/assistant/researchCitationProjection.test.ts
set -a && source .env && set +a && bun test tests/security/assistantResearchSafeFetch.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l core/services/assistant/research/*.ts \
  tests/vitest/assistant/{webResearchContracts,braveWebResearchProvider,researchCitationProjection}.test.ts \
  tests/security/assistantResearchSafeFetch.test.ts \
  tests/integration/assistant-live/braveWebResearchLive.test.ts
docker compose -f docker/assistant-research-renderer/compose.yaml config
```

Run the live test only with its explicit opt-in flag and test credential. Its
absence does not weaken deterministic provider fixtures.

## Official Decision Notes

- Brave documents LLM Context as its machine-consumption endpoint and exposes
  bounded URL/token/snippet controls: [Brave LLM Context](https://api-dashboard.search.brave.com/documentation/services/llm-context).
- Ranked result discovery remains the separate [Brave Web Search API](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started).
- Brave requires the subscription token in a header and warns against exposing
  it in client code: [Brave API authentication](https://api-dashboard.search.brave.com/documentation/guides/authentication).

Verify current terms, retention, attribution, endpoint limits, and supported
parameters against those official pages immediately before implementation.
Provider documentation is evidence, not permission to persist raw results.

## Documentation Updates Required

Hand the provider configuration, citation, safe-fetch/renderer, retention, and
failure-mode receipts to TASK-414-11-L01 for the shared architecture, API,
security, contributor, and Agent user documentation. This leaf edits no shared
docs, task board, status, or changelog.
