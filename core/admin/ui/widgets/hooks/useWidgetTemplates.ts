import { useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  listWidgetTemplates,
  type WidgetTemplate,
} from "@/services/widgetTemplatesClient";

let cachedTemplates: WidgetTemplate[] | null = null;
let cachedTemplatesError: string | null = null;
let cachedTemplatesPromise: Promise<WidgetTemplate[]> | null = null;

const resolveTemplatesError = (err: unknown) => {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Failed to load widget templates.";
};

export function primeWidgetTemplatesCache(items: WidgetTemplate[]) {
  cachedTemplates = items;
  cachedTemplatesError = null;
  cachedTemplatesPromise = null;
}

export function clearWidgetTemplatesCache() {
  cachedTemplates = null;
  cachedTemplatesError = null;
  cachedTemplatesPromise = null;
}

export function useWidgetTemplates() {
  const [items, setItems] = useState<WidgetTemplate[]>(() => cachedTemplates ?? []);
  const [isLoading, setIsLoading] = useState(() => !cachedTemplates);
  const [error, setError] = useState<string | null>(() => cachedTemplatesError);

  useEffect(() => {
    if (cachedTemplates) return;

    let active = true;
    const request =
      cachedTemplatesPromise ??
      listWidgetTemplates().then((payload) => payload.items ?? []);

    cachedTemplatesPromise = request;

    request
      .then((nextItems) => {
        cachedTemplates = nextItems;
        cachedTemplatesError = null;
        cachedTemplatesPromise = null;
        if (!active) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((err) => {
        cachedTemplatesError = resolveTemplatesError(err);
        cachedTemplatesPromise = null;
        if (!active) return;
        setError(cachedTemplatesError);
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { items, isLoading, error };
}
