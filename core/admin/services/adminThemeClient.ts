import { createReadThroughCache } from "@/utils/readThroughCache";
import { apiRequest } from "./apiClient";
import { broadcastCacheEvent } from "@/utils/cacheBus";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";
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

let cachedAdminThemeTemplates: AdminThemeTemplate[] | null = null;
let cachedAdminThemeTemplatesPromise: Promise<AdminThemeTemplate[]> | null = null;
let cachedAdminThemeProfiles: AdminThemeProfile[] | null = null;
let cachedAdminThemeProfilesPromise: Promise<AdminThemeProfile[]> | null = null;
const ADMIN_THEME_PROFILES_READ_TTL_MS = 10_000;

const adminThemeProfilesReadCache = createReadThroughCache<{ items: AdminThemeProfile[] }>({
  ttlMs: ADMIN_THEME_PROFILES_READ_TTL_MS,
  load: () =>
    apiRequest<{ items: AdminThemeProfile[] }>("/admin-theme-profiles", {
      method: "GET",
    }),
});

const invalidateAdminThemeProfilesReadCache = () => {
  adminThemeProfilesReadCache.invalidate();
};


const isAdminThemeTemplateList = (value: unknown): value is AdminThemeTemplate[] =>
  Array.isArray(value);

const isAdminThemeProfileList = (value: unknown): value is AdminThemeProfile[] =>
  Array.isArray(value);

const readAdminThemeTemplatesCache = () =>
  readLocalCache(
    cacheKeys.adminThemeTemplatesList,
    cacheTtlMs.list,
    isAdminThemeTemplateList
  );

const readAdminThemeProfilesCache = () =>
  readLocalCache(
    cacheKeys.adminThemeProfilesList,
    cacheTtlMs.list,
    isAdminThemeProfileList
  );

const primeAdminThemeTemplatesCacheInternal = (items: AdminThemeTemplate[]) => {
  cachedAdminThemeTemplates = items;
  cachedAdminThemeTemplatesPromise = null;
  writeLocalCache(cacheKeys.adminThemeTemplatesList, items);
};

const primeAdminThemeProfilesCacheInternal = (items: AdminThemeProfile[]) => {
  cachedAdminThemeProfiles = items;
  cachedAdminThemeProfilesPromise = null;
  writeLocalCache(cacheKeys.adminThemeProfilesList, items);
};

const upsertCachedAdminThemeTemplate = (item: AdminThemeTemplate) => {
  const current = cachedAdminThemeTemplates ?? readAdminThemeTemplatesCache() ?? [];
  const index = current.findIndex((template) => template.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeAdminThemeTemplatesCacheInternal(next);
};

const removeCachedAdminThemeTemplate = (id: string) => {
  const current = cachedAdminThemeTemplates ?? readAdminThemeTemplatesCache();
  if (!current) return;
  primeAdminThemeTemplatesCacheInternal(
    current.filter((template) => template.id !== id)
  );
};

const upsertCachedAdminThemeProfile = (item: AdminThemeProfile) => {
  const current = cachedAdminThemeProfiles ?? readAdminThemeProfilesCache() ?? [];
  const index = current.findIndex((profile) => profile.id === item.id);
  const next = [...current];
  if (index === -1) {
    next.unshift(item);
  } else {
    next[index] = item;
  }
  primeAdminThemeProfilesCacheInternal(next);
};

const setActiveAdminThemeProfile = (id: string) => {
  const current = cachedAdminThemeProfiles ?? readAdminThemeProfilesCache();
  if (!current) return;
  const next = current.map((profile) => ({
    ...profile,
    isActive: profile.id === id,
  }));
  primeAdminThemeProfilesCacheInternal(next);
};

export const getCachedAdminThemeTemplates = () => {
  if (cachedAdminThemeTemplates) return cachedAdminThemeTemplates;
  const cached = readAdminThemeTemplatesCache();
  if (cached) cachedAdminThemeTemplates = cached;
  return cachedAdminThemeTemplates;
};

export const getCachedAdminThemeProfiles = () => {
  if (cachedAdminThemeProfiles) return cachedAdminThemeProfiles;
  const cached = readAdminThemeProfilesCache();
  if (cached) cachedAdminThemeProfiles = cached;
  return cachedAdminThemeProfiles;
};

export const clearAdminThemeTemplatesCache = () => {
  cachedAdminThemeTemplates = null;
  cachedAdminThemeTemplatesPromise = null;
  clearLocalCache(cacheKeys.adminThemeTemplatesList);
};

export const clearAdminThemeProfilesCache = () => {
  cachedAdminThemeProfiles = null;
  cachedAdminThemeProfilesPromise = null;
  clearLocalCache(cacheKeys.adminThemeProfilesList);
  invalidateAdminThemeProfilesReadCache();
};

export async function listAdminThemeTemplates() {
  return apiRequest<{ items: AdminThemeTemplate[] }>("/admin-theme-templates", {
    method: "GET",
  });
}

export async function listAdminThemeTemplatesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedAdminThemeTemplates();
    if (cached) return cached;
    if (cachedAdminThemeTemplatesPromise) return cachedAdminThemeTemplatesPromise;
  }
  const request = listAdminThemeTemplates().then((payload) => payload.items ?? []);
  cachedAdminThemeTemplatesPromise = request;
  const items = await request;
  primeAdminThemeTemplatesCacheInternal(items);
  return items;
}

export async function createAdminThemeTemplate(payload: AdminThemeTemplateCreate) {
  const created = await apiRequest<AdminThemeTemplate>(
    "/admin-theme-templates",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedAdminThemeTemplate(created);
    broadcastCacheEvent({ key: cacheKeys.adminThemeTemplatesList, action: "update" });
  }
  return created;
}

export async function updateAdminThemeTemplate(
  id: string,
  payload: AdminThemeTemplateUpdate
) {
  const updated = await apiRequest<AdminThemeTemplate>(
    `/admin-theme-templates/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedAdminThemeTemplate(updated);
    broadcastCacheEvent({ key: cacheKeys.adminThemeTemplatesList, action: "update" });
  }
  return updated;
}

export async function deleteAdminThemeTemplate(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/admin-theme-templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
  if (result?.ok) {
    removeCachedAdminThemeTemplate(id);
    broadcastCacheEvent({
      key: cacheKeys.adminThemeTemplatesList,
      action: "invalidate",
    });
  }
  return result;
}

export async function listAdminThemeProfiles(options?: { force?: boolean }) {
  return adminThemeProfilesReadCache.get({ force: options?.force });
}

export async function listAdminThemeProfilesCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedAdminThemeProfiles();
    if (cached) return cached;
    if (cachedAdminThemeProfilesPromise) return cachedAdminThemeProfilesPromise;
  }
  const request = listAdminThemeProfiles({ force: options?.force }).then((payload) => payload.items ?? []);
  cachedAdminThemeProfilesPromise = request;
  const items = await request;
  primeAdminThemeProfilesCacheInternal(items);
  return items;
}

export async function createAdminThemeProfile(payload: AdminThemeProfileCreate) {
  const created = await apiRequest<AdminThemeProfile>(
    "/admin-theme-profiles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (created) {
    upsertCachedAdminThemeProfile(created);
    invalidateAdminThemeProfilesReadCache();
    broadcastCacheEvent({ key: cacheKeys.adminThemeProfilesList, action: "update" });
  }
  return created;
}

export async function updateAdminThemeProfile(
  id: string,
  payload: AdminThemeProfileUpdate
) {
  const updated = await apiRequest<AdminThemeProfile>(
    `/admin-theme-profiles/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
  if (updated) {
    upsertCachedAdminThemeProfile(updated);
    invalidateAdminThemeProfilesReadCache();
    broadcastCacheEvent({ key: cacheKeys.adminThemeProfilesList, action: "update" });
  }
  return updated;
}

export async function activateAdminThemeProfile(id: string) {
  const result = await apiRequest<{ ok: boolean }>(
    `/admin-theme-profiles/${encodeURIComponent(id)}/activate`,
    { method: "POST" },
    { withCsrf: true }
  );
  if (result?.ok) {
    setActiveAdminThemeProfile(id);
    invalidateAdminThemeProfilesReadCache();
    broadcastCacheEvent({ key: cacheKeys.adminThemeProfilesList, action: "update" });
  }
  return result;
}
