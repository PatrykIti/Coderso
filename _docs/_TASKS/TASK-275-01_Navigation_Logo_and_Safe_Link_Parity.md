# TASK-275-01: Navigation Logo and Safe Link Parity

# FileName: TASK-275-01_Navigation_Logo_and_Safe_Link_Parity.md

**Priority:** High
**Category:** Widgets + Navigation + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256, TASK-275
**Status:** Done (2026-05-19)

---

## Overview

Repair the Navigation logo destination and align editor URL feedback with the
runtime safe-href contract. The runtime already normalizes logo, item, child,
and CTA links through `normalizeWidgetSafeHref({ allowHash: true })`, but the
renderer does not wrap the logo in an anchor and the editor rejects `#` links.

This leaf must not change the shared safe-href helper. It consumes the existing
Navigation-safe href behavior and keeps unsafe schemes rejected.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:117-120` - `logo.href` is
  defined but not used by the renderer.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:179-180,186` - logo link inputs
  are unlabeled in Wizard and Visual.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:261,266,271-273,279,281,329` -
  logo-link and `#` validation rows show missing labels and false editor
  validation errors while runtime accepts hashes.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:403,407,424` - prioritized
  logo, hash validation, and logo-label fixes.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Render text and image logos inside a safe `<a>` using normalized `logo.href`, preserving image alt, text logo styling, and current flex layout. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Replace local `isValidHref` with a Navigation-specific check that accepts `/`, `#`, `http://`, and `https://`. Add visible labels for Wizard and Visual logo-link fields. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert logo renders as a link, unsafe logo hrefs still fall back safely, and hash links remain valid in normalized output. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert Wizard/Visual logo-link labels render and `#` does not produce destructive URL feedback. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document logo link output and hash-link validation parity. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Mark fixed or deferred evidence for logo link, hash validation, and logo-label rows. |

## Implementation Pseudocode

```tsx
function isValidNavigationHref(value: string | undefined) {
  if (!value || value.trim().length === 0) return true;
  const trimmed = value.trim();
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  );
}

function NavigationLogoLink({ logo, logoStyle }: Props) {
  const href = normalizeNavigationHref(logo.href) ?? "/";
  const content =
    logo.type === "image" ? (
      <img src={logo.value} alt={logo.alt ?? "Logo"} className="h-6 w-auto" />
    ) : (
      <span style={logoStyle}>{logo.value}</span>
    );

  return (
    <a href={href} className="inline-flex items-center gap-3">
      {content}
    </a>
  );
}
```

Error handling:

- Unsafe logo hrefs must still normalize to `/`.
- Empty logo hrefs keep the existing default.
- Hash-only links must be valid in editor feedback but still pass through the
  same runtime normalization path.

## Data Flow

1. Admin edits `logo.href` and manual link `href` values in Wizard/Visual.
2. `NavigationEditors.tsx` validates feedback with the same allowed destination
   classes as the Navigation runtime: empty, `/`, `#`, `http://`, and
   `https://`.
3. Persisted widget data continues through `navigationSchema` and
   `normalizeNavigationData()` without adding shared sanitizer behavior.
4. `navigation.tsx` resolves `logo.href` through the existing safe-href helper
   before rendering the logo anchor.
5. Vitest asserts editor feedback, normalized hash links, linked logo SSR
   output, and unsafe destination fallback.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged unless tests expose a schema drift.
- Anti-abuse: logo and item hrefs must continue to use
  `normalizeWidgetSafeHref()` before render. Do not allow `javascript:`,
  protocol-relative, `data:`, or raw HTML/script destinations.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` only if schema/defaults
  change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux` when the linked logo changes
  public UX/accessibility classification.
- `bun scripts/coderso-release-gates.ts --gate security` when logo or link
  output changes safe-href behavior.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-01_Navigation_Logo_and_Safe_Link_Parity.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Logo text and image variants render as keyboard-focusable safe links.
- Editor validation for `#` matches the runtime hash-link contract.
- Wizard and Visual logo-link fields have visible labels.
- Focused Navigation runtime and editor tests cover the behavior.
