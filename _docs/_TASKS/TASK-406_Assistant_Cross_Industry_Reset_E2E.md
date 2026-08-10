# TASK-406: Assistant Cross-Industry Reset E2E Handoff
# FileName: TASK-406_Assistant_Cross_Industry_Reset_E2E.md

**Priority:** High
**Category:** Historical Assistant Acceptance / Runtime Smoke Handoff
**Estimated Effort:** Small
**Dependencies:** TASK-414-11-L01
**Related Tasks:** TASK-405, TASK-407, TASK-414
**Status:** ⏳ To Do
**Contract Refreshed:** 2026-08-08
**Planned Disposition:** TASK-414-11-L01 must mark this task `⏭️ Superseded`
and list TASK-406 in changelog 1266 only after its stronger owner-scoped runtime
suite passes.

---

## Overview

The original task proposed deleting broad site state and rerunning one
cross-industry “assistant builds a site” scenario. That contract is stale:

- Guide, Agent, and Designer are now separate products;
- Agent is forbidden from generating a whole site;
- Designer staging/reject/approve must be tested without deleting unrelated
  shared-site data;
- runtime smoke must use the shared `scripts/runtime-smoke.ts` entry point and
  the wrappers, helpers, persistent profile workers, browser transport,
  owner-scoped fixtures, checkpoints, and cleanup recipes registered through
  `docs/develop/runtime-smoke-cookbook.md`, rather than a task-local reset or
  Playwright/worker/DB/report loop; and
- TASK-414-11-L01 already owns a broader matrix covering provider-off Guide,
  multi-session Agent, cross-industry Designer staging/preview/revision,
  reject/cleanup, promotion/front parity, and crash recovery.

TASK-406 therefore receives no independent implementation or reset harness.
It remains open only so task/changelog closure stays valid: once the replacement
flows pass, TASK-414-11-L01 records their evidence, changes this status to
`⏭️ Superseded`, moves the board row to Done, and includes TASK-406 in changelog
1266. Until then, this file is a required evidence handoff, not authorization to
run a destructive reset.

## Requirements Preserved by TASK-414-11-L01

| Original intent | Replacement evidence |
|---|---|
| Different industry/theme | `designer-cross-industry-matched-media` plus the distinct `designer-cross-industry-unsupported-media-empty` brief/theme/profile |
| No unrelated architecture media | exact provenance in `designer-cross-industry-matched-media`; honest zero-media/needs-input proof in `designer-cross-industry-unsupported-media-empty` |
| Clean starting state | uniquely owned workspace/resources; normal CMS read models prove staged rows are absent |
| Plan, review, execute | Designer brief/compile/validation/preview followed by digest-bound explicit promotion |
| Public runtime | approved full graph, navigation/forms/SEO/front parity, responsive visible-effect assertions |
| Reset/rebuild | reject/expiry owner-scoped purge and a separate approve/crash/retry idempotency flow |

The replacement must retain desktop/mobile, light/dark where Admin UI is
involved, zero console/page errors, forms/public security, media source/license
checks, and cleanup that deletes only task-owned records/assets.

## Security Contract

- **Endpoint visibility:** no new endpoint and no independent runtime harness.
- **Auth/RBAC/CSRF/rate limits:** inherited from TASK-414-11-L01's real Guide,
  Agent, Designer, native-resource, preview, and public-form flows.
- **Validation:** this handoff cannot bypass strict schemas or create raw
  package/provider actions.
- **Anti-abuse:** no public write. Generated public Forms keep native nonce,
  CAPTCHA policy, validation, and rate limits.
- **Data safety:** never truncate tables, delete by a broad installation
  predicate, clear another actor's Agent session, or reuse a shared database as
  disposable. Every fixture carries an actor/workspace identity and cleanup
  proves exact ownership.
- **Secrets/privacy:** no provider/search key, cookie, CSRF/session value, raw
  attachment, private URL, prompt with secrets, or user data enters evidence.

## Sub-Tasks

None. TASK-414-11-L01 owns the replacement implementation and this task's final
status/board/changelog transition.

## Testing Requirements

No standalone command is valid. TASK-406 closes only from TASK-414-11-L01's
validated shared `task-414` runtime-smoke report containing the exact ordered
25-ID inventory owned by that leaf, including both cross-industry IDs above,
and complete family gates. The closure test imports the same canonical scenario
constant and requires all 25 IDs plus both named replacement flows; it cannot
maintain a second handwritten count/list. It must also assert that no TASK-406-local wrapper,
helper, lifecycle, worker, reset, Playwright, DB cleanup, checkpoint, or report
loop was introduced and that the adapter follows
`docs/develop/runtime-smoke-cookbook.md`.

## Documentation Updates Required

- TASK-414-11-L01 replacement-flow evidence
- `_docs/_TASKS/README.md` row/status/statistics at terminal supersession
- changelog 1266 explicitly listing TASK-406 and TASK-414-11-L01
