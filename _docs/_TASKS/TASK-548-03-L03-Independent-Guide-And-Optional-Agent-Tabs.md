# TASK-548-03-L03: Independent Guide and Optional Agent Tabs
# FileName: TASK-548-03-L03-Independent-Guide-And-Optional-Agent-Tabs.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-03
**Priority:** High
**Category:** Assistant Runtime / Admin Chat UX / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-03-L02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Replace the single mode-bearing floating conversation with two explicit product
tabs:

- **Guide** — deterministic DB documentation Q&A, always independent of Agent
  enablement/provider availability; and
- **Agent** — optional provider-backed planning/action workflow using the
  existing plan → dry-run → reviewed execute contracts.

This is not the mode selector removed by TASK-182. Tabs own separate sessions,
readiness, errors, and responsibilities. Guide and Agent may cooperate only
through an explicit sanitized user-reviewed handoff.

## Exclusive Ownership

This leaf is the only writer for:

- `core/admin/ui/assistant/AssistantPanel.tsx` and cohesive new panel/tab/hook
  modules under `core/admin/ui/assistant/`;
- `core/admin/ui/assistant/AssistantMessage.tsx`;
- `core/admin/ui/assistant/AssistantModeSwitch.tsx` (retire/replace its legacy
  readiness role without restoring a selector);
- `core/admin/ui/assistant/assistantConversationState.ts`;
- `core/admin/ui/assistant/assistantRuntimeStateCache.ts`;
- `core/admin/ui/contexts/AdminAssistantConfigContext.tsx`;
- `core/admin/services/assistantClient.ts`;
- `core/admin/services/assistantStatusClient.ts`;
- `core/services/assistant/assistantService.ts`;
- new `core/services/assistant/guideAnswerEnrichment.ts` if server-side response
  projection is needed;
- `core/server/validation/assistantSchemas.ts` only if the existing strict chat
  context must be extended with stable document context;
- related Assistant Vitest/Bun route/service tests named below.

It must not edit L01 route files, L02 Help/renderer files, provider secret
storage, action executors, or task/changelog metadata.

`core/services/assistant/docsAnswerComposer.ts` is currently 1,202 lines and is
not an owner file for this leaf: resolve cards from TASK-548-01/02 evidence ids
in a separate enrichment/projection helper. If verified implementation evidence
shows a composer edit is unavoidable, stop, amend ownership, and first extract
cohesive intent/section/follow-up modules so every resulting file is below 1,000
lines.

## Required Modular Split

`AssistantPanel.tsx` starts at 1,359 lines. Before behavior changes, split by
cohesive responsibility, for example:

- launcher geometry/drag/resize and shell;
- shared tab chrome and focus management;
- Guide controller/composer/transcript;
- Agent controller/planning/review/execution;
- pure readiness/current-tab/handoff helpers;
- storage schemas and migrations.

Do not move arbitrary line ranges or create a generic helper dumping ground.
Keep public exports stable where tests/consumers rely on them. Every new/existing
touched production and test file must remain independently reviewable and at
most 1,000 physical lines. If the 825-line
`assistant-panel-interaction.test.tsx` would cross the limit, extract whole
Guide, Agent, or handoff suites into the new focused test files before adding
assertions.

## Runtime Contract

### Guide

- Always sends explicit `mode: "docs-only"` to existing
  `POST /assistant/chat`.
- Requires a ready DB index but ignores `assistant.enabled`,
  `assistant.llm.enabled`, provider, model, and provider failure.
- Existing startup seed remains the normal readiness path. Authorized manual
  reindex remains available even when Agent is disabled.
- Answer/source records carry TASK-548-01/02 stable
  `(docId, locale, sectionId)` identity.
  Response cards resolve matching local `visualId`/`exampleId` records from the
  installed bundle only after confirming the document still contains the
  `assistant` target and round-trip exact `capabilityIds`. Card eligibility
  requires only `assistant`; `Open in Help` exists only when that same document
  also contains `embedded-help`, while the versioned official link exists only
  when it also contains `public-docs`. `Open in CMS` remains governed by the
  exact `permissionRequirement`.
- For card actions, null succeeds for an authenticated Admin even with an empty
  permission array; `allOf` requires every listed permission and `anyOf` at
  least one. Empty/partial snapshots deny only an unsatisfied non-null
  requirement, while the exact live ready snapshot `["*"]` grants full access.
  Authored requirements still forbid `*`; duplicate/mixed wildcard and other
  malformed snapshots fail closed.
- Card actions import L02's exact
  `resolvePermittedAdminAction`/`DocsAdminActionResolutionV1` exports from
  `@coderso/docs-renderer`; this leaf defines no parallel path or permission
  evaluator.
- Missing/mismatched local metadata degrades to text/source evidence and never
  invents a screenshot/example.
- Guide cannot call plan, dry-run, or execute.

### Agent

- Availability is `assistant.enabled && llmAvailable`; keep
  `assistant.enabled` as the backward-compatible stored key/API field while
  exposing explicit `guideReady`, `agentEnabled`, and `agentAvailable` UI
  semantics.
- Sends provider chat with `mode: "llm-guide"` and uses existing action routes.
- Without provider/config, render a focused unavailable state and link to
  Integrations only when the user can access it.
- If the existing chat service returns a docs-only fallback, do not render it as
  an Agent answer. Offer an explicit sanitized `Ask Guide` handoff instead.
- Preserve review-before-mutation, dry-run, per-action RBAC, idempotency, audit,
  redaction, and partial/failure UI.

### Separate State and Handoff

Persist versioned, bounded, redacted Guide and Agent snapshots separately.
Migrate the current schema-v1 snapshot once:

- `assistantMode: "docs-only"` → Guide transcript;
- `assistantMode: "llm-guide"` plus plan/preview/execution → Agent transcript;
- malformed, expired, oversized, unknown-key, or secret-like values are
  discarded.

`New` clears only the current tab. A handoff button:

1. selects only the user-authored question/goal;
2. passes it through the existing assistant safety redactor and hard length
   limit;
3. shows/prefills the sanitized text in the destination composer;
4. switches only after explicit click;
5. never auto-sends or transfers response text, sources, provider metadata,
   plans, execution results, secrets, or privileged runtime context.

The handoff command accepts only the currently normalized typed
`AssistantConversationSnapshotV2`, a destination, and one bounded entry ID; it
has no free-form `userText` parameter. `entryId` matches
`^[a-z0-9][a-z0-9-]{0,63}$`, must occur exactly once in that source snapshot,
and the snapshot's `product` must differ from the destination. The selected
entry must be exactly `{ entryId, role: "user", kind: "text", text }`.
Recursive reject-unknown normalization rejects mixed entries such as user text
plus source/provider/plan fields. A missing, duplicated or other-snapshot
entry ID is forged and fails closed. Assistant/system text and every
`structured`, `provider`, `source`, `plan`, or `execution` entry are never
eligible. Only the selected user's `text` reaches redaction and clamping.

## Security Contract

- **Endpoint visibility:** no new endpoint. `/assistant/status`,
  `/assistant/chat`, `/assistant/reindex`, and `/assistant/actions/*` remain
  internal.
- **Auth:** existing authenticated Admin session-cookie gate and server RBAC
  remain. This leaf adds no generic API-key authentication path.
- **RBAC:** status/chat keep `settings:read`; reindex keeps `settings:write`;
  plan keeps current `settings:read` + `content:read` and contextual
  permissions; dry-run/execute keep per-action read/write permissions. No route
  is broadened to anonymous or permissionless API access.
- **CSRF:** every existing assistant POST remains CSRF protected.
- **Rate limit:** all existing calls remain in the `assistant` bucket.
- **Validation:** chat/reindex/action schemas remain strict
  `additionalProperties: false`; any context extension is bounded,
  reject-unknown, and server-trusts only route/locale/stable ids. Add route
  registration and error-map coverage for every changed response/error branch.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply.
  Existing action idempotency and review controls remain mandatory.
- **Secrets/privacy:** separate state and handoff reuse redaction, TTL, size
  caps, exact-key validation, and no provider/session/CSRF/signed-URL storage.
  Handoff selection revalidates snapshot membership and exact user-text role/
  kind at click time; rendered DOM text or a caller-supplied replacement string
  is never trusted.

## Implementation Pseudocode

```ts
export function resolveAssistantProducts(status: AssistantStatusResponse): {
  guide: ProductReadiness;
  agent: ProductReadiness;
} {
  return {
    guide: status.indexReady
      ? { state: "ready" }
      : { state: "unavailable", reason: "docs_not_ready" },
    agent:
      status.agentEnabled && status.llmAvailable
        ? { state: "ready" }
        : { state: "unavailable", reason: "provider_unavailable" },
  };
}

export async function answerAssistantQuestion(input: AssistantChatInput) {
  const settings = await readRuntimeSettings();
  const requestedMode = normalizeMode(input.mode, settings.defaultMode);
  if (requestedMode !== "docs-only" && !settings.enabled) {
    throw new Error("assistant_disabled");
  }
  const evidence = await retrieveDocsHits(input.message, input.context);
  return requestedMode === "docs-only"
    ? composeDeterministicGuideAnswer(evidence)
    : completeProviderAnswerOrExplicitFallback(evidence, settings);
}

type GuideCardActionContext = {
  locale: string;
  sectionId: string;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
  officialDocs: {
    origin: string;
    basePath: string;
    version: string;
  };
};

export function resolveGuideCardActions(
  document: DocsDocumentV2,
  context: GuideCardActionContext
): GuideCardActions {
  assertDocumentHasPublicationTarget(document, "assistant");
  assertLocalizedDocumentAndSectionIdentity(document, {
    docId: document.docId,
    locale: context.locale,
    sectionId: context.sectionId,
  });
  return {
    helpHref: document.publicationTargets.includes("embedded-help")
      ? adminHelpPath({
          docId: document.docId,
          locale: document.locale,
          sectionId: context.sectionId,
        })
      : null,
    officialHref: document.publicationTargets.includes("public-docs")
      ? buildDocsPublicHref({
          origin: context.officialDocs.origin,
          basePath: context.officialDocs.basePath,
          route: {
            kind: "version",
            version: context.officialDocs.version,
            locale: document.locale,
            slug: document.slug,
          },
        })
      : null,
    cmsAction: resolvePermittedAdminAction({
      adminPath: document.adminPath,
      permissionRequirement: document.permissionRequirement,
      permissionSnapshot: context.permissionSnapshot,
    }),
  };
}

type AssistantConversationEntryV2 =
  | {
      entryId: string;
      role: "user" | "assistant" | "system";
      kind: "text";
      text: string;
    }
  | {
      entryId: string;
      role: "assistant" | "system";
      kind: "structured" | "provider" | "source" | "plan" | "execution";
      payloadRef: string;
    };

type AssistantConversationSnapshotV2 = {
  schema: "coderso.assistant-conversation@v2";
  product: "guide" | "agent";
  entries: readonly AssistantConversationEntryV2[];
};

export function prepareAssistantHandoff(input: {
  sourceSnapshot: AssistantConversationSnapshotV2;
  destination: "guide" | "agent";
  entryId: string;
}): PendingHandoff {
  const snapshot = normalizeAssistantConversationSnapshotV2(
    input.sourceSnapshot
  );
  const entryId = assertBoundedAssistantEntryId(input.entryId);
  if (snapshot.product === input.destination) {
    throw new Error("assistant_handoff_invalid");
  }
  const matches = snapshot.entries.filter((entry) => entry.entryId === entryId);
  if (matches.length !== 1) throw new Error("assistant_handoff_entry_invalid");
  const entry = matches[0];
  if (entry.role !== "user" || entry.kind !== "text") {
    throw new Error("assistant_handoff_entry_forbidden");
  }
  return {
    destination: input.destination,
    text: redactAndClampUserText(entry.text),
    autoSend: false,
  };
}
```

**Data flow:** active tab + isolated snapshot → explicit mode request → existing
strict route → DB retrieval; Agent optionally invokes provider/action review.
Guide evidence `(docId, locale, sectionId)` → installed distribution join →
safe locale-bound visual/example cards from L02 renderer/link policy.

**Error handling:** DB/index errors remain in Guide state; provider/config/quota
errors remain in Agent state; malformed response ids omit cards; a docs fallback
in Agent becomes an explicit handoff choice; stale snapshot/secret-like handoff
is discarded; no cross-tab state overwrite.

**Regression-test shape:**

- Guide launcher/tab remains visible with `assistant.enabled=false` for a user
  who satisfies existing chat RBAC;
- Guide sends docs-only and works with provider absent/failing;
- Agent requires global Agent enablement plus provider and never calls actions
  from Guide;
- separate histories, errors, readiness, `New`, plan/preview/execution;
- v1 storage migration and strict v2 unknown/expiry/size/secret rejection;
- handoff accepts a current typed snapshot plus bounded member entry ID, extracts
  only exact user text, is redacted/prefilled/user-triggered, and never
  auto-sent; reject missing/duplicate/other-snapshot IDs, assistant/system text,
  every structured/provider/source/plan/execution entry, and mixed forged
  objects carrying both user text and privileged fields;
- Agent docs fallback cannot masquerade as Agent output;
- cards join stable ids, hide unsafe/missing assets, use exact
  `adminHelpPath({ docId, locale, sectionId })` for Help and the L02
  public-link helpers for official URLs; two locale rows sharing `docId` and
  `sectionId` resolve distinct Help/source/asset evidence;
- cards preserve exact `capabilityIds`; test null plus authenticated empty
  ready snapshot, missing/malformed snapshot, invalid empty non-null
  requirements, exact live `["*"]` full access, duplicate/mixed wildcard
  rejection, partial/full `allOf`, and every `anyOf` branch without alternate
  permission/capability fields; spy the exact L02 named resolver import rather
  than a local evaluator;
- assistant/multi-target evidence cards resolve, while `embedded-help`-only and
  `public-docs`-only bundle records cannot leak through a forged/mismatched ID;
- assistant-only cards have neither cross-surface link; assistant+embedded adds
  only Help, assistant+public adds only official, and all-three adds both;
- existing chat/reindex/action auth/RBAC/CSRF/rate/error mappings remain pinned;
- panel/test modularity and all touched-file line counts.

## Sub-Tasks

- [ ] Split the oversized panel and focused interaction tests.
- [ ] Add separate typed Guide/Agent state machines and storage migration.
- [ ] Decouple docs-only/reindex readiness from Agent enablement.
- [ ] Add rich Guide evidence cards from local bundle ids.
- [ ] Add exact snapshot-member user-text handoff with forged/mixed-entry
  rejection and preserve Agent review/action gates.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-lazy-load.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts \
  tests/vitest/docs/docs-renderer.test.tsx

set -a && source .env && set +a
bun test tests/unit/assistant/assistantService.test.ts
bun test tests/integration/routes/assistant.test.ts

bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun --cwd core build:admin
find core/admin/ui/assistant -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec wc -l {} +
wc -l core/services/assistant/assistantService.ts \
  core/services/assistant/docsAnswerComposer.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/unit/assistant/assistantService.test.ts \
  tests/integration/routes/assistant.test.ts
git diff --check
```

Every touched human-authored source/test file must be at most 1,000 lines.
`tests/integration/routes/assistant.test.ts` is already above that threshold;
if this leaf must add assertions there, first extract complete Assistant
route-contract suites into independently runnable files and keep imports/helpers
cohesive.

## Acceptance Criteria

- Guide and Agent are explicit tabs with independent state, not a restored mode
  selector.
- Guide remains deterministic DB-backed and usable when Agent/global AI is
  disabled or provider calls fail.
- Agent remains optional, provider-backed, review-first, permission-aware,
  idempotent, audited, and isolated from Guide failure.
- Rich Guide cards resolve only stable local bundle evidence and degrade safely.
- Handoff is explicit, redacted, bounded, reviewable, and never auto-sent.
- Existing assistant API security and reject-unknown behavior is not weakened.
- `AssistantPanel.tsx` and every other touched production/test file is at most
  1,000 physical lines.

## Documentation Updates Required

Hand Guide/Agent isolation, storage migration, handoff, and security behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
