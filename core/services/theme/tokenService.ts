import { getSettingRecord } from "../settings/settingsService";
import { DEFAULT_TOKENS, type DesignTokenOverrides, type DesignTokens } from "./tokenTypes";
import { assertTokenOverrides } from "./tokenValidation";

let cachedTokens: DesignTokens | null = null;
let cachedUpdatedAt: number | null = null;

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

export async function getResolvedTokens(): Promise<DesignTokens> {
  const record = await getSettingRecord("design.tokens");
  const updatedAt = record?.updatedAt ? record.updatedAt.getTime() : null;

  if (cachedTokens && cachedUpdatedAt === updatedAt) {
    return cachedTokens;
  }

  let overrides: DesignTokenOverrides | undefined;
  if (record?.value) {
    try {
      assertTokenOverrides(record.value);
      overrides = record.value;
    } catch {
      overrides = undefined;
    }
  }

  const merged = mergeTokens(DEFAULT_TOKENS, overrides);
  cachedTokens = merged;
  cachedUpdatedAt = updatedAt;
  return merged;
}
