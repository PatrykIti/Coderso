import type { DesignTokens } from "../../services/theme/tokenTypes";
import type { AdminThemeTokens } from "../../services/adminThemes/tokenTypes";

export function toCssVariables(tokens: DesignTokens) {
  const entries = Object.entries(toCssVariableMap(tokens)).map(([key, value]) => `${key}:${value}`);
  return `:root{${entries.join(";")};}`;
}

/**
 * Emit the admin-theme `--admin-*` (+ `--font-*`/`--text-*`) variables as a CSS
 * block. The `selector` defaults to `:root` (the light block); pass `:root.dark`
 * to emit the parallel DARK block from the SAME injected style so the chrome —
 * which reads `--admin-*` directly — recolors in dark and wins source order over
 * `globals.css` (see TASK-479-05-L01 dark-mode decision).
 */
export function toAdminThemeCssVariables(tokens: AdminThemeTokens, selector: string = ":root") {
  const entries = [
    `--admin-base-bg:${tokens.base.bg}`,
    `--admin-base-surface:${tokens.base.surface}`,
    `--admin-base-text:${tokens.base.text}`,
    `--admin-base-border:${tokens.base.border}`,
    `--admin-button-primary-bg:${tokens.buttons.primary.bg}`,
    `--admin-button-primary-text:${tokens.buttons.primary.text}`,
    `--admin-button-primary-hover-bg:${tokens.buttons.primary.hoverBg}`,
    `--admin-button-primary-hover-text:${tokens.buttons.primary.hoverText}`,
    `--admin-button-secondary-bg:${tokens.buttons.secondary.bg}`,
    `--admin-button-secondary-text:${tokens.buttons.secondary.text}`,
    `--admin-button-secondary-hover-bg:${tokens.buttons.secondary.hoverBg}`,
    `--admin-button-secondary-hover-text:${tokens.buttons.secondary.hoverText}`,
    `--admin-button-outline-border:${tokens.buttons.outline.border}`,
    `--admin-button-outline-text:${tokens.buttons.outline.text}`,
    `--admin-button-outline-hover-bg:${tokens.buttons.outline.hoverBg}`,
    `--admin-button-outline-hover-text:${tokens.buttons.outline.hoverText}`,
    `--admin-button-ghost-hover-bg:${tokens.buttons.ghost.hoverBg}`,
    `--admin-button-ghost-hover-text:${tokens.buttons.ghost.hoverText}`,
    `--admin-primary-soft:${tokens.primarySoft.bg}`,
    `--admin-primary-soft-text:${tokens.primarySoft.text}`,
    `--admin-input-bg:${tokens.inputs.bg}`,
    `--admin-input-border:${tokens.inputs.border}`,
    `--admin-input-text:${tokens.inputs.text}`,
    `--admin-input-placeholder:${tokens.inputs.placeholder}`,
    `--admin-input-ring:${tokens.inputs.focusRing}`,
    `--admin-sidebar-bg:${tokens.sidebar.bg}`,
    `--admin-sidebar-text:${tokens.sidebar.text}`,
    `--admin-sidebar-active-bg:${tokens.sidebar.activeBg}`,
    `--admin-sidebar-active-text:${tokens.sidebar.activeText}`,
    `--admin-sidebar-hover-bg:${tokens.sidebar.hoverBg}`,
    `--admin-sidebar-muted:${tokens.sidebar.muted}`,
    `--admin-sidebar-accent:${tokens.sidebar.accent}`,
    `--admin-sidebar-accent-foreground:${tokens.sidebar.accentForeground}`,
    `--admin-sidebar-border:${tokens.sidebar.border}`,
    `--admin-topbar-bg:${tokens.topbar.bg}`,
    `--admin-topbar-text:${tokens.topbar.text}`,
    `--admin-topbar-border:${tokens.topbar.border}`,
    `--admin-card-bg:${tokens.card.bg}`,
    `--admin-card-border:${tokens.card.border}`,
    `--admin-text-muted:${tokens.typography.mutedText}`,
    `--font-sans:${tokens.typography.sans}`,
    `--font-display:${tokens.typography.display}`,
    `--text-sm:${tokens.typography.sm}`,
    `--text-md:${tokens.typography.md}`,
    `--text-lg:${tokens.typography.lg}`,
    `--text-xl:${tokens.typography.xl}`,
    `--text-2xl:${tokens.typography["2xl"]}`,
    `--admin-state-success:${tokens.state.success}`,
    `--admin-state-warning:${tokens.state.warning}`,
    `--admin-state-danger:${tokens.state.danger}`,
    `--admin-state-info:${tokens.state.info}`,
    `--admin-state-success-foreground:${tokens.state.successForeground}`,
    `--admin-state-warning-foreground:${tokens.state.warningForeground}`,
    `--admin-state-danger-foreground:${tokens.state.dangerForeground}`,
    `--admin-state-info-foreground:${tokens.state.infoForeground}`,
    `--admin-state-success-soft:${tokens.state.successSoft}`,
    `--admin-state-warning-soft:${tokens.state.warningSoft}`,
    `--admin-state-info-soft:${tokens.state.infoSoft}`,
    `--admin-shadow-soft:${tokens.effects.shadowSoft}`,
    `--admin-shadow-card:${tokens.effects.shadowCard}`,
    `--admin-shadow-pop:${tokens.effects.shadowPop}`,
  ];

  return `${selector}{${entries.join(";")};}`;
}

/**
 * Site typography token variables consumed by the Page V2 typography contract
 * (`pageTypographyFontFamilyCssValues`/`pageTypographyFontSizeCssValues` in
 * `core/services/pages/pageDocumentV2.ts`). Single owner of the variable
 * names: the front emits them on `:root` through {@link toCssVariables}, and
 * the page editor canvas re-paints the same map inline on the canvas frame so
 * the canvas resolves the SAME effective values as the front (the admin shell
 * defines admin-theme `--text-*`/`--font-*` variables on `:root` that would
 * otherwise leak into the canvas and cause WYSIWYG drift).
 */
export function toPageTypographyCssVariableMap(tokens: DesignTokens): Record<string, string> {
  return {
    "--font-sans": tokens.typography.sans,
    "--font-display": tokens.typography.display,
    "--text-2xs": tokens.typography["2xs"],
    "--text-xs": tokens.typography.xs,
    "--text-sm": tokens.typography.sm,
    "--text-md": tokens.typography.md,
    "--text-lg": tokens.typography.lg,
    "--text-xl": tokens.typography.xl,
    "--text-2xl": tokens.typography["2xl"],
    "--text-3xl": tokens.typography["3xl"],
    "--text-4xl": tokens.typography["4xl"],
    "--text-5xl": tokens.typography["5xl"],
  };
}

/**
 * CSS variable map for the Page V2 editor canvas frame: the site typography vars
 * PLUS the three NEUTRAL page-color vars (`--color-bg`/`-surface`/`-text`).
 *
 * The admin shell's Tailwind `@theme` (`core/admin/styles/globals.css`) already
 * maps the BRAND `--color-primary`/`-secondary`/`-accent`/`-border` (from the
 * admin theme) globally, so those resolve inside the canvas — but it does NOT
 * define the site neutral `--color-bg`/`-surface`/`-text`, so a block color set
 * to a neutral token would render nothing in-editor (it works on the front,
 * which emits all seven on `:root` via {@link toCssVariableMap}). We emit only
 * the three missing neutrals so neutral block colors are WYSIWYG in-editor.
 *
 * Brand `--color-*` are intentionally OMITTED: re-emitting them on the canvas
 * frame would override editor chrome that consumes them (e.g. `ring-primary`,
 * borders). No `core/admin/ui/pages` chrome consumes `--color-bg/-surface/-text`,
 * so emitting these three is chrome-safe.
 */
export function toPageCanvasColorCssVariableMap(tokens: DesignTokens): Record<string, string> {
  return {
    ...toPageTypographyCssVariableMap(tokens),
    "--color-bg": tokens.neutrals.bg,
    "--color-surface": tokens.neutrals.surface,
    "--color-text": tokens.neutrals.text,
  };
}

/**
 * CSS variable map for the Menu Design editor canvas frame: site typography
 * vars PLUS ALL SEVEN `--color-*` (primary/secondary/accent/bg/surface/border/
 * text). Unlike the page canvas map (which keeps the brand `--color-*` OFF the
 * frame because page chrome consumes `--color-primary`), the menu doc CSS
 * references the brand vars too — swatches store
 * `var(--color-primary|secondary|accent|border)` and the section
 * Surface/Border rules paint onto the scope root — while the admin `@theme`
 * maps those brand names to ADMIN colors, so leaving them unpainted leaks the
 * admin beige into the menu preview (bug 4). The menu canvas therefore repaints
 * all seven and pins its own chrome instead (the `SelectableBlock` selection
 * ring is re-pointed off `--color-primary` onto an `--admin-*` var).
 */
export function toMenuCanvasColorCssVariableMap(tokens: DesignTokens): Record<string, string> {
  return {
    ...toPageTypographyCssVariableMap(tokens),
    "--color-primary": tokens.colors.primary,
    "--color-secondary": tokens.colors.secondary,
    "--color-accent": tokens.colors.accent,
    "--color-bg": tokens.neutrals.bg,
    "--color-surface": tokens.neutrals.surface,
    "--color-text": tokens.neutrals.text,
    "--color-border": tokens.neutrals.border,
  };
}

export function toCssVariableMap(tokens: DesignTokens): Record<string, string> {
  return {
    "--color-primary": tokens.colors.primary,
    "--color-secondary": tokens.colors.secondary,
    "--color-accent": tokens.colors.accent,
    "--color-bg": tokens.neutrals.bg,
    "--color-surface": tokens.neutrals.surface,
    "--color-text": tokens.neutrals.text,
    "--color-border": tokens.neutrals.border,
    "--space-xs": tokens.spacing.xs,
    "--space-sm": tokens.spacing.sm,
    "--space-md": tokens.spacing.md,
    "--space-lg": tokens.spacing.lg,
    "--space-xl": tokens.spacing.xl,
    "--space-2xl": tokens.spacing["2xl"],
    "--radius-sm": tokens.radius.sm,
    "--radius-md": tokens.radius.md,
    "--radius-lg": tokens.radius.lg,
    "--radius-xl": tokens.radius.xl,
    ...toPageTypographyCssVariableMap(tokens),
    "--background": "var(--color-bg)",
    "--foreground": "var(--color-text)",
    "--primary": "var(--color-primary)",
    "--primary-foreground": "var(--color-bg)",
    "--secondary": "var(--color-secondary)",
    "--secondary-foreground": "var(--color-bg)",
    "--accent": "var(--color-accent)",
    "--accent-foreground": "var(--color-bg)",
    "--muted": "var(--color-surface)",
    "--muted-foreground": "var(--color-text)",
    "--popover": "var(--color-surface)",
    "--popover-foreground": "var(--color-text)",
    "--card": "var(--color-surface)",
    "--card-foreground": "var(--color-text)",
    "--border": "var(--color-border)",
    "--input": "var(--color-surface)",
    "--ring": "var(--color-primary)",
    "--destructive": "#ef4444",
    "--destructive-foreground": "#ffffff",
  };
}

export function toAdminThemeCssVariableMap(tokens: AdminThemeTokens): Record<string, string> {
  return {
    "--admin-base-bg": tokens.base.bg,
    "--admin-base-surface": tokens.base.surface,
    "--admin-base-text": tokens.base.text,
    "--admin-base-border": tokens.base.border,
    "--admin-button-primary-bg": tokens.buttons.primary.bg,
    "--admin-button-primary-text": tokens.buttons.primary.text,
    "--admin-button-primary-hover-bg": tokens.buttons.primary.hoverBg,
    "--admin-button-primary-hover-text": tokens.buttons.primary.hoverText,
    "--admin-button-secondary-bg": tokens.buttons.secondary.bg,
    "--admin-button-secondary-text": tokens.buttons.secondary.text,
    "--admin-button-secondary-hover-bg": tokens.buttons.secondary.hoverBg,
    "--admin-button-secondary-hover-text": tokens.buttons.secondary.hoverText,
    "--admin-button-outline-border": tokens.buttons.outline.border,
    "--admin-button-outline-text": tokens.buttons.outline.text,
    "--admin-button-outline-hover-bg": tokens.buttons.outline.hoverBg,
    "--admin-button-outline-hover-text": tokens.buttons.outline.hoverText,
    "--admin-button-ghost-hover-bg": tokens.buttons.ghost.hoverBg,
    "--admin-button-ghost-hover-text": tokens.buttons.ghost.hoverText,
    "--admin-primary-soft": tokens.primarySoft.bg,
    "--admin-primary-soft-text": tokens.primarySoft.text,
    "--admin-input-bg": tokens.inputs.bg,
    "--admin-input-border": tokens.inputs.border,
    "--admin-input-text": tokens.inputs.text,
    "--admin-input-placeholder": tokens.inputs.placeholder,
    "--admin-input-ring": tokens.inputs.focusRing,
    "--admin-sidebar-bg": tokens.sidebar.bg,
    "--admin-sidebar-text": tokens.sidebar.text,
    "--admin-sidebar-active-bg": tokens.sidebar.activeBg,
    "--admin-sidebar-active-text": tokens.sidebar.activeText,
    "--admin-sidebar-hover-bg": tokens.sidebar.hoverBg,
    "--admin-sidebar-muted": tokens.sidebar.muted,
    "--admin-sidebar-accent": tokens.sidebar.accent,
    "--admin-sidebar-accent-foreground": tokens.sidebar.accentForeground,
    "--admin-sidebar-border": tokens.sidebar.border,
    "--admin-topbar-bg": tokens.topbar.bg,
    "--admin-topbar-text": tokens.topbar.text,
    "--admin-topbar-border": tokens.topbar.border,
    "--admin-card-bg": tokens.card.bg,
    "--admin-card-border": tokens.card.border,
    "--admin-text-muted": tokens.typography.mutedText,
    "--font-sans": tokens.typography.sans,
    "--font-display": tokens.typography.display,
    "--text-sm": tokens.typography.sm,
    "--text-md": tokens.typography.md,
    "--text-lg": tokens.typography.lg,
    "--text-xl": tokens.typography.xl,
    "--text-2xl": tokens.typography["2xl"],
    "--admin-state-success": tokens.state.success,
    "--admin-state-warning": tokens.state.warning,
    "--admin-state-danger": tokens.state.danger,
    "--admin-state-info": tokens.state.info,
    "--admin-state-success-foreground": tokens.state.successForeground,
    "--admin-state-warning-foreground": tokens.state.warningForeground,
    "--admin-state-danger-foreground": tokens.state.dangerForeground,
    "--admin-state-info-foreground": tokens.state.infoForeground,
    "--admin-state-success-soft": tokens.state.successSoft,
    "--admin-state-warning-soft": tokens.state.warningSoft,
    "--admin-state-info-soft": tokens.state.infoSoft,
    "--admin-shadow-soft": tokens.effects.shadowSoft,
    "--admin-shadow-card": tokens.effects.shadowCard,
    "--admin-shadow-pop": tokens.effects.shadowPop,
  };
}
