# 893. TASK-283-01 section layout height and region flow controls

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-283-01

## Key Changes

### Section runtime

- `SectionData.layout` now owns bounded `minHeight`, `regionFlow`, `regionColumns`, `headingGap`, and optional `regionGap` fields.
- `SectionBlock` now renders deterministic min-height and flow markers, supports row/grid region layouts, and clamps grid columns to the repeatable-slot ceiling of eight.
- Explicit `regionGap` tokens now override the prior variant spacing while untouched legacy payloads keep the existing `default` / `contained` / `bleed` spacing contract.

### Section editor and tests

- The Section Visual editor now exposes minimum-height, flow, grid-column, heading-gap, and region-gap controls with disabled guidance until grid flow is active.
- Focused SSR and happy-dom suites now cover legacy defaults, grid/row rendering, clamp behavior, and synchronized editor payload updates, while the widget validator suite continues to prove schema acceptance.
- Section docs, task notes, and the Playwright report rows for C1, C5, W7, and W8 now reflect the landed layout contract.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (blocked by missing local `semgrep`, `trivy`, and `gitleaks` executables; `bun audit` ran)
