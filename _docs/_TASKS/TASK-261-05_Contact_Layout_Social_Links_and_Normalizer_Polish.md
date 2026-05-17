# TASK-261-05: Contact Layout, Social Links, and Normalizer Polish

# FileName: TASK-261-05_Contact_Layout_Social_Links_and_Normalizer_Polish.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-261, TASK-261-01, TASK-261-04
**Status:** To Do

---

## Overview

Add the remaining Contact-owned layout and display options from the report.

This leaf covers max width, section padding, social display links, and explicit
normalizer enum handling. These are Contact-specific product options and should
not reopen shared TASK-256 style helper work.

## Scope Boundary

This leaf owns:

- `style.maxWidth` and `style.paddingX`/section padding controls.
- Contact-owned social links with safe absolute web URL normalization through a
  Contact-local wrapper around `normalizeWidgetSafeHref`.
- Explicit checks for default enum values in Contact normalizer helpers
  (`spacing=md`, `borderWidth=1`) so tests can distinguish valid defaults from
  invalid fallback behavior.

This leaf does not own:

- Generic shared spacing/padding token systems.
- Generic social link rendering for footer/navigation/team widgets.
- Generic safe-href helper changes; Contact social links should reuse the
  existing helper with Contact-local options and without expanding its protocol
  policy.
- Contact `borderColor` clear behavior, which remains TASK-256-02 shared
  clear/token scope unless that task leaves a Contact-only hook.

## Sub-Tasks

- [ ] Add strict `maxWidth` and horizontal padding options to Contact style.
- [ ] Render section width/padding from approved token maps instead of hardcoded
  `max-w-5xl px-4`.
- [ ] Add a bounded `contact.social[]` model with platform enum, label, URL,
  and optional visibility/order fields.
- [ ] Normalize social URLs through existing `normalizeWidgetSafeHref` behavior
  for public web profile links via `normalizeContactSocialHref(value)`. Use
  `{ allowHttp: true }` so absolute `https://` profile links survive, but keep
  `mailto:`, `tel:`, relative, hash-only, protocol-relative, and scriptable
  schemes rejected for social rows. `tel:`/`mailto:` contact-detail links stay
  owned by TASK-261-01.
- [ ] Add editor controls for max width, padding, and social links without
  creating a broad social-link platform.
- [ ] Update `resolveContactSpacing()` and `resolveContactBorderWidth()` to
  explicitly accept their default values while still falling back for invalid
  input.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Extend style/social schema/defaults/normalizer and render width/padding/social links through existing safe href normalization. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add Contact-local layout and social controls. |
| `tests/vitest/widgets/contact.test.tsx` | Cover width/padding tokens, social link normalization, and explicit enum default normalization. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover editor controls for layout/social fields. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | Run if this task touches `normalizeWidgetSafeHref`; prefer not touching it for Contact social links. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/CONTACT.md` | Document layout/social options and safe links. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if these options change Contact pack readiness. |

## Implementation Pseudocode

```ts
type ContactMaxWidth = "none" | "md" | "lg" | "xl" | "2xl";
type ContactPaddingX = "none" | "sm" | "md" | "lg";
type ContactSocialPlatform = "x" | "linkedin" | "facebook" | "instagram" | "youtube" | "custom";

type ContactSocialLink = {
  id: string;
  platform: ContactSocialPlatform;
  label: string;
  href: string;
};

type ContactData = {
  contact?: {
    social?: ContactSocialLink[];
  };
  style?: {
    maxWidth?: ContactMaxWidth;
    paddingX?: ContactPaddingX;
  };
};
```

Normalizer shape:

```ts
function resolveContactSpacing(value: string | undefined): ContactSpacing {
  if (value === "none" || value === "sm" || value === "md" || value === "lg" || value === "xl") {
    return value;
  }
  return "md";
}

function resolveContactBorderWidth(value: string | undefined): ContactBorderWidth {
  if (value === "0" || value === "1" || value === "2" || value === "3") {
    return value;
  }
  return "1";
}

function normalizeContactSocialHref(value: unknown): string | undefined {
  const href = normalizeWidgetSafeHref(value, { allowHttp: true });
  if (!href) return undefined;
  // Social links are public profile URLs only, not contact-detail links.
  return href;
}

function normalizeSocialLinks(value: unknown): ContactSocialLink[] {
  return readArray(value)
    .map((row) => normalizeSocialLink(row, normalizeContactSocialHref))
    .filter((link): link is ContactSocialLink => Boolean(link));
}
```

Renderer shape:

```tsx
<section className={joinClasses("mx-auto grid w-full", maxWidthClass, paddingXClass)}>
  <SocialLinks links={normalized.contact?.social ?? []} />
</section>
```

Error handling:

- Invalid social platforms fall back to `custom` only when label and href are
  valid; otherwise the row is dropped.
- Unsafe hrefs are omitted from runtime output and surfaced in editor validation
  where possible. `https://` profile URLs stay valid; `mailto:`, `tel:`,
  relative, hash-only, protocol-relative, and scriptable URLs are not accepted
  for social rows unless a separate shared safe-href task expands and tests that
  helper contract.
- Old blocks without style/social fields keep the current `max-w-5xl px-4`
  behavior through defaults.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: Contact schema must reject unknown style/social
  fields.
- Anti-abuse: social hrefs must be safe, normalized, and never allow
  `javascript:`, raw HTML, inline event handlers, or scriptable SVG data.
- Secret handling: social/layout fields must not store provider keys, private
  URLs, or secret-like settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- Contact widget tests must prove `https://` social profile links render while
  `mailto:`, `tel:`, relative, hash-only, protocol-relative, and scriptable
  hrefs are dropped.
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if the
  shared helper is touched
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with max width, padding, social link, and
  explicit normalizer behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows W6, W7, W13, R11,
  and R12 after validation.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Contact readiness changes.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Contact width and padding are configurable through bounded tokens.
- Contact can render safe social links without adding a generic social system.
- Normalizer tests explicitly prove valid default enum values are accepted and
  invalid values fall back deterministically.
