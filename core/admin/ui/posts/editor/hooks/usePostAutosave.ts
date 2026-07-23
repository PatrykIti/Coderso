import { useCallback, useEffect, useRef } from "react";

type UsePostAutosaveOptions = {
  enabled: boolean;
  dirty: boolean;
  signature: string;
  delayMs?: number;
  onAutosave: () => Promise<void>;
};

export type UsePostAutosaveResult = {
  cancel: () => void;
  flush: () => Promise<void>;
};

export function usePostAutosave({
  enabled,
  dirty,
  signature,
  delayMs = 1800,
  onAutosave,
}: UsePostAutosaveOptions): UsePostAutosaveResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onAutosaveRef = useRef(onAutosave);

  useEffect(() => {
    onAutosaveRef.current = onAutosave;
  }, [onAutosave]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    cancel();
    if (!enabled || !dirty) return;
    await onAutosaveRef.current();
  }, [cancel, dirty, enabled]);

  useEffect(() => {
    if (!enabled || !dirty) {
      cancel();
      return;
    }

    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void onAutosaveRef.current().catch(() => undefined);
    }, delayMs);

    return cancel;
  }, [cancel, delayMs, dirty, enabled, signature]);

  useEffect(() => cancel, [cancel]);

  return { cancel, flush };
}
