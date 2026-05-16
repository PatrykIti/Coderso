# TASK-269-04: Multi-Step Controls and Stored Progress

# FileName: TASK-269-04_Multi_Step_Controls_and_Stored_Progress.md

**Priority:** High
**Category:** Widgets + Runtime Script + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-269-02
**Status:** To Do

---

## Overview

Make Form Embed multi-step behavior configurable and trustworthy.

The report shows that Back/Next labels are hardcoded, progress state has no
user-visible indicator, stored progress never expires, and the editor shows a
Submit label even when a multi-step form hides Submit until the final step. This
leaf adds Form Embed-owned multi-step controls and localStorage policy without
changing the Forms route contract.

## Scope Boundary

This leaf owns Form Embed multi-step runtime and editor behavior:

- back/next/submit label model for multi-step forms;
- progress indicator display and accessible step status;
- saved-progress TTL and expired-progress cleanup;
- editor visibility/copy for multi-step-only controls;
- localStorage key/versioning policy for Form Embed progress.

This leaf does not own general page-builder mode helpers, generic form field
rendering, or backend Forms submission validation.

## Sub-Tasks

- [ ] Extend Form Embed data with bounded `navigation.backLabel`,
  `navigation.nextLabel`, and optional multi-step progress settings.
- [ ] Add a visible progress indicator that uses resolved step titles and
  announces current/total step state.
- [ ] Add data attributes consumed by `formRuntimeScript.ts` for custom nav
  labels, progress state, and saved-progress TTL.
- [ ] Implement saved-progress expiry by checking `savedAt` before hydrating and
  removing stale payloads.
- [ ] Keep progress persistence path-scoped and form-scoped; do not store
  submissions, secrets, or nonce values.
- [ ] Update the editor so Submit label guidance changes when a selected form is
  multi-step and Back/Next controls are only shown when relevant.
- [ ] Preserve current multi-step validation and conditional field behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Add schema/defaults/normalizer for navigation/progress settings and render progress/nav attributes. |
| `core/widgets/core/formRuntimeScript.ts` | Add progress indicator refresh and saved-progress TTL cleanup. |
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Add multi-step-only label/progress controls and selected-form guidance. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover navigation labels, progress markup, and data attributes. |
| `tests/vitest/widgets/formRuntimeScript.test.ts` | Create or update focused tests for TTL hydration, progress UI refresh, and navigation state. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover multi-step editor controls and single-step hiding/guidance. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document multi-step controls and saved-progress expiry. |

## Implementation Pseudocode

```ts
type FormEmbedNavigation = {
  backLabel?: string;
  nextLabel?: string;
  showProgress?: boolean;
  progressStyle?: "text" | "bar" | "steps";
  savedProgressTtlDays?: number;
};

function normalizeFormEmbedNavigation(value: unknown): Required<FormEmbedNavigation> {
  return {
    backLabel: normalizeNonEmptyString(readString(value, "backLabel"), "Back"),
    nextLabel: normalizeNonEmptyString(readString(value, "nextLabel"), "Next"),
    showProgress: readBoolean(value, "showProgress", true),
    progressStyle: readProgressStyle(value, "text"),
    savedProgressTtlDays: clampInteger(readNumber(value, "savedProgressTtlDays"), 1, 30, 7),
  };
}
```

Runtime shape:

```js
const isProgressExpired = (payload, ttlDays) => {
  const savedAt = Number(payload && payload.savedAt);
  if (!Number.isFinite(savedAt)) return true;
  return Date.now() - savedAt > ttlDays * 24 * 60 * 60 * 1000;
};

const hydrateProgress = (form) => {
  const payload = readProgressPayload(form);
  if (isProgressExpired(payload, readProgressTtlDays(form))) {
    clearProgress(form);
    return;
  }
  hydrateValuesAndStep(form, payload);
};

const refreshProgressUi = (form) => {
  const current = getCurrentStep(form);
  const total = getStepElements(form).length;
  setText(form.querySelector("[data-form-progress-text]"), `Step ${current} of ${total}`);
  updateProgressBar(form, current, total);
};
```

Error handling:

- Invalid custom labels fall back to "Back" and "Next".
- Invalid TTL values clamp to a safe range and never disable expiry silently.
- Corrupt localStorage payloads are ignored and removed when possible.
- Progress UI hides for single-step forms unless explicitly useful for editor
  diagnostics.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: navigation/progress fields must be explicitly
  allowlisted.
- Anti-abuse: localStorage stores only user-entered field values and step index
  when existing save-progress is enabled; it must not store nonce secrets,
  CAPTCHA tokens, provider keys, or raw backend responses.
- Secret handling: progress payloads remain path/form scoped and are cleared
  after success or TTL expiry.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formRuntimeScript.test.ts`
  when `formRuntimeScript.ts` behavior changes
- `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with multi-step labels, progress
  indicator, and saved-progress expiry behavior.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows W13, W14, W16,
  U7, and U8 after validation.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Multi-step Form Embed output has configurable Back/Next labels and an
  accessible progress indicator.
- Saved progress expires deterministically and stale payloads are not restored
  indefinitely.
- The editor exposes multi-step controls only when they are relevant and
  explains Submit label behavior for final-step submission.
- Existing conditional field and per-step validation behavior remains covered.
