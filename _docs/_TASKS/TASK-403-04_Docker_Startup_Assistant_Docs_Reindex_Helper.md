# TASK-403-04: Docker Startup Assistant Docs Reindex Helper
# FileName: TASK-403-04_Docker_Startup_Assistant_Docs_Reindex_Helper.md

**Priority:** High
**Category:** Assistant + Docker + Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-403, TASK-400
**Status:** Done (2026-06-04)

---

## Overview

Move official assistant docs indexing toward Docker/startup ownership by adding
an idempotent helper that runs after startup migrations, fingerprints the
`docs/guide` corpus, and records successful runs by image/docs version under an
advisory lock.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/server/startupAssistantDocs.ts` | Add pure startup decision, fingerprint, state, lock, and reindex orchestration helpers. |
| `core/server/dockerStart.ts` | Run assistant docs startup reindex after migrations and before serving traffic. |
| `Dockerfile` | Copy `docs/` into the runtime image. |
| `tests/vitest/server/startupAssistantDocs.test.ts` | Cover disabled, already-current, changed-version, partial-failure, and fingerprint behavior. |
| `tests/vitest/server/startupMigrations.test.ts` | Keep startup sequencing coverage aligned if touched. |

## Implementation Pseudocode

```ts
await runStartupAssistantDocsReindex({
  cwd,
  env,
  deps: {
    computeFingerprint,
    readState,
    writeState,
    reindex: ingestOfficialDocs,
    withLock,
  },
});
```

Data flow:

- Resolve image version from `CODERSO_IMAGE_VERSION`, `CORE_VERSION`,
  `APP_VERSION`, or `dev`.
- Resolve docs source root from `CODERSO_ASSISTANT_DOCS_SOURCE_ROOT` or
  `docs/guide`.
- Compute a stable markdown corpus fingerprint.
- Skip when persisted image version, source root, and fingerprint match.
- Run docs reindex under advisory lock and write marker only on success.

Error handling:

- Explicit opt-out env values skip cleanly.
- Missing docs source fails with machine-readable startup docs error.
- Partial or failed reindex does not write the success marker.

## Security Contract

- Endpoint visibility: no public endpoint added; startup helper is internal
  runtime work.
- Auth model: not request-driven.
- RBAC: not request-driven.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject unknown validation: startup env parsing is explicit and bounded.
- Anti-abuse: no public write endpoint, no nonce/signature/HMAC, no reCAPTCHA.
- Secret handling: helper indexes `docs/guide` markdown only and must not read
  provider secrets, session data, or user-generated transcripts.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/server/startupAssistantDocs.test.ts tests/vitest/server/startupMigrations.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Validation Results

- Parent targeted Vitest lane passed with `tests/vitest/server/startupAssistantDocs.test.ts`
  and `tests/vitest/server/startupMigrations.test.ts`.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- `bun run gates:coderso` passed all gates.

## Documentation Updates Required

- `docs/guide/screens/assistant-settings.md`
- `docs/develop/assistant.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1097-2026-06-04-task-403-assistant-docs-and-llm-guide-ux-repair.md`

## Acceptance Criteria

- Docker startup indexes assistant docs after migrations.
- Startup indexing is idempotent by image/docs fingerprint.
- Operators can explicitly disable startup docs indexing when needed.
- Success markers are not written after partial or failed reindex attempts.
