# TASK-395-01: FE-31-05-01 - Mount public Form Embed submit route
# FileName: TASK-395-01_FE_31_05_01_Mount_Public_Form_Embed_Submit_Route.md

**Priority:** High
**Category:** Widgets + Form Embed + Public Forms API + Security + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Large
**Dependencies:** TASK-395
**Status:** To Do

---

## Overview

Execution-ready leaf task for FE-31-05-01 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md` and parent `TASK-395`.

Public submit currently 404s for the widget flow.

## Sub-Tasks

- [ ] Reproduce FE-31-05-01 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Register the public forms submit route in the runtime router and map known service errors to API errors.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Route registration + public submit happy/failure tests.

## Owner Files

- `core/server/publicFormsApi.ts`
- `core/server/routes*.ts`

## Security Contract

Public write endpoint: form submission. Must be public only when form access allows it, require nonce/signature/HMAC where contract expects it, optional reCAPTCHA/botProtection, rate-limit forms bucket, strict reject-unknown validation, no persisted nonce, CSRF/session/RBAC for internal admin writes, and API key scope only for explicitly internal integrations.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Endpoint visibility must be explicit if a route is touched: internal admin routes require session/RBAC/CSRF; public routes require the existing widget-specific public access contract.
- Public writes must use nonce/signature/HMAC or the existing equivalent, optional CAPTCHA where configured, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for malformed IDs, unsafe hrefs, unsafe CSS, stale runtime data, and empty resolver states.
- Browser-visible state must not contain secrets, provider keys, privileged settings, persisted nonce values, or internal-only identifiers.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/site/publicRenderer.test.tsx`
- `bun test` public forms route/security suites with env loaded when DB-backed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Focused regression: Route registration + public submit happy/failure tests.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/TASK-395_Form_Embed_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Do not create a standalone changelog for this leaf unless closure policy changes; the parent family uses the reserved changelog number at implementation closure.

## Acceptance Criteria

- FE-31-05-01 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
