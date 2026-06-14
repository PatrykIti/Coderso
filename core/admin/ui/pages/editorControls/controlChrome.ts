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
 * frame is always a white, site-like surface, so these CTAs use explicit
 * neutral light-surface colors instead of admin-theme button variables that
 * can invert under dark admin themes.
 */
export const editorCanvasCtaButtonClass =
  "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-100 hover:text-slate-900";

/**
 * Canvas-only ghost "Add block" tiles (empty multi-column section cells, the
 * trailing next-free-cell tile, and columns-block slot tiles). Same fixed
 * light-surface palette as the canvas CTAs, but dashed and shadow-free so the
 * affordance reads as a placeholder cell, not a button. Never rendered on the
 * public front.
 */
export const editorCanvasGhostTileClass =
  "flex min-h-14 w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900";

/** Compact variant for trailing add affordances inside non-empty columns slots. */
export const editorCanvasGhostTileCompactClass =
  "flex h-8 w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 bg-white text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900";

/**
 * Compact ghost "+" handle pinned to the right edge of the SELECTED canvas
 * block ("Add block beside", owner finding #7 round 3). Same dashed
 * light-surface ghost chrome as the add tiles, sized as a circular handle
 * that straddles the block border. Canvas-only, never on the public front.
 */
export const editorCanvasGhostBesideHandleClass =
  "absolute right-0 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900";
