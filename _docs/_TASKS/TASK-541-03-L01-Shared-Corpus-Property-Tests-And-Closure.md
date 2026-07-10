# TASK-541-03-L01: Shared Corpus Property Tests and Closure

# FileName: TASK-541-03-L01-Shared-Corpus-Property-Tests-And-Closure.md

**Parent Subtask:** TASK-541-03
**Priority:** High
**Category:** Shared Styling / Validation / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-541-01, TASK-541-02
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create in this leaf only)

---

## Test and documentation ownership

Own only:

- `tests/vitest/ui/color-value.test.ts`
- `tests/vitest/ui/color-swatch-alpha.test.tsx`
- `tests/vitest/ui/shared-color-alpha.test.tsx`
- `tests/vitest/ui/shared-color-control.test.tsx`
- `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `tests/vitest/ui/divider-editor-wave.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/vitest/ui/footer-editor-wave.test.tsx`
- `tests/vitest/ui/menu-color-alpha.test.tsx`
- `tests/vitest/services/normalize-menu-appearance.test.ts`
- `tests/vitest/services/menu-document-v2.test.ts`
- `tests/vitest/widgets/clearableStyle.test.ts`
- `tests/vitest/widgets/toggleBlock.test.tsx`
- `tests/vitest/widgets/divider.test.tsx`
- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/widgets/gridColumns.test.tsx`
- `tests/vitest/widgets/footer.test.tsx`
- `tests/vitest/widgets/newsletter.test.tsx`
- `_docs/DESIGN_TOKENS.md`
- `_docs/THEMES_SPEC.md`
- `_docs/WIDGETS.md`
- `docs/develop/content-and-widgets.md`
- TASK-541 descendants/parent, board/index, changelog 1253 and changelog index
- task-scoped screenshots and concise closeout evidence under the currently supported
  `_docs/_workflows/_smoke/` path

Read indexes fresh before closure and touch only TASK-541 rows/statistics. Do not edit
production source or another task family. Do not run this leaf concurrently with
TASK-481 while it owns `tests/vitest/ui/shared-color-control.test.tsx` or any of the four
enumerated editor-wave suites; serialize and read every landed test fresh before adding
TASK-541 cases.

The two TASK-541-01 owner suites and their fixture are read-only inputs here:
`css-color-contract.test.ts`, `css-color-contract-corpus.test.ts`, and
`cssColorCorpus.ts`. This closure leaf reruns them but never edits/rebaselines them.

## Implementation Pseudocode

### Shared Parity Test Shape

Import the read-only `tests/vitest/services/cssColorCorpus.ts` owned by
TASK-541-01-L02 rather than copy-pasting acceptance tables. Do not edit that fixture
or its owner service test in this closure leaf. Assert:

```text
canonical authoring accept(value)=normalized
  => admin commit emits normalized
  => normalizeMenuColorValue(normalized)=normalized
  => widget authoring render(normalized)=normalized

inherited-only value
  => authoring/admin/menu reject
  => explicit inherited-render widget accepts canonical value

rejected value
  => no admin commit, menu invalid/null behavior, widget undefined/fallback

for each of ToggleBlockEditors, DividerEditors, NavigationEditors, FooterEditors:
  render the exact editor surface containing each inherited-capable color field
  seed currentColor and inherit as already-stored opted-in values
  => actual control state recognizes the canonical inherited value, not unknown/invalid
  => mount emits no onChange and preserves the stored bytes
  => paired schema normalizer and renderer accept the identical bytes
  use the existing native picker/clear interaction
  => replacement emits canonical hex/clear once and no stale inherited preview remains

for ordinary authoring-only grid-columns/newsletter fields:
  use their owned widget suites plus the shared corpus
  => inherited values reject at schema/normalizer/render without requiring a nonexistent
     text input in the four inherited-capable editor surfaces
```

Cover all numeric boundaries, leading-dot alpha, whitespace/casing, tokens,
transparent, inherited keywords, unsafe/oversized strings, and normalization
idempotence. Pin that mounting controls with unknown legacy values does not call
`onChange`. Pin widget defaults/no authored value render byte identity.

Generate length-boundary cases from `CSS_COLOR_VALUE_MAX_LENGTH`: a valid authoring
token at max must survive parser, admin commit, menu schema+normalizer, and widget
schema+render boundaries; the corresponding max+1 value must be rejected by all four.
Assert every affected menu/widget JSON schema exposes the imported constant as
`maxLength`; no consumer test repeats `128` as a separate policy.

If DB-backed menu route round-trip coverage is needed, first load `.env`, check the DB,
create uniquely scoped fixtures, and delete only those fixtures. Do not truncate shared
tables.

## Automated Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/css-color-contract.test.ts tests/vitest/services/css-color-contract-corpus.test.ts tests/vitest/ui/color-value.test.ts tests/vitest/ui/color-swatch-alpha.test.tsx tests/vitest/ui/shared-color-alpha.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/menu-color-alpha.test.tsx tests/vitest/services/normalize-menu-appearance.test.ts tests/vitest/services/menu-document-v2.test.ts tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/newsletter.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
bun run gates:coderso
bun run scan:security:strict
git diff --check
```

Rerun every named failing file alone before classification.

## Real browser smoke

Restart the server and use a TASK-541 named Playwright session. Execute at least six
flows, in light and dark admin themes where applicable:

1. Hex8 and opacity control → save → reopen → published computed color.
2. RGBA leading-dot alpha → canonical `0.x` persistence and computed alpha.
3. Valid HSL/HSLA → save/reopen/front parity.
4. Out-of-range RGB/HSL → rejected commit, no optimistic persisted preview.
5. Existing `currentColor`/`inherit` fixture → rejected in menu authoring, recognized
   without mount mutation and visibly inherited only in an explicit widget context;
   picker replacement emits the canonical new value.
6. Design token and transparent/clear → correct fallback/computed result.

Assert computed CSS values, persistence/reopen bytes, visible swatch state, zero
console errors, and screenshots—not merely input/control presence.

TASK-545 lands later. Keep TASK-541 evidence on the current task-scoped `_smoke/`
screenshot plus closeout contract; do not depend on, pre-create, or claim validation by
TASK-545's future durable manifest/schema/`.gitignore` contract.

## Post-audit and closure

Run about five fresh lenses: policy/range correctness, admin/menu/widget parity,
present-only/legacy behavior, security/no-mirror scan, and test/docs/task graph. Every
finding needs `file:line`; fix verified HIGH/MEDIUM, rerun targeted gates, then run a
fresh reconcile.

Document exact profiles, ranges, canonicalization, schema-prefilter limitation, and
explicit inherited opt-in. Create
`_docs/_CHANGELOG/1253-{YYYY-MM-DD}-task-541-canonical-css-color-contract.md` using
the actual closure date and the live `{N}-{YYYY-MM-DD}-short-title.md` convention.
Close all physical descendants before parent, update board/index and
recompute statistics. Record tests, smoke, audit summary and owner commit scope; do not
commit as an agent.
