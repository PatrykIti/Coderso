import { getSetting } from "../../services/settings/settingsService";

const normalizeAdminPath = (value: string | null) => {
  if (!value) return "/admin";
  const trimmed = value.trim();
  if (!trimmed) return "/admin";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
};

export async function resolveAdminPath() {
  const setting = await getSetting("site.adminPath");
  return normalizeAdminPath(typeof setting === "string" ? setting : null);
}
