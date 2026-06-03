# 1086 - Contact widget 31-05 UI audit remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-396, TASK-396-01, TASK-396-02, TASK-396-03, TASK-396-04, TASK-396-05, TASK-396-06, TASK-396-07, TASK-396-08

## Key Changes

- Kept Contact on the shared public Forms submit endpoint for active public
  runtimes, including nonce/HMAC, bot-protection, strict schema, public-write
  rate-limit, and route error mapping.
- Projected Contact runtime metadata for submit labels and CAPTCHA, and made the
  shared Forms runtime restore the original submit label after failed submits
  while binding duplicate/later forms idempotently.
- Split Contact configured/effective form mode markers and added explicit
  runtime boundary metadata for static fallback, missing nonce, internal forms,
  field mismatch, conditional logic, and multi-step bindings.
- Hardened public render safety by restricting map embeds to HTTPS Google Maps,
  publishing only known HTTPS social platform links, and bounding inline color
  normalization.
- Completed Contact Visual path/action metadata beyond style rows and updated
  widget docs plus the 31-05 report with the effective runtime contract.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx` - passed.
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts` - passed, 9 files / 125 tests.
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/server/publicFormsApi.test.ts tests/integration/routes/forms.test.ts` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/security/codersoSecurityGate.test.ts` - passed.
- `bun run scan:gitleaks:worktree` - passed.
- `bun run scan:trivy:secret` - passed.
- `bun run scan:semgrep` - passed, 0 findings.
- `git diff --check` - passed.
- `bun run gates:coderso` - passed: functional, ux, performance, security, reliability.
