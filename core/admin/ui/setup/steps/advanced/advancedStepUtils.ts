// TASK-482-07-L01: shared lifecycle helpers for the optional Advanced-track
// wizard steps. Each advanced step is a thin ADAPTER over an existing dedicated
// settings surface: it loads the masked current config on mount, keeps a local
// form (never routing secrets through the shared wizard `settingsState`), and
// writes back through the SAME client the standalone settings screen uses so
// validation + secret redaction stay in one place.

import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";

/**
 * Secret write-back rule (critical): an untouched secret field must be OMITTED
 * from the payload entirely. The email/storage servers treat an explicit `""`
 * or `null` secret as "clear the stored value", so forwarding an empty string
 * would silently wipe a configured SMTP password / access key. Returns the
 * trimmed value when the operator typed a replacement, or `undefined` (omit)
 * when the field was left blank.
 */
export const stripUnchangedSecret = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Load the masked current config on mount and seed a local, editable form from
 * it. Both `load` and `toForm` MUST be stable references (pass imported/module-
 * level functions, not inline arrows) so the effect runs exactly once. The form
 * seed happens inside the async `.then` — never a synchronous setState in the
 * effect body — per the admin React (ESLint 9 + react-hooks) contract, and
 * `loading` starts `true` so no setState is needed to enter the loading state.
 */
export function useAdapterForm<TData, TForm>(
  load: () => Promise<TData>,
  toForm: (data: TData) => TForm,
  fallbackError: string
) {
  const [data, setData] = useState<TData | null>(null);
  const [form, setForm] = useState<TForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setData(result);
        setForm(toForm(result));
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(isApiClientError(err) ? err.message : fallbackError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, toForm, fallbackError]);

  return { data, form, setForm, loading, loadError };
}

/**
 * Save-status state machine shared by the adapter steps. Surfaces the domain
 * validation codes returned by the underlying route (e.g.
 * `settings_value_invalid`) verbatim at the step banner.
 */
export function useSaveAction() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const run = useCallback(async (action: () => Promise<void>, fallbackError: string) => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await action();
      setSaved(true);
    } catch (err) {
      setSaveError(isApiClientError(err) ? err.message : fallbackError);
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, saveError, saved, run, setSaved };
}
