import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { clearLocalCache, readLocalCache, writeLocalCache } from "@/utils/storageCache";

export type SolutionKitId =
  | "automotive-workshop"
  | "medical-clinic"
  | "beauty-salon"
  | "services-directory"
  | "small-ecommerce";

export type SiteBuilderBusinessType =
  | "automotive_workshop"
  | "medical_clinic"
  | "beauty_salon"
  | "services_directory"
  | "small_ecommerce"
  | "custom";

export type SiteBuilderGoal =
  | "lead_generation"
  | "online_booking"
  | "catalog_showcase"
  | "reviews_social_proof"
  | "sell_products"
  | "collect_qualified_leads";

export type SolutionKitSummary = {
  id: SolutionKitId;
  title: string;
  shortDescription: string;
  recommendedModules: string[];
  features: string[];
};

export type SolutionKitResourceBlueprint = {
  pages: Array<{ slug: string; title: string; status: "draft" | "published" }>;
  forms: Array<{ slug: string; name: string; status: "draft" | "published" }>;
  contentTypes: Array<{ slug: string; name: string }>;
  menus: Array<{ location: "primary" | "footer"; name: string }>;
};

export type SolutionKitDefinition = SolutionKitSummary & {
  longDescription: string;
  businessTypes: SiteBuilderBusinessType[];
  defaultGoals: SiteBuilderGoal[];
  resourceBlueprint: SolutionKitResourceBlueprint;
};

export type SiteBuilderPlanInput = {
  businessType: SiteBuilderBusinessType;
  goals: SiteBuilderGoal[];
  locale: string;
  region?: string | null;
  siteName?: string | null;
  preferredKitId?: SolutionKitId | null;
};

export type SiteBuilderPlanOutput = {
  recommendedKitId: SolutionKitId;
  confidence: number;
  recommendations: Array<{ kitId: SolutionKitId; score: number; reasons: string[] }>;
  steps: Array<{ id: string; type: string; title: string; description: string }>;
  settingsPatch: Record<string, unknown>;
  notes: string[];
};

const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "services-directory",
  "small-ecommerce",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isSolutionKitId = (value: unknown): value is SolutionKitId =>
  typeof value === "string" && solutionKitIds.includes(value as SolutionKitId);

const isSolutionKitSummary = (value: unknown): value is SolutionKitSummary =>
  isRecord(value) &&
  isSolutionKitId(value.id) &&
  typeof value.title === "string" &&
  typeof value.shortDescription === "string" &&
  isStringArray(value.recommendedModules) &&
  isStringArray(value.features);

const isSolutionKitList = (value: unknown): value is SolutionKitSummary[] =>
  Array.isArray(value) && value.every(isSolutionKitSummary);

const isSolutionKitDefinition = (value: unknown): value is SolutionKitDefinition => {
  if (!isRecord(value)) return false;
  if (!isSolutionKitSummary(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.longDescription === "string" &&
    Array.isArray(record.businessTypes) &&
    Array.isArray(record.defaultGoals) &&
    isRecord(record.resourceBlueprint)
  );
};

const isSiteBuilderPlanOutput = (value: unknown): value is SiteBuilderPlanOutput =>
  isRecord(value) &&
  isSolutionKitId(value.recommendedKitId) &&
  typeof value.confidence === "number" &&
  Array.isArray(value.recommendations) &&
  Array.isArray(value.steps) &&
  isRecord(value.settingsPatch) &&
  isStringArray(value.notes);

let cachedKits: SolutionKitSummary[] | null = null;
let cachedKitsPromise: Promise<SolutionKitSummary[]> | null = null;

const readKitsCache = () =>
  readLocalCache(cacheKeys.solutionKitsList, cacheTtlMs.list, isSolutionKitList);

const readKitDetailCache = (id: string) =>
  readLocalCache(cacheKeys.solutionKitDetail(id), cacheTtlMs.detail, isSolutionKitDefinition);

const primeKitsCache = (items: SolutionKitSummary[]) => {
  cachedKits = items;
  cachedKitsPromise = null;
  writeLocalCache(cacheKeys.solutionKitsList, items);
};

export const getCachedSolutionKits = () => {
  if (cachedKits) return cachedKits;
  const cached = readKitsCache();
  if (cached) cachedKits = cached;
  return cachedKits;
};

export const clearSolutionKitsCache = () => {
  cachedKits = null;
  cachedKitsPromise = null;
  clearLocalCache(cacheKeys.solutionKitsList);
};

export async function listSolutionKits() {
  const payload = await apiRequest<{ items: SolutionKitSummary[] }>("/solution-kits", {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listSolutionKitsCached(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedSolutionKits();
    if (cached) return cached;
    if (cachedKitsPromise) return cachedKitsPromise;
  }

  const request = listSolutionKits();
  cachedKitsPromise = request;
  const items = await request;
  primeKitsCache(items);
  return items;
}

export async function getSolutionKit(id: SolutionKitId) {
  const item = await apiRequest<SolutionKitDefinition>(`/solution-kits/${id}`, {
    method: "GET",
  });
  writeLocalCache(cacheKeys.solutionKitDetail(id), item);
  return item;
}

export async function getSolutionKitCached(
  id: SolutionKitId,
  options?: { force?: boolean }
) {
  if (!options?.force) {
    const cached = readKitDetailCache(id);
    if (cached) return cached;
  }
  return getSolutionKit(id);
}

export async function previewSolutionKitPlan(input: SiteBuilderPlanInput) {
  const payload = await apiRequest<SiteBuilderPlanOutput>(
    "/solution-kits/plan",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: false }
  );

  if (!isSiteBuilderPlanOutput(payload)) {
    throw new Error("Invalid solution kit plan response");
  }

  return payload;
}
