# TASK-395-07: FE-31-05-07 - Clarify widget vs form-level success and redirect policy
# FileName: TASK-395-07_FE_31_05_07_Clarify_Widget_Vs_Form_Level_Success_And_Redirect.md

**Priority:** High
**Category:** Widgets + Form Embed + Public Forms API + Security + Runtime + QA + Docs + Leaf Remediation
**Estimated Effort:** Medium
**Dependencies:** TASK-395
**Status:** Done

---

## Overview

Execution-ready leaf task for FE-31-05-07 from `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md` and parent `TASK-395`.

Success message and redirect are controlled by form-level API response, not widget configuration.

Status log:

- 2026-06-02: Moved to In Progress with TASK-395 family implementation.
- 2026-06-02: Done. Runtime success copy uses widget copy before API/runtime
  copy; form-level success redirects are normalized to same-origin relative
  paths before persistence, and runtime ignores unsafe redirects before assign.

## Sub-Tasks

- [ ] Reproduce FE-31-05-07 with the report fixture before editing and record the observed admin/public state in closure notes.
- [ ] Implement the owner-side contract change described below without adding route/editor-only fallbacks that hide the real behavior.
- [ ] Preserve non-destructive legacy behavior unless this task explicitly requires clearing stale inactive state.
- [ ] Add the focused regression test listed below in the correct Bun/Vitest/Playwright lane.
- [ ] Update parent task, report notes, and widget docs if the implementation changes public/admin behavior.

## Implementation Pseudocode

**Helper/function shape:** Define precedence contract; UI/Advanced must show effective source and runtime must apply documented order.

**Data flow:**

1. Start at the external/admin/import/runtime payload boundary named in the report.
2. Normalize or validate in the widget/domain/service owner before data reaches persistence, renderer, runtime script, or Advanced diagnostics.
3. Pass only the normalized/effective state into UI copy, public SSR, runtime binding, and diagnostics.
4. Keep saved-but-inactive state visible only as inactive/dormant copy; never present it as active runtime behavior.

**Error handling:**

- Fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, stale hidden state, and invalid public-write payloads.
- Map service/route errors through existing machine-readable error helpers when this leaf touches an API route.
- Do not leak raw attacker-controlled strings, nonce material, provider secrets, or internal identifiers into public DOM/debug output.

**Regression-test shape:** Runtime/UI tests for widget copy vs form response precedence.

## Owner Files

- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
- `core/widgets/core/formRuntimeScript.ts`

## Security Contract

Public write endpoint: form submission. Route visibility is public only when the Forms access evaluator allows widget-rendered submissions; internal/admin writes remain session/RBAC/CSRF protected. Public submissions must use a server-issued one-time nonce plus request signature/HMAC, optional reCAPTCHA/botProtection when configured, strict reject-unknown validation, no persisted nonce, and the existing `public_write` bucket keyed by the submission pathname via `resolvePublicWriteIdentifier`. Internal integration mode may use only a session or an API key with explicit forms submit scope.

Minimum checks for any touched endpoint or payload boundary:

- Endpoint visibility must remain explicit: internal admin routes under authenticated admin scope; public routes only where the widget runtime requires them.
- Auth/RBAC/CSRF must follow existing admin route conventions for writes.
- Public writes, where present, require nonce/signature/HMAC or the existing widget-specific equivalent, optional CAPTCHA policy, strict reject-unknown validation, and a named rate-limit bucket.
- Public read/render paths must fail closed for unsafe URLs, unsafe CSS strings, malformed IDs, and stale runtime data.
- Do not put secrets, provider keys, nonce material, or privileged settings in browser cache/localStorage/debug payloads.

Leaf-specific checks:

- Form Embed public submissions must use public visibility only for widget runtime, nonce + signature/HMAC, optional reCAPTCHA/botProtection when configured, the existing `public_write` bucket keyed by the submission pathname via `resolvePublicWriteIdentifier`, strict reject-unknown validation, and session or API key with explicit forms submit scope for internal mode.
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
- Focused regression: Runtime/UI tests for widget copy vs form response precedence.

For DB-backed tests, load env first: `set -a && source .env && set +a`. If unavailable, record that skip in the parent closure notes.

## Documentation Updates Required

- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/PLAYWRIGHT/31-05-2026-widgets/REPORT_FORM_EMBED_WIDGET.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/TASK-395_Form_Embed_Widget_31_05_UI_Audit_Remediation_Family.md` parent status/checklist when this leaf starts or closes.
- `_docs/_TASKS/README.md` board row when status changes.
- Leaf closure changelog coverage: either create a standalone changelog entry for this leaf at closure or list this leaf ID explicitly in the parent family changelog before moving this leaf to `Done`.

## Acceptance Criteria

- FE-31-05-07 is fixed or reclassified with fresh evidence in the report and parent task.
- The focused regression fails before the fix and passes after it.
- The effective admin/public behavior is truthful and does not regress adjacent options from the same widget.
- Required lint/typecheck/diff checks and targeted test lanes are recorded in closure notes.
