# TASK-274-04: Logo Cloud Dense Strip and Marquee Layouts

# FileName: TASK-274-04_Logo_Cloud_Dense_Strip_and_Marquee_Layouts.md

**Priority:** Medium
**Category:** Widgets + Logo Cloud + Runtime Render + Responsive Layout
**Estimated Effort:** Large
**Dependencies:** TASK-274, TASK-274-03, TASK-256-06-02
**Status:** To Do

---

## Overview

Expand Logo Cloud layout behavior beyond the current static `grid`, wrapped
`strip`, and six-column `dense` layouts while keeping the widget bounded and
accessible.

Source report findings:

- BF-03 dense variant possible overflow at max count
- BF-04 strip missing nowrap / single-row scroll option
- BF-05 strip missing marquee / auto-scroll option

Explicitly out of scope:

- Adding arbitrary grid column counts or per-logo sizing.
- Copying third-party marquee source or unknown-license class recipes.
- Implementing animation without a reduced-motion and pause/focus behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/logoCloud.tsx` | Add bounded layout mode fields, defaults, normalizer, responsive classes, scroll/marquee rendering, and runtime markers. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Add Visual controls for row/wrap/marquee behavior with clear product copy and disabled states where variant-specific. |
| `core/site/styles/site.css` | Add the public-runtime `@keyframes` / utility class for Logo Cloud marquee if no shared animation token already exists. |
| `core/admin/styles/globals.css` | Add or import the same marquee class for admin/editor preview so Visual mode and public runtime render consistently. |
| `tests/vitest/widgets/logoCloudStyles.test.ts` | Add static CSS parity coverage that reads the public/admin style owners and asserts both define or import the same Logo Cloud marquee keyframe/class. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover dense max-count classes, strip single-row scroll, marquee markers, and reduced-motion fallback markers. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover layout mode controls and variant gating. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if shared renderer output markers change. |
| `_docs/_WIDGETS/LOGO_CLOUD.md` | Document layout modes and accessibility behavior. |
| `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md` | Record fixed evidence for BF-03/BF-04/BF-05. |

## Implementation Pseudocode

```tsx
type LogoCloudRowMode = "wrap" | "single-row";
type LogoCloudMotionMode = "static" | "marquee";

function resolveLogoCloudRowMode(value: unknown): LogoCloudRowMode {
  return value === "single-row" ? value : "wrap";
}

function resolveLogoCloudMotionMode(value: unknown): LogoCloudMotionMode {
  return value === "marquee" ? value : "static";
}

function resolveLogoListClassName({
  variant,
  rowMode,
  motionMode,
  gap,
  alignment,
}: ResolveLogoListOptions) {
  if (variant === "strip" && rowMode === "single-row") {
    return joinClasses("flex flex-nowrap overflow-x-auto", gapClassMap[gap], alignmentClassMap[alignment]);
  }
  if (variant === "dense") {
    return joinClasses("grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6", gapClassMap[gap]);
  }
  return existingListClassName;
}

function LogoCloudMarquee({ logos }: { logos: LogoCloudLogo[] }) {
  return (
    <div data-logo-cloud-motion="marquee" className="motion-safe:animate-logo-cloud-marquee motion-reduce:animate-none">
      {logos.concat(logos).map(renderLogo)}
    </div>
  );
}
```

Renderer data flow:

1. Add bounded row/motion style fields owned by `logoCloud.tsx`.
2. Normalize legacy payloads to the current static wrap behavior.
3. Keep dense responsive classes truthful at max count; prefer safer breakpoints
   or item min-width changes over unbounded custom columns.
4. For marquee, duplicate visual items only for animation, not in persisted
   `logos[]`; expose deterministic runtime markers for tests.
5. Define the marquee keyframes/class in both public runtime and admin preview
   style owners, unless a shared imported style owner is introduced in the same
   implementation commit.
6. Respect reduced motion and pause on hover/focus.

Error handling:

- Unknown row/motion values normalize to safe static defaults.
- Marquee with fewer than two logos falls back to static strip.
- Single-row overflow must be horizontal only and not create page-wide overflow.
- Server rendering must not depend on browser APIs or timers.
- If the public runtime and admin preview do not load the same marquee class,
  disable the marquee option in the editor until the style owners are aligned.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page/template save flow.
- Reject-unknown validation: new layout fields must be bounded enum fields and
  validator-tested.
- Anti-abuse: no raw animation CSS text, scripts, third-party embeds, unbounded
  duration values, or external source code is accepted in widget data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers change.
- `bun run test:vitest -- tests/vitest/widgets/logoCloudStyles.test.ts` when
  adding marquee CSS. The test must assert `core/site/styles/site.css` and
  `core/admin/styles/globals.css` both define or import the same
  `logo-cloud-marquee` keyframe/class.
- `bun test tests/unit/widgets/validator.test.ts` only when intentionally adding
  Logo Cloud coverage to the generic Bun validator suite.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/WIDGETS.md` if global widget layout docs mention Logo Cloud modes.
- `_docs/_TASKS/README.md` on status transition.
- `_docs/_CHANGELOG/README.md` and a changelog entry when this leaf is completed
  independently or through TASK-274-06 closure.

## Acceptance Criteria

- Dense max-count rendering no longer risks horizontal overflow at normal
  desktop widths.
- Strip can render as wrapped or single-row scroll through a bounded control.
- Marquee, if implemented, pauses safely and respects reduced-motion users.
- Layout fields are schema-owned, normalized, documented, and covered by
  runtime and editor tests.
