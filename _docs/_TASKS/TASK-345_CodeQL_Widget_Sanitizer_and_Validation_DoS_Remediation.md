# TASK-345: CodeQL Widget Sanitizer and Validation DoS Remediation
# FileName: TASK-345_CodeQL_Widget_Sanitizer_and_Validation_DoS_Remediation.md

**Priority:** High
**Category:** Security + CodeQL + Widgets + Testing
**Estimated Effort:** Small
**Dependencies:** TASK-238, TASK-343, TASK-344
**Status:** Done (2026-05-31)

---

## Overview

Remediate the new GitHub CodeQL high-severity alerts for widget editing and
widget validation:

- `core/admin/ui/widgets/editors/HeroEditors.tsx`: incomplete multi-character
  sanitization while checking whether sanitized rich text is empty.
- `tests/vitest/widgets/templateSection.test.tsx`: test-only regex tag stripping
  flagged as incomplete sanitization.
- `core/widgets/validator.ts`: AJV `allErrors: true` resource-exhaustion risk
  while validating user-controlled widget data.

## Sub-Tasks

- Replace regex HTML tag stripping with the existing tokenizer-based rich-text
  plain-text helper.
- Keep Hero rich text sanitization behavior intact while avoiding pseudo HTML
  sanitization in the editor empty-check path.
- Switch widget AJV validation to fail-fast mode.
- Add a validation budget guard before schema traversal to reject excessively
  deep or broad widget data payloads.
- Add focused regression coverage for Hero rich-text script-only empty content
  and widget validator budget limits.
- Update task board and changelog.

## Implementation Pseudocode

```ts
export const richTextHtmlToPlainText = (html: string) =>
  htmlToPlainText(html, richTextPlainTextBlockTags);

const isEmptyRichTextHtml = (html: string) =>
  richTextHtmlToPlainText(html).length === 0;

const ajv = new Ajv({ allErrors: false, strict: true });

assertValidationBudget(merged);
const valid = validate(merged);
```

Data flow:

- Rich text continues through `sanitizeRichTextHtmlWithDiagnostics` before Hero
  editor state is persisted.
- Plain-text checks use the shared tokenizer instead of regular-expression tag
  removal.
- Widget data is merged with defaults, checked against a bounded structural
  budget, then validated by AJV in fail-fast mode.

Error handling:

- Over-budget widget data throws `widget_schema_invalid: payload_too_deep` or
  `widget_schema_invalid: payload_too_complex` before AJV traversal.
- Schema errors still throw `widget_schema_invalid: ...` with AJV's first
  fail-fast detail.

## Security Contract

No API routes are added or changed.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: preserved through existing widget schemas.
- Anti-abuse: widget validation now rejects excessively deep/broad payloads
  before schema traversal.
- Secret handling: unchanged.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/validator-security.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `bun run scan:semgrep:strict`
- Local CodeQL CLI when available; otherwise GitHub code scanning remains the
  final CodeQL validation.

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1032-2026-05-31-codeql-widget-sanitizer-validation-dos.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-05-31)

- Regex-based HTML tag stripping was removed from the CodeQL-reported Hero
  editor and Template Section test paths.
- Widget AJV validation now runs fail-fast and rejects structurally excessive
  data before schema traversal.
- Validation passed:
  - `bun run vitest run --config vitest.config.ts tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/validator-security.test.ts` (`31 pass`, `0 fail`)
  - `bun test tests/unit/widgets/validator.test.ts` (`33 pass`, `0 fail`)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run lint:repo:types`
  - `bun run scan:semgrep:strict` (`0 findings`)
- Local CodeQL CLI was not available on `PATH`; GitHub CodeQL remains the final
  confirmation for the exact reported code-scanning alerts.
