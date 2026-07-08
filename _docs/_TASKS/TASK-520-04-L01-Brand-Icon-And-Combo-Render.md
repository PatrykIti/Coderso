# TASK-520-04-L01: Front `BrandRender` — Icon Mode & Graphic-With-Text Combo

# FileName: TASK-520-04-L01-Brand-Icon-And-Combo-Render.md

**Parent Subtask:** TASK-520-04
**Priority:** High
**Category:** Site Render / Navigation / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the `BrandRender` component body + signature (@490-536)
in `core/site/siteShell.tsx`. Adds icon-mode rendering (lucide `<svg>` from the
validated name, styled by `iconColor`/`iconSize`), the `showText:true` combo
(graphic + wordmark), and the new optional `breakpoint` prop on `BrandRender`'s
signature. Disjoint from L02's `SiteHeaderMenuDocumentRender` region (@555-621) —
**the caller edit at @599 that threads `breakpoint={breakpoint}` into `<BrandRender>`
is owned by L02** (@599 sits inside `SiteHeaderMenuDocumentRender`), so this leaf
touches only @490-536 and the regions stay strictly disjoint.

## Grounded anchors

`BrandRender` @490-536; href sanitize @501; `resolveBrandImageSrc` @509; image
branch @510-522; text/site-name fallback @523-534; `resolveMenuBrandStyleForDevice`
(`menuDocumentV2.ts:1768`) resolves per-device `BrandStyle` (incl. new
`iconColor`/`iconSize`); lucide render `lucideKebabIconComponents` in
`core/widgets/core/timelineLucideIcons.ts` (SSR-renderable). The header passes
`breakpoint` (@566) — use it to resolve the per-device brand style.

## Implementation pseudocode

```tsx
const BrandRender = ({ block, siteName, breakpoint }: {
  block: Extract<MenuBlockV2, { type: "brand" }>;
  siteName?: string | null;
  breakpoint?: PageBreakpoint;
}) => {
  const href = sanitizeAuthoringLinkHref(block.props.href) ?? "/";
  const style = resolveMenuBrandStyleForDevice(block, breakpoint ?? "desktop");
  const wordmark = block.props.text?.trim() || siteName || null;   // fallback chain (unchanged)
  const showText = block.props.showText === true;

  // Resolve a graphic node per mode (icon | image), null if none:
  let graphic: ReactNode = null;
  if (block.props.mode === "icon" && block.props.icon) {
    const Icon = lucideKebabIconComponents[block.props.icon];      // ALLOWLIST: unknown ⇒ undefined ⇒ null graphic
    if (Icon) {
      graphic = <Icon aria-hidden="true"
        width={style.iconSize ?? 24} height={style.iconSize ?? 24}
        style={style.iconColor ? { color: style.iconColor } : undefined} />;
      // color via `color` so lucide's stroke=currentColor inherits it; iconColor is a
      // validated token (520-01) — defence in depth: it only reaches an inline style as a
      // whitelisted color string.
    }
  } else if (block.props.mode === "image") {
    const resolvedSrc = resolveBrandImageSrc(block.props.image);
    if (resolvedSrc) {
      const imageBlock = { id: block.id, type: "image", props: block.props.image,
        visibility: { visible: true } } as PageBlockV2;
      graphic = <PageBlockContent block={imageBlock} />;
    }
  }

  // Compose:
  //  - graphic present & !showText            → graphic only (today's image-only / new icon-only)
  //  - graphic present & showText & wordmark  → graphic + wordmark (COMBO)
  //  - graphic absent                         → wordmark (text mode / graphic-mode-without-graphic fallback)
  if (graphic && showText && wordmark) {
    return (
      <a className="site-header-brand site-header-brand--combo" href={href} data-menu-block-id={block.id}>
        {graphic}
        <span className="site-header-brand-text">{wordmark}</span>
      </a>
    );
  }
  if (graphic) {
    return (
      <a className="site-header-brand" href={href} data-menu-block-id={block.id}>
        {graphic}
      </a>
    );
  }
  if (!wordmark) return null;
  return (
    <a className="site-header-brand" href={href} data-menu-block-id={block.id}>{wordmark}</a>
  );
};
// NOTE: the caller edit at @599 (adding `breakpoint={breakpoint}` to the <BrandRender>
// invocation) lives INSIDE SiteHeaderMenuDocumentRender @555-621 and is owned by L02
// — this leaf only DECLARES the optional `breakpoint` prop here (back-compat: the
// caller may land it in either order; an undefined breakpoint falls back to "desktop").
```

**CSS note:** the `--combo` layout (graphic + wordmark inline-flex gap) is handled
by the EXISTING `.site-header-brand` styling / a tiny utility class. If a new
declaration is genuinely required, it must be emitted by 520-02 (CSS single-writer),
NOT here — flag it to 520-02 rather than adding CSS in `siteShell.tsx`. Prefer
Tailwind utility classes already available on the anchor (e.g. `inline-flex
items-center gap-2`) to avoid a cross-file CSS dependency.

## Regression-test shape (Bun render — `tests/unit/site/menu-document-render.test.tsx`)

> Lane note: this SSR render file is `bun:test` + `renderToString`, i.e. the **Bun**
> lane per `_docs/TESTING_STRATEGY.md` (`tests/unit/*` = Bun; `tests/vitest/*` =
> Vitest) — not Vitest.

- **Icon mode:** `{mode:"icon", icon:"house", style:{iconColor:"#f7fbffcc", iconSize:28}}`
  renders an `<svg>` (lucide) inside `.site-header-brand` with the color/size applied;
  no wordmark.
- **Unknown icon fallback:** `{mode:"icon", icon:"definitely-not-an-icon"}` renders the
  site-name text (no `<svg>`, no broken mark).
- **Combo:** `{mode:"image", image:{src}, showText:true, text:"Acme"}` renders both the
  `<img>` and `<span>Acme</span>`; `{mode:"icon", icon:"house", showText:true}` renders
  `<svg>` + wordmark.
- **Back-compat:** `{mode:"text"}` and `{mode:"image", image:{src}}` (no showText) render
  byte-identical to pre-520 (text-only / image-only).
- **Per-device:** a tablet `iconSize` override reflects when `breakpoint="tablet"`.

## Hard Invariants

- Icon name resolved against the lucide allowlist (unknown → fallback).
- `iconColor` reaches only an inline `style` as a validated token.
- Combo only when graphic + `showText` + wordmark all present.
- No CSS added in `siteShell.tsx` (flag to 520-02 if needed).
