# TASK-268-05: Footer Layout, Typography, and Interactive Style Controls

# FileName: TASK-268-05_Footer_Layout_Typography_and_Interactive_Style_Controls.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-268, TASK-268-03, TASK-268-04
**Status:** To Do

---

## Overview

Add Footer-owned layout, typography, and interactive style controls that remain
outside the general TASK-256 shared-contract scope.

The report identifies Footer-specific gaps: hardcoded horizontal padding,
hardcoded column breakpoint, no hover feedback, missing link letter-spacing and
font-weight controls, and no open-in-new-tab option for Footer links. It also
lists broader market backlog ideas. This leaf adds the bounded Footer controls
that can be expressed safely in the existing widget model and explicitly defers
market-only utilities that would create a larger product surface.

This leaf also owns Footer-local adoption of already-landed shared color-picker
patterns for Footer style inputs. It does not redefine the shared primitive from
TASK-256-02.

## Scope Boundary

This leaf owns:

- Footer horizontal padding token, replacing hardcoded public `px-6`.
- Footer responsive column breakpoint or a small approved layout-density enum
  that maps to fixed class names.
- Footer link hover/active/underline controls implemented through bounded
  style tokens plus an optional strict color normalizer, not arbitrary CSS.
- Footer link font-weight and letter-spacing controls from fixed enums.
- Footer link target controls for column and legal links, preserving safe href
  normalization and external-link safety.
- Footer-local adoption of already-landed shared color-picker patterns for
  Footer style fields that still expose text-only color entry.

This leaf does not own:

- Generic color picker primitives, generic clear controls, or CSS-variable
  preservation semantics from TASK-256-02.
- Newsletter signup submission logic, back-to-top global scroll behavior, or
  new public write flows. Those may be documented as future tasks if product
  wants them after Footer basics are fixed.
- Arbitrary breakpoint strings, arbitrary Tailwind class names, or arbitrary CSS
  in widget JSON.

## Sub-Tasks

- [ ] Add `layout.paddingX` with fixed token values, for example
  `none | 4 | 6 | 8`, and map it to fixed classes.
- [ ] Add a bounded responsive layout choice, for example
  `columnBreakpoint: "sm" | "md" | "lg"` or a higher-level density enum, and
  map it to fixed grid classes.
- [ ] Add link style fields such as `linkHoverColor`, `linkActiveColor`,
  `linkUnderline`, `linkFontWeight`, and `linkLetterSpacing`. Color fields must
  either reference approved design tokens or pass a strict hex/CSS-variable
  normalizer before render.
- [ ] Add `target` controls for Footer column and legal links with schema,
  editor, renderer, and tests that preserve safe `rel` behavior.
- [ ] Update Footer editors with labeled controls in Visual or Advanced based
  on final mode ownership.
- [ ] Adopt the existing shared color-picker pattern for Footer style fields
  that still expose text-only color entry.
- [ ] If market-only rows such as newsletter slot, address/contact block, or
  back-to-top remain deferred, TASK-268-06 must create or reference a physical
  future task before TASK-268 closes; report-only backlog prose is not enough.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/footer.tsx` | Extend layout/style/link schema/defaults/normalization and render bounded classes/styles. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add labeled controls for new layout/style/link options. |
| `tests/vitest/widgets/footer.test.tsx` | Cover padding, breakpoint, hover/underline/typography output, target/rel behavior, and unsafe values. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover editor controls for new bounded options. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Update only if approved `none` token behavior changes for Footer fields. |
| `tests/unit/widgets/validator.test.ts` | Update when schema fields are added. |
| `_docs/_WIDGETS/FOOTER.md` | Document layout/style/link controls and any explicit future deferrals. |

## Implementation Pseudocode

```ts
type FooterLinkTarget = "_self" | "_blank";

type FooterLink = {
  label: string;
  href: string;
  target?: FooterLinkTarget;
};

type FooterLegal = {
  enabled?: boolean;
  privacy?: string;
  privacyLabel?: string;
  privacyTarget?: FooterLinkTarget;
  terms?: string;
  termsLabel?: string;
  termsTarget?: FooterLinkTarget;
};

type FooterLayout = {
  paddingX?: "none" | "4" | "6" | "8";
  columnBreakpoint?: "sm" | "md" | "lg";
};

type FooterLinkColorToken = "inherit" | "muted" | "accent" | "brand" | "custom";

type FooterStyle = {
  linkHoverColor?: FooterLinkColorToken;
  linkHoverCustomColor?: string;
  linkActiveColor?: FooterLinkColorToken;
  linkActiveCustomColor?: string;
  linkUnderline?: "none" | "hover" | "always";
  linkFontWeight?: "normal" | "medium" | "semibold";
  linkLetterSpacing?: "normal" | "wide";
};

function normalizeFooterLinkColor(
  token: unknown,
  customValue: unknown
): { token: Exclude<FooterLinkColorToken, "custom">; value?: string } {
  if (token === "custom") {
    const value = normalizeStrictFooterColor(customValue);
    return value ? { token: "inherit", value } : { token: "inherit" };
  }
  if (token === "muted" || token === "accent" || token === "brand") return { token };
  return { token: "inherit" };
}

function normalizeStrictFooterColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(trimmed)) return trimmed;
  if (/^var\(--[a-zA-Z0-9-_]+\)$/.test(trimmed)) return trimmed;
  return undefined;
}

const paddingXClassMap = {
  none: "px-0",
  "4": "px-4",
  "6": "px-6",
  "8": "px-8",
} as const;

const gridClassMap = {
  sm: {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
  },
  md: {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
  },
  lg: {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
  },
} as const;

function resolveFooterGridClass(count: number, breakpoint: FooterLayout["columnBreakpoint"]) {
  const normalizedBreakpoint = breakpoint ?? "md";
  const normalizedCount = count === 1 || count === 3 ? count : 2;
  return gridClassMap[normalizedBreakpoint][normalizedCount];
}

function getFooterLinkAttrs(href: string, target: FooterLinkTarget | undefined) {
  if (target === "_blank" && /^https?:\/\//i.test(href)) {
    return { target: "_blank", rel: "noopener noreferrer" };
  }
  return {};
}
```

Error handling:

- Unknown layout/style tokens fall back to current defaults.
- `none` is accepted only for fields already approved as visual off tokens.
- Unknown hover/active color tokens fall back to `inherit`; custom colors render
  only after the strict hex/CSS-variable normalizer accepts them.
- Unsafe hrefs still normalize to `#` or are omitted according to the existing
  Footer safe-href behavior.
- `_blank` on unsafe or non-http hrefs must not create weaker behavior.
- Legal target updates are additive to the TASK-268-02/TASK-268-03 legal model:
  they must preserve `enabled`, `privacyLabel`, and `termsLabel`.
- All class output comes from static maps so Tailwind can see every class at
  build time.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new layout/style/link fields must be explicit and
  reject unknown values.
- Anti-abuse: no arbitrary class names or CSS strings; custom color strings must
  pass the strict Footer color normalizer; href/target behavior must keep
  `noopener noreferrer` where needed and continue safe-href normalization.
- Secret handling: no secrets in style/link data, docs, tests, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` because this
  leaf changes public Footer renderer output.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only if
  Footer `none` token behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before moving this leaf to `Done` or committing it independently, also run
  `git diff --check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, and `bun run precommit`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/FOOTER.md` with new layout/style/link controls.
- Update `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md` rows for padding,
  responsive grid, hover states, link typography, and open-in-new-tab after
  validation.
- Record market-only deferrals, if any, through named future task IDs in
  TASK-268-06 closure notes.

## Changelog Policy

- Covered by the TASK-268 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Footer horizontal padding is configurable through bounded tokens.
- Footer responsive behavior is configurable through bounded choices or is
  explicitly deferred with a concrete reason.
- Link hover/active/underline/typography controls render safely and are tested.
- Link target behavior for column and legal links preserves safe href
  normalization and rel hardening.
- Market-only utility ideas are not silently implemented without an approved
  security and product contract, and any deferred Footer-owned row ends with a
  named future task before closure.
