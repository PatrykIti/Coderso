# TASK-337: Spacer and Stats KPI Lint Typecheck Drift Repair

# FileName: TASK-337_Spacer_and_Stats_KPI_Lint_Typecheck_Drift_Repair.md

**Priority:** High
**Category:** QA + Widgets + Admin UI + Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-336-19, TASK-284-02, TASK-287-05
**Status:** Done (2026-05-27)

---

## Overview

Repair the failing root `bun run lint` lane after the recent widget-editor
ownership cleanup by removing test/type drift around the Spacer contract and
the Stats KPI editor DOM helpers.

The failure is currently in repo-level TypeScript checks, not in the
`core` ESLint lane. The fix must align tests with the current owner contracts
instead of restoring outdated signatures or weakening type safety with loose
casts.

## Source Findings

- `bun run lint` fails in root `tsc` with `TS2554` in Spacer Vitest suites and
  `TS2345` in `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`.
- `core/widgets/core/spacer.tsx` owns `normalizeSpacerData(data: SpacerData)`
  with a single-argument signature; lingering tests still call the old
  two-argument form.
- `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` defines a local
  `findInputByPlaceholder()` helper as `HTMLElement`-only even though the
  assertions pass a `ParentNode` section root.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `tests/vitest/widgets/spacer.test.tsx` | Update Spacer normalization calls to the current owner signature and keep regression coverage for defaults, presets, viewport lengths, and fixed-mode rendering. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Align the shared style-token Spacer assertion with the current normalization signature. |
| `tests/vitest/ui/spacer-editor-wave.test.tsx` | Update the mocked fallback path so it delegates to the current Spacer owner signature without reintroducing obsolete variant-aware normalization. |
| `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Broaden the local placeholder helper to the correct DOM base type so section-scoped assertions remain strict and type-safe. |
| `_docs/_TASKS/TASK-337_Spacer_and_Stats_KPI_Lint_Typecheck_Drift_Repair.md` | Track status, validation, and closure notes. |
| `_docs/_TASKS/README.md` | Keep board state and statistics synchronized while the task is active and after closure. |

## Implementation Pseudocode

```ts
// Spacer: keep the contract owner as-is and fix stale tests.
const normalized = normalizeSpacerData({
  height: {
    desktop: "24",
    tablet: "12",
    mobile: "8",
  },
});

vi.doMock("../../../core/widgets/core/spacer", async () => {
  const actual = await vi.importActual<typeof import("../../../core/widgets/core/spacer")>(
    "../../../core/widgets/core/spacer"
  );

  return {
    ...actual,
    normalizeSpacerData: vi.fn((data: SpacerData, variant = "responsive") => {
      if (variant === "missing-height") return { showGuideInEditor: false };
      if (variant === "empty-height") return { height: {}, showGuideInEditor: false };
      return actual.normalizeSpacerData(data);
    }),
  };
});

// Stats KPI: helper only needs DOM query methods available on ParentNode.
const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
```

Data flow:

- `normalizeSpacerData()` remains the single source of truth for Spacer
  normalization.
- Spacer tests continue to simulate missing-height editor states through the
  mock wrapper, but they must delegate to the live owner signature on the
  fallback path.
- Stats KPI test helpers must accept the same DOM node family that the file
  already uses for textarea/select queries, without widening assertion scope.

Error handling:

- Do not re-add an unused `variant` parameter to `normalizeSpacerData()` only to
  satisfy stale tests.
- Do not use `any`, unsafe non-null assertions, or broad `HTMLElement` casts to
  silence the Stats KPI helper mismatch.
- Keep the existing regression assertions intact so the fix proves the current
  contract instead of hiding failures.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged widget schemas and editor contracts.
- Anti-abuse: no new persisted payload fields, no client-side storage changes,
  and no weakening of current input normalization.
- Secret handling: unchanged; no secrets are introduced into tests, docs, or
  diagnostics.

## Testing Requirements

- `bun run lint`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`

## Documentation Updates Required

- Update this task file with final status and validation notes.
- Update `_docs/_TASKS/README.md` on status changes.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` if the task is
  completed in this work session.

## Acceptance Criteria

- Root `bun run lint` is green again without restoring outdated helper
  signatures.
- Spacer Vitest suites call the current owner contract consistently.
- Stats KPI editor tests remain strict while using the correct DOM base type.
- Task board and changelog state reflect the completed repair.


## Completion Notes (2026-05-27)

- Root `bun run lint` is green again.
- Spacer regression suites now call the current owner `normalizeSpacerData()`
  signature consistently, including the editor-wave mock fallback.
- Stats KPI editor tests now use `ParentNode` for the local placeholder helper,
  which matches the section-scoped DOM queries already used elsewhere in the
  file.
- Validation passed:
  - `bun run lint`
  - `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
