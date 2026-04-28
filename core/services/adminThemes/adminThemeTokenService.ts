import { getDefaultAdminThemeTokens, mergeAdminThemeTokens } from "./tokenUtils";
import { getActiveAdminThemeProfile } from "./adminThemeProfileService";
import { getAdminThemeTemplate } from "./adminThemeTemplateService";
import type { AdminThemeTokens } from "./tokenTypes";

let cachedTokens: AdminThemeTokens | null = null;
let cachedSignature: string | null = null;

const buildSignature = (parts: Array<string | number | null | undefined>) =>
  parts.map((part) => (part === null || part === undefined ? "null" : String(part))).join("|");

export async function getResolvedAdminThemeTokens(): Promise<AdminThemeTokens> {
  const activeProfile = await getActiveAdminThemeProfile();
  const templateId = activeProfile?.templateId ?? null;
  const template = templateId ? await getAdminThemeTemplate(templateId) : null;

  const signature = buildSignature([
    activeProfile?.id,
    activeProfile?.updatedAt?.getTime?.() ?? null,
    template?.id,
    template?.updatedAt?.getTime?.() ?? null,
  ]);

  if (cachedTokens && cachedSignature === signature) {
    return cachedTokens;
  }

  const defaults = getDefaultAdminThemeTokens();
  const resolved = mergeAdminThemeTokens(defaults, template?.tokens ?? null);
  cachedTokens = resolved;
  cachedSignature = signature;
  return resolved;
}

export function resetAdminThemeTokenCache() {
  cachedTokens = null;
  cachedSignature = null;
}
