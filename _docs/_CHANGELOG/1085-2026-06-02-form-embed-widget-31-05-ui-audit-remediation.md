# 1085 - Form Embed widget 31-05 UI audit remediation

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-395, TASK-395-01, TASK-395-02, TASK-395-03, TASK-395-04, TASK-395-05, TASK-395-06, TASK-395-07, TASK-395-08, TASK-395-09

## Key Changes

- Mounted public Form Embed submissions through `POST /forms/:id/submissions`
  on the public site handler while sharing the existing Forms submit route
  validation, access, signed nonce/HMAC, bot-protection, persistence,
  automation, and error mapping contract.
- Made the shared Form Embed runtime idempotent across duplicate/later
  instances, serialized checked boxes as backend-compatible booleans, clamped
  restored progress to incomplete previous steps, and validated all visible
  steps through the current step before submit.
- Split Forms field step semantics into `formStep` for multi-step placement and
  `inputStep` for number/range/time increments, preserving legacy
  `settings.step` as a form-step adapter.
- Hardened public/internal behavior and redirect policy: internal-only forms
  render noninteractive public boundaries, widget success copy outranks runtime
  copy, unsafe redirects are ignored at runtime, and form-level redirects are
  rejected before persistence unless same-origin relative.
- Kept runtime nonce material out of persisted Form Embed widget data by
  tightening the saved `resolved` schema while still allowing server-side
  runtime nonce projection for the current request.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/forms/validation.test.ts tests/vitest/forms/formRuntimeResolver.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx` — passed.
- `set -a && source .env && set +a && bun test tests/unit/server/publicFormsApi.test.ts tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts` — passed.
- `bun run test:vitest -- tests/vitest/ui/form-canvas.test.tsx tests/vitest/ui/form-canvas-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/widgets/contact.test.tsx tests/vitest/ui/contact-editor-wave.test.tsx` — passed.
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/admin/formsClient.test.ts` — passed.
- `bun --cwd core lint` — passed.
- `bun --cwd core lint:types` — passed.
- `bun test tests/security/codersoSecurityGate.test.ts` — passed.
- `bun run scan:gitleaks:worktree` — passed.
- `bun run scan:trivy:secret` — passed.
- `bun run scan:semgrep` — passed.
- `git diff --check` — passed.
- `bun run gates:coderso` — passed.
