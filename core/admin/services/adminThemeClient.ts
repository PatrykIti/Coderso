import { apiRequest } from "./apiClient";
import type { AdminThemeTokens } from "../../services/adminThemes/tokenTypes";

export type AdminThemeTemplate = {
  id: string;
  name: string;
  description: string | null;
  tokens: AdminThemeTokens;
  createdAt: string;
  updatedAt: string;
};

export type AdminThemeProfile = {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminThemeTemplateCreate = {
  name: string;
  description?: string | null;
  tokens: AdminThemeTokens;
};

export type AdminThemeTemplateUpdate = {
  name?: string;
  description?: string | null;
  tokens?: AdminThemeTokens;
};

export type AdminThemeProfileCreate = {
  name: string;
  description?: string | null;
  templateId: string;
  isActive?: boolean;
};

export type AdminThemeProfileUpdate = {
  name?: string;
  description?: string | null;
  templateId?: string;
};

export async function listAdminThemeTemplates() {
  return apiRequest<{ items: AdminThemeTemplate[] }>("/admin-theme-templates", {
    method: "GET",
  });
}

export async function createAdminThemeTemplate(payload: AdminThemeTemplateCreate) {
  return apiRequest<AdminThemeTemplate>(
    "/admin-theme-templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateAdminThemeTemplate(
  id: string,
  payload: AdminThemeTemplateUpdate
) {
  return apiRequest<AdminThemeTemplate>(
    `/admin-theme-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteAdminThemeTemplate(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/admin-theme-templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}

export async function listAdminThemeProfiles() {
  return apiRequest<{ items: AdminThemeProfile[] }>("/admin-theme-profiles", {
    method: "GET",
  });
}

export async function createAdminThemeProfile(payload: AdminThemeProfileCreate) {
  return apiRequest<AdminThemeProfile>(
    "/admin-theme-profiles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateAdminThemeProfile(
  id: string,
  payload: AdminThemeProfileUpdate
) {
  return apiRequest<AdminThemeProfile>(
    `/admin-theme-profiles/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function activateAdminThemeProfile(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/admin-theme-profiles/${encodeURIComponent(id)}/activate`,
    { method: "POST" },
    { withCsrf: true }
  );
}
