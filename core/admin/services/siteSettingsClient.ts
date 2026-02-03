import { apiRequest } from "./apiClient";

export type SiteContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
};

export type SiteSettingsResponse = {
  publicBaseUrl: string | null;
  homepageId: string | null;
  notFoundPageId: string | null;
  previewEnabled: boolean;
  cacheTtlSeconds: number;
  contentRoutes: SiteContentRoute[];
};

export type SiteSettingsUpdate = Partial<SiteSettingsResponse>;

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeOptionalNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeBaseUrlInput = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalIdInput = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeContentRoutes = (value: unknown): SiteContentRoute[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Partial<SiteContentRoute>;
      if (typeof record.type !== "string") return null;
      if (typeof record.listPath !== "string") return null;
      if (typeof record.detailPath !== "string") return null;
      return {
        type: record.type,
        listPath: record.listPath,
        detailPath: record.detailPath,
        enabled: typeof record.enabled === "boolean" ? record.enabled : true,
      } satisfies SiteContentRoute;
    })
    .filter((entry): entry is SiteContentRoute => Boolean(entry));
};

const resolveSiteSettings = (
  payload: Record<string, unknown>
): SiteSettingsResponse => {
  return {
    publicBaseUrl: normalizeOptionalString(payload["site.publicBaseUrl"]),
    homepageId: normalizeOptionalString(payload["site.homepageId"]),
    notFoundPageId: normalizeOptionalString(payload["site.notFoundPageId"]),
    previewEnabled: normalizeOptionalBoolean(payload["site.previewEnabled"], true),
    cacheTtlSeconds: Math.max(
      0,
      Math.floor(normalizeOptionalNumber(payload["site.cacheTtlSeconds"], 30))
    ),
    contentRoutes: normalizeContentRoutes(payload["site.contentRoutes"]),
  };
};

export async function getSiteSettings() {
  const payload = await apiRequest<Record<string, unknown>>("/settings", {
    method: "GET",
  });
  return resolveSiteSettings(payload);
}

export async function updateSiteSettings(update: SiteSettingsUpdate) {
  const payload: Record<string, unknown> = {};
  if ("publicBaseUrl" in update) {
    payload["site.publicBaseUrl"] = normalizeBaseUrlInput(update.publicBaseUrl);
  }
  if ("homepageId" in update) {
    payload["site.homepageId"] = normalizeOptionalIdInput(update.homepageId);
  }
  if ("notFoundPageId" in update) {
    payload["site.notFoundPageId"] = normalizeOptionalIdInput(
      update.notFoundPageId
    );
  }
  if ("previewEnabled" in update) {
    payload["site.previewEnabled"] = update.previewEnabled;
  }
  if ("cacheTtlSeconds" in update) {
    payload["site.cacheTtlSeconds"] = update.cacheTtlSeconds;
  }
  if ("contentRoutes" in update) {
    payload["site.contentRoutes"] = update.contentRoutes;
  }

  const result = await apiRequest<Record<string, unknown>>(
    "/settings",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );

  return resolveSiteSettings(result);
}
