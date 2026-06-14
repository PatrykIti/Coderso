# TASK-466: Page Full Width Section Background Bleed
# FileName: TASK-466_Page_Full_Width_Section_Background_Bleed.md

**Priority:** High
**Category:** Pages / Public Runtime / Admin Preview
**Estimated Effort:** Small
**Dependencies:** TASK-464
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Fix the Pages v2 `full-width` section variant so section backgrounds fill the
entire horizontal band instead of leaving white gutters around hero/CTA content.

Before this task, the renderer put the author-controlled background on the
inner section content grid but always put `px-4 py-6` on the outer `<section>`.
That left visible white strips around full-width hero backgrounds even though
the inner content correctly used `max-width: none`.

The UX/UI controls stay unchanged. Authors still choose **Layout → Variant →
Full width**.

---

## Sub-Tasks

- [x] Remove the outer section gutter for resolved `full-width` variants only.
- [x] Preserve the existing gutter for all non-full-width section variants.
- [x] Add renderer regression coverage for the full-width band contract.
- [x] Verify with a real dev-host browser smoke on desktop, tablet, and mobile.
- [x] Update docs, task board, and changelog.

## Implementation Pseudocode

```ts
function toPageSectionRenderProps(section) {
  const template = resolvePageSectionTemplate(section);
  return {
    sectionClassName:
      template.variant === "full-width" ? "w-full" : "w-full px-4 py-6",
    contentClassName: "...",
    style: toPageSectionStyle(section),
  };
}

test("full-width section variants remove the outer section gutter", () => {
  const fullWidth = createPageSectionV2("hero", { variant: "full-width" });
  expect(toPageSectionRenderProps(fullWidth).sectionClassName).toBe("w-full");
  expect(renderToStaticMarkup(<PageSectionRender section={fullWidth} />)).not.toContain("px-4");
});
```

Data flow:

- Section variant resolves through `pageSectionTemplates`.
- The outer `<section>` owns only the public band wrapper class.
- The inner `PageSectionContent` keeps background, padding, max-width, and grid
  layout styles.
- Full-width removes only the wrapper gutter; author spacing remains on the
  painted content node.

Error handling:

- Unsupported variants still fall back through the existing template resolver.
- Non-full-width variants keep the previous wrapper class unchanged.

Regression-test shape:

- Pure Vitest renderer coverage asserts class and markup differences.
- Browser smoke checks desktop/tablet/mobile published geometry.

## Security Contract

- No new endpoints.
- Existing Pages admin auth/RBAC/CSRF/rate-limit behavior is unchanged.
- No new public write path.
- No sanitizer contract change; existing background color/media sanitizers still
  own the painted section content styles.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- Real `coderso-dev-core-host` + `playwright-cli` smoke for a published
  full-width hero on desktop, tablet, and mobile.
- `bun run precommit` before commit.

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1173-2026-06-14-task-466-page-full-width-section-background-bleed.md`
- `_docs/_CHANGELOG/README.md`

## Closeout Evidence

- `toPageSectionRenderProps` now emits `sectionClassName: "w-full"` for
  resolved `full-width` variants and preserves `w-full px-4 py-6` for all other
  variants.
- Renderer regression coverage pins the full-width background band contract.
- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
  passed with 35 tests.
- `bun run lint` passed after the renderer regression test was updated to use a
  full `PageSectionStyleV2` payload.
- `coderso-dev-core-host` + `playwright-cli` smoke passed for a published
  full-width hero on desktop, tablet, and mobile: the painted content rect
  starts at `left=0`, ends at the viewport width, and matches the outer section
  top/bottom on every checked viewport.
