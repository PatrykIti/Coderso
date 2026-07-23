# TASK-548-03: Embedded Local Help and Guide
# FileName: TASK-548-03-Embedded-Local-Help-And-Guide.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Admin UI / Documentation / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Ship two local documentation experiences from the compiled
`coderso.docs-corpus@v2` distribution generated at
`core/generated/docs/coderso-docs-v2.json`:

1. an authenticated `/admin/help` search and reader that works without an AI
   provider or an external documentation request; and
2. a floating conversation window with separate **Guide** and **Agent** tabs.

Guide remains deterministic and DB-backed through the existing assistant
index/routes. Agent remains optional, provider-backed, review-first, and
auditable. These are distinct products with separate histories and readiness
states; this task does not restore the mode selector removed by TASK-182.

`docs/guide` remains the single authored end-user/assistant source. Embedded
Help consumes the exact compiled distribution produced by TASK-548-01/02, while
Guide response cards join DB `(docId, locale, sectionId)` evidence to that same
locale-bound local visual/example metadata. There is no second Help corpus,
per-question remote
documentation call, runtime external docs API, or assistant filesystem
fallback.

Consumer targets are fail-closed: embedded Help indexes/renders only documents
whose `publicationTargets` contains `embedded-help`; Guide receives only
`assistant`-targeted rows from ingest/retrieval. `public-docs` remains the portal
owner and is never an implicit Help or Guide fallback.

The interactive site Designer/canvas and accepted-plan CMS mutation workflow
are outside TASK-548.

## Grounded Baseline

- `core/admin/app/AdminApp.tsx` is 1,237 lines and owns route matching plus the
  complete inline route list (`RouteDefinition` at lines 170-175 and the route
  array beginning near line 613).
- Canonical admin paths and aliases live in
  `core/admin/utils/adminPaths.ts:61-99`; navigation must continue through
  `AdminLink` and `prefetchAdminRoute`.
- `core/admin/ui/navigation/sidebarConfig.ts:167-170` currently points the
  footer `Docs` item at `https://coderso.dev/docs`.
- `core/admin/ui/assistant/AssistantPanel.tsx` is 1,359 lines and currently
  mixes launcher geometry, one conversation history, docs Q&A, provider
  planning, dry-run, execute, and rendering.
- `core/admin/ui/assistant/assistantConversationState.ts:22-36` persists one
  mode-bearing snapshot, while TASK-182 intentionally removed the chat mode
  selector.
- `core/services/assistant/assistantService.ts:441-459` reports one global
  `enabled` state and lines 513-711 gate all chat behind it.
- Existing assistant security is explicit in
  `core/server/routes/assistantRoutes.ts:406-448`: status/chat require
  `settings:read`, reindex requires `settings:write`, POST payloads are strict,
  and `/assistant/*` uses the `assistant` rate bucket from
  `core/server/httpServer.ts:37-40`.
- `core/services/assistant/docsAnswerComposer.ts` is 1,202 lines. This child
  does not need to edit it: visual/example cards are resolved from the stable
  evidence ids added by TASK-548-01/02. If implementation proves a composer
  change unavoidable, split it by cohesive responsibility below 1,000 lines
  before adding behavior.

## Product Contract

### Embedded Help

- `/admin/help` is an authenticated SPA route available to every authenticated
  Admin user. It has no additional RBAC permission because the bundled corpus
  is public-safe.
- Search, table of contents, article content, examples, and screenshots load
  from the installed local distribution after exact `embedded-help` target
  filtering. A query never calls the official portal.
- `Open in CMS` is shown only when the document's exact
  `permissionRequirement` is satisfied by the current fail-closed permission
  snapshot. Null means authenticated Admin access with no extra catalog
  permission; `allOf` requires every listed permission and `anyOf` at least one.
  The exact live ready snapshot `["*"]` grants full access consistently with
  Admin auth, while authored requirements forbid `*` and duplicate/mixed
  wildcard snapshots fail closed. Its destination is resolved through
  canonical admin path helpers.
- TASK-548-03-L02 exclusively owns and exports the Bun-free
  `resolvePermittedAdminAction(input): DocsAdminActionResolutionV1 | null` from
  `packages/docs-renderer/src/adminActions.ts`; Help and Guide import it rather
  than reimplementing permission or path logic.
- `Open official docs` is derived from the validated documentation base URL,
  installed product version, locale, and stable slug only when the selected
  embedded Help document also contains `public-docs`. A Help-only document has
  no official action. Portal failure never blocks local Help.
- The reader renders the exact closed Markdown subset through the shared v2
  parser and safe React token renderer. It never renders raw HTML, arbitrary
  iframes, scripts, event attributes, CSS, or unvalidated URLs.
- English is the complete initial corpus. Locale handling is ready for Polish
  documents when they exist, but neither Help nor this task may claim a fully
  localized Polish Admin UI.

### Guide and Agent

- Guide always sends `mode: "docs-only"` and depends on DB index readiness, not
  provider availability or `assistant.enabled`.
- Guide card eligibility requires `assistant`; its Help action additionally
  requires `embedded-help` and its official action additionally requires
  `public-docs`. Missing cross-surface targets render no dead link.
- `assistant.enabled` remains a backward-compatible persisted setting but
  controls Agent availability, not Guide availability.
- Agent always uses the existing provider/action routes and remains unavailable
  without an enabled provider/model. Guide errors never disable Agent and Agent
  errors never disable Guide.
- Each tab owns independent transcript, composer, readiness, error, active
  plan, preview, and execution state as applicable. `New` clears only the
  active tab.
- A handoff is user-triggered, redacted, bounded, and prefilled for review; it
  never auto-sends a prompt, plan, provider response, credential, or execution
  payload into the other tab.
- Guide cannot call action plan/dry-run/execute endpoints. Agent cannot present
  a docs-only fallback as if it were an Agent answer.

## Architecture and Data Flow

```text
DocsDistributionBundleV2
        |
        +--> packages/docs-renderer --> /admin/help
        |
        +--> DB (docId,locale,sectionId) index --> Guide answer evidence
                                           |
                                           +--> local visual/example card join

Guide tab  --> POST /assistant/chat { mode: "docs-only" }
Agent tab  --> existing provider chat/plan -> dry-run -> reviewed execute
```

The browser keeps the immutable corpus/search index in module memory. It does
not copy the corpus, provider configuration, secrets, or permission snapshots
to `localStorage`. If implementation introduces persistent caching despite this
default, the owning leaf must use `cachePolicy`/`cacheBus`, prove no sensitive
payload is stored, and update `_docs/ADMIN_CACHE.md` plus
`_docs/ADMIN_CACHE_MAP.md`.

## Sub-Tasks

### Exclusive ownership

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-03-L01 | Extract the oversized Admin route registry plus Bun-free canonical route descriptors, own the strict pre-loss raw permission-state seam in `authClient.ts`, preserve route/RBAC parity, and add canonical Help path helpers; do not expose a Help link yet | ⏳ To Do |
| TASK-548-03-L02 | Add the auto-discovered Help route, local search/reader/shared renderer package, and atomically replace the external footer Docs link | ⏳ To Do |
| TASK-548-03-L03 | Split the oversized Assistant panel, implement distinct Guide/Agent products, decouple Guide runtime from Agent enablement, and render rich local evidence cards | ⏳ To Do |

**Land order:** `TASK-548-03-L01 → TASK-548-03-L02 → TASK-548-03-L03`.
Every source/test file has one leaf writer. L02 may add a route-module file but
its pure descriptor + TSX binding pair must use L01's discovery seam without
editing the registry. L01 alone edits `core/admin/services/authClient.ts` and
`tests/vitest/admin/authClient.test.ts` so raw permission state survives before
the route context is built. L03 must not re-open L01/L02 route, auth-normalizer
or Help contracts.

## Security Contract

- **Endpoint visibility:** `/admin/help` is an internal authenticated SPA route;
  no new server/API endpoint is added. Existing `/assistant/*` endpoints remain
  internal.
- **Auth:** Help and every existing Assistant status/chat/reindex/action route
  retain the authenticated Admin session-cookie gate in the shared router.
  Server RBAC remains mandatory; this task adds no generic API-key auth path.
- **RBAC:** Help prose is available to any authenticated Admin user.
  `Open in CMS` actions are permission-filtered. `/assistant/status` and
  `/assistant/chat` retain `settings:read`; `/assistant/reindex` retains
  `settings:write`; action routes retain their per-family permissions.
- **CSRF:** no CSRF applies to static SPA navigation. Every existing assistant
  POST, including chat, reindex, plan, dry-run, and execute, remains CSRF
  protected.
- **Rate limit:** no new Help bucket is introduced. Existing assistant calls
  remain in the `assistant` bucket.
- **Validation:** compiled bundle/schema validation is strict and
  reject-unknown. Existing assistant request schemas stay reject-unknown.
- **Anti-abuse:** there is no public write, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. Existing action idempotency and review gates are
  unchanged.
- **Secrets/privacy:** no provider key, cookie, session/CSRF token, permission
  snapshot, raw prompt containing secret-like material, or signed URL is stored
  in the corpus, screenshots, Help cache, transcript, debug output, or handoff.

## Implementation Pseudocode

```ts
export function resolveEmbeddedHelp(input: {
  bundle: DocsDistributionBundleV2;
  location: HelpLocation;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
  officialDocs: {
    origin: string;
    basePath: string;
    version: string;
  };
}): HelpReaderView {
  const publicationTarget = "embedded-help" as const;
  const targetDocuments = selectDocumentsForPublicationTarget(
    input.bundle.documents,
    publicationTarget
  );
  const searchIndex = createDocsSearchIndex(input.bundle, {
    publicationTarget,
  });
  const query = normalizeHelpQuery(input.location.query);
  const document = resolvePublishedDocument(
    targetDocuments,
    input.location,
    { publicationTarget }
  );
  return {
    publicationTarget,
    results: searchDocs(searchIndex, {
      ...buildHelpSearchInput(input.location),
      query,
    }),
    document,
    rendererProps: {
      bundle: input.bundle,
      document,
      publicationTarget,
    },
    cmsAction: resolvePermittedAdminAction({
      adminPath: document.adminPath,
      permissionRequirement: document.permissionRequirement,
      permissionSnapshot: input.permissionSnapshot,
    }),
    officialHref: resolveOptionalHelpOfficialHref({
      document,
      origin: input.officialDocs.origin,
      basePath: input.officialDocs.basePath,
      version: input.officialDocs.version,
    }),
  };
}

export async function submitConversation(
  tab: "guide" | "agent",
  prompt: string
): Promise<void> {
  if (tab === "guide") {
    return submitGuide({ prompt, mode: "docs-only" });
  }
  return submitAgentWithReview({ prompt, mode: "llm-guide" });
}
```

**Data flow:** validated installed bundle → exact `embedded-help`
document selection → explicit-target index/search/render props → local Help
reader; or strict assistant request → DB evidence ids → local distribution card
join → safe React tokens. No Help selector/search/renderer receives the unscoped
bundle without the literal target.

**Error handling:** invalid bundle/route/link/asset fails closed; missing visual
falls back to text without inventing one; portal/network failure leaves local
Help usable; DB index failure affects Guide only; provider failure affects
Agent only; stale/malformed persisted transcript is discarded.

**Regression-test shape:** route parity before/after extraction; no broken Help
link between leaves; any-auth Help route; locale-bearing deep links and
same-doc/same-section cross-locale isolation; local-only search; malicious
Markdown/URL rejection; permission-filtered CMS links including exact live
`["*"]` full access plus duplicate/mixed wildcard rejection; independent tab
histories/readiness;
Guide works with Agent disabled; Agent cannot silently show docs fallback;
redacted explicit handoff; no action calls from Guide; null/empty/partial/full
`allOf`/`anyOf` permission cases; capability-context ranking; file-size gates.
Target-leak fixtures prove Help renders `embedded-help` and multi-target records
only, while Guide evidence comes only from `assistant`-targeted persisted rows;
`public-docs`-only records appear in neither surface. Help-only documents omit
official links; embedded+public documents expose them. Guide tests cover
assistant-only, assistant+embedded, assistant+public and all-three action
combinations.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts \
  tests/vitest/ui/admin-shell-nav.test.tsx \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts

set -a && source .env && set +a
bun test tests/unit/assistant/assistantService.test.ts \
  tests/integration/routes/assistant.test.ts

bun --cwd core lint:types
bun --cwd core lint
tsc -p packages/docs-renderer/tsconfig.json --noEmit
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

After restarting the task-owned server and checking Admin/front health, run
these six distinct real flows with exact task-scoped `playwright-cli` sessions:

1. `-s=wf548help-wide-light` — Help search/article/TOC and bounded visual in
   wide light mode.
2. `-s=wf548help-narrow-dark` — narrow dark navigation, focus restoration and
   geometry/no-overflow proof.
3. `-s=wf548guide-agent-off` — grounded Guide answer/card with Agent/provider
   disabled and isolated Agent unavailable state.
4. `-s=wf548tabs-handoff` — separate histories and explicit redacted
   Guide→Agent prefill that is not auto-sent.
5. `-s=wf548help-permissions` — null, partial/full `allOf` and valid `anyOf`
   with visible/disabled `Open in CMS` DOM state.
6. `-s=wf548help-a11y-motion` — keyboard landmarks/focus/Escape restoration
   under reduced motion.

Every flow asserts a visible effect through computed style, geometry, DOM or
`aria-*` state, covers responsive light/dark behavior across the matrix,
collects zero console/page errors, performs scoped cleanup and saves a unique
review screenshot through the TASK-548 workflow-evidence owner.

Re-run every named failure alone before classifying it. Run a physical
line-count check across every touched human-authored production and test file;
no result may exceed 1,000.

## Acceptance Criteria

- Authenticated users can open `/admin/help`, search, navigate, read examples,
  view sanitized screenshots, and follow canonical links without a provider or
  official-site request.
- The footer changes from external Docs to local Help only in the same leaf that
  activates the working route.
- Admin route extraction preserves every existing path, alias, lazy load,
  prefetch, permission guard, settings context, SSR behavior, and 404 outcome.
- The floating panel exposes distinct Guide and Agent tabs with separate state;
  it does not restore the TASK-182 mode selector.
- Guide remains DB-backed and usable when Agent/global AI is disabled. Agent
  remains provider-backed and review-first.
- Visual/example cards are resolved by stable ids from the exact installed
  distribution and rendered without raw HTML or arbitrary URLs.
- No existing assistant auth, RBAC, CSRF, rate-limit, reject-unknown,
  idempotency, audit, or secret-handling invariant is weakened.
- Every touched human-authored source/test file is at most 1,000 physical lines.

## Documentation Updates Required

The TASK-548 closure owner must update `_docs/ARCHITECTURE.md`,
`_docs/CMS_API.md`, `_docs/ASSISTANT_GUIDE.md`,
`_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`,
`docs/guide/README.md`, and cache docs only if persistent Help caching actually
lands. Changelog 1261 and board/status changes remain closure-only.
