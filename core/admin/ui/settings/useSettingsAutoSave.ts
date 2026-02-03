import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "nextless.settings.autosave";

export type AutoSaveState = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
};

export type AutoSaveEffectOptions<T> = {
  enabled: boolean;
  isReady?: boolean;
  hasErrors?: boolean;
  value: T;
  onSave: () => Promise<boolean> | boolean;
  delayMs?: number;
};

export function useSettingsAutoSave(): AutoSaveState {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return;
    setEnabled(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent("settings:autosave", { detail: { enabled } })
    );
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setEnabled(event.newValue === "true");
    };
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      if (detail && typeof detail.enabled === "boolean") {
        setEnabled(detail.enabled);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("settings:autosave", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("settings:autosave", handleCustom);
    };
  }, []);

  const setEnabledStable = useCallback((value: boolean) => {
    setEnabled(value);
  }, []);

  return useMemo(
    () => ({ enabled, setEnabled: setEnabledStable }),
    [enabled, setEnabledStable]
  );
}

export function useAutoSaveEffect<T>({
  enabled,
  isReady = true,
  hasErrors = false,
  value,
  onSave,
  delayMs = 800,
}: AutoSaveEffectOptions<T>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !isReady || hasErrors) return;

    const snapshot = JSON.stringify(value);
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSavedRef.current = snapshot;
      return;
    }

    if (snapshot === lastSavedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await onSave();
        if (result !== false) {
          lastSavedRef.current = snapshot;
        }
      } catch {
        // Keep lastSavedRef as-is to retry on next change.
      }
    }, delayMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, isReady, hasErrors, value, onSave, delayMs]);
}
