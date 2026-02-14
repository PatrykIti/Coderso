import { useEffect, useState } from "react";

import { clearSessionCache, readSessionCache, writeSessionCache } from "@/utils/sessionCache";
import { isApiClientError } from "@/services/apiClient";
import {
  listWidgetTemplates,
  type WidgetTemplate,
} from "@/services/widgetTemplatesClient";

let cachedTemplates: WidgetTemplate[] | null = null;
let cachedTemplatesError: string | null = null;
let cachedTemplatesPromise: Promise<WidgetTemplate[]> | null = null;

const isWidgetTemplateList = (value: unknown): value is WidgetTemplate[] =>
  Array.isArray(value);

const WIDGET_TEMPLATES_CACHE_KEY = "nextless.widgetTemplatesCache";
const WIDGET_TEMPLATES_CACHE_TTL_MS = 5 * 60 * 1000;

const readTemplatesCache = () =>
  readSessionCache<WidgetTemplate[]>(
    WIDGET_TEMPLATES_CACHE_KEY,
    WIDGET_TEMPLATES_CACHE_TTL_MS,
    isWidgetTemplateList
  );

const getCachedTemplates = () => {
  if (cachedTemplates) return cachedTemplates;
  const cached = readTemplatesCache();
  if (cached) cachedTemplates = cached;
  return cachedTemplates;
};

const writeTemplatesCache = (items: WidgetTemplate[]) => {
  writeSessionCache(WIDGET_TEMPLATES_CACHE_KEY, items);
};

const resolveTemplatesError = (err: unknown) => {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Failed to load widget templates.";
};

export function primeWidgetTemplatesCache(items: WidgetTemplate[]) {
  cachedTemplates = items;
  cachedTemplatesError = null;
  cachedTemplatesPromise = null;
  writeTemplatesCache(items);
}

export function clearWidgetTemplatesCache() {
  cachedTemplates = null;
  cachedTemplatesError = null;
  cachedTemplatesPromise = null;
  clearSessionCache(WIDGET_TEMPLATES_CACHE_KEY);
}

export function useWidgetTemplates() {
  const [items, setItems] = useState<WidgetTemplate[]>(() => getCachedTemplates() ?? []);
  const [isLoading, setIsLoading] = useState(() => !getCachedTemplates());
  const [error, setError] = useState<string | null>(() => cachedTemplatesError);

  useEffect(() => {
    let active = true;
    const cached = getCachedTemplates();
    if (cached) {
      setItems(cached);
      setIsLoading(false);
    }

    const request =
      cachedTemplatesPromise ??
      listWidgetTemplates().then((payload) => payload.items ?? []);

    cachedTemplatesPromise = request;

    request
      .then((nextItems) => {
        cachedTemplates = nextItems;
        cachedTemplatesError = null;
        cachedTemplatesPromise = null;
        writeTemplatesCache(nextItems);
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
