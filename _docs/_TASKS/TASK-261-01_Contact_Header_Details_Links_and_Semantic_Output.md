# TASK-261-01: Contact Header, Details Links, and Semantic Output

# FileName: TASK-261-01_Contact_Header_Details_Links_and_Semantic_Output.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-261
**Status:** To Do

---

## Overview

Add the Contact-owned section header and semantic contact details contract.

`REPORT_CONTACT_WIDGET.md` identifies that Contact lacks a widget title and
description, panel headings, clickable phone/email links, contact labels/icons,
and semantic detail markup. This leaf fixes those Contact-specific renderer and
editor gaps without changing shared widget helpers.

## Scope Boundary

This leaf owns only Contact section/detail output:

- `title` and `description` for the widget section.
- `form.title` and `contact.title` panel headings when the form/details panels
  are rendered.
- Safe `tel:` and `mailto:` links for phone/email details.
- Contact detail labels, optional icon keys from a fixed allowlist, and semantic
  `<address>` plus `<dl>/<dt>/<dd>` output.
- `aria-labelledby` / `aria-label` for the Contact section and details panel.

This leaf does not own public submission, form field names, generic shared ARIA
helpers, generic icon systems, or arbitrary rich text in contact details.

## Sub-Tasks

- [ ] Extend `ContactData` with `title`, `description`,
  `form.title`, `contact.title`, and Contact detail display metadata.
- [ ] Add fixed allowlists for contact detail labels and icon identifiers; do
  not allow arbitrary SVG/HTML/icon script data in widget JSON.
- [ ] Normalize missing legacy values to the current visible defaults so old
  Contact blocks render unchanged except for improved semantics.
- [ ] Render section headings with stable IDs and connect the `<section>` via
  `aria-labelledby` when a title exists; otherwise use a deterministic
  `aria-label`.
- [ ] Render details as `<address>` containing a description list; use safe
  `tel:` and `mailto:` href generation for phone/email.
- [ ] Update Contact Wizard/Visual editor controls only for fields introduced
  by this leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Extend schema/defaults/normalizer and render section/detail semantics; consume existing `blockId` render prop for stable local IDs. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add title/description/panel heading/label/icon controls in appropriate modes. |
| `tests/vitest/widgets/contact.test.tsx` | Cover headings, `aria-labelledby`, semantic detail markup, `tel:` and `mailto:` links, and backward-compatible defaults. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover editor updates for the new Contact-owned content fields. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/CONTACT.md` | Document the new section/detail contract. |

## Implementation Pseudocode

```ts
type ContactDetailKey = "phone" | "email" | "address" | "hours";
type ContactIconKey = "phone" | "mail" | "map-pin" | "clock" | "none";

type ContactDetailDisplay = {
  label?: string;
  icon?: ContactIconKey;
};

type ContactData = {
  title?: string;
  description?: string;
  form?: {
    title?: string;
  };
  contact?: {
    title?: string;
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    details?: Partial<Record<ContactDetailKey, ContactDetailDisplay>>;
  };
};
```

Normalization:

```ts
function normalizeContactDetailDisplay(
  key: ContactDetailKey,
  value: unknown
): Required<ContactDetailDisplay> {
  return {
    label: normalizeNonEmptyString(readLabel(value), defaultDetailLabel[key]),
    icon: normalizeIconKey(readIcon(value), defaultDetailIcon[key]),
  };
}

function toContactHref(key: ContactDetailKey, value: string) {
  const text = value.trim();
  if (key === "email" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) {
    return `mailto:${encodeURIComponent(text).replace("%40", "@")}`;
  }
  if (key === "phone") {
    const normalized = text.replace(/[^\d+]/g, "");
    return normalized.length > 0 ? `tel:${normalized}` : null;
  }
  return null;
}
```

Renderer shape:

```tsx
const contactIdBase = blockId ?? "contact";
const sectionTitleId = title ? `${contactIdBase}-title` : undefined;

<section aria-labelledby={sectionTitleId} aria-label={sectionTitleId ? undefined : "Contact"}>
  {title ? <h2 id={sectionTitleId}>{title}</h2> : null}
  {description ? <p>{description}</p> : null}
  <address aria-labelledby={detailsTitleId}>
    <h3 id={detailsTitleId}>{contactTitle}</h3>
    <dl>
      {details.map((detail) => (
        <React.Fragment key={detail.key}>
          <dt>{detail.label}</dt>
          <dd>{detail.href ? <a href={detail.href}>{detail.value}</a> : detail.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  </address>
</section>
```

Error handling:

- Invalid icon keys fall back to the per-detail default icon.
- Empty custom labels fall back to stable defaults.
- Invalid phone/email values render as text, not unsafe links.
- Old blocks without new fields must still render with current content.
- Stable IDs must use the existing `blockId` renderer prop when available and a
  deterministic local fallback otherwise. Do not introduce shared instance-ID
  helpers here; generic instance-safe ID work belongs to TASK-256-04.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: Contact schema must reject unknown title/detail
  metadata keys.
- Anti-abuse: labels/icons are plain text or fixed enum values; no arbitrary
  HTML, SVG, scripts, or unsafe href schemes.
- Secret handling: contact display fields must not be treated as secret storage
  and must not expose provider keys or private URLs in docs/report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer integration changes
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with title/description, panel headings,
  contact detail labels/icons, semantic output, and safe link behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C1, C2, W1, W4, W5,
  R1, R5, R6, and R7 after validation.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Contact can render a section title/description and panel headings without a
  separate text widget.
- Phone and email render as safe clickable links when values are valid.
- Contact details use semantic accessible markup and preserve old payloads.
- Editor controls update only Contact-owned fields and do not introduce a
  shared icon or rich-text system.
