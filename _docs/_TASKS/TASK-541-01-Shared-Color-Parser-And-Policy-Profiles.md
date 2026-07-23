# TASK-541-01: Shared Color Parser and Policy Profiles

# FileName: TASK-541-01-Shared-Color-Parser-And-Policy-Profiles.md

**Parent Task:** TASK-541
**Priority:** High
**Category:** Shared Styling / Pure Domain / Validation
**Estimated Effort:** Medium
**Dependencies:** None inside TASK-541; first family in the strict leaf order
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Goal

Create one Bun-free CSS color parser/normalizer with explicit `authoring` and
`inherited-render` profiles. Structural schema patterns are exported by the same
owner, while all numeric/range security decisions remain semantic parser logic.
The contract operates on an ASCII grammar: it caps the original untrimmed string,
recognizes only U+0020 as whitespace, and canonicalizes without an exponent-form
number serializer or channel clamping.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-541-01-L01 | Sole canonical contract implementation | ✅ Done |
| TASK-541-01-L02 | Generated boundary/canonicalization corpus | ✅ Done |

## Ownership

- L01 creates and solely owns `core/services/theme/cssColorContract.ts` plus the compact
  direct source-gate suite `tests/vitest/services/css-color-contract.test.ts`.
- L02 creates only the additive generated suite
  `tests/vitest/services/css-color-contract-corpus.test.ts` and its data-only
  `cssColorCorpus.ts`; that fixture may import only
  `CSS_COLOR_VALUE_MAX_LENGTH` from the production owner so it never repeats the
  numeric cap, and may not import the parser, patterns, or any other production
  helper. It treats L01's suite as read-only and performs no rebaseline.
- Rollout consumers import exact names; no consumer reimplements semantic ranges.
- HSL accepts bare hue or case-insensitive `deg`; canonical output is unitless.
  Functional canonical names derive from arity, not from the authored alias.
- Literal parser results expose canonical text, alpha, six-digit picker hex, and
  integer RGB metadata. The metadata conversion and rounding rules are owned here,
  so admin picker and contrast consumers do not carry a second classifier.
- The compact and generated suites construct the same valid terminal padded only
  with ASCII U+0020: total raw length exactly
  `CSS_COLOR_VALUE_MAX_LENGTH` accepts and canonicalizes, while total raw length
  `CSS_COLOR_VALUE_MAX_LENGTH + 1` rejects even though stripping the padding would
  expose the same short valid terminal. This is a raw-input cap, not a post-trim cap.
- L02 exports a runtime- and type-immutable data corpus whose parser expectations,
  structural-pattern expectations, and explicit structural false-positive IDs are
  reused unchanged by rollout parity tests.

## Security Contract

No endpoint, persistence, auth, RBAC, CSRF, rate limit, nonce, or captcha changes.
The module is a positive allowlist and must have no Bun, React, DB, settings, server,
or integration import. Export `CSS_COLOR_VALUE_MAX_LENGTH = 128` as the sole parser,
schema, and consumer cap. Check the raw string length before ASCII-space trimming;
reject tabs, newlines, controls, non-ASCII whitespace, comments, and CSS fragments
before complex matching. No fallback returns unchecked input.

## Acceptance

- Both profiles and their difference are explicit and testable.
- Functional numeric channels are semantically bounded.
- Normalization is deterministic and idempotent.
- Literal RGB metadata is integer, deterministic, and derived without clamping.
- Structural patterns cannot be mistaken for semantic validation.
- The raw-length-before-ASCII-space-trimming boundary is pinned independently of
  the structural pattern and without repeating the numeric cap.
- Rejected values return `undefined`.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts \
  tests/vitest/services/css-color-contract-corpus.test.ts
git diff --check
```
