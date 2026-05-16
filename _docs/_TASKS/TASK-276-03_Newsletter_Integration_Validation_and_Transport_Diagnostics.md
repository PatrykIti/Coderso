# TASK-276-03: Newsletter Integration Validation and Transport Diagnostics

# FileName: TASK-276-03_Newsletter_Integration_Validation_and_Transport_Diagnostics.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render + Integration Safety
**Estimated Effort:** Large
**Dependencies:** TASK-276, TASK-276-01
**Status:** To Do

---

## Overview

Make Newsletter integration settings truthful and validated across Visual,
Advanced, and runtime output.

The report highlights that action URL accepts arbitrary text, the renderer
always posts with method `POST`, Advanced shows both action URL and webhook ID
without priority guidance, and transport-security details are unclear. This
leaf keeps transport choices bounded and explainable without adding provider
secrets to widget data.

## Scope Boundary

This leaf owns:

- Safe action URL normalization and inline editor validation.
- Bounded method selection where needed for third-party providers (`GET`/`POST`)
  without changing default behavior.
- Advanced integration diagnostics explaining which field is active for the
  selected mode.
- External action safety diagnostics where applicable. Do not add invalid HTML
  attributes to `<form>`; if the report's `rel` row is not applicable to form
  actions, close it as `not reproducible` with evidence in TASK-276-07.
- Compatibility handling for existing `integration.mode`, `actionUrl`, and
  `webhookId`.

This leaf does not own:

- Runtime success/error orchestration from TASK-276-02.
- New backend webhook delivery service or provider secret storage.
- Arbitrary scripts, custom headers, CORS bypasses, provider API keys, or raw
  HTML embed snippets in widget data.
- Generic safe URL helpers for unrelated widgets unless already available from
  TASK-256.

## Sub-Tasks

- [ ] Add `integration.method?: "post" | "get"` with default `post` only if
  current provider references require method configurability.
- [ ] Normalize `integration.actionUrl` to accepted safe values: HTTPS absolute
  URLs and explicit relative paths only when the route is Coderso-owned.
- [ ] Reject or surface editor diagnostics for bare domains such as
  `example.com`.
- [ ] Keep `webhookId` as a safe identifier only; do not treat it as a secret or
  direct provider URL.
- [ ] In Advanced, show active transport summary: selected mode, active field,
  ignored field, method, and submit readiness.
- [ ] Preserve legacy payloads by normalizing missing method to `post` and
  missing action URL to a non-submitting state.
- [ ] Add docs explaining external action URL limitations, the non-applicable
  `rel`/target distinction for forms if confirmed, and the backend-owned path
  for webhook/public write behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Extend schema/defaults/normalizer for method and safe URL diagnostics; render method/action only when valid. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add action URL validation, method choice if approved, and Advanced active-field diagnostics. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover valid/invalid URL normalization, method defaults, and non-submitting invalid action state. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover inline validation and Advanced diagnostics. |
| `tests/unit/widgets/validator.test.ts` | Update when schema changes. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document integration modes, method support, URL constraints, and diagnostics. |

## Implementation Pseudocode

```ts
type NewsletterIntegration = {
  mode?: "action-url" | "webhook";
  method?: "post" | "get";
  actionUrl?: string;
  webhookId?: string;
};

function normalizeNewsletterActionUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length === 0) return { value: "", status: "empty" as const };
  if (text.startsWith("/")) return { value: text, status: "valid" as const };
  try {
    const url = new URL(text);
    if (url.protocol === "https:") return { value: url.toString(), status: "valid" as const };
  } catch {
    return { value: "", status: "invalid" as const };
  }
  return { value: "", status: "invalid" as const };
}

function resolveNewsletterTransport(integration: NewsletterIntegration) {
  const action = normalizeNewsletterActionUrl(integration.actionUrl);
  const mode = integration.mode === "webhook" ? "webhook" : "action-url";
  return {
    mode,
    method: integration.method === "get" ? "get" : "post",
    actionUrl: mode === "action-url" && action.status === "valid" ? action.value : "",
    actionStatus: action.status,
    activeField: mode === "webhook" ? "webhookId" : "actionUrl",
  };
}
```

Error handling:

- Invalid action URLs render no `action` attribute and set
  `data-newsletter-action-status="invalid"`.
- Bare domains remain invalid until the user adds `https://`.
- Webhook mode ignores action URL at runtime but keeps the stored value for
  backward-compatible editing.
- If method is `get`, hidden fields and consent names must still be safe and no
  secret-like values may be included.
- Advanced diagnostics must describe inactive fields rather than encouraging
  users to fill both.

## Security Contract

This leaf does not add API routes.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin editing and public rendering.
- Reject-unknown validation: integration schema remains
  `additionalProperties: false`; invalid URLs/methods normalize or fail
  validation in tests.
- Anti-abuse: external action URLs are not Coderso-protected; docs and
  diagnostics must not imply nonce/CAPTCHA protection unless the target is a
  Coderso-owned route.
- Secret handling: no provider API keys, webhook secrets, custom headers, raw
  scripts, private URLs, or credentials in widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict` before closure if URL/transport sanitization
  behavior changes.

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows UX-03, UX-04, BF-10, and
  BF-13 after validation or not-applicable evidence.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Invalid action URLs cannot silently produce broken public submit behavior.
- Advanced editor clearly identifies the active integration field and ignored
  metadata.
- Method behavior is explicit, backward-compatible, and test-covered if added.
- Widget data remains free of secrets, arbitrary scripts, and custom privileged
  provider configuration.
