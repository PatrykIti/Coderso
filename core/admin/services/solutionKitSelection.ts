import type { SolutionKitId, SolutionKitSummary } from "./solutionKitsClient";
import {
  ADVANCED_MODULE_REGISTRY,
  type AdvancedFeatureFlags,
  type AdvancedModuleId,
} from "@/ui/navigation/advancedModules";

const STORAGE_KEY = "coderso.solutionKits.activeKit.v1";
const LEGACY_STORAGE_KEY = "nextless.solutionKits.activeKit.v1";
const EVENT_NAME = "coderso:solution-kit-selection";
const LEGACY_EVENT_NAME = "nextless:solution-kit-selection";

const solutionKitIds: SolutionKitId[] = [
  "automotive-workshop",
  "medical-clinic",
  "beauty-salon",
  "local-service-business",
  "services-directory",
  "small-ecommerce",
];

const advancedModuleIds = new Set<AdvancedModuleId>(
  ADVANCED_MODULE_REGISTRY.map((module) => module.id)
);
const advancedModulesById = new Map(ADVANCED_MODULE_REGISTRY.map((module) => [module.id, module]));

const isSolutionKitId = (value: unknown): value is SolutionKitId =>
  typeof value === "string" && solutionKitIds.includes(value as SolutionKitId);

const isAdvancedModuleId = (value: unknown): value is AdvancedModuleId =>
  typeof value === "string" && advancedModuleIds.has(value as AdvancedModuleId);

const readStoredValue = () => {
  if (typeof window === "undefined") return null;
  const raw =
    window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (isSolutionKitId(raw) && !window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.setItem(STORAGE_KEY, raw);
  }
  return isSolutionKitId(raw) ? raw : null;
};

const emitSelectionChange = (kitId: SolutionKitId | null) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { kitId },
    })
  );
  window.dispatchEvent(
    new CustomEvent(LEGACY_EVENT_NAME, {
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

export function subscribeActiveSolutionKitId(listener: (kitId: SolutionKitId | null) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return;
    listener(isSolutionKitId(event.newValue) ? event.newValue : null);
  };

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ kitId?: SolutionKitId | null }>).detail;
    listener(isSolutionKitId(detail?.kitId) ? detail.kitId : null);
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener(LEGACY_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener(LEGACY_EVENT_NAME, handleCustomEvent);
  };
}

const collectKitModules = (kit: SolutionKitSummary | null) => {
  if (!kit) return new Set<AdvancedModuleId>(["ai-kit-wizard"]);

  const modules = new Set<AdvancedModuleId>(["ai-kit-wizard"]);
  const addWithDependencies = (moduleId: AdvancedModuleId) => {
    if (modules.has(moduleId)) return;
    modules.add(moduleId);
    const definition = advancedModulesById.get(moduleId);
    for (const dependency of definition?.dependencies ?? []) {
      addWithDependencies(dependency);
    }
  };

  [
    ...kit.recommendedModules,
    ...(kit.manifest?.requiredModules ?? []),
    ...(kit.manifest?.optionalModules ?? []),
  ]
    .filter(isAdvancedModuleId)
    .forEach(addWithDependencies);

  if (modules.has("engine") && modules.has("entries") && modules.has("widgets")) {
    addWithDependencies("custom-screens");
  }

  return modules;
};

export function buildAdvancedFeatureFlagsForSolutionKit(
  kit: SolutionKitSummary | null
): AdvancedFeatureFlags {
  if (!kit) return {};

  const enabledModules = collectKitModules(kit);
  return ADVANCED_MODULE_REGISTRY.reduce<AdvancedFeatureFlags>((result, module) => {
    result[module.id] = enabledModules.has(module.id);
    return result;
  }, {});
}
