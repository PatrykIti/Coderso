import { useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiClientError } from "@/services/apiClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";
import { BrandingCard } from "./BrandingCard";
import { LogoUploadCard } from "./LogoUploadCard";
import { SettingsSidebar } from "./SettingsSidebar";

export type GeneralSettingsValues = {
  siteName: string;
  siteLocale: string;
};

type GeneralSettingsPageProps = {
  values?: Partial<GeneralSettingsValues>;
  onSave?: (values: GeneralSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

export const GENERAL_SETTINGS_DEFAULT_VALUES: GeneralSettingsValues = {
  siteName: "Nextless",
  siteLocale: "en",
};

export function GeneralSettingsPage({
  values = GENERAL_SETTINGS_DEFAULT_VALUES,
  onSave,
  isLoading = false,
  isSaving = false,
  error = null,
}: GeneralSettingsPageProps) {
  const normalizeValues = (input: Partial<GeneralSettingsValues>) => ({
    ...GENERAL_SETTINGS_DEFAULT_VALUES,
    ...input,
    siteName: input.siteName ?? GENERAL_SETTINGS_DEFAULT_VALUES.siteName,
    siteLocale: input.siteLocale ?? GENERAL_SETTINGS_DEFAULT_VALUES.siteLocale,
  });

  const [formState, setFormState] = useState(() => ({
    source: values,
    form: normalizeValues(values),
  }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();

  const hasValidationErrors = false;

  const form =
    formState.source === values ? formState.form : normalizeValues(values);
  const setForm = (
    next:
      | GeneralSettingsValues
      | ((previous: GeneralSettingsValues) => GeneralSettingsValues)
  ) => {
    setFormState((previous) => {
      const current =
        previous.source === values ? previous.form : normalizeValues(values);
      return {
        source: values,
        form: typeof next === "function" ? next(current) : next,
      };
    });
  };

  const handleSave = useCallback(async () => {
    if (!onSave) return false;
    if (hasValidationErrors) return false;
    setSaveError(null);
    setSaveSuccess(null);
    setLocalSaving(true);
    try {
      await onSave(form);
      setSaveSuccess("General settings updated.");
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save general settings.");
      }
      return false;
    } finally {
      setLocalSaving(false);
    }
  }, [form, hasValidationErrors, onSave]);

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: !isLoading,
    hasErrors: hasValidationErrors,
    value: form,
    onSave: handleSave,
  });

  const busy = isLoading || isSaving || localSaving;
  const disableSave = busy || hasValidationErrors;

  return (
    <SettingsShell
      activeHref="/admin/settings"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="general" />}
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            General Settings
          </span>
          <span className="text-xs text-muted-foreground">
            Manage your global site configuration and preferences
          </span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{busy ? "Saving changes..." : "Manage site identity and branding"}</span>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 pb-28">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saveError ? (
              <Alert variant="destructive">
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}
            <BrandingCard
              siteName={form.siteName}
              siteLocale={form.siteLocale}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  siteName: next.siteName,
                  siteLocale: next.siteLocale,
                }))
              }
              disabled={busy}
            />
            <LogoUploadCard />
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoSaveEnabled}
                onCheckedChange={(checked) => setAutoSaveEnabled(Boolean(checked))}
                disabled={busy}
              />
              <span>Auto-save settings across all screens</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={disableSave}
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
