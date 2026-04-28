import { apiRequest } from "./apiClient";

export type ThemeMeta = {
  name: string;
  version: string;
  templates: string[];
  tokens?: Record<string, unknown>;
  description?: string;
};

export type ThemeRoute = {
  id: string;
  path: string;
  pageId: string | null;
};

export type ThemeProfile = {
  id: string;
  name: string;
  description: string | null;
  themeName: string;
  tokens: Record<string, unknown>;
  isActive: boolean;
  routes: ThemeRoute[];
  createdAt: string;
  updatedAt: string;
};

export type ThemeProfileCreate = {
  name: string;
  description?: string | null;
  themeName: string;
  tokens?: Record<string, unknown>;
  isActive?: boolean;
};

export type ThemeProfileUpdate = {
  name?: string;
  description?: string | null;
  tokens?: Record<string, unknown>;
};

export type ThemeRouteInput = {
  path: string;
  pageId: string | null;
};

export async function listThemes() {
  return apiRequest<{ items: ThemeMeta[] }>("/themes", { method: "GET" });
}

export async function listThemeProfiles() {
  return apiRequest<{ items: ThemeProfile[] }>("/theme-profiles", { method: "GET" });
}

export async function getThemeProfile(id: string) {
  return apiRequest<ThemeProfile>(`/theme-profiles/${encodeURIComponent(id)}`, {
    method: "GET",
  });
}

export async function createThemeProfile(payload: ThemeProfileCreate) {
  return apiRequest<ThemeProfile>(
    "/theme-profiles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateThemeProfile(id: string, payload: ThemeProfileUpdate) {
  return apiRequest<ThemeProfile>(
    `/theme-profiles/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function activateThemeProfile(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/theme-profiles/${encodeURIComponent(id)}/activate`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function updateThemeRoutes(id: string, routes: ThemeRouteInput[]) {
  return apiRequest<ThemeProfile>(
    `/theme-profiles/${encodeURIComponent(id)}/routes`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(routes),
    },
    { withCsrf: true }
  );
}
