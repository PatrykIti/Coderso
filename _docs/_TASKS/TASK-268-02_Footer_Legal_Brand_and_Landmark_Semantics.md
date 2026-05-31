# TASK-268-02: Footer Legal, Brand, and Landmark Semantics

# FileName: TASK-268-02_Footer_Legal_Brand_and_Landmark_Semantics.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-268, TASK-268-01
**Status:** Done (2026-05-18)

---

## Overview

Add Footer-owned legal label configuration, brand content, and accessible
landmark/heading semantics.

The report shows that legal links render with hardcoded "Privacy" and "Terms"
copy, the Footer has no brand/logo/tagline area, the `<footer>` has no
accessible name, and column titles render as `<p>` instead of headings. This
leaf repairs those Footer-specific renderer and editor gaps while preserving old
payloads.

## Scope Boundary

This leaf owns:

- `legal.privacyLabel` and `legal.termsLabel` with backward-compatible defaults.
- A Footer brand model with safe plain text, optional safe image URL/media src,
  alt text, and tagline.
- Placement of brand content in the Footer layout without removing existing
  `column-1` slot behavior.
- `<footer aria-label>` or `aria-labelledby` when a visible brand/title label
  exists.
- Column titles rendered as heading elements with stable level and styling.

This leaf does not own global SEO schema, site-wide brand settings, arbitrary
rich-text taglines, media upload flows, or a new shared heading-level helper.

## Sub-Tasks

- [ ] Extend `FooterLegal` with configurable `privacyLabel` and `termsLabel`.
- [ ] Add a Footer brand data model, for example `brand.logoUrl`, `brand.logoAlt`,
  `brand.logoText`, and `brand.tagline`.
- [ ] Normalize legacy legal objects to visible defaults: Privacy and Terms
  labels must stay unchanged until the user edits them.
- [ ] Normalize brand fields with a Footer image/media source helper for logo
  sources and plain text labels/taglines only. Do not reuse link-only
  normalization for `<img src>` without rejecting hash-only values.
- [ ] Render the Footer landmark with an accessible name. Use `aria-labelledby`
  when a visible brand text/title can own the label; otherwise use
  `aria-label="Site footer"` or a configured plain-text label.
- [ ] Render column titles as `<h3>` or the repo-approved heading level while
  preserving class/style output.
- [ ] Add Wizard/Visual controls for legal labels and brand basics.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Extend schema/defaults/normalization and render configurable labels, brand content, landmark label, and heading column titles. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add legal label and brand controls in Wizard/Visual with field labels. |
| `tests/vitest/widgets/footer.test.tsx` | Cover legal label defaults/custom labels, brand output, safe logo URL handling, Footer `aria-label`/`aria-labelledby`, and heading tags. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover editor updates for legal labels and brand fields. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if Footer renderer integration proof needs brand/label assertions. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/FOOTER.md` | Document legal labels, brand fields, and semantic output. |

## Implementation Pseudocode

```ts
type FooterLegal = {
  copyright?: string;
  privacy?: string;
  privacyLabel?: string;
  terms?: string;
  termsLabel?: string;
};

type FooterBrand = {
  logoUrl?: string;
  logoAlt?: string;
  logoText?: string;
  tagline?: string;
};

type FooterData = {
  brand?: FooterBrand;
  legal?: FooterLegal;
};

function normalizeFooterLegal(value: unknown): Required<FooterLegal> {
  return {
    copyright: normalizeText(read(value, "copyright"), footerDefaults.legal.copyright),
    privacy: normalizeFooterHref(read(value, "privacy")) ?? footerDefaults.legal.privacy,
    privacyLabel: normalizeText(read(value, "privacyLabel"), "Privacy"),
    terms: normalizeFooterHref(read(value, "terms")) ?? footerDefaults.legal.terms,
    termsLabel: normalizeText(read(value, "termsLabel"), "Terms"),
  };
}

function normalizeFooterImageSrc(value: unknown): string | undefined {
  return normalizeWidgetSafeHref(value, {
    allowRelative: true,
    allowHash: false,
    allowHttp: true,
  });
}

function normalizeFooterBrand(value: unknown): FooterBrand | undefined {
  const logoText = normalizeOptionalText(read(value, "logoText"));
  const tagline = normalizeOptionalText(read(value, "tagline"));
  const logoUrl = normalizeFooterImageSrc(read(value, "logoUrl"));
  if (!logoText && !tagline && !logoUrl) return undefined;
  return {
    logoUrl,
    logoAlt: normalizeOptionalText(read(value, "logoAlt")) ?? logoText ?? "Footer logo",
    logoText,
    tagline,
  };
}
```

Renderer shape:

```tsx
const footerLabelId = brand.logoText ? `${blockId}-footer-brand` : undefined;

<footer aria-labelledby={footerLabelId} aria-label={footerLabelId ? undefined : "Site footer"}>
  {brand ? (
    <div className="space-y-2">
      {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.logoAlt} loading="lazy" /> : null}
      {brand.logoText ? <p id={footerLabelId}>{brand.logoText}</p> : null}
      {brand.tagline ? <p>{brand.tagline}</p> : null}
    </div>
  ) : null}
  <h3>{column.title}</h3>
  <a href={legal.privacy}>{legal.privacyLabel}</a>
  <a href={legal.terms}>{legal.termsLabel}</a>
</footer>
```

Error handling:

- Empty legal labels fall back to `Privacy` and `Terms`.
- Unsafe logo URLs, protocol-relative URLs, and hash-only values are omitted
  rather than rendered.
- Empty brand objects normalize away.
- Existing payloads without brand/legal labels render unchanged except for
  improved semantics.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: brand and legal payloads must reject unknown keys.
- Anti-abuse: brand/logo URLs use a safe image/media source normalizer, not a
  link-only helper that accepts hash anchors; brand text and legal labels are
  plain text only, not HTML.
- Secret handling: no provider keys, private media tokens, or privileged URLs in
  brand/legal examples, tests, docs, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` because this
  leaf changes public Footer renderer output.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before moving this leaf to `Done` or committing it independently, also run
  `git diff --check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/FOOTER.md` with legal labels, brand fields, landmark
  naming, and heading semantics.
- Update `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` rows for hardcoded labels,
  brand absence, Footer `aria-label`, and column headings after validation.

## Changelog Policy

- Covered by the TASK-268 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Legal link labels are configurable and backward-compatible.
- Footer can render a brand/logo/tagline area without requiring a separate
  text/image widget.
- `<footer>` has an accessible name.
- Column titles render with heading semantics.
- No arbitrary HTML, scripts, or unsafe media URLs enter Footer public output.
