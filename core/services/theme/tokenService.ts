import { getSettingRecord } from "../settings/settingsService";
import { getActiveThemeProfile } from "../themes/themeProfileService";
import { getTheme } from "../themes/themeService";
import type { DesignTokenOverrides, DesignTokens } from "./tokenTypes";
import { assertTokenOverrides } from "./tokenValidation";
import { getDefaultTokens, mergeTokens } from "./tokenUtils";

let cachedTokens: DesignTokens | null = null;
let cachedSignature: string | null = null;

const buildSignature = (parts: Array<string | number | null | undefined>) =>
  parts.map((part) => (part === null || part === undefined ? "null" : String(part))).join("|");

export async function getResolvedTokens(): Promise<DesignTokens> {
  const record = await getSettingRecord("design.tokens");
  const settingsUpdatedAt = record?.updatedAt ? record.updatedAt.getTime() : null;

  const activeProfile = await getActiveThemeProfile();
  const profileUpdatedAt = activeProfile?.updatedAt
    ? activeProfile.updatedAt.getTime()
    : null;
  const profileId = activeProfile?.id ?? null;
  const themeName = activeProfile?.themeName ?? "default";
  const theme = themeName ? await getTheme(themeName) : null;

  const signature = buildSignature([
    settingsUpdatedAt,
    profileId,
    profileUpdatedAt,
    themeName,
    theme?.version,
  ]);

  if (cachedTokens && cachedSignature === signature) {
    return cachedTokens;
  }

  let globalOverrides: DesignTokenOverrides | undefined;
  if (record?.value) {
    try {
      assertTokenOverrides(record.value);
      globalOverrides = record.value;
    } catch {
      globalOverrides = undefined;
    }
  }

  const defaults = getDefaultTokens();
  const themeDefaults = mergeTokens(defaults, theme?.tokens ?? {});
  const withGlobalOverrides = mergeTokens(themeDefaults, globalOverrides);
  const withProfileOverrides = mergeTokens(
    withGlobalOverrides,
    activeProfile?.tokens ?? undefined
  );

  cachedTokens = withProfileOverrides;
  cachedSignature = signature;
  return withProfileOverrides;
}

export { getDefaultTokens, mergeTokens };
