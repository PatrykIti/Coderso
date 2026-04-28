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
  const initialCached = getCachedWidgetTemplates();
  const [items, setItems] = useState<WidgetTemplate[]>(() =>
    initialCached ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !initialCached);
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
    let active = true;
    listWidgetTemplatesCached({ force: true })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(resolveTemplatesError(err));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.widgetTemplatesList) return;
      refresh(true).catch(() => undefined);
    });
  }, [refresh]);

  return { items, isLoading, error };
}
