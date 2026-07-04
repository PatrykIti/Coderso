import { DEFAULT_ADMIN_THEME_TOKENS, type AdminThemeTokens } from "./tokenTypes";

export function getDefaultAdminThemeTokens(): AdminThemeTokens {
  return JSON.parse(JSON.stringify(DEFAULT_ADMIN_THEME_TOKENS)) as AdminThemeTokens;
}

export function mergeAdminThemeTokens(
  defaults: AdminThemeTokens,
  overrides?: Partial<AdminThemeTokens> | null
): AdminThemeTokens {
  if (!overrides) return defaults;

  return {
    base: { ...defaults.base, ...overrides.base },
    buttons: {
      primary: { ...defaults.buttons.primary, ...overrides.buttons?.primary },
      secondary: { ...defaults.buttons.secondary, ...overrides.buttons?.secondary },
      outline: { ...defaults.buttons.outline, ...overrides.buttons?.outline },
      ghost: { ...defaults.buttons.ghost, ...overrides.buttons?.ghost },
    },
    // NEW group (TASK-479-05): back-filled from defaults for legacy templates.
    primarySoft: { ...defaults.primarySoft, ...overrides.primarySoft },
    inputs: { ...defaults.inputs, ...overrides.inputs },
    // New sidebar keys (muted/accent/accentForeground/border) back-fill via spread.
    sidebar: { ...defaults.sidebar, ...overrides.sidebar },
    topbar: { ...defaults.topbar, ...overrides.topbar },
    card: { ...defaults.card, ...overrides.card },
    typography: { ...defaults.typography, ...overrides.typography },
    // New state keys (info/*Foreground/*Soft) back-fill via spread.
    state: { ...defaults.state, ...overrides.state },
    // NEW group (TASK-479-05): back-filled from defaults for legacy templates.
    effects: { ...defaults.effects, ...overrides.effects },
  };
}
