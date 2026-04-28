import {
  DEFAULT_TOKENS,
  type DesignTokenOverrides,
  type DesignTokens,
} from "./tokenTypes";

export function getDefaultTokens(): DesignTokens {
  return JSON.parse(JSON.stringify(DEFAULT_TOKENS)) as DesignTokens;
}

export function mergeTokens(
  defaults: DesignTokens,
  overrides?: DesignTokenOverrides | null
): DesignTokens {
  return {
    colors: { ...defaults.colors, ...overrides?.colors },
    neutrals: { ...defaults.neutrals, ...overrides?.neutrals },
    spacing: { ...defaults.spacing, ...overrides?.spacing },
    radius: { ...defaults.radius, ...overrides?.radius },
    typography: { ...defaults.typography, ...overrides?.typography },
  };
}
