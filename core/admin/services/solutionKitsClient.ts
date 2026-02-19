import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { broadcastCacheEvent } from "@/utils/cacheBus";
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

export type SolutionKitInstallMode = "dry_run" | "apply" | "rollback";
export type SolutionKitInstallStatus = "running" | "success" | "failed";
export type SolutionKitInstallItemStatus = "planned" | "success" | "failed" | "skipped";
export type SolutionKitInstallItemOperation =
  | "create"
  | "update"
  | "noop"
  | "delete"
  | "restore";

export type SolutionKitInstallSummary = {
  total: number;
  success: number;
  failed: number;
  planned: number;
  skipped: number;
  operations: Record<SolutionKitInstallItemOperation, number>;
};

export type SolutionKitInstallRunRecord = {
  id: string;
  kitId: string;
  mode: SolutionKitInstallMode;
  status: SolutionKitInstallStatus;
  actorId: string | null;
  rollbackOfRunId: string | null;
  options: Record<string, unknown>;
  summary: SolutionKitInstallSummary;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type SolutionKitInstallItemRecord = {
  id: string;
  runId: string;
  position: number;
  resourceType: "content_type" | "form" | "page" | "menu";
  resourceKey: string;
  operation: SolutionKitInstallItemOperation;
  status: SolutionKitInstallItemStatus;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  rollbackAction: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SolutionKitInstallResult = {
  run: SolutionKitInstallRunRecord;
  items: SolutionKitInstallItemRecord[];
  summary: SolutionKitInstallSummary;
};

export type SolutionKitRunDetail = {
  run: SolutionKitInstallRunRecord;
  items: SolutionKitInstallItemRecord[];
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

const isInstallMode = (value: unknown): value is SolutionKitInstallMode =>
  value === "dry_run" || value === "apply" || value === "rollback";

const isInstallStatus = (value: unknown): value is SolutionKitInstallStatus =>
  value === "running" || value === "success" || value === "failed";

const isInstallItemStatus = (value: unknown): value is SolutionKitInstallItemStatus =>
  value === "planned" || value === "success" || value === "failed" || value === "skipped";

const isInstallItemOperation = (value: unknown): value is SolutionKitInstallItemOperation =>
  value === "create" ||
  value === "update" ||
  value === "noop" ||
  value === "delete" ||
  value === "restore";

const isInstallSummary = (value: unknown): value is SolutionKitInstallSummary => {
  if (!isRecord(value) || !isRecord(value.operations)) return false;
  return (
    typeof value.total === "number" &&
    typeof value.success === "number" &&
    typeof value.failed === "number" &&
    typeof value.planned === "number" &&
    typeof value.skipped === "number"
  );
};

const isInstallRunRecord = (value: unknown): value is SolutionKitInstallRunRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.kitId === "string" &&
  isInstallMode(value.mode) &&
  isInstallStatus(value.status) &&
  (value.actorId === null || typeof value.actorId === "string") &&
  (value.rollbackOfRunId === null || typeof value.rollbackOfRunId === "string") &&
  isRecord(value.options) &&
  isInstallSummary(value.summary) &&
  (value.error === null || typeof value.error === "string") &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string" &&
  (value.finishedAt === null || typeof value.finishedAt === "string");

const isInstallRunRecordList = (value: unknown): value is SolutionKitInstallRunRecord[] =>
  Array.isArray(value) && value.every(isInstallRunRecord);

const isInstallItemRecord = (value: unknown): value is SolutionKitInstallItemRecord =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.runId === "string" &&
  typeof value.position === "number" &&
  typeof value.resourceType === "string" &&
  typeof value.resourceKey === "string" &&
  isInstallItemOperation(value.operation) &&
  isInstallItemStatus(value.status) &&
  (value.beforeSnapshot === null || isRecord(value.beforeSnapshot)) &&
  (value.afterSnapshot === null || isRecord(value.afterSnapshot)) &&
  (value.rollbackAction === null || isRecord(value.rollbackAction)) &&
  (value.error === null || typeof value.error === "string") &&
  typeof value.createdAt === "string" &&
  typeof value.updatedAt === "string";

const isInstallItemRecordList = (value: unknown): value is SolutionKitInstallItemRecord[] =>
  Array.isArray(value) && value.every(isInstallItemRecord);

const isInstallResult = (value: unknown): value is SolutionKitInstallResult =>
  isRecord(value) &&
  isInstallRunRecord(value.run) &&
  isInstallItemRecordList(value.items) &&
  isInstallSummary(value.summary);

const isInstallRunDetail = (value: unknown): value is SolutionKitRunDetail =>
  isRecord(value) && isInstallRunRecord(value.run) && isInstallItemRecordList(value.items);

let cachedKits: SolutionKitSummary[] | null = null;
let cachedKitsPromise: Promise<SolutionKitSummary[]> | null = null;
const cachedRunsPromises = new Map<string, Promise<SolutionKitInstallRunRecord[]>>();

const readKitsCache = () =>
  readLocalCache(cacheKeys.solutionKitsList, cacheTtlMs.list, isSolutionKitList);

const readKitDetailCache = (id: string) =>
  readLocalCache(cacheKeys.solutionKitDetail(id), cacheTtlMs.detail, isSolutionKitDefinition);

const runsListCacheKey = (kitId?: string | null) =>
  cacheKeys.solutionKitRunsList(kitId ?? "all");

const readRunsListCache = (kitId?: string | null) =>
  readLocalCache(
    runsListCacheKey(kitId),
    cacheTtlMs.list,
    isInstallRunRecordList
  );

const readRunDetailCache = (runId: string) =>
  readLocalCache(cacheKeys.solutionKitRunDetail(runId), cacheTtlMs.detail, isInstallRunDetail);

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

const primeRunsCache = (
  runs: SolutionKitInstallRunRecord[],
  kitId?: string | null
) => {
  writeLocalCache(runsListCacheKey(kitId), runs);
  cachedRunsPromises.delete(runsListCacheKey(kitId));
};

export const clearSolutionKitRunsCache = (kitId?: string | null) => {
  if (kitId) {
    const key = runsListCacheKey(kitId);
    cachedRunsPromises.delete(key);
    clearLocalCache(key);
    return;
  }
  cachedRunsPromises.clear();
};

export async function listSolutionKitRuns(options?: {
  kitId?: SolutionKitId;
  mode?: SolutionKitInstallMode;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (options?.kitId) searchParams.set("kitId", options.kitId);
  if (options?.mode) searchParams.set("mode", options.mode);
  if (typeof options?.limit === "number" && Number.isFinite(options.limit)) {
    searchParams.set("limit", String(options.limit));
  }
  const query = searchParams.toString();
  const path = query.length > 0 ? `/solution-kits/runs?${query}` : "/solution-kits/runs";
  const payload = await apiRequest<{ items: SolutionKitInstallRunRecord[] }>(path, {
    method: "GET",
  });
  return payload.items ?? [];
}

export async function listSolutionKitRunsCached(options?: {
  kitId?: SolutionKitId;
  mode?: SolutionKitInstallMode;
  limit?: number;
  force?: boolean;
}) {
  const key = runsListCacheKey(options?.kitId ?? null);

  if (!options?.force && !options?.mode && typeof options?.limit === "undefined") {
    const cached = readRunsListCache(options?.kitId ?? null);
    if (cached) return cached;
    const pending = cachedRunsPromises.get(key);
    if (pending) return pending;
  }

  const request = listSolutionKitRuns({
    kitId: options?.kitId,
    mode: options?.mode,
    limit: options?.limit,
  });
  cachedRunsPromises.set(key, request);
  const items = await request;
  if (!options?.mode && typeof options?.limit === "undefined") {
    primeRunsCache(items, options?.kitId ?? null);
  } else {
    cachedRunsPromises.delete(key);
  }
  return items;
}

export async function getSolutionKitRun(runId: string) {
  const payload = await apiRequest<SolutionKitRunDetail>(`/solution-kits/runs/${runId}`, {
    method: "GET",
  });
  if (!isInstallRunDetail(payload)) {
    throw new Error("Invalid solution kit run response");
  }
  writeLocalCache(cacheKeys.solutionKitRunDetail(runId), payload);
  return payload;
}

export async function getSolutionKitRunCached(runId: string, options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = readRunDetailCache(runId);
    if (cached) return cached;
  }
  return getSolutionKitRun(runId);
}

const assertInstallResult = (payload: unknown) => {
  if (!isInstallResult(payload)) {
    throw new Error("Invalid solution kit install response");
  }
  return payload;
};

const notifyRunsRefresh = (kitId: SolutionKitId) => {
  const key = runsListCacheKey(kitId);
  clearLocalCache(key);
  cachedRunsPromises.delete(key);
  broadcastCacheEvent({ key, action: "invalidate" });
};

export async function applySolutionKit(
  kitId: SolutionKitId,
  input?: {
    dryRun?: boolean;
    continueOnError?: boolean;
  }
) {
  const payload = await apiRequest<SolutionKitInstallResult>(
    `/solution-kits/${kitId}/apply`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    },
    { withCsrf: true }
  );
  const normalized = assertInstallResult(payload);
  writeLocalCache(cacheKeys.solutionKitRunDetail(normalized.run.id), {
    run: normalized.run,
    items: normalized.items,
  });
  notifyRunsRefresh(kitId);
  return normalized;
}

export async function rollbackSolutionKit(
  kitId: SolutionKitId,
  input?: {
    sourceRunId?: string;
    continueOnError?: boolean;
  }
) {
  const payload = await apiRequest<SolutionKitInstallResult>(
    `/solution-kits/${kitId}/rollback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input ?? {}),
    },
    { withCsrf: true }
  );
  const normalized = assertInstallResult(payload);
  writeLocalCache(cacheKeys.solutionKitRunDetail(normalized.run.id), {
    run: normalized.run,
    items: normalized.items,
  });
  notifyRunsRefresh(kitId);
  return normalized;
}
