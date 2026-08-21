import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import { type LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  resolveBrandImageSrc,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuSectionAppearanceForDevice,
  type MenuBarLayout,
  type MenuBlockV2,
  type MenuDocumentV2,
  type NavLevelStyleLevel,
} from "../../../services/menus/menuDocumentV2";
import type { PageBlockV2, PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import { PageBlockContent, PageBlockFrame } from "../../../services/pages/pageRendererV2";
import {
  SITE_MENU_DOC_ATTRIBUTE,
  buildMenuDocumentPreviewCss,
} from "../../../site/menuDocumentCss";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import type { NavigationItem } from "../../../widgets/core/navigation";
import { loadFullTimelineIcons } from "../../../widgets/core/timeline";

import {
  MENU_BLOCK_LABELS,
  DEFAULT_BRAND_ICON_SIZE,
  SelectableBlock,
} from "./MenuDesignEditorControls";

export const MENU_CANVAS_GHOST_CSS = [
  `[data-menu-document-canvas="true"] [data-menu-block-ghost="true"]{display:block;opacity:.4}`,
  `[data-menu-document-canvas="true"] [data-menu-block-ghost="true"] [data-block-id]{display:revert}`,
].join("\n");

// --- responsive control shell (TASK-501-03) ----------------------------------

/**
 * TASK-502-04: tablet is now a REAL override breakpoint (mirrors the Pages
 * `ResponsiveControlShell`) — tablet AND mobile each carry their own sparse
 * responsive record inheriting the desktop base. This single predicate (used
 * by badge + writers + visibility controls) narrows the current device to a
 * `MenuResponsiveBreakpoint` ("tablet" | "mobile") so the override read/write
 * call sites type-check.
 */
export const previewHasRealHref = (href: string) => href.trim().length > 0 && href.trim() !== "#";

/**
 * TASK-502-04 §8: recursive canvas nav item mirroring the 502-03 FRONT hover
 * markup EXACTLY (`li.site-nav-item[data-site-nav-group]` + link / group-label
 * span + nested `ul.site-nav-sublist`) — grandchildren are NEVER dropped. The
 * 502-02 doc-scoped preview CSS owns reachability (hover/focus-within open +
 * fly-out); this only guarantees the recursive markup exists. `tabIndex={0}` on
 * the linkless group label is NORMATIVE so :focus-within can open its sublist.
 */
export const renderPreviewNavItem = (item: NavigationItem, key: string): ReactNode => {
  const children = item.children ?? [];
  return (
    <li
      className="site-nav-item"
      data-site-nav-group={children.length > 0 ? "true" : undefined}
      key={key}
    >
      {previewHasRealHref(item.href) ? (
        <a className="site-nav-link" href={item.href} onClick={(event) => event.preventDefault()}>
          {item.label}
        </a>
      ) : (
        <span className="site-nav-link site-nav-group-label" tabIndex={0}>
          {item.label}
        </span>
      )}
      {children.length > 0 ? (
        <ul className="site-nav-sublist">
          {children.map((child, index) =>
            renderPreviewNavItem(child, `${key}-${child.label}-${index}`)
          )}
        </ul>
      ) : null}
    </li>
  );
};

export function NavItemsPreview({ items, label }: { items: NavigationItem[]; label: string }) {
  return (
    <nav
      className="site-nav"
      aria-label={label.trim() || "Site navigation"}
      data-menu-nav-preview="true"
    >
      <ul className="site-nav-list" data-site-nav-list="true">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground">No published menu items yet.</li>
        ) : (
          items.map((item, index) => renderPreviewNavItem(item, `${item.label}-${index}`))
        )}
      </ul>
    </nav>
  );
}

/**
 * Local, blessed replica of `siteShell`'s module-private `menuLeafToPageBlock`
 * (TASK-502-04 §7 — the sibling keeps it private; a verbatim import would carry
 * its hand-off-to-CSS visibility skip into the canvas, fighting the ghost gate).
 * Visibility is ALWAYS `{ visible: true }` — the §3 ghost gate is the SOLE owner
 * of canvas hiding. Drift vs the original is pinned by this subtask's vitest.
 */
export const CANVAS_LEAF_TO_PAGE_TYPE = { "cta-button": "button", divider: "divider" } as const;
export const canvasMenuLeafToPageBlock = (block: MenuBlockV2): PageBlockV2 =>
  ({
    id: block.id,
    type: CANVAS_LEAF_TO_PAGE_TYPE[block.type as keyof typeof CANVAS_LEAF_TO_PAGE_TYPE],
    props: block.props,
    style: "style" in block ? block.style : undefined,
    visibility: { visible: true },
  }) as PageBlockV2;

export function MenuBlockPreview({
  block,
  device,
  items,
  navLabel,
  siteName,
  iconComponents,
}: {
  block: MenuBlockV2;
  device: PageBreakpoint;
  items: NavigationItem[];
  navLabel: string;
  siteName: string | null;
  /** TASK-520-03-L02: lazily-loaded lucide set for the brand ICON canvas preview
   * (parity with the 520-04 front render; NEVER imported from `siteShell.tsx`). */
  iconComponents: Record<string, ComponentType<LucideProps>> | null;
}) {
  switch (block.type) {
    case "nav-items":
      return <NavItemsPreview items={items} label={navLabel} />;
    case "brand": {
      const href = block.props.href || "/";
      // Mirror the 502-03 FRONT fallback chain EXACTLY: per-menu override →
      // site name → placeholder (menuName is GONE — the front renders the SITE
      // name, never the menu name). The placeholder marks where the front
      // renders null.
      const text =
        (typeof block.props.text === "string" ? block.props.text.trim() : "") ||
        siteName ||
        "Site name";
      // TASK-504-04 §7 (defect B1): resolve the brand image `src` through the
      // SINGLE shared resolver (menuDocumentV2) — the SAME shape the front
      // MenuBrandRender consumes — and render a REAL <img> (not the "Logo" text).
      // The <img> is SIZED by 504-02's `[data-menu-block-id] img{}` rule, which
      // reaches it because §3 stamps `data-menu-block-id` on this <a>. GUARD on a
      // resolved src so an image-mode brand with NO logo falls through to text.
      const resolvedSrc =
        block.props.mode === "image" ? resolveBrandImageSrc(block.props.image) : null;
      // TASK-520-03-L02: icon mode + graphic-with-text combo (mirrors 520-04). The
      // icon resolves against the lazily-loaded lucide set; an unresolvable/absent
      // icon falls through to the text/site-name chain (never a broken mark).
      const brandStyle = resolveMenuBrandStyleForDevice(block, device);
      const iconName = block.props.mode === "icon" ? block.props.icon : undefined;
      const IconComp = iconName && iconComponents ? iconComponents[iconName] : undefined;
      const hasGraphic =
        (block.props.mode === "image" && !!resolvedSrc) ||
        (block.props.mode === "icon" && !!IconComp);
      // Show the wordmark when there is NO graphic (fallback) OR the author opted
      // into the combo (`showText`). Graphic-only ⇒ byte-identical to today.
      const showWordmark = !hasGraphic || block.props.showText === true;
      return (
        <a
          className="site-header-brand"
          href={href}
          onClick={(event) => event.preventDefault()}
          data-menu-block-id={block.id}
          data-menu-brand-combo={hasGraphic && block.props.showText === true ? "true" : undefined}
        >
          {block.props.mode === "image" && resolvedSrc ? (
            <img src={resolvedSrc} alt={String(block.props.image?.alt ?? "")} />
          ) : null}
          {block.props.mode === "icon" && IconComp ? (
            <IconComp
              className="site-header-brand-icon"
              aria-hidden="true"
              style={{
                color: brandStyle.iconColor ?? undefined,
                width: brandStyle.iconSize ?? DEFAULT_BRAND_ICON_SIZE,
                height: brandStyle.iconSize ?? DEFAULT_BRAND_ICON_SIZE,
              }}
            />
          ) : null}
          {showWordmark ? <span className="site-header-brand-text">{text}</span> : null}
        </a>
      );
    }
    case "search":
    case "account":
    case "language": {
      const label =
        typeof block.props.label === "string" && block.props.label.trim().length > 0
          ? block.props.label
          : MENU_BLOCK_LABELS[block.type];
      return (
        <span className="site-nav-utility" data-site-nav-utility={block.type}>
          {label}
        </span>
      );
    }
    // cta-button / divider: render the REAL front leaf structure. PageBlockFrame
    // stamps `data-block-id`, so 502-02's divider context rules (frame-as-line +
    // inner <hr> hidden) apply identically on canvas, and variant/size/target
    // render through the page renderer for visible effect.
    case "cta-button":
    case "divider": {
      const leaf = canvasMenuLeafToPageBlock(block);
      return (
        <PageBlockFrame block={leaf}>
          <PageBlockContent block={leaf} />
        </PageBlockFrame>
      );
    }
    // SPACER is DELIBERATELY the fixed-24px stub: the real leaf is a 0-width
    // `<div style={{height}}/>` flex item with zero 502-02 rules (flex-push is a
    // named residual), so a real render would collapse to an unclickable sliver.
    case "spacer":
      return <span aria-hidden="true" style={{ display: "inline-block", width: 24 }} />;
    default:
      return null;
  }
}

export function MenuDocumentCanvas({
  doc,
  device,
  items,
  navLabel,
  siteName,
  tokenVariables,
  selectedId,
  onSelect,
  forceOpenLevel,
}: {
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  items: NavigationItem[];
  navLabel: string;
  siteName: string | null;
  /** Site design token vars (all seven `--color-*` + typography) painted inline
   * on the canvas frame ROOT so the doc CSS resolves the SITE theme, not admin. */
  tokenVariables: CSSProperties;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** TASK-504-04 §6: CUMULATIVE force-open depth (1 ⇒ open depth 1; 2 ⇒ open
   * depths 1 AND 2) so the sublist level being styled is revealed sim-open on
   * the canvas. `undefined` ⇒ byte-identical to today (no sim-open rule). */
  forceOpenLevel?: NavLevelStyleLevel;
}) {
  const css = useMemo(
    () => buildMenuDocumentPreviewCss(doc, device, forceOpenLevel),
    [doc, device, forceOpenLevel]
  );
  const section = doc.sections[0];
  const blocks = section?.blocks ?? [];
  // TASK-520-03-L01: the resolved bar layout gates both the scrolled preview
  // toggle (sticky-only) and its effect.
  const barLayout: MenuBarLayout = section
    ? resolveMenuSectionAppearanceForDevice(section, device).layout
    : {};
  const barSticky = barLayout.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky;
  const [previewScrolled, setPreviewScrolled] = useState(false);
  // TASK-520-03-L02: lazily-load the full lucide set ONLY when a brand icon block
  // exists on the canvas, keeping the heavy module off the initial admin bundle.
  const needsIcons = blocks.some(
    (block) => block.type === "brand" && block.props.mode === "icon" && !!block.props.icon
  );
  const [iconComponents, setIconComponents] = useState<Record<
    string,
    ComponentType<LucideProps>
  > | null>(null);
  useEffect(() => {
    if (!needsIcons || iconComponents) return;
    let active = true;
    void loadFullTimelineIcons().then((lib) => {
      if (active) setIconComponents(lib.components);
    });
    return () => {
      active = false;
    };
  }, [needsIcons, iconComponents]);
  return (
    <div className="grid gap-2">
      {barSticky ? (
        <div className="flex justify-end">
          <button
            type="button"
            data-menu-preview-scrolled-toggle="true"
            aria-pressed={previewScrolled}
            onClick={() => setPreviewScrolled((on) => !on)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
              previewScrolled
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-primary"
            )}
          >
            {previewScrolled ? "Previewing scrolled state" : "Preview scrolled state"}
          </button>
        </div>
      ) : null}
      <div
        className="site-header"
        data-menu-document-canvas="true"
        {...{ [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
        // TASK-520-03-L01: stamp the SAME `[data-scrolled="true"]` hook the 520-02
        // CSS + 520-04 front machine use, so the scrolled variant is visible IN the
        // canvas without leaving the editor. Preview-only chrome (no model write).
        data-scrolled={barSticky && previewScrolled ? "true" : undefined}
        // Painted on the ROOT (NORMATIVE): the section Surface/Border doc rules
        // target this very element, and CSS custom properties inherit downward
        // only — a per-block wrapper could never feed those root-level rules.
        style={tokenVariables}
      >
        <style>{`${css}\n${MENU_CANVAS_GHOST_CSS}`}</style>
        <div className="site-header-inner">
          {blocks.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              This menu design has no blocks yet. Add one from the panel.
            </p>
          ) : (
            blocks.map((block) => (
              <SelectableBlock
                key={block.id}
                id={block.id}
                ghost={!resolveMenuBlockVisibleForDevice(block, device)}
                selected={block.id === selectedId}
                onSelect={onSelect}
              >
                <MenuBlockPreview
                  block={block}
                  device={device}
                  items={items}
                  navLabel={navLabel}
                  siteName={siteName}
                  iconComponents={iconComponents}
                />
              </SelectableBlock>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
