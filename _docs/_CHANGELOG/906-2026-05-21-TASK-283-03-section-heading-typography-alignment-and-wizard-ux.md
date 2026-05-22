# 906. TASK-283-03 section heading typography alignment and Wizard UX

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-283-03

## Key Changes

### Section runtime

- `SectionData.heading` now owns bounded `level`, `align`, `labelSize`, `titleSize`, `descriptionSize`, and optional clearable heading text colors while preserving the safe default `h2` baseline for legacy blocks.
- `SectionBlock` now renders bounded heading tags, alignment classes, size tokens, and optional inline heading colors without widening the Section contract into rich text, Markdown, or arbitrary classes.
- Legacy Section payloads still normalize to the prior left-aligned `text-xs` / `text-2xl` / `text-sm` visual baseline unless authors intentionally choose a different bounded heading token.

### Section editor and docs

- The Section Wizard now includes a `Label` input, and the Visual `Heading and intro` section now exposes heading level, alignment, size, and clearable color controls with `h2` guidance.
- Focused runtime, editor, and validator coverage now prove the new heading normalization, bounded render output, and Wizard/Visual synchronization.
- Section docs, the Playwright report rows for C3, C4, W5, and U1, and the task board now reflect the shipped heading contract.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (blocked by missing local `semgrep`, `trivy`, and `gitleaks` executables; `bun audit` ran)
- `bun run precommit`
- `git diff --check`
