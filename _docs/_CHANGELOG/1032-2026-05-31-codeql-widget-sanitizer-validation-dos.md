# 1032 - CodeQL widget sanitizer and validation DoS remediation

Date: 2026-05-31
Version: Unreleased
Tasks: TASK-345

## Key Changes

### Security

- Replaced regex-based HTML tag stripping in the Hero editor rich-text
  empty-check path with the shared tokenizer-based rich-text plain-text helper.
- Updated the Template Section regression test to inspect visible text through
  the same tokenizer helper instead of test-only regex stripping.
- Hardened widget schema validation by switching AJV to fail-fast mode and
  rejecting excessively deep or broad widget data before schema traversal.

### Testing

- Added focused regression coverage for Hero rich-text script-only empty input
  and widget validator budget rejection.

## Validation

- Passed `bun run vitest run --config vitest.config.ts tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/validator-security.test.ts`.
- Passed `bun test tests/unit/widgets/validator.test.ts`.
- Passed `bun --cwd core lint`, `bun --cwd core lint:types`, and `bun run lint:repo:types`.
- Passed `bun run scan:semgrep:strict` with `0 findings`.
- Local CodeQL CLI was unavailable; GitHub CodeQL is the final confirmation for
  the exact code-scanning alerts.
