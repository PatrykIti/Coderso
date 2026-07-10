# TASK-541-01: Shared Color Parser and Policy Profiles

# FileName: TASK-541-01-Shared-Color-Parser-And-Policy-Profiles.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Pure Domain / Validation
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-541
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Goal

Create one Bun-free CSS color parser/normalizer with explicit `authoring` and
`inherited-render` profiles. Structural schema patterns are exported by the same
owner, while all numeric/range security decisions remain semantic parser logic.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-541-01-L01 | Sole canonical contract implementation | ⏳ To Do |
| TASK-541-01-L02 | Generated boundary/canonicalization corpus | ⏳ To Do |

## Ownership

- L01 creates and solely owns `core/services/theme/cssColorContract.ts` plus the compact
  direct source-gate suite `tests/vitest/services/css-color-contract.test.ts`.
- L02 creates only the additive generated suite
  `tests/vitest/services/css-color-contract-corpus.test.ts` and its data-only
  `cssColorCorpus.ts`; it treats L01's suite as read-only and performs no rebaseline.
- Rollout consumers import exact names; no consumer reimplements semantic ranges.

## Security Contract

No endpoint, persistence, auth, RBAC, CSRF, rate limit, nonce, or captcha changes.
The module is a positive allowlist and must have no Bun, React, DB, settings, server,
or integration import. Export `CSS_COLOR_VALUE_MAX_LENGTH = 128` as the sole parser,
schema, and consumer cap. Reject unsafe fragments and oversized inputs before complex
matching. No fallback returns unchecked input.

## Acceptance

- Both profiles and their difference are explicit and testable.
- Functional numeric channels are semantically bounded.
- Normalization is deterministic and idempotent.
- Structural patterns cannot be mistaken for semantic validation.
- Rejected values return `undefined`.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts \
  tests/vitest/services/css-color-contract-corpus.test.ts
git diff --check
```
