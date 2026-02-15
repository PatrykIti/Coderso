import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedWidgetTemplates,
  listWidgetTemplatesCached,
  type WidgetTemplate,
} from "@/services/widgetTemplatesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveTemplatesError = (err: unknown) => {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Failed to load widget templates.";
};

export function useWidgetTemplates() {
  const [items, setItems] = useState<WidgetTemplate[]>(() =>
    getCachedWidgetTemplates() ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedWidgetTemplates());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listWidgetTemplatesCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (err) {
      setError(resolveTemplatesError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = getCachedWidgetTemplates();
    if (cached) {
      setItems(cached);
      setIsLoading(false);
    }
    refresh(true).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.widgetTemplatesList) return;
      refresh(true).catch(() => undefined);
    });
  }, [refresh]);

  return { items, isLoading, error };
}
