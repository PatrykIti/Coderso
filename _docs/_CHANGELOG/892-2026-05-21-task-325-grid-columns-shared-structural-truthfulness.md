# 892. TASK-325 Grid Columns shared structural truthfulness

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-325, TASK-325-01, TASK-325-02, TASK-325-03, TASK-325-04, TASK-325-05, TASK-325-06

## Key Changes

### Grid Columns editor truthfulness

- Selecting `asymmetric` now reapplies the current desktop preset atomically, while saved equal/custom desktop spans surface explicit state and a bounded reapply action.
- Visual now shows current desktop/tablet/mobile totals from the effective visible live layout, keeps row-level controls aligned to the current live slot order, and explains whether each breakpoint fills one row, wraps onto additional rows, or leaves unused width.
- Cardize-only controls now hide or disable truthfully when cardized styling is off, and `masonry-lite` keeps the cardized contract locked on with explicit copy.

### Shared contract closure

- Grid Columns color controls now rely on the already-landed shared CSS-variable swatch/text contract, with widget-local regression coverage proving both global and per-column token text stays visible, and the global wrapper colors now use the same bounded token-or-hex schema as per-column overrides.
- The runtime overflow follow-up closed with an explicit `no-runtime-guard` decision: saved spans stay authoritative, and the editor now explains wrap/unused-width consequences instead of rewriting layouts.
- The review-loop hardening also aligned asymmetric preset behavior for 4-6 columns, made totals follow live slot count plus breakpoint visibility, and ensured row controls plus recovery actions materialize the current live slot order instead of raw saved `columns[]` order.
- Updated the Grid Columns report, widget docs, task board, and task files to close the shared residuals under TASK-325.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (current local environment is missing `semgrep`, `trivy`, and `gitleaks`; `bun audit` still completes inside the same command)
