import {
  DEFAULT_ADMIN_THEME_TOKENS,
  type AdminThemeTokens,
} from "./tokenTypes";

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
    inputs: { ...defaults.inputs, ...overrides.inputs },
    sidebar: { ...defaults.sidebar, ...overrides.sidebar },
    topbar: { ...defaults.topbar, ...overrides.topbar },
    card: { ...defaults.card, ...overrides.card },
    typography: { ...defaults.typography, ...overrides.typography },
    state: { ...defaults.state, ...overrides.state },
  };
}
