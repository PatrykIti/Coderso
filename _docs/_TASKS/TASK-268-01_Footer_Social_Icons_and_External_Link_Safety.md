# TASK-268-01: Footer Social Icons and External Link Safety

# FileName: TASK-268-01_Footer_Social_Icons_and_External_Link_Safety.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + Security + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-268
**Status:** To Do

---

## Overview

Replace Footer social links rendered as plain platform text with a safe,
accessible, Footer-owned icon/link contract.

`REPORT_FOOTER_WIDGET.md` identifies the current output as a critical public
defect: `twitter` and `linkedin` are rendered literally, social links do not get
external-link safety attributes, and the editor only exposes a small fixed list
of platforms. This leaf fixes only Footer social behavior. It does not create a
global icon system or a shared social-link component.

## Scope Boundary

This leaf owns:

- Footer social platform allowlist and optional safe custom label/icon fallback.
- Social icon rendering from a fixed local map or an approved existing icon
  library already used in the admin/runtime bundle.
- `aria-label` for every social link.
- External social link `target="_blank"` and `rel="noopener noreferrer"` when
  the href resolves to an external HTTP(S) URL.
- Backward-compatible normalization for existing social payloads such as
  `twitter`, `linkedin`, `github`, `youtube`, `facebook`, and `instagram`.
- Footer editor platform options and tests for modern platforms named by the
  report.

This leaf does not own generic link-target controls for column/legal links,
generic safe-href helpers, arbitrary SVG uploads, arbitrary icon HTML, or a new
public write/subscription endpoint.

## Sub-Tasks

- [ ] Add a Footer-owned `FooterSocialType` allowlist for known platforms,
  including the existing six plus `x`, `tiktok`, `discord`, `pinterest`, and
  `mastodon` when their icon output can be fixed and local.
- [ ] Decide whether custom platforms are allowed. If allowed, represent them
  with `type: "custom"` plus a plain-text `label`; never store arbitrary SVG,
  HTML, or script data.
- [ ] Normalize legacy `twitter` as the current default while optionally mapping
  display copy/icon to X only if product copy explicitly chooses that.
- [ ] Render each social link with a visible icon and screen-reader label, not
  the raw platform id as body text.
- [ ] Add safe external target/rel handling for social links while keeping
  relative/hash hrefs same-tab.
- [ ] Update Footer Wizard/Visual social editors so platform options, labels,
  custom label fields, and validation feedback match the runtime contract.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Extend social types/schema/defaults/normalization and render icons, labels, and safe external link attributes. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Update `socialTypeOptions`, custom-label UI if accepted, and social field copy. |
| `tests/vitest/widgets/footer.test.tsx` | Cover icon output, no raw platform text as the only visible content, social `aria-label`, safe target/rel, unsafe href filtering, and legacy payloads. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover new platform choices and any custom social editor fields. |
| `tests/vitest/widgets/renderer.test.tsx` | Update only if shared renderer assertions need Footer social output proof. |
| `tests/unit/widgets/validator.test.ts` | Update when the Footer social schema changes. |
| `_docs/_WIDGETS/FOOTER.md` | Document social platform options, safe href behavior, and accessibility labels. |

## Implementation Pseudocode

```ts
const footerSocialTypes = [
  "linkedin",
  "twitter",
  "x",
  "github",
  "youtube",
  "facebook",
  "instagram",
  "tiktok",
  "discord",
  "pinterest",
  "mastodon",
  "custom",
] as const;

type FooterSocial = {
  type: FooterSocialType;
  href: string;
  label?: string;
};

function normalizeFooterSocial(entry: unknown, index: number): FooterSocial | null {
  const href = normalizeFooterHref(readHref(entry));
  if (!href) return null;

  const type = normalizeSocialType(readType(entry), "linkedin");
  return {
    type,
    href,
    label: normalizeSocialLabel(type, readLabel(entry), index),
  };
}

function getExternalLinkAttrs(href: string) {
  return /^https?:\/\//i.test(href)
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}
```

Renderer shape:

```tsx
<a
  href={social.href}
  aria-label={social.label}
  title={social.label}
  {...getExternalLinkAttrs(social.href)}
>
  <FooterSocialIcon type={social.type} aria-hidden="true" />
  <span className="sr-only">{social.label}</span>
</a>
```

Error handling:

- Unknown legacy `type` values fall back to `custom` with a plain label, or to a
  deterministic known default if custom is rejected.
- Unsafe hrefs are filtered out before render.
- Missing labels fall back to platform display names.
- Icon fallback must be a safe local symbol and must not render the raw type as
  the only visual output.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: social payload keys must remain allowlisted.
- Anti-abuse: no arbitrary SVG/HTML/script/icon URL payloads; all hrefs pass
  `normalizeWidgetSafeHref`; external social links get `noopener noreferrer`.
- Secret handling: social URLs and labels are public content, not secret
  storage; do not log private tokens in tests or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  snapshots/assertions are updated.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FOOTER.md` with supported social platforms, custom
  social behavior if shipped, icon output, and external-link safety.
- Update `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` rows for social icons,
  social accessible names, modern platforms, and safe external social links
  after validation.

## Changelog Policy

- Covered by the TASK-268 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Footer public output no longer displays raw social platform ids as the link
  body in normal icon mode.
- Social links have accessible names and safe external link attributes.
- Existing social payloads still render after normalization.
- New platform options are schema/editor/runtime consistent.
- The implementation does not introduce a global icon framework or arbitrary
  unsafe icon payloads.
