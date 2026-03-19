import type {
  SolutionKitId,
  SolutionKitSummary,
} from "./solutionKitsClient";
import {
  CODERSO_MODULE_REGISTRY,
  type CodersoFeatureFlags,
  type CodersoModuleId,
} from "@/ui/navigation/codersoModules";

const STORAGE_KEY = "nextless.solutionKits.activeKit.v1";
const EVENT_NAME = "nextless:solution-kit-selection";

const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "services-directory",
  "small-ecommerce",
];

const codersoModuleIds = new Set<CodersoModuleId>(
  CODERSO_MODULE_REGISTRY.map((module) => module.id)
);

const isSolutionKitId = (value: unknown): value is SolutionKitId =>
  typeof value === "string" && solutionKitIds.includes(value as SolutionKitId);

const isCodersoModuleId = (value: unknown): value is CodersoModuleId =>
  typeof value === "string" && codersoModuleIds.has(value as CodersoModuleId);

const readStoredValue = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return isSolutionKitId(raw) ? raw : null;
};

const emitSelectionChange = (kitId: SolutionKitId | null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { kitId },
    })
  );
};

export function getActiveSolutionKitId() {
  return readStoredValue();
}

export function setActiveSolutionKitId(kitId: SolutionKitId | null) {
  if (typeof window === "undefined") return;
  if (kitId) {
    window.localStorage.setItem(STORAGE_KEY, kitId);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emitSelectionChange(kitId);
}

export function subscribeActiveSolutionKitId(
  listener: (kitId: SolutionKitId | null) => void
) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    listener(isSolutionKitId(event.newValue) ? event.newValue : null);
  };

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ kitId?: SolutionKitId | null }>).detail;
    listener(isSolutionKitId(detail?.kitId) ? detail.kitId : null);
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
  };
}

const collectKitModules = (kit: SolutionKitSummary | null) => {
  if (!kit) return new Set<CodersoModuleId>(["ai-kit-wizard"]);

  const modules = new Set<CodersoModuleId>(["ai-kit-wizard"]);
  [
    ...kit.recommendedModules,
    ...(kit.manifest?.requiredModules ?? []),
    ...(kit.manifest?.optionalModules ?? []),
  ]
    .filter(isCodersoModuleId)
    .forEach((moduleId) => modules.add(moduleId));

  return modules;
};

export function buildCodersoFeatureFlagsForSolutionKit(
  kit: SolutionKitSummary | null
): CodersoFeatureFlags {
  if (!kit) return {};

  const enabledModules = collectKitModules(kit);
  return CODERSO_MODULE_REGISTRY.reduce<CodersoFeatureFlags>((result, module) => {
    if (!module.nav) return result;
    result[module.id] = enabledModules.has(module.id);
    return result;
  }, {});
}
