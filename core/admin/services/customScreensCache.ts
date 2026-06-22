import { clearLocalCache } from "@/utils/storageCache";
import { cacheKeys } from "@/services/cachePolicy";

export const clearCustomScreensBrowserCache = () => {
  clearLocalCache(cacheKeys.customScreensList);
};

export const clearCustomScreenDetailBrowserCache = (id: string) => {
  clearLocalCache(cacheKeys.customScreenDetail(id));
};
