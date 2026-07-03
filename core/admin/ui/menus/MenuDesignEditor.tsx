import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  PanelRight,
  Plus,
  Redo2,
  Rocket,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { getCachedMedia, listMediaCached, type MediaRecord } from "@/services/mediaClient";
import {
  getCachedMenuDetail,
  getMenuWithItemsCached,
  publishMenu,
  updateMenu,
} from "@/services/menusClient";
import { listPagesCached } from "@/services/pagesClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { resolveStoredMenuNavExtras } from "../../../services/menus/menuNavExtras";
import {
  buildMenuDocumentV2FromLegacy,
  clearMenuBlockVisibilityOverride,
  clearMenuBrandStyleOverride,
  clearMenuNavLevelStyleOverride,
  clearMenuSectionOverride,
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  deleteMenuBlock,
  findMenuBlock,
  insertMenuBlock,
  patchMenuBrandStyleForDevice,
  patchMenuNavLevelStyleForDevice,
  patchMenuSectionForDevice,
  readMenuBrandStyleOverrideValue,
  readMenuNavLevelStyleOverrideValue,
  readMenuSectionOverrideValue,
  reorderMenuBlock,
  resolveBrandImageSrc,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuNavLevelStyle,
  resolveMenuSectionAppearanceForDevice,
  resolveStoredMenuDocument,
  setMenuBlockVisibleForDevice,
  BRAND_STYLE_NUMBER_RANGES,
  MENU_BRAND_TEXT_MAX_LENGTH,
  NAV_LEVEL_NUMBER_RANGES,
  NAV_LINK_NUMBER_RANGES,
  type BrandStyle,
  type MenuBarLayout,
  type MenuBlockType,
  type MenuBlockV2,
  type MenuDocumentV2,
  type MenuResponsiveBreakpoint,
  type MenuSectionV2,
  type NavItemsProps,
  type NavLevelStyle,
  type NavLevelStyleLevel,
} from "../../../services/menus/menuDocumentV2";
import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceNumberRanges,
  menuAppearanceOrientations,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  resolveStoredMenuAppearance,
  type MenuAppearance,
  type MenuAppearanceFontWeight,
} from "../../../services/menus/normalizeMenuAppearance";
import { mapMenuNodesToNavigationItems } from "../../../services/navigation/navigationMenuMapping";
import type { PageBlockV2, PageBreakpoint } from "../../../services/pages/pageDocumentV2";
import {
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
} from "../../../services/pages/pageDocumentV2";
import {
  getPageEditorColorPalette,
  type PageEditorColorSwatch,
} from "../../../services/pages/pageEditorControlUiModel";
import { PageBlockContent, PageBlockFrame } from "../../../services/pages/pageRendererV2";
import {
  SITE_MENU_DOC_ATTRIBUTE,
  buildMenuDocumentPreviewCss,
} from "../../../site/menuDocumentCss";
import { SHELL_APPEARANCE_DEFAULTS } from "../../../site/siteShellCss";
import { toMenuCanvasColorCssVariableMap } from "../../../ui/theme/tokenCss";
import type { NavigationItem } from "../../../widgets/core/navigation";
import { DeviceSwitcher } from "../pages/DeviceSwitcher";
import {
  ColorSwatchControl,
  MediaPickerControl,
  SegmentedControl,
  SliderControl,
  ToggleSwitch,
} from "../pages/editorControls";
import {
  EditorControlToneContext,
  editorControlFocusClassFor,
  editorGhostButtonClassFor,
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../pages/editorControls/controlChrome";
import { CanvasEditor } from "../shared/CanvasEditor";
import { useCanvasSiteName, useCanvasSiteTokens } from "../shared/useCanvasSiteTokens";

/**
 * MenuDesignEditor (TASK-499-03): the Design tab's Pages-identical editor — a
 * THIN host over the shared `CanvasEditor` shell + the shared `editorControls`
 * primitives, editing `menuDocumentV2` directly. It renders a dotted canvas of
 * the `menu-bar` blocks (click-to-select, innermost wins), a single floating
 * control panel that swaps menu control primitives per selected block, an
 * "Add block" rail, and the existing menu Save/Publish lifecycle. The
 * `nav-items` block BINDS the published item tree (read-only) — never
 * duplicating item data.
 *
 * Undo/Redo is a SINGLE `useReducer` atom (doc + past + future + dirty) so an
 * edit, undo, and redo never read a stale document from a nested setState
 * closure. History is bounded (menu-scoped) and host-owned, so regressions stay
 * on the menu surface and cannot reach the Pages editor.
 *
 * Per-device overrides (TASK-501-03): APPEARANCE writers are device-forked —
 * with the DeviceSwitcher on Mobile, `setLayoutField`/`setNavField` write a
 * SPARSE `responsive.mobile` record via `patchMenuSectionForDevice` and the
 * per-block visibility toggle writes `setMenuBlockVisibleForDevice`; Desktop
 * AND Tablet write the flat base (tablet overrides deferred). Panels display
 * RESOLVED values (`resolveMenuSectionAppearanceForDevice`) while the
 * `MenuResponsiveControlShell` badge compares against the BASE record and
 * offers an explicit Reset (`clearMenuSectionOverride` — prune-on-clear, no
 * auto-remove-on-equality). Content writes (`patchBlock`) stay FLAT and
 * badge-less on every device. All writes remain event-handler dispatches into
 * the history atom — no setState-in-effect.
 *
 * The Pages **Layers** overlay is intentionally scoped out and served by the
 * "Blocks" list in `MenuBarPanel` (select + reorder + remove over the single
 * `menu-bar`): a menu document is one shallow section, so a full Layers tree
 * would be redundant chrome — the one deliberate, documented narrowing of
 * "Pages-identical".
 */

// --- undo/redo reducer atom -------------------------------------------------

type HistoryState = {
  doc: MenuDocumentV2;
  past: MenuDocumentV2[];
  future: MenuDocumentV2[];
  dirty: boolean;
};

type HistoryAction =
  | { type: "update"; updater: (doc: MenuDocumentV2) => MenuDocumentV2 }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: MenuDocumentV2 }
  | { type: "hydrate"; doc: MenuDocumentV2 }
  | { type: "markSaved" };

const HISTORY_LIMIT = 50;

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "update": {
      const next = action.updater(state.doc);
      if (next === state.doc) return state;
      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        dirty: true,
      };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1]!;
      return {
        doc: prev,
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
        dirty: true,
      };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const next = state.future[0]!;
      return {
        doc: next,
        past: [...state.past, state.doc],
        future: state.future.slice(1),
        dirty: true,
      };
    }
    case "reset":
      return { doc: action.doc, past: [], future: [], dirty: false };
    case "hydrate":
      // Authoritative seed from the freshly loaded detail (cold cache). Guarded:
      // never clobbers a draft the user has already started editing.
      if (state.dirty || state.past.length > 0) return state;
      return { doc: action.doc, past: [], future: [], dirty: false };
    case "markSaved":
      return state.dirty ? { ...state, dirty: false } : state;
    default:
      return state;
  }
}

// --- seed contract ----------------------------------------------------------

/**
 * FRESH-MENU SEED CONTRACT (shared with TASK-499-02 §4): an existing stored
 * `document` draft wins; otherwise seed-from-legacy (WITHOUT writing) —
 * `buildMenuDocumentV2FromLegacy` returns `null` for a fresh menu (no appearance
 * AND no extras), so the chain reaches `createDefaultMenuDocumentV2()`
 * (menu-bar ⊃ brand(text)/nav-items/cta-button).
 */
const seedMenuDocument = (settings: unknown): MenuDocumentV2 =>
  resolveStoredMenuDocument(settings) ??
  buildMenuDocumentV2FromLegacy(
    resolveStoredMenuAppearance(settings),
    resolveStoredMenuNavExtras(settings)
  ) ??
  createDefaultMenuDocumentV2();

// --- labels -----------------------------------------------------------------

const MENU_BLOCK_LABELS: Record<MenuBlockType, string> = {
  "nav-items": "Navigation items",
  brand: "Brand",
  search: "Search",
  account: "Account",
  language: "Language",
  "cta-button": "Button",
  divider: "Divider",
  spacer: "Spacer",
};

const ADD_BLOCK_TYPES: MenuBlockType[] = ["nav-items", "brand", "cta-button", "divider", "spacer"];

const DEVICE_LABELS: Record<PageBreakpoint, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

const alignmentLabels: Record<string, string> = {
  start: "Start",
  center: "Center",
  end: "End",
  "space-between": "Spread",
};
const textTransformLabels: Record<string, string> = {
  none: "None",
  uppercase: "Uppercase",
  capitalize: "Capitalize",
};
const shadowLabels: Record<string, string> = { none: "None", sm: "Soft", md: "Strong" };
const orientationLabels: Record<string, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
};
const dropdownDirectionLabels: Record<string, string> = { bottom: "Below", top: "Above" };
const mobileModeLabels: Record<string, string> = { disclosure: "Collapsed", inline: "Inline" };
const FONT_WEIGHT_INHERIT = "inherit" as const;
const fontWeightOptions = [FONT_WEIGHT_INHERIT, ...menuAppearanceFontWeights.map((w) => String(w))];
const fontWeightLabels: Record<string, string> = {
  [FONT_WEIGHT_INHERIT]: "Theme",
  "400": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
};
// TASK-504-04 §8 (defect B2): an UNSET nav `fontSize` emits `font-size:inherit`,
// which the theme resolves to ~16px (menuDocumentCss.ts) — NOT the misleading
// explicit 15 the slider showed before. The slider now displays this true
// inherited size at the unset position + an "Inherited" hint so unset (16) reads
// distinctly from an EXPLICIT 16. DISPLAY only — CSS emission is unchanged.
const NAV_FONT_SIZE_INHERITED = 16;
const toSwatchValue = (value: string) => (value === "transparent" ? "" : value);

// --- selectable canvas ------------------------------------------------------

function SelectableBlock({
  id,
  selected,
  ghost = false,
  onSelect,
  children,
}: {
  id: string;
  selected: boolean;
  /** TASK-502-04: the block is hidden on the current device — dim it to a
   * selectable ghost (opacity + "Hidden" badge) instead of skipping it. */
  ghost?: boolean;
  onSelect: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div
      data-menu-block-id={id}
      data-menu-block-ghost={ghost ? "true" : undefined}
      data-menu-block-selected={selected ? "true" : "false"}
      onClick={(event) => {
        // Real leaf previews (cta/divider) render live anchors/buttons; keep the
        // canvas click intercept + preventDefault so a preview link SELECTS the
        // block instead of navigating away from the editor.
        event.stopPropagation();
        event.preventDefault();
        onSelect(id);
      }}
      className={cn(
        // Chrome-safety (TASK-502-04 §2): the canvas frame repaints the SITE
        // `--color-primary`, so the selection ring is pinned to an admin var
        // (NOT `ring-primary`) to stay admin-themed and immune to token paint.
        "relative cursor-pointer rounded-lg outline-none transition-shadow",
        selected && "ring-2 ring-[color:var(--admin-input-ring,#7c3aed)]"
      )}
    >
      {children}
      {ghost ? (
        <span
          aria-hidden="true"
          data-menu-block-hidden-badge="true"
          className="pointer-events-none absolute -top-2 right-1 z-10 rounded-full bg-muted px-1.5 text-[9px] font-semibold uppercase text-muted-foreground shadow-sm"
        >
          Hidden
        </span>
      ) : null}
    </div>
  );
}

/**
 * Canvas visibility presentation (TASK-502-04 §3). The 502-02 preview builder
 * emits NO `[data-menu-block-id]{display:none}` hide rules, so the ghost gate
 * is the SOLE owner of canvas visibility. These rules are DEFENSE IN DEPTH:
 * appended AFTER the builder CSS (later source order + equal specificity) so a
 * stray hide rule reaching the canvas `<style>` can never `display:none` a
 * ghost subtree — force-show only applies to `data-menu-block-ghost` subtrees
 * and is inert against a compliant builder. The nested `[data-block-id]` revert
 * covers real leaf frames (PageBlockFrame) inside a ghost.
 */
const MENU_CANVAS_GHOST_CSS = [
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
const isMenuOverrideDevice = (device: PageBreakpoint): device is MenuResponsiveBreakpoint =>
  device !== "desktop";

type MenuResponsiveBadgeState = "base" | "override" | "inherited";

/** Per-breakpoint copy (bounded tablet window per `pageResponsiveMediaBounds.tablet`). */
const menuResponsiveBadgeDescription = (
  state: MenuResponsiveBadgeState,
  device: PageBreakpoint
): string =>
  state === "base"
    ? "Editing the base value (applies to every device)."
    : state === "override"
      ? device === "tablet"
        ? "Tablet override — this value replaces the desktop value between 640px and 1023px."
        : "Mobile override — this value replaces the desktop value below 640px."
      : `Inherited from desktop. Edit to create a ${DEVICE_LABELS[device].toLowerCase()} override.`;

function MenuResponsiveStateBadge({
  state,
  device,
}: {
  state: MenuResponsiveBadgeState;
  device: PageBreakpoint;
}) {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          data-menu-responsive-badge={state}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${editorControlFocusClassFor(
            tone
          )} ${
            state === "override"
              ? isLight
                ? editorPanelOptionActiveClass
                : "bg-sky-400/20 text-sky-200"
              : isLight
                ? "bg-muted text-muted-foreground"
                : "bg-white/10 text-slate-400"
          }`}
        >
          {state === "base" ? "Base" : state === "override" ? "Override" : "Inherited"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
        {menuResponsiveBadgeDescription(state, device)}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Port of the Pages `ResponsiveControlShell` idiom (module-private to
 * `PageEditor.tsx`, so ported — not imported — with menu-scoped data
 * attributes): wraps every device-forkable APPEARANCE control with a
 * Base/Override/Inherited badge plus an explicit Reset affordance on Mobile.
 * `override` MUST be computed from the BASE record
 * (`readMenuSectionOverrideValue` / the raw block responsive record), never
 * from resolved values — explicit Reset only, NO auto-remove-on-equality.
 * Content controls (brand/cta/utility) are deliberately NOT wrapped: the
 * badge's presence itself communicates "this control forks per device".
 */
function MenuResponsiveControlShell({
  device,
  override,
  label,
  onReset,
  children,
}: {
  device: PageBreakpoint;
  /** Computed from the BASE record by the caller, never from resolved values. */
  override: boolean;
  /** Control label used in the reset affordance accessible name + data hook. */
  label: string;
  onReset: () => void;
  children: ReactNode;
}) {
  const tone = useEditorControlTone();
  const state: MenuResponsiveBadgeState = !isMenuOverrideDevice(device)
    ? "base"
    : override
      ? "override"
      : "inherited";
  return (
    <div className="grid min-w-0 gap-1" data-menu-responsive-field={state}>
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <MenuResponsiveStateBadge state={state} device={device} />
        {state === "override" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Reset ${label} to inherited`}
                data-menu-responsive-reset={label}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors ${editorGhostButtonClassFor(
                  tone
                )} ${editorControlFocusClassFor(tone)}`}
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              {`Remove the ${DEVICE_LABELS[device].toLowerCase()} override and inherit the desktop value.`}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

/** Same predicate as `siteShell` (`href !== "#"` / non-empty). */
const previewHasRealHref = (href: string) => href.trim().length > 0 && href.trim() !== "#";

/**
 * TASK-502-04 §8: recursive canvas nav item mirroring the 502-03 FRONT hover
 * markup EXACTLY (`li.site-nav-item[data-site-nav-group]` + link / group-label
 * span + nested `ul.site-nav-sublist`) — grandchildren are NEVER dropped. The
 * 502-02 doc-scoped preview CSS owns reachability (hover/focus-within open +
 * fly-out); this only guarantees the recursive markup exists. `tabIndex={0}` on
 * the linkless group label is NORMATIVE so :focus-within can open its sublist.
 */
const renderPreviewNavItem = (item: NavigationItem, key: string): ReactNode => {
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

function NavItemsPreview({ items, label }: { items: NavigationItem[]; label: string }) {
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
const CANVAS_LEAF_TO_PAGE_TYPE = { "cta-button": "button", divider: "divider" } as const;
const canvasMenuLeafToPageBlock = (block: MenuBlockV2): PageBlockV2 =>
  ({
    id: block.id,
    type: CANVAS_LEAF_TO_PAGE_TYPE[block.type as keyof typeof CANVAS_LEAF_TO_PAGE_TYPE],
    props: block.props,
    style: "style" in block ? block.style : undefined,
    visibility: { visible: true },
  }) as PageBlockV2;

function MenuBlockPreview({
  block,
  items,
  navLabel,
  siteName,
}: {
  block: MenuBlockV2;
  items: NavigationItem[];
  navLabel: string;
  siteName: string | null;
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
      return (
        <a
          className="site-header-brand"
          href={href}
          onClick={(event) => event.preventDefault()}
          data-menu-block-id={block.id}
        >
          {block.props.mode === "image" && resolvedSrc ? (
            <img src={resolvedSrc} alt={String(block.props.image?.alt ?? "")} />
          ) : (
            text
          )}
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

function MenuDocumentCanvas({
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
  const blocks = doc.sections[0]?.blocks ?? [];
  return (
    <div
      className="site-header"
      data-menu-document-canvas="true"
      {...{ [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
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
                items={items}
                navLabel={navLabel}
                siteName={siteName}
              />
            </SelectableBlock>
          ))
        )}
      </div>
    </div>
  );
}

// --- control panels ---------------------------------------------------------

type UpdateDoc = (updater: (doc: MenuDocumentV2) => MenuDocumentV2) => void;

/**
 * Device-forked layout writer (TASK-501-03): Desktop/Tablet write the base
 * `section.layout`; Mobile writes the SPARSE `responsive.mobile.layout`
 * override. `patchMenuSectionForDevice` honors `undefined` ⇒
 * delete-key-from-target on BOTH device paths (base-key delete on
 * desktop/tablet; override-leaf delete + prune chain on mobile — never an own
 * `undefined` key), matching the previous flat delete-on-undefined semantics.
 */
const setLayoutField =
  (updateDoc: UpdateDoc, device: PageBreakpoint) =>
  <K extends keyof MenuBarLayout>(field: K, value: MenuBarLayout[K] | undefined) => {
    updateDoc((doc) => {
      const section = doc.sections[0];
      if (!section) return doc;
      return patchMenuSectionForDevice(doc, section.id, device, "layout", {
        [field]: value,
      } as MenuBarLayout);
    });
  };

const patchBlock =
  (updateDoc: UpdateDoc) => (id: string, updater: (block: MenuBlockV2) => MenuBlockV2) => {
    updateDoc((doc) => ({
      ...doc,
      sections: doc.sections.map((section, index) =>
        index === 0
          ? { ...section, blocks: section.blocks.map((b) => (b.id === id ? updater(b) : b)) }
          : section
      ),
    }));
  };

function MenuBarPanel({
  doc,
  device,
  palette,
  updateDoc,
  onSelectBlock,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
}: {
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  /** Site-resolved swatch palette so preset swatches preview their REAL colors. */
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
  onSelectBlock: (id: string) => void;
  onAddBlock: (type: MenuBlockType) => void;
  onRemoveBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: "up" | "down") => void;
}) {
  const section = doc.sections[0];
  // Panels DISPLAY resolved values (base merged with the device override)…
  const layout: MenuBarLayout = section
    ? resolveMenuSectionAppearanceForDevice(section, device).layout
    : {};
  const blocks = section?.blocks ?? [];
  const setField = setLayoutField(updateDoc, device);
  const setColor = (field: "surfaceColor" | "borderColor") => (value: string | null) =>
    setField(field, value === null ? "transparent" : value);
  // …while override DETECTION reads the raw BASE record for the CURRENT override
  // breakpoint (tablet OR mobile) — never the resolved merge, never desktop.
  const layoutOverride = (key: keyof MenuBarLayout) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuSectionOverrideValue(section, device, "layout", key) !== undefined;
  const resetLayout = (key: keyof MenuBarLayout) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuSectionOverride(current, target.id, device, "layout", key)
        : current;
    });

  return (
    <div className="flex flex-col gap-4" data-menu-bar-panel="true">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Menu bar
        </p>
        <div className="grid gap-3">
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("surfaceColor")}
            label="Surface color"
            onReset={resetLayout("surfaceColor")}
          >
            <ColorSwatchControl
              label="Surface color"
              palette={palette}
              value={toSwatchValue(layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)}
              onChange={setColor("surfaceColor")}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("borderColor")}
            label="Border color"
            onReset={resetLayout("borderColor")}
          >
            <ColorSwatchControl
              label="Border color"
              palette={palette}
              value={toSwatchValue(layout.borderColor ?? SHELL_APPEARANCE_DEFAULTS.borderColor)}
              onChange={setColor("borderColor")}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("alignment")}
            label="Alignment"
            onReset={resetLayout("alignment")}
          >
            <SegmentedControl
              label="Alignment"
              value={layout.alignment ?? SHELL_APPEARANCE_DEFAULTS.alignment}
              options={menuAppearanceAlignments}
              optionLabels={alignmentLabels}
              onChange={(next) => setField("alignment", next as MenuBarLayout["alignment"])}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("paddingX")}
            label="Horizontal padding"
            onReset={resetLayout("paddingX")}
          >
            <SliderControl
              label="Horizontal padding"
              value={layout.paddingX ?? SHELL_APPEARANCE_DEFAULTS.paddingX}
              min={menuAppearanceNumberRanges.paddingX.min}
              max={menuAppearanceNumberRanges.paddingX.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingX", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("paddingY")}
            label="Vertical padding"
            onReset={resetLayout("paddingY")}
          >
            <SliderControl
              label="Vertical padding"
              value={layout.paddingY ?? SHELL_APPEARANCE_DEFAULTS.paddingY}
              min={menuAppearanceNumberRanges.paddingY.min}
              max={menuAppearanceNumberRanges.paddingY.max}
              step={1}
              unit="px"
              onChange={(next) => setField("paddingY", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("borderWidth")}
            label="Border width"
            onReset={resetLayout("borderWidth")}
          >
            <SliderControl
              label="Border width"
              value={layout.borderWidth ?? SHELL_APPEARANCE_DEFAULTS.borderWidth}
              min={menuAppearanceNumberRanges.borderWidth.min}
              max={menuAppearanceNumberRanges.borderWidth.max}
              step={1}
              unit="px"
              onChange={(next) => setField("borderWidth", next)}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("shadow")}
            label="Shadow"
            onReset={resetLayout("shadow")}
          >
            <SegmentedControl
              label="Shadow"
              value={layout.shadow ?? SHELL_APPEARANCE_DEFAULTS.shadow}
              options={menuAppearanceShadows}
              optionLabels={shadowLabels}
              onChange={(next) => setField("shadow", next as MenuBarLayout["shadow"])}
            />
          </MenuResponsiveControlShell>
          <MenuResponsiveControlShell
            device={device}
            override={layoutOverride("sticky")}
            label="Sticky header"
            onReset={resetLayout("sticky")}
          >
            <ToggleSwitch
              label="Sticky header"
              value={layout.sticky ?? SHELL_APPEARANCE_DEFAULTS.sticky}
              onChange={(next) => setField("sticky", next)}
            />
          </MenuResponsiveControlShell>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add block
        </p>
        <div className="flex flex-wrap gap-1.5" data-menu-add-block-rail="true">
          {ADD_BLOCK_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              data-menu-add-block={type}
              onClick={() => onAddBlock(type)}
            >
              <Plus className="h-3.5 w-3.5" />
              {MENU_BLOCK_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Blocks
        </p>
        <ul className="flex flex-col gap-1" data-menu-blocks-list="true">
          {blocks.map((block, index) => (
            <li
              key={block.id}
              className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1.5"
              data-menu-block-row={block.id}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => onSelectBlock(block.id)}
              >
                {MENU_BLOCK_LABELS[block.type]}
              </button>
              {resolveMenuBlockVisibleForDevice(block, device) === false ? (
                // Discoverability: a CSS-hidden canvas block stays reachable
                // here — pure render derivation from doc + device (no state).
                <EyeOff
                  role="img"
                  aria-label={`Hidden on ${DEVICE_LABELS[device]}`}
                  data-menu-block-hidden={block.id}
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${MENU_BLOCK_LABELS[block.type]} up`}
                disabled={index === 0}
                onClick={() => onMoveBlock(block.id, "up")}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${MENU_BLOCK_LABELS[block.type]} down`}
                disabled={index === blocks.length - 1}
                onClick={() => onMoveBlock(block.id, "down")}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${MENU_BLOCK_LABELS[block.type]}`}
                onClick={() => onRemoveBlock(block.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- TASK-504-04 brand + per-level control sets ------------------------------

/**
 * Level-inheritance badge (orthogonal to the device Base/Override/Inherited
 * badge): does THIS level explicitly set the field, or does it inherit level
 * N-1 via the pure CSS cascade (504-02 emits level 0 → 1 → 2, each only its own
 * overrides)? Reuses the `MenuResponsiveStateBadge` pill chrome.
 */
function NavLevelInheritBadge({
  level,
  overridden,
}: {
  level: NavLevelStyleLevel;
  overridden: boolean;
}) {
  const tone = useEditorControlTone();
  const isLight = tone === "light";
  return (
    <span
      data-menu-level-field={overridden ? "override" : "inherited"}
      className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        overridden
          ? isLight
            ? editorPanelOptionActiveClass
            : "bg-sky-400/20 text-sky-200"
          : isLight
            ? "bg-muted text-muted-foreground"
            : "bg-white/10 text-slate-400"
      }`}
    >
      {overridden ? "This level" : `Inherits level ${level - 1}`}
    </span>
  );
}

/**
 * Brand logo picker (defect B1): resolves the picked library asset id to its
 * URL and stores it as `brand.props.image.src` — the SAME `{src}`-resolvable
 * shape `resolveBrandImageSrc` (front + canvas) reads. Mirrors the Pages
 * `ToolbarMediaUrlField`: the stored contract is a URL, never a bare asset id
 * (a bare id never resolves to a `src`, so the logo would never render). The
 * media-list load is a data-fetch effect (NOT setState-from-props), matching the
 * existing item-load effect + the Pages pattern.
 */
function BrandLogoPicker({ block, updateDoc }: { block: MenuBlockV2; updateDoc: UpdateDoc }) {
  const patch = patchBlock(updateDoc);
  const currentSrc =
    block.type === "brand" && typeof block.props.image?.src === "string"
      ? block.props.image.src
      : "";
  const [assets, setAssets] = useState<readonly MediaRecord[] | null>(() => getCachedMedia());
  const requestRef = useRef(0);
  const selectedAssetId = currentSrc
    ? (assets?.find((asset) => asset.url === currentSrc)?.id ?? null)
    : null;

  useEffect(() => {
    if (!currentSrc || assets) return;
    let active = true;
    listMediaCached()
      .then((items) => {
        if (active) setAssets(items);
      })
      .catch(() => {
        // The picker dialog owns media load errors; the stored value is kept.
      });
    return () => {
      active = false;
    };
  }, [assets, currentSrc]);

  const writeSrc = (url: string | null) =>
    patch(block.id, (current) => {
      if (current.type !== "brand") return current;
      if (!url) {
        const { image: _removed, ...rest } = current.props;
        return { ...current, props: rest };
      }
      return {
        ...current,
        props: { ...current.props, image: { ...(current.props.image ?? {}), src: url } },
      };
    });

  const handlePickerChange = (next: unknown) => {
    if (typeof next !== "string" || next.length === 0) {
      writeSrc(null);
      return;
    }
    requestRef.current += 1;
    const requestId = requestRef.current;
    void listMediaCached()
      .then((items) => {
        if (requestId !== requestRef.current) return;
        setAssets(items);
        const match = items.find((item) => item.id === next);
        if (match) writeSrc(match.url);
      })
      .catch(() => {
        // Resolution failed: never write an asset id into the src URL path.
      });
  };

  return (
    <MediaPickerControl
      label="Logo image"
      accept={["image/*"]}
      value={selectedAssetId}
      onChange={handlePickerChange}
    />
  );
}

/**
 * Brand style controls, mode-gated + device-forked (§3). Text mode ⇒ font size /
 * weight / color / transform / letter-spacing; image mode ⇒ height / max-width.
 * Every control is wrapped by `MenuResponsiveControlShell` (device Base/Override/
 * Inherited badge + per-breakpoint Reset). Values are RESOLVED for display; the
 * override badge reads the RAW responsive record. A control at its default omits
 * the key (sparse — legacy byte-identity), so a "Theme" font weight DELETES it.
 */
function BrandStyleControls({
  block,
  device,
  palette,
  updateDoc,
}: {
  block: MenuBlockV2;
  device: PageBreakpoint;
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
}) {
  if (block.type !== "brand") return null;
  const brandStyle = resolveMenuBrandStyleForDevice(block, device);
  const brandOverride = (key: keyof BrandStyle) =>
    isMenuOverrideDevice(device) &&
    readMenuBrandStyleOverrideValue(block, device, key) !== undefined;
  const setBrand = <K extends keyof BrandStyle>(key: K, value: BrandStyle[K] | undefined) =>
    updateDoc((current) =>
      patchMenuBrandStyleForDevice(current, block.id, device, {
        [key]: value,
      } as Partial<BrandStyle>)
    );
  const resetBrand = (key: keyof BrandStyle) => () =>
    updateDoc((current) =>
      isMenuOverrideDevice(device)
        ? clearMenuBrandStyleOverride(current, block.id, device, key)
        : current
    );
  const brandStyleControl = (key: keyof BrandStyle, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={brandOverride(key)}
      label={label}
      onReset={resetBrand(key)}
    >
      {node}
    </MenuResponsiveControlShell>
  );

  return block.props.mode === "text" ? (
    <>
      {brandStyleControl(
        "fontSize",
        "Brand font size",
        <SliderControl
          label="Brand font size"
          value={brandStyle.fontSize ?? BRAND_STYLE_NUMBER_RANGES.fontSize.min}
          min={BRAND_STYLE_NUMBER_RANGES.fontSize.min}
          max={BRAND_STYLE_NUMBER_RANGES.fontSize.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("fontSize", next)}
        />
      )}
      {brandStyleControl(
        "fontWeight",
        "Brand font weight",
        <SegmentedControl
          label="Brand font weight"
          value={brandStyle.fontWeight ? String(brandStyle.fontWeight) : FONT_WEIGHT_INHERIT}
          options={fontWeightOptions}
          optionLabels={fontWeightLabels}
          onChange={(next) =>
            setBrand(
              "fontWeight",
              next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight)
            )
          }
        />
      )}
      {brandStyleControl(
        "color",
        "Brand color",
        <ColorSwatchControl
          label="Brand color"
          palette={palette}
          value={toSwatchValue(brandStyle.color ?? "inherit")}
          onChange={(value) => setBrand("color", value === null ? undefined : value)}
        />
      )}
      {brandStyleControl(
        "textTransform",
        "Brand text transform",
        <SegmentedControl
          label="Brand text transform"
          value={brandStyle.textTransform ?? "none"}
          options={menuAppearanceTextTransforms}
          optionLabels={textTransformLabels}
          onChange={(next) => setBrand("textTransform", next as BrandStyle["textTransform"])}
        />
      )}
      {brandStyleControl(
        "letterSpacing",
        "Letter spacing",
        <SliderControl
          label="Letter spacing"
          value={brandStyle.letterSpacing ?? 0}
          min={BRAND_STYLE_NUMBER_RANGES.letterSpacing.min}
          max={BRAND_STYLE_NUMBER_RANGES.letterSpacing.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("letterSpacing", next)}
        />
      )}
    </>
  ) : (
    <>
      {brandStyleControl(
        "height",
        "Logo height",
        <SliderControl
          label="Logo height"
          value={brandStyle.height ?? BRAND_STYLE_NUMBER_RANGES.height.min}
          min={BRAND_STYLE_NUMBER_RANGES.height.min}
          max={BRAND_STYLE_NUMBER_RANGES.height.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("height", next)}
        />
      )}
      {brandStyleControl(
        "maxWidth",
        "Logo max width",
        <SliderControl
          label="Logo max width"
          value={brandStyle.maxWidth ?? BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
          min={BRAND_STYLE_NUMBER_RANGES.maxWidth.min}
          max={BRAND_STYLE_NUMBER_RANGES.maxWidth.max}
          step={1}
          unit="px"
          onChange={(next) => setBrand("maxWidth", next)}
        />
      )}
    </>
  );
}

/**
 * Per-level nav control set (§4), bound to `levelStyles[level]` (level 1/2 only;
 * level 0 stays the existing nav base). Writes ride the dedicated 504-01 nested
 * per-device helpers (desktop ⇒ props.levelStyles; tablet/mobile ⇒ the sparse
 * `responsive[bp].navProps.levelStyles`). Two badge axes: the device axis
 * (`MenuResponsiveControlShell`) + the level axis (`NavLevelInheritBadge`).
 * Inheritance is pure CSS cascade — NO runtime merge here; each control writes
 * ONLY its own level's field.
 */
function NavLevelControls({
  section,
  device,
  level,
  palette,
  updateDoc,
}: {
  section: MenuSectionV2 | undefined;
  device: PageBreakpoint;
  level: NavLevelStyleLevel;
  palette: readonly PageEditorColorSwatch[];
  updateDoc: UpdateDoc;
}) {
  const levelStyle: NavLevelStyle = section ? resolveMenuNavLevelStyle(section, device, level) : {};
  const levelOverride = (key: keyof NavLevelStyle) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuNavLevelStyleOverrideValue(section, device, level, key) !== undefined;
  const setLevel = <K extends keyof NavLevelStyle>(key: K, value: NavLevelStyle[K] | undefined) =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target
        ? patchMenuNavLevelStyleForDevice(current, target.id, device, level, {
            [key]: value,
          } as Partial<NavLevelStyle>)
        : current;
    });
  const resetLevel = (key: keyof NavLevelStyle) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuNavLevelStyleOverride(current, target.id, device, level, key)
        : current;
    });
  const levelControl = (key: keyof NavLevelStyle, label: string, node: ReactNode) => (
    <MenuResponsiveControlShell
      device={device}
      override={levelOverride(key)}
      label={label}
      onReset={resetLevel(key)}
    >
      <div className="grid gap-1">
        {node}
        <NavLevelInheritBadge level={level} overridden={levelStyle[key] !== undefined} />
      </div>
    </MenuResponsiveControlShell>
  );
  const swatch = (key: keyof NavLevelStyle, label: string) => (
    <ColorSwatchControl
      label={label}
      palette={palette}
      value={toSwatchValue((levelStyle[key] as string | undefined) ?? "inherit")}
      onChange={(value) => setLevel(key, value === null ? undefined : (value as never))}
    />
  );
  const slider = (key: keyof typeof NAV_LEVEL_NUMBER_RANGES, label: string) => (
    <SliderControl
      label={label}
      value={(levelStyle[key] as number | undefined) ?? NAV_LEVEL_NUMBER_RANGES[key].min}
      min={NAV_LEVEL_NUMBER_RANGES[key].min}
      max={NAV_LEVEL_NUMBER_RANGES[key].max}
      step={1}
      unit="px"
      onChange={(next) => setLevel(key, next as never)}
    />
  );
  return (
    <>
      {levelControl("linkColor", "Link color", swatch("linkColor", "Link color"))}
      {levelControl(
        "linkHoverColor",
        "Hover background",
        swatch("linkHoverColor", "Hover background")
      )}
      {levelControl("linkHoverTextColor", "Hover text", swatch("linkHoverTextColor", "Hover text"))}
      {levelControl(
        "linkActiveColor",
        "Active background",
        swatch("linkActiveColor", "Active background")
      )}
      {levelControl("fontSize", "Font size", slider("fontSize", "Font size"))}
      {levelControl(
        "fontWeight",
        "Font weight",
        <SegmentedControl
          label="Font weight"
          value={levelStyle.fontWeight ? String(levelStyle.fontWeight) : FONT_WEIGHT_INHERIT}
          options={fontWeightOptions}
          optionLabels={fontWeightLabels}
          onChange={(next) =>
            setLevel(
              "fontWeight",
              next === FONT_WEIGHT_INHERIT ? undefined : (Number(next) as MenuAppearanceFontWeight)
            )
          }
        />
      )}
      {levelControl("gap", "Item gap", slider("gap", "Item gap"))}
      {levelControl("paddingX", "Link padding X", slider("paddingX", "Link padding X"))}
      {levelControl("paddingY", "Link padding Y", slider("paddingY", "Link padding Y"))}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dropdown container
      </p>
      {levelControl(
        "background",
        "Container background",
        swatch("background", "Container background")
      )}
      {levelControl("borderColor", "Border color", swatch("borderColor", "Border color"))}
      {levelControl("borderWidth", "Border width", slider("borderWidth", "Border width"))}
      {levelControl("radius", "Corner radius", slider("radius", "Corner radius"))}
      {levelControl(
        "shadow",
        "Shadow",
        <SegmentedControl
          label="Shadow"
          value={levelStyle.shadow ?? "none"}
          options={menuAppearanceShadows}
          optionLabels={shadowLabels}
          onChange={(next) => setLevel("shadow", next as NavLevelStyle["shadow"])}
        />
      )}
      {levelControl("minWidth", "Min width", slider("minWidth", "Min width"))}
    </>
  );
}

function MenuBlockPanel({
  block,
  doc,
  device,
  palette,
  siteName,
  updateDoc,
  onRemove,
  onMove,
  navLevel,
  onNavLevelChange,
}: {
  block: MenuBlockV2;
  doc: MenuDocumentV2;
  device: PageBreakpoint;
  /** Site-resolved swatch palette so preset swatches preview their REAL colors. */
  palette: readonly PageEditorColorSwatch[];
  /** Site name for the brand-text placeholder (the default the front renders). */
  siteName: string | null;
  updateDoc: UpdateDoc;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
  /** TASK-504-04 §4: the selected nesting level (0 = nav base; 1/2 = levelStyles).
   * Owned by the top-level component so the canvas force-open stays in sync. */
  navLevel: 0 | 1 | 2;
  onNavLevelChange: (level: 0 | 1 | 2) => void;
}) {
  // patchBlock stays FLAT and device-invariant: content writes (brand/cta/
  // utility label/href/variant/logo/size/target) are NOT device-forked.
  const patch = patchBlock(updateDoc);

  const section = doc.sections[0];
  // Resolved nav appearance for DISPLAY (base merged with the device override;
  // base navProps = the FIRST nav-items block's props, mirroring the CSS
  // pipeline's collectMenuAppearance binding).
  const navProps: NavItemsProps = section
    ? resolveMenuSectionAppearanceForDevice(section, device).navProps
    : {};
  // Override detection reads the raw BASE record for the CURRENT override
  // breakpoint (tablet OR mobile), never the resolved merge, never desktop.
  // TASK-504-01: `NavItemsProps` widened with the non-appearance `levelStyles`
  // member, so its keyof no longer ⊆ `keyof MenuAppearance`. These closures only
  // ever handle FLAT scalar overrides (levelStyles rides the dedicated 504-01
  // nav-level helpers), so they are annotated `keyof MenuAppearance` directly.
  const navOverride = (key: keyof MenuAppearance) =>
    section !== undefined &&
    isMenuOverrideDevice(device) &&
    readMenuSectionOverrideValue(section, device, "navProps", key) !== undefined;
  const resetNav = (key: keyof MenuAppearance) => () =>
    updateDoc((current) => {
      const target = current.sections[0];
      return target && isMenuOverrideDevice(device)
        ? clearMenuSectionOverride(current, target.id, device, "navProps", key)
        : current;
    });
  /**
   * Device-forked nav appearance writer: Desktop ⇒ the FIRST nav-items block's
   * base props; tablet/mobile ⇒ sparse `responsive.{device}.navProps`.
   * NORMATIVE (501-01 §3): `patchMenuSectionForDevice` targets the FIRST
   * nav-items block regardless of which nav-items block is selected — the
   * section-level override record can only represent one nav-items block.
   * `undefined` ⇒ delete-key-from-target on every device path (the sole
   * emitter today is fontWeight "Theme").
   */
  const setNavField = <K extends keyof NavItemsProps>(
    field: K,
    value: NavItemsProps[K] | undefined
  ) =>
    updateDoc((current) => {
      const target = current.sections[0];
      if (!target) return current;
      return patchMenuSectionForDevice(current, target.id, device, "navProps", {
        [field]: value,
      } as NavItemsProps);
    });

  /**
   * BASE-writing sibling of setNavField for the DEVICE-DEFINING nav props
   * (`MENU_NAV_DEVICE_DEFINING_KEYS` in menuDocumentV2 — mobileMode +
   * dropdownDirection). These are NOT overridable: they always write the BASE
   * (device literal "desktop") regardless of the current device, so no dead
   * override record is ever stored (the 501 residual this kills). 502-01's
   * write-reject + stored-read migration guarantee `resolved ≡ base` here.
   */
  const setNavBaseField = <K extends keyof NavItemsProps>(field: K, value: NavItemsProps[K]) =>
    updateDoc((current) => {
      const target = current.sections[0];
      if (!target) return current;
      return patchMenuSectionForDevice(current, target.id, "desktop", "navProps", {
        [field]: value,
      } as NavItemsProps);
    });

  const visibleOnDevice = resolveMenuBlockVisibleForDevice(block, device);
  const visibilityOverride =
    isMenuOverrideDevice(device) && block.responsive?.[device]?.visibility !== undefined;
  const deviceLabelLower = DEVICE_LABELS[device].toLowerCase();

  return (
    <div className="flex flex-col gap-4" data-menu-block-panel={block.type}>
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {MENU_BLOCK_LABELS[block.type]}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block up"
          onClick={() => onMove("up")}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move block down"
          onClick={() => onMove("down")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove block"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isMenuOverrideDevice(device) ? (
        // Tablet AND Mobile: EVERY block type gets a per-device visibility
        // override toggle (writes the sparse block responsive record).
        <MenuResponsiveControlShell
          device={device}
          override={visibilityOverride}
          label={`Visible on ${deviceLabelLower}`}
          onReset={() =>
            updateDoc((current) => clearMenuBlockVisibilityOverride(current, block.id, device))
          }
        >
          <ToggleSwitch
            label={`Visible on ${deviceLabelLower}`}
            value={visibleOnDevice}
            onChange={(next) =>
              updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
            }
          />
        </MenuResponsiveControlShell>
      ) : block.type === "cta-button" || block.type === "divider" || block.type === "spacer" ? (
        // Desktop only: LEAF blocks get the FLAT visibility toggle (native blocks
        // carry no flat visibility slot by schema). The inlined three-type check
        // mirrors the module-private MENU_LEAF_BLOCK_TYPES; a vitest divergence
        // guard pins the lists against schema drift. Composable with a device
        // override: flat visible:false + tablet/mobile override true =
        // "show only on tablet/mobile".
        <ToggleSwitch
          label="Visible"
          value={block.visibility?.visible ?? true}
          onChange={(next) =>
            updateDoc((current) => setMenuBlockVisibleForDevice(current, block.id, device, next))
          }
        />
      ) : null}

      {block.type === "nav-items" ? (
        <div className="grid gap-3">
          <SegmentedControl
            label="Nesting level"
            value={String(navLevel)}
            options={["0", "1", "2"]}
            optionLabels={{ "0": "Level 0", "1": "Level 1", "2": "Level 2+" }}
            onChange={(next) => onNavLevelChange(Number(next) as 0 | 1 | 2)}
          />
          {navLevel === 0 ? (
            <>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("orientation")}
                label="Orientation"
                onReset={resetNav("orientation")}
              >
                <SegmentedControl
                  label="Orientation"
                  value={navProps.orientation ?? "horizontal"}
                  options={menuAppearanceOrientations}
                  optionLabels={orientationLabels}
                  onChange={(next) =>
                    setNavField("orientation", next as NavItemsProps["orientation"])
                  }
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("itemGap")}
                label="Item gap"
                onReset={resetNav("itemGap")}
              >
                <SliderControl
                  label="Item gap"
                  value={navProps.itemGap ?? SHELL_APPEARANCE_DEFAULTS.itemGap}
                  min={menuAppearanceNumberRanges.itemGap.min}
                  max={menuAppearanceNumberRanges.itemGap.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("itemGap", next)}
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("fontSize")}
                label="Font size"
                onReset={resetNav("fontSize")}
              >
                <div className="grid gap-1">
                  <SliderControl
                    label="Font size"
                    // TASK-504-04 §8 (defect B2): at the UNSET position show the TRUE
                    // inherited size (16, `font-size:inherit` resolution) — not the
                    // misleading explicit 15 — and flag it inherited below so unset
                    // reads distinctly from an explicit 16. DISPLAY-only: onChange
                    // still writes an explicit value; unset emits nothing.
                    value={navProps.fontSize ?? NAV_FONT_SIZE_INHERITED}
                    min={menuAppearanceNumberRanges.fontSize.min}
                    max={menuAppearanceNumberRanges.fontSize.max}
                    step={1}
                    unit="px"
                    onChange={(next) => setNavField("fontSize", next)}
                  />
                  {navProps.fontSize === undefined ? (
                    <span
                      data-menu-font-size-inherited="true"
                      className="text-[10px] font-medium text-muted-foreground"
                    >
                      Inherited from theme ({NAV_FONT_SIZE_INHERITED}px)
                    </span>
                  ) : null}
                </div>
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("fontWeight")}
                label="Font weight"
                onReset={resetNav("fontWeight")}
              >
                <SegmentedControl
                  label="Font weight"
                  value={navProps.fontWeight ? String(navProps.fontWeight) : FONT_WEIGHT_INHERIT}
                  options={fontWeightOptions}
                  optionLabels={fontWeightLabels}
                  onChange={(next) =>
                    setNavField(
                      "fontWeight",
                      next === FONT_WEIGHT_INHERIT
                        ? undefined
                        : (Number(next) as MenuAppearanceFontWeight)
                    )
                  }
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("textTransform")}
                label="Text transform"
                onReset={resetNav("textTransform")}
              >
                <SegmentedControl
                  label="Text transform"
                  value={navProps.textTransform ?? SHELL_APPEARANCE_DEFAULTS.textTransform}
                  options={menuAppearanceTextTransforms}
                  optionLabels={textTransformLabels}
                  onChange={(next) =>
                    setNavField("textTransform", next as MenuAppearance["textTransform"])
                  }
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkColor")}
                label="Link color"
                onReset={resetNav("linkColor")}
              >
                <ColorSwatchControl
                  label="Link color"
                  palette={palette}
                  value={toSwatchValue(navProps.linkColor ?? SHELL_APPEARANCE_DEFAULTS.linkColor)}
                  onChange={(value) =>
                    setNavField("linkColor", value === null ? "transparent" : value)
                  }
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkHoverColor")}
                label="Hover background"
                onReset={resetNav("linkHoverColor")}
              >
                {/* Copy fix (bug 4 secondary): the emission is a state-only
                background pill (menuDocumentCss linkHoverColor), NOT link color. */}
                <ColorSwatchControl
                  label="Hover background"
                  palette={palette}
                  value={toSwatchValue(
                    navProps.linkHoverColor ?? SHELL_APPEARANCE_DEFAULTS.linkHoverColor
                  )}
                  onChange={(value) =>
                    setNavField("linkHoverColor", value === null ? "transparent" : value)
                  }
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkActiveColor")}
                label="Active background"
                onReset={resetNav("linkActiveColor")}
              >
                <ColorSwatchControl
                  label="Active background"
                  palette={palette}
                  value={toSwatchValue(navProps.linkActiveColor ?? "transparent")}
                  onChange={(value) =>
                    setNavField("linkActiveColor", value === null ? "transparent" : value)
                  }
                />
              </MenuResponsiveControlShell>
              {/* TASK-504-04 §4b: hover TEXT color, distinct from the hover
              BACKGROUND control above (504-02 emits `.site-nav-link:hover{color}`).
              Present-only: `null` (default) OMITS `linkHoverTextColor`. */}
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkHoverTextColor")}
                label="Hover text"
                onReset={resetNav("linkHoverTextColor")}
              >
                <ColorSwatchControl
                  label="Hover text"
                  palette={palette}
                  value={toSwatchValue(navProps.linkHoverTextColor ?? "inherit")}
                  onChange={(value) =>
                    setNavField("linkHoverTextColor", value === null ? undefined : value)
                  }
                />
              </MenuResponsiveControlShell>
              {/* TASK-504-04 §5 cheap wins: per-link padding + radius (base scalars,
              present-only via the shared delta channel). */}
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkPaddingX")}
                label="Link padding X"
                onReset={resetNav("linkPaddingX")}
              >
                <SliderControl
                  label="Link padding X"
                  value={navProps.linkPaddingX ?? NAV_LINK_NUMBER_RANGES.paddingX.min}
                  min={NAV_LINK_NUMBER_RANGES.paddingX.min}
                  max={NAV_LINK_NUMBER_RANGES.paddingX.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkPaddingX", next)}
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkPaddingY")}
                label="Link padding Y"
                onReset={resetNav("linkPaddingY")}
              >
                <SliderControl
                  label="Link padding Y"
                  value={navProps.linkPaddingY ?? NAV_LINK_NUMBER_RANGES.paddingY.min}
                  min={NAV_LINK_NUMBER_RANGES.paddingY.min}
                  max={NAV_LINK_NUMBER_RANGES.paddingY.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkPaddingY", next)}
                />
              </MenuResponsiveControlShell>
              <MenuResponsiveControlShell
                device={device}
                override={navOverride("linkRadius")}
                label="Link radius"
                onReset={resetNav("linkRadius")}
              >
                <SliderControl
                  label="Link radius"
                  value={navProps.linkRadius ?? NAV_LINK_NUMBER_RANGES.radius.min}
                  min={NAV_LINK_NUMBER_RANGES.radius.min}
                  max={NAV_LINK_NUMBER_RANGES.radius.max}
                  step={1}
                  unit="px"
                  onChange={(next) => setNavField("linkRadius", next)}
                />
              </MenuResponsiveControlShell>
              {device !== "mobile" ? (
                // Device-DEFINING (base-writing, NOT overridable): dropdowns exist
                // only >=640px (sublists collapse inline on mobile), so a mobile
                // override would be dead data. Rendered on Desktop/Tablet only, NOT
                // wrapped in MenuResponsiveControlShell — no badge, no Reset.
                <SegmentedControl
                  label="Dropdown direction"
                  value={navProps.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
                  options={menuAppearanceDropdownDirections}
                  optionLabels={dropdownDirectionLabels}
                  onChange={(next) =>
                    setNavBaseField(
                      "dropdownDirection",
                      next as MenuAppearance["dropdownDirection"]
                    )
                  }
                />
              ) : null}
              {device === "mobile" ? (
                // Device-DEFINING (base-writing): mobileMode chooses how the mobile
                // viewport behaves — it IS the mobile design, not an override of a
                // desktop value. Rendered on Mobile only; no badge, no Reset.
                <SegmentedControl
                  label="Mobile menu"
                  value={navProps.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
                  options={menuAppearanceMobileModes}
                  optionLabels={mobileModeLabels}
                  onChange={(next) =>
                    setNavBaseField("mobileMode", next as MenuAppearance["mobileMode"])
                  }
                />
              ) : null}
            </>
          ) : (
            <NavLevelControls
              section={section}
              device={device}
              level={navLevel}
              palette={palette}
              updateDoc={updateDoc}
            />
          )}
        </div>
      ) : null}

      {block.type === "brand" ? (
        <div className="grid gap-3">
          <SegmentedControl
            label="Mode"
            value={block.props.mode}
            options={["text", "image"]}
            optionLabels={{ text: "Text", image: "Image" }}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "brand"
                  ? { ...current, props: { ...current.props, mode: next as "text" | "image" } }
                  : current
              )
            }
          />
          {block.props.mode === "text" ? (
            // Sparse per-menu override of the site name. Raw keystrokes are
            // written as-is (no per-keystroke trim — it would eat mid-word
            // spaces); the 502-01 normalizer trims + caps on save. maxLength is
            // pinned to the same imported constant (never a magic literal).
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Brand text</span>
              <Input
                aria-label="Brand text"
                maxLength={MENU_BRAND_TEXT_MAX_LENGTH}
                placeholder={siteName ?? "Site name (default)"}
                value={typeof block.props.text === "string" ? block.props.text : ""}
                onChange={(event) =>
                  patch(block.id, (current) => {
                    if (current.type !== "brand") return current;
                    const value = event.target.value;
                    if (value.length === 0) {
                      // sparse contract: empty DELETES the prop (canvas + front
                      // fall back to the site name; the doc round-trips textless).
                      const { text: _removed, ...rest } = current.props;
                      return { ...current, props: rest };
                    }
                    return { ...current, props: { ...current.props, text: value } };
                  })
                }
              />
            </label>
          ) : null}
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Link</span>
            <Input
              aria-label="Brand link"
              value={block.props.href}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "brand"
                    ? { ...current, props: { ...current.props, href: event.target.value } }
                    : current
                )
              }
            />
          </label>
          {block.props.mode === "image" ? (
            // TASK-504-04 §7 (defect B1): resolve the picked asset to its URL and
            // store `image.src` — the shape `resolveBrandImageSrc` reads (a bare
            // `assetId` never resolved, so the logo never rendered).
            <BrandLogoPicker block={block} updateDoc={updateDoc} />
          ) : null}
          {/* TASK-504-04 §3: mode-gated brand style controls (device-forked). */}
          <BrandStyleControls
            block={block}
            device={device}
            palette={palette}
            updateDoc={updateDoc}
          />
        </div>
      ) : null}

      {block.type === "cta-button" ? (
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Label</span>
            <Input
              aria-label="Button label"
              value={typeof block.props.label === "string" ? block.props.label : ""}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "cta-button"
                    ? { ...current, props: { ...current.props, label: event.target.value } }
                    : current
                )
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-muted-foreground">Link</span>
            <Input
              aria-label="Button link"
              value={typeof block.props.href === "string" ? block.props.href : ""}
              onChange={(event) =>
                patch(block.id, (current) =>
                  current.type === "cta-button"
                    ? { ...current, props: { ...current.props, href: event.target.value } }
                    : current
                )
              }
            />
          </label>
          <SegmentedControl
            label="Variant"
            value={typeof block.props.variant === "string" ? block.props.variant : "primary"}
            options={pageButtonVariants}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? { ...current, props: { ...current.props, variant: next } }
                  : current
              )
            }
          />
          {/* size + target are already validated by the page button pipeline
              (pageDocumentV2 button allow-list) — no schema work. */}
          <SegmentedControl
            label="Size"
            value={typeof block.props.size === "string" ? block.props.size : "md"}
            options={pageButtonSizes}
            optionLabels={{ sm: "Small", md: "Medium", lg: "Large" }}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? { ...current, props: { ...current.props, size: next } }
                  : current
              )
            }
          />
          <ToggleSwitch
            label="Open in new tab"
            value={block.props.target === "blank"}
            onChange={(next) =>
              patch(block.id, (current) =>
                current.type === "cta-button"
                  ? {
                      ...current,
                      props: {
                        ...current.props,
                        target: (next ? "blank" : "self") as (typeof pageButtonTargets)[number],
                      },
                    }
                  : current
              )
            }
          />
        </div>
      ) : null}

      {block.type === "divider" ? (
        <p className="text-xs text-muted-foreground">
          Renders as a vertical separator line in the menu bar. Use reorder/remove above.
        </p>
      ) : null}
      {block.type === "spacer" ? (
        <p className="text-xs text-muted-foreground">
          This block has no editable options; use reorder/remove above.
        </p>
      ) : null}
    </div>
  );
}

// --- editor -----------------------------------------------------------------

const resolveErrorMessage = (error: unknown, fallback: string) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export function MenuDesignEditor({ menuId }: { menuId: string }) {
  const { navigate } = useAdminRouter();
  const initial = useMemo(() => getCachedMenuDetail(menuId), [menuId]);
  const [history, dispatch] = useReducer(
    historyReducer,
    initial?.menu.settings,
    (settings): HistoryState => ({
      doc: seedMenuDocument(settings),
      past: [],
      future: [],
      dirty: false,
    })
  );
  const doc = history.doc;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<PageBreakpoint>("desktop");
  // TASK-504-04 §1: the nesting level being styled (0 = nav base; 1/2 =
  // levelStyles). Lives here (beside device/selectedId) so BOTH the panel (sets
  // it) and the canvas (force-open consumes it) stay in sync.
  const [navLevel, setNavLevel] = useState<0 | 1 | 2>(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [menuName, setMenuName] = useState(initial?.menu.name ?? "Menu design");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDoc = useCallback<UpdateDoc>((updater) => dispatch({ type: "update", updater }), []);

  // Canvas WYSIWYG (TASK-502-04): the SAME live site-token payload the Pages
  // canvas uses (shared hook). The seven-var map is painted inline on the canvas
  // frame ROOT so the doc CSS resolves the SITE theme (not the admin beige); the
  // palette makes preset swatches preview their REAL site colors; siteName feeds
  // the brand fallback chain (per-menu text → site name → placeholder).
  const siteTokens = useCanvasSiteTokens();
  const siteName = useCanvasSiteName();
  const canvasSiteTokenVariables = useMemo(
    () => toMenuCanvasColorCssVariableMap(siteTokens) as CSSProperties,
    [siteTokens]
  );
  const sitePalette = useMemo(() => getPageEditorColorPalette(siteTokens), [siteTokens]);

  // Load the published item tree (cache-first) + page slugs to BIND nav-items.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getMenuWithItemsCached(menuId), listPagesCached()])
      .then(([detail, pages]) => {
        if (cancelled || !detail) return;
        const pagePathById = new Map(pages.map((page) => [page.id, page.slug] as const));
        setMenuName(detail.menu.name);
        setItems(
          mapMenuNodesToNavigationItems(detail.items, pagePathById, {
            includeDefaultTarget: true,
          })
        );
        // Cold-cache authoritative seed: if the synchronous cache was empty at
        // mount, adopt the loaded document draft (guarded against clobbering a
        // draft the user already started).
        dispatch({ type: "hydrate", doc: seedMenuDocument(detail.menu.settings) });
      })
      .catch((loadError) => {
        if (!cancelled) setError(resolveErrorMessage(loadError, "Failed to load menu."));
      });
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  const selectedBlock = findMenuBlock(doc, selectedId);
  const navLabel = menuName;

  // TASK-504-04 §1: neutralize a stale level for a non-nav selection as a PURE
  // derivation (no setState-in-effect) — the raw `navLevel` persists so
  // re-selecting nav-items restores the author's last level. `forceOpenLevel`
  // sim-opens the canvas ONLY for a nav level >= 1.
  const navLevelActive: 0 | 1 | 2 = selectedBlock?.type === "nav-items" ? navLevel : 0;
  const forceOpenLevel: NavLevelStyleLevel | undefined =
    navLevelActive >= 1 ? (navLevelActive as NavLevelStyleLevel) : undefined;

  const addMenuBlock = (type: MenuBlockType) =>
    updateDoc((current) => insertMenuBlock(current, createDefaultMenuBlock(type)));
  const removeMenuBlock = (id: string) => {
    updateDoc((current) => deleteMenuBlock(current, id));
    setSelectedId((current) => (current === id ? null : current));
  };
  const moveMenuBlock = (id: string, dir: "up" | "down") =>
    updateDoc((current) => reorderMenuBlock(current, id, dir));

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateMenu(menuId, { document: doc });
      dispatch({ type: "markSaved" });
    } catch (saveError) {
      setError(resolveErrorMessage(saveError, "Failed to save menu design."));
    } finally {
      setIsSaving(false);
    }
  };

  const publish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      await updateMenu(menuId, { document: doc });
      await publishMenu(menuId);
      dispatch({ type: "markSaved" });
    } catch (publishError) {
      setError(resolveErrorMessage(publishError, "Failed to publish menu design."));
    } finally {
      setIsPublishing(false);
    }
  };

  const discard = () => {
    dispatch({ type: "reset", doc: seedMenuDocument(getCachedMenuDetail(menuId)?.menu.settings) });
    setSelectedId(null);
  };

  return (
    <EditorShell
      breadcrumbs={
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Menus</span>
          <span className="text-sm font-semibold">{menuName}</span>
        </div>
      }
      centerScroll={false}
      contentClassName="h-full"
    >
      <div className="relative flex h-full min-h-0 flex-col bg-background">
        <CanvasEditor
          header={
            <PageHeader
              className="mb-0 shrink-0 px-6 pb-3 pt-4"
              title={menuName}
              breadcrumbs={[
                { label: "Content" },
                { label: "Menus", href: "/menus" },
                { label: menuName },
                { label: "Design" },
              ]}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/menus/${menuId}`)}
                  >
                    Structure
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!history.dirty}
                    onClick={discard}
                  >
                    Discard
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void save()}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPublishing}
                    onClick={() => void publish()}
                  >
                    <Rocket className="h-4 w-4" />
                    {isPublishing ? "Publishing..." : "Publish"}
                  </Button>
                </>
              }
            />
          }
          title="Menu builder"
          badge={
            history.dirty ? (
              <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                Unsaved
              </Badge>
            ) : null
          }
          toolbar={
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                disabled={history.past.length === 0}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                disabled={history.future.length === 0}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <DeviceSwitcher value={device} onChange={setDevice} />
              <Button
                type="button"
                variant={panelOpen ? "soft" : "ghost"}
                size="sm"
                onClick={() => setPanelOpen((open) => !open)}
                aria-label={panelOpen ? "Hide panel" : "Show panel"}
                aria-pressed={panelOpen}
              >
                <PanelRight className="h-4 w-4" />
                {panelOpen ? "Hide panel" : "Show panel"}
              </Button>
            </>
          }
          deviceContext={{
            value: device,
            // Scope cue: Mobile edits write sparse overrides; Desktop/Tablet
            // edit the base (tablet deferred — base-mapped, TASK-501).
            label: isMenuOverrideDevice(device)
              ? `${DEVICE_LABELS[device]} (overrides)`
              : `${DEVICE_LABELS[device]} (base)`,
          }}
          panelOpen={panelOpen}
          onPanelOpenChange={setPanelOpen}
          panelPosition="right"
          panelAriaLabel="Menu design tools"
          panelDataProps={{ "data-menu-design-panel": "true" }}
          canvas={
            <div
              data-menu-design-canvas-scroller="true"
              className="min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"
              style={panelOpen ? { paddingRight: 300 } : undefined}
              onClick={() => setSelectedId(null)}
            >
              {error ? (
                <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div
                className="mx-auto min-h-full w-full max-w-4xl rounded-2xl bg-card p-4 shadow-soft"
                onClick={(event) => event.stopPropagation()}
              >
                <MenuDocumentCanvas
                  doc={doc}
                  device={device}
                  items={items}
                  navLabel={navLabel}
                  siteName={siteName}
                  tokenVariables={canvasSiteTokenVariables}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  forceOpenLevel={forceOpenLevel}
                />
              </div>
            </div>
          }
          panel={
            <EditorControlToneContext.Provider value="light">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {selectedBlock ? (
                  <MenuBlockPanel
                    block={selectedBlock}
                    doc={doc}
                    device={device}
                    palette={sitePalette}
                    siteName={siteName}
                    updateDoc={updateDoc}
                    onRemove={() => removeMenuBlock(selectedBlock.id)}
                    onMove={(dir) => moveMenuBlock(selectedBlock.id, dir)}
                    navLevel={navLevel}
                    onNavLevelChange={setNavLevel}
                  />
                ) : (
                  <MenuBarPanel
                    doc={doc}
                    device={device}
                    palette={sitePalette}
                    updateDoc={updateDoc}
                    onSelectBlock={setSelectedId}
                    onAddBlock={addMenuBlock}
                    onRemoveBlock={removeMenuBlock}
                    onMoveBlock={moveMenuBlock}
                  />
                )}
              </div>
            </EditorControlToneContext.Provider>
          }
          reopenAffordance={
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-xl border border-border bg-popover px-3 py-2 text-xs font-medium shadow-pop transition-colors hover:text-primary"
              aria-label="Show panel"
            >
              <SlidersHorizontal className="size-3.5" /> Show panel
            </button>
          }
        />
      </div>
    </EditorShell>
  );
}

export { seedMenuDocument };
