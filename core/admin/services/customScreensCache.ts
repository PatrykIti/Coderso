import { clearLocalCache } from "@/utils/storageCache";
import { cacheKeys } from "@/services/cachePolicy";

const customScreensMemoryInvalidators = new Set<() => void>();

export function registerCustomScreensCacheInvalidator(invalidator: () => void) {
  customScreensMemoryInvalidators.add(invalidator);
  return () => {
    customScreensMemoryInvalidators.delete(invalidator);
  };
}

export function clearCustomScreensCacheLightweight() {
  for (const invalidate of customScreensMemoryInvalidators) {
    try {
      invalidate();
    } catch {
      // A failing invalidator must not prevent later invalidators from running.
    }
  }
  clearLocalCache(cacheKeys.customScreensList);
}

export const clearCustomScreensBrowserCache = () => {
  clearLocalCache(cacheKeys.customScreensList);
};

export const clearCustomScreenDetailBrowserCache = (id: string) => {
  clearLocalCache(cacheKeys.customScreenDetail(id));
};
