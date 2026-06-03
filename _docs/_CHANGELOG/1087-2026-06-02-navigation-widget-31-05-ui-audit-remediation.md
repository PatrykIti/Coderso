# 1087 - Navigation widget 31-05 UI audit remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-397, TASK-397-01, TASK-397-02, TASK-397-03, TASK-397-04, TASK-397-05, TASK-397-06

## Key Changes

- Allowed resolved empty Navigation link lists to render a static-safe public
  state instead of failing schema validation.
- Made unsafe manual hrefs fail closed instead of degrading to clickable `#`
  placeholders.
- Fixed drawer active-link clone semantics so responsive duplicate links expose
  truthful `aria-current` state.
- Replaced raw public menu-key exposure with non-sensitive configured-state
  metadata.
- Completed Navigation Visual path metadata and bounded persisted/imported
  style colors through the shared CSS color normalizer.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed.
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 9 files / 125 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/security/codersoSecurityGate.test.ts` - passed.
- `bun run scan:gitleaks:worktree` - passed.
- `bun run scan:trivy:secret` - passed.
- `bun run scan:semgrep` - passed, 0 findings.
- `git diff --check -- core/widgets/core/navigation.tsx core/admin/ui/widgets/editors/NavigationEditors.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx _docs/_WIDGETS/NAVIGATION.md _docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_NAVIGATION_WIDGET.md _docs/_TASKS/TASK-397*.md` - passed.
- `git diff --check` - passed.
- `bun run gates:coderso` - passed: functional, ux, performance, security, reliability.
