# TASK-261-04: Contact Map Validation, Fallback, and Display Controls

# FileName: TASK-261-04_Contact_Map_Validation_Fallback_and_Display_Controls.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-261, TASK-261-03
**Status:** To Do

---

## Overview

Complete the Contact map contract from the Playwright report.

The current Contact map renders only when `map.enabled` is true and the URL is
valid, but the editor stores invalid URLs without feedback, the iframe lacks
`allowFullScreen`, map height is hardcoded, and there is no map heading or
fallback copy. This leaf keeps map behavior Contact-owned and avoids provider
secret/config surfaces.

## Scope Boundary

This leaf owns:

- `map.title`, `map.description`, `map.height`, and optional fallback copy.
- Inline admin validation for map embed URLs.
- Runtime `allowFullScreen`, accessible iframe title, and invalid/unavailable
  fallback output.
- HTTPS-only rendered iframe URLs. Current `http`/`https` acceptance is
  tightened here because the report asks the editor to explain accepted
  `https://` embed URLs; docs and tests must move together.

This leaf does not own:

- Google Maps API keys or provider secrets.
- Third-party map provider configuration.
- Arbitrary raw iframe attributes.
- Public network fetching or server-side map validation.

## Sub-Tasks

- [ ] Extend `ContactData.map` with title, description, height, and fallback
  copy fields using strict enum/string bounds.
- [ ] Add `resolveContactMapHeight()` with approved values or a clamped custom
  pixel model if the repo has an existing local pattern.
- [ ] Add inline editor validation for invalid map URLs while preserving the
  current non-destructive storage behavior until the user edits or normalizes.
- [ ] Render map title/description when present.
- [ ] Add `allowFullScreen` and an accessible iframe title.
- [ ] Render a fallback message when `map.enabled` is true but the URL is
  invalid/unavailable, without embedding unsafe raw URL text.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Extend map schema/defaults/normalizer and render map title/description/height/fallback/fullscreen with HTTPS-only iframe output. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add map title/description/height controls and URL validation feedback. |
| `tests/vitest/widgets/contact.test.tsx` | Cover map height, title, iframe fullscreen, invalid URL fallback, HTTPS-only iframe rendering, and safe URL handling. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover editor validation feedback and map display controls. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/CONTACT.md` | Document map display behavior. |

## Implementation Pseudocode

```ts
type ContactMapHeight = "sm" | "md" | "lg" | "xl";

type ContactMapData = {
  enabled?: boolean;
  embedUrl?: string;
  title?: string;
  description?: string;
  height?: ContactMapHeight;
  fallbackCopy?: string;
};

const mapHeightClassMap: Record<ContactMapHeight, string> = {
  sm: "h-40",
  md: "h-56",
  lg: "h-72",
  xl: "h-96",
};

function resolveMapEmbedUrl(value: string | undefined) {
  const url = parseUrl(value);
  if (!url) return "";
  return url.protocol === "https:" ? url.toString() : "";
}
```

Editor validation:

```tsx
const mapUrlState = getMapUrlState(normalized.map?.embedUrl);

<Input
  aria-invalid={mapUrlState.valid ? undefined : true}
  value={normalized.map?.embedUrl ?? ""}
  onChange={(event) => updateMap(value, onChange, { embedUrl: event.target.value })}
/>
{mapUrlState.message ? <p role="status">{mapUrlState.message}</p> : null}
```

Renderer shape:

```tsx
{showMapHeading ? (
  <div>
    {map.title ? <h3>{map.title}</h3> : null}
    {map.description ? <p>{map.description}</p> : null}
  </div>
) : null}
{showMap ? (
  <iframe
    src={mapEmbedUrl}
    title={map.title || "Contact map"}
    allowFullScreen
    loading="lazy"
  />
) : map.enabled ? (
  <p role="status">{map.fallbackCopy || "Map is unavailable."}</p>
) : null}
```

Error handling:

- Invalid URLs must not render an iframe.
- `http://` map URLs must be treated as invalid for rendered iframes after this
  task, even though legacy data may preserve the raw text until the editor
  normalizes or the user edits it.
- Invalid URLs may remain in editor state until normalization, but the editor
  must show a clear validation message.
- Fallback copy is plain text only.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: map schema must reject unknown fields and invalid
  enum values.
- Anti-abuse: only safe `https` iframe URLs render; no raw `srcdoc`, script,
  provider key, or arbitrary iframe attributes.
- Secret handling: map fields must not store private provider keys, signed URLs,
  or secret-like config.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with map title/description, height,
  validation, fullscreen, and fallback behavior.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows W9, W10, W14, W15,
  R8, and R9 after validation.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Map URL issues are visible in the editor and invalid URLs do not render unsafe
  iframes, including legacy `http://` values.
- Runtime map output supports title/description, approved heights,
  `allowFullScreen`, and fallback copy.
- No map provider secrets or arbitrary iframe attributes enter widget data.
