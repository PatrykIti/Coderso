import { createContext, useContext } from "react";

/**
 * Tone of the surface the editor control primitives render on.
 *
 * - `"dark"` — the legacy dark `bg-slate-950` bottom-center floating toolbar
 *   (the `menu` visual-designer host keeps this).
 * - `"light"` — the right-pinned `bg-popover` rail used by the page /
 *   page-template builder chrome (TASK-495-02).
 *
 * The tone is provided through context so the full registry-control pipeline
 * (`ToolbarSubpanel` → every leaf control) relights without threading a prop
 * through every intermediate wrapper. Each primitive may still accept an
 * explicit `tone` prop that overrides the context (used by the per-primitive
 * tests); the context default is `"dark"` so the menu branch and any bare
 * mount stay on the legacy dark tokens.
 */
export type EditorControlTone = "dark" | "light";

export const EditorControlToneContext = createContext<EditorControlTone>("dark");

/** Resolve the effective tone: an explicit prop wins, else the context. */
export const useEditorControlTone = (tone?: EditorControlTone): EditorControlTone => {
  const contextTone = useContext(EditorControlToneContext);
  return tone ?? contextTone;
};

/**
 * Shared Tailwind chrome for the page editor floating-toolbar control
 * primitives. The floating toolbar is a dark `bg-slate-950` surface, so these
 * tokens intentionally differ from the light admin form idiom.
 */
export const editorControlLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-slate-400";

export const editorControlValueClass = "text-xs font-semibold tabular-nums text-slate-100";

export const editorControlFocusClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-white/60";

/**
 * CTA chrome for `Button`s rendered on the dark toolbar surface ("Add block",
 * "Browse media"). The admin-theme outline/ghost variant variables assume a
 * light admin surface, so on `bg-slate-950` they render near-invisible and
 * invert to white-bg/black-text on hover. This override keeps the contract:
 * idle = visible subtle light fill, hover = slightly lighter fill, never the
 * inverted white-background jump.
 */
export const editorDarkButtonClass =
  "border border-white/20 bg-white/10 text-slate-100 shadow-none hover:bg-white/20 hover:text-white";

/**
 * Quiet/ghost chrome for secondary actions on the dark toolbar surface
 * ("Clear", selected-media remove). Mirrors the toolbar icon-button
 * idle/hover behavior instead of the admin-theme ghost hover inversion.
 */
export const editorDarkGhostButtonClass = "text-slate-200 hover:bg-white/10 hover:text-white";

/**
 * Canvas CTA chrome ("Add section", "Add the first block"). The editor canvas
 * frame is now an adaptive `bg-card` surface (TASK-495-03 P1a — the dark-mode
 * fix), so these CTAs use design tokens (`bg-card`/`border-border`/
 * `text-foreground`, hover `bg-muted`) that flip with the theme instead of the
 * hardcoded light literals that stayed bright-white on the dark frame.
 */
export const editorCanvasCtaButtonClass =
  "border border-border bg-card text-foreground shadow-sm hover:bg-muted hover:text-foreground";

/**
 * Canvas-only ghost "Add block" tiles (empty multi-column section cells, the
 * trailing next-free-cell tile, and columns-block slot tiles). Same fixed
 * light-surface palette as the canvas CTAs, but dashed and shadow-free so the
 * affordance reads as a placeholder cell, not a button. Never rendered on the
 * public front.
 */
export const editorCanvasGhostTileClass =
  "flex min-h-14 w-full items-center justify-center gap-1 rounded border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** Compact variant for trailing add affordances inside non-empty columns slots. */
export const editorCanvasGhostTileCompactClass =
  "flex h-8 w-full items-center justify-center gap-1 rounded border border-dashed border-border bg-background text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/**
 * Compact ghost "+" handle pinned to the right edge of the SELECTED canvas
 * block ("Add block beside", owner finding #7 round 3). Same dashed
 * light-surface ghost chrome as the add tiles, sized as a circular handle
 * that straddles the block border. Canvas-only, never on the public front.
 */
export const editorCanvasGhostBesideHandleClass =
  "absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-dashed border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground";

/* -------------------------------------------------------------------------- *
 * Light (`tone="light"`) siblings — TASK-495-02
 *
 * The page / page-template builder docks the SAME control surface into a light
 * `bg-popover` right rail. Every dark token above (slate-on-dark fills,
 * white/NN overlays, `ring-white/60`, `accent-white`) renders illegible /
 * invisible on that light surface, so each token KIND below has a light
 * sibling. The dark constants stay for the `menu` legacy branch.
 * -------------------------------------------------------------------------- */

// Buttons / text.
export const editorPanelButtonClass =
  "border border-border bg-muted text-foreground shadow-none hover:bg-muted/70";
export const editorPanelGhostButtonClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground";
export const editorPanelLabelClass =
  "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground";
export const editorPanelValueClass = "text-xs font-semibold tabular-nums text-foreground";

// Focus ring (replaces `editorControlFocusClass`'s `ring-white/60` on light).
export const editorPanelFocusClass = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Inputs / selects (ColorSwatch hex, ListItems/FacetList inputs + select,
// Combobox trigger + search).
export const editorPanelInputClass =
  "border border-border bg-background text-foreground placeholder:text-muted-foreground";
export const editorPanelSubInputClass =
  "border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground";
export const editorPanelSelectClass =
  "border border-border bg-background text-foreground [&>option]:bg-popover";

// Swatch borders (`border-white/15` → light).
export const editorPanelSwatchBorderClass = "border-border hover:border-foreground/40";

// Row container (FacetList / gradient stop `bg-white/5 border-white/10` → light).
export const editorPanelRowClass = "border border-border bg-muted/40";

// Segmented control (track / active / idle).
export const editorPanelSegmentTrackClass = "bg-muted";
export const editorPanelSegmentActiveClass = "bg-background text-foreground shadow-sm";
export const editorPanelSegmentIdleClass =
  "text-muted-foreground hover:bg-muted hover:text-foreground";

// Combobox dropdown surface + option states.
export const editorPanelDropdownClass = "border border-border bg-popover shadow-pop";
export const editorPanelOptionActiveClass = "bg-primary-soft text-primary-soft-foreground";
export const editorPanelOptionFocusClass = "bg-muted text-foreground";
export const editorPanelOptionIdleClass = "text-foreground hover:bg-muted hover:text-foreground";

// Toggle off-track (`bg-white/20` → light).
export const editorPanelToggleOffClass = "bg-muted-foreground/30";

// Slider range accent (`accent-white` → light).
export const editorPanelSliderAccentClass = "accent-primary";

/* Tone-aware getters used by the leaf primitives so each call site stays a
 * single expression instead of a scattered ternary. */
export const editorControlLabelClassFor = (tone: EditorControlTone): string =>
  tone === "light" ? editorPanelLabelClass : editorControlLabelClass;
export const editorControlValueClassFor = (tone: EditorControlTone): string =>
  tone === "light" ? editorPanelValueClass : editorControlValueClass;
export const editorControlFocusClassFor = (tone: EditorControlTone): string =>
  tone === "light" ? editorPanelFocusClass : editorControlFocusClass;
export const editorButtonClassFor = (tone: EditorControlTone): string =>
  tone === "light" ? editorPanelButtonClass : editorDarkButtonClass;
export const editorGhostButtonClassFor = (tone: EditorControlTone): string =>
  tone === "light" ? editorPanelGhostButtonClass : editorDarkGhostButtonClass;
