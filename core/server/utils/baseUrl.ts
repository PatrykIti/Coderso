import { getSetting } from "../../services/settings/settingsService";

export async function resolvePublicBaseUrl() {
  const setting = await getSetting("site.publicBaseUrl");
  if (typeof setting === "string" && setting.trim().length > 0) {
    return setting;
  }
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  return null;
}
