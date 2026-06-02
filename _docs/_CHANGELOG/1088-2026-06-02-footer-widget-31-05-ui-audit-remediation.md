# 1088 - Footer widget 31-05 UI audit remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-398, TASK-398-01, TASK-398-02, TASK-398-03, TASK-398-04, TASK-398-05

## Key Changes

- Minimal Footer variant now preserves configured contact and back-to-top
  utilities when legal or social output is disabled.
- Unsafe or empty column links fail closed instead of rendering clickable `#`
  anchors.
- Visual logo preview normalizes image URLs and surfaces replace-or-clear copy
  for unsafe saved logo URLs.
- Wizard variant ownership is read-only, with Visual as the writable variant
  owner.
- Footer slot summaries and link destination controls now expose precise
  ownership metadata.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed.
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 9 files / 125 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/security/codersoSecurityGate.test.ts` - passed.
- `bun run scan:gitleaks:worktree` - passed.
- `bun run scan:trivy:secret` - passed.
- `bun run scan:semgrep` - passed, 0 findings.
- `git diff --check` - passed.
- `bun run gates:coderso` - passed: functional, ux, performance, security, reliability.
