# TASK-265-03: Entry Teaser CTA Link and URL Feedback

# FileName: TASK-265-03_Entry_Teaser_CTA_Link_and_URL_Feedback.md

**Priority:** High
**Category:** Widgets + Runtime Render + Admin UI + Safe Links
**Estimated Effort:** Medium
**Dependencies:** TASK-265-01, TASK-265-02
**Status:** To Do

---

## Overview

Repair Entry Teaser CTA and custom URL behavior from
`REPORT_ENTRY_TEASER_WIDGET.md`.

This leaf owns report findings E-08, E-11, B-04, B-05, and T-04. It must keep
custom URL editing user-friendly, validate unsafe URLs before persistence or
rendering, add optional new-tab behavior with safe `rel`, and add Entry
Teaser-local CTA style variants without weakening shared safe-href rules. It
must consume the existing shared `resolveWidgetLinkAttrs()` helper from
`core/widgets/core/widgetSafeHref.ts` when adding new-tab output instead of
duplicating external-link logic locally.

## Scope Boundary

In scope:

- Entry Teaser CTA schema/defaults/normalizer/render/editor/tests.
- Separate raw editor input from normalized safe runtime href so switching to
  Custom URL does not immediately show `#`.
- Inline validation for unsafe custom URLs such as `javascript:`.
- Optional `opensInNewTab` and local CTA style choices.
- Safe runtime output for `target="_blank"` with `rel="noopener noreferrer"`
  through the shared link-attribute helper.

Out of scope:

- A generic CTA/link helper for all widgets; consume the existing shared owner
  in `core/widgets/core/widgetSafeHref.ts` instead of changing link logic
  locally without cause.
- Arbitrary HTML, raw class names, script URLs, or external link allowlist
  changes outside existing `normalizeWidgetSafeHref()` behavior.

## Files To Create Or Change

| File | Required change |
|---|---|
| `core/widgets/core/entryTeaser.tsx` | Extend CTA schema/defaults/normalizer/render for `opensInNewTab`, `style`, and safe href metadata while using the existing shared link attrs owner. |
| `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` | Add user-friendly custom URL editing, validation feedback, new-tab toggle, and CTA style controls. |
| `tests/vitest/widgets/entryTeaser.test.tsx` | Create or extend Bun-free coverage for unsafe href normalization, safe render output, target/rel, schema rejection, and CTA style variants. |
| `tests/vitest/ui/entry-teaser-editor-wave.test.tsx` | Cover custom URL empty field, invalid URL copy, new-tab toggle, and style updates. |
| `tests/vitest/site/publicRenderer.test.tsx` | Update public HTML assertions when CTA output changes. |
| `_docs/_WIDGETS/ENTRY_TEASER.md` | Document CTA behavior and safe-link constraints. |

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged.
- CSRF: unchanged because no route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: CTA fields must be declared in
  `entryTeaserSchema` and unknown CTA fields rejected by widget validation.
- Anti-abuse: custom CTA URLs must use `normalizeWidgetSafeHref()` with the
  current allow-relative/hash/http policy; unsafe URLs must not render as
  clickable script URLs.
- Secret handling: do not store provider keys, auth tokens, private URLs, or
  signed URLs in CTA fields or diagnostics.

## Implementation Pseudocode

```ts
type EntryTeaserCtaStyle = "link" | "button" | "outline";

type EntryTeaserData["cta"] = {
  label?: string;
  hrefMode?: "auto" | "custom";
  href?: string;
  opensInNewTab?: boolean;
  style?: EntryTeaserCtaStyle;
};

type EntryTeaserCtaEditorState = {
  hrefValidation?: "valid" | "invalid";
  message?: string;
};

function normalizeEntryTeaserCta(input: EntryTeaserData["cta"]) {
  const hrefMode = resolveEntryTeaserHrefMode(input?.hrefMode);
  const rawHref = resolveString(input?.href, "");
  const safeHref = hrefMode === "custom" && rawHref.trim()
    ? normalizeWidgetSafeHref(rawHref, safeHrefOptions)
    : rawHref;
  return {
    label: resolveString(input?.label, "Read more"),
    hrefMode,
    href: safeHref ?? "",
    opensInNewTab: Boolean(input?.opensInNewTab),
    style: resolveCtaStyle(input?.style),
  };
}

function EntryTeaserCtaEditor(...) {
  // Keep empty input empty while editing.
  // Show validation in local component state if raw value is non-empty and
  // safeHref is null. Do not write hrefValidation into EntryTeaserData.
  // Do not write "#" as the user's custom value.
}

function renderCta(cta, itemHref) {
  const href = cta.hrefMode === "custom" ? safeHref(cta.href) : safeHref(itemHref);
  const attrs = resolveWidgetLinkAttrs(href, {
    opensInNewTab: cta.opensInNewTab,
    allowRelative: true,
    allowHash: true,
    allowHttp: true,
  });
  return attrs ? <a {...attrs} className={ctaClass} /> : <span className={ctaClass} />;
}
```

Error handling:

- Empty custom URL is an incomplete editor state, not an immediate `#` input.
- Unsafe URL shows inline validation and renders as non-navigation fallback or
  disabled CTA according to final product decision.
- New-tab behavior adds `rel` only when `target="_blank"` is present.

Regression-test shape:

- Assert switching to Custom URL leaves the input empty.
- Assert `javascript:` produces editor validation and never renders a script
  href.
- Assert safe relative and HTTPS links render.
- Assert new-tab output includes `target="_blank"` and
  `rel="noopener noreferrer"` through `resolveWidgetLinkAttrs()`.
- Assert CTA style variants change classes through fixed maps only.
  Assert editor validation state is local and never serialized into
  `entryTeaserSchema`.

## Sub-Tasks

- [ ] Extend Entry Teaser CTA schema/defaults/normalizer.
- [ ] Add editor validation and preserve empty custom URL input.
- [ ] Add new-tab toggle with safe runtime output.
- [ ] Add fixed CTA style variants.
- [ ] Update tests and widget docs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- if this leaf creates or extends `tests/vitest/widgets/entryTeaser.test.tsx`,
  run `bun run test:vitest -- tests/vitest/widgets/entryTeaser.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx` while CTA render and
  normalization assertions still remain in the Bun-owned suite
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx`
- Entry Teaser schema rejection coverage belongs in
  `tests/vitest/widgets/entryTeaser.test.tsx`; touch generic validator suites
  only if the shared validator contract changes.
- `bun run scan:security:strict` before final family closure or sooner if href
  hardening touches scanner-relevant code.

## Documentation Updates Required

- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when this leaf moves to
  `Done`.

## Acceptance Criteria

- Custom URL editing never shows a synthetic `#` as the user's value.
- Unsafe custom URLs are visible as validation feedback and never render as
  executable links.
- New-tab CTAs always include safe `rel`.
- Entry Teaser consumes the existing shared link-attribute helper for
  target/rel behavior.
- CTA styles are fixed, schema-backed, and tested.
