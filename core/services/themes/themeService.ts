import { ensureThemesLoaded, listThemes as listRegistryThemes, getTheme as getRegistryTheme } from "../../themes/registry";

export async function listThemes() {
  await ensureThemesLoaded();
  return listRegistryThemes();
}

export async function getTheme(name: string) {
  await ensureThemesLoaded();
  return getRegistryTheme(name);
}
