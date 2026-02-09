import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiClientError } from "@/services/apiClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import {
  AssistantSettingsCard,
  type AssistantSettingsValues,
} from "./AssistantSettingsCard";
import { BrandingCard } from "./BrandingCard";
import { LogoUploadCard } from "./LogoUploadCard";
import { SettingsSidebar } from "./SettingsSidebar";

export type GeneralSettingsValues = AssistantSettingsValues & {
  siteName: string;
  siteLocale: string;
  publicBaseUrl: string;
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
  publicBaseUrl: "",
  assistantEnabled: false,
  assistantDefaultMode: "docs-only",
  assistantDocsBackend: "filesystem",
  assistantDocsSourceRoot: "_docs/_internal",
  assistantDocsPaths: ["_docs"],
  assistantDocsReindexOnBoot: false,
  assistantLlmEnabled: false,
  assistantLlmProvider: "none",
  assistantLlmModel: "google/gemma-3n-e2b-it:free",
  assistantLlmMaxInputTokens: 8192,
  assistantLlmMaxOutputTokens: 2048,
  assistantLlmTimeoutMs: 20000,
  assistantQuotaRequestsPerMinute: 20,
  assistantQuotaRequestsPerDay: 1000,
};

const resolveAssistantValidationError = (
  input: GeneralSettingsValues
): string | null => {
  if (input.assistantEnabled && input.assistantDocsPaths.length === 0) {
    return "Assistant docs paths cannot be empty when assistant is enabled.";
  }
  if (!input.assistantDocsSourceRoot.trim()) {
    return "Assistant docs source root cannot be empty.";
  }
  if (
    input.assistantDefaultMode === "llm-rag" &&
    (!input.assistantLlmEnabled || input.assistantLlmProvider === "none")
  ) {
    return "LLM mode requires enabled LLM and a provider different than 'none'.";
  }
  return null;
};

const resolvePublicBaseUrlValidationError = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Public Site URL must use http or https.";
    }
    return null;
  } catch {
    return "Enter a valid URL (for example: https://example.com).";
  }
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
    publicBaseUrl:
      input.publicBaseUrl ?? GENERAL_SETTINGS_DEFAULT_VALUES.publicBaseUrl,
    assistantEnabled:
      input.assistantEnabled ?? GENERAL_SETTINGS_DEFAULT_VALUES.assistantEnabled,
    assistantDefaultMode:
      input.assistantDefaultMode ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantDefaultMode,
    assistantDocsBackend:
      input.assistantDocsBackend === "db" || input.assistantDocsBackend === "filesystem"
        ? input.assistantDocsBackend
        : GENERAL_SETTINGS_DEFAULT_VALUES.assistantDocsBackend,
    assistantDocsSourceRoot:
      typeof input.assistantDocsSourceRoot === "string" &&
      input.assistantDocsSourceRoot.trim().length > 0
        ? input.assistantDocsSourceRoot
        : GENERAL_SETTINGS_DEFAULT_VALUES.assistantDocsSourceRoot,
    assistantDocsPaths: Array.isArray(input.assistantDocsPaths)
      ? input.assistantDocsPaths.filter((entry) => typeof entry === "string")
      : GENERAL_SETTINGS_DEFAULT_VALUES.assistantDocsPaths,
    assistantDocsReindexOnBoot:
      input.assistantDocsReindexOnBoot ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantDocsReindexOnBoot,
    assistantLlmEnabled:
      input.assistantLlmEnabled ?? GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmEnabled,
    assistantLlmProvider:
      input.assistantLlmProvider ?? GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmProvider,
    assistantLlmModel:
      input.assistantLlmModel ?? GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmModel,
    assistantLlmMaxInputTokens:
      input.assistantLlmMaxInputTokens ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmMaxInputTokens,
    assistantLlmMaxOutputTokens:
      input.assistantLlmMaxOutputTokens ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmMaxOutputTokens,
    assistantLlmTimeoutMs:
      input.assistantLlmTimeoutMs ?? GENERAL_SETTINGS_DEFAULT_VALUES.assistantLlmTimeoutMs,
    assistantQuotaRequestsPerMinute:
      input.assistantQuotaRequestsPerMinute ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantQuotaRequestsPerMinute,
    assistantQuotaRequestsPerDay:
      input.assistantQuotaRequestsPerDay ??
      GENERAL_SETTINGS_DEFAULT_VALUES.assistantQuotaRequestsPerDay,
  });

  const [form, setForm] = useState(() => normalizeValues(values));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();

  const validationError = resolveAssistantValidationError(form);
  const publicBaseUrlError = resolvePublicBaseUrlValidationError(form.publicBaseUrl);
  const hasValidationErrors = Boolean(validationError || publicBaseUrlError);

  useEffect(() => {
    setForm(normalizeValues(values));
  }, [values]);

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
          <span className="hidden md:inline">
            Use the Assistant button in top bar to test Doc Navigator replies.
          </span>
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
            {validationError ? (
              <Alert variant="destructive">
                <AlertTitle>Validation error</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            ) : null}
            {publicBaseUrlError ? (
              <Alert variant="destructive">
                <AlertTitle>URL validation error</AlertTitle>
                <AlertDescription>{publicBaseUrlError}</AlertDescription>
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
              publicBaseUrl={form.publicBaseUrl}
              publicBaseUrlError={publicBaseUrlError}
              onChange={(next) =>
                setForm((prev) => ({
                  ...prev,
                  siteName: next.siteName,
                  siteLocale: next.siteLocale,
                  publicBaseUrl: next.publicBaseUrl,
                }))
              }
              disabled={busy}
            />
            <AssistantSettingsCard
              values={{
                assistantEnabled: form.assistantEnabled,
                assistantDefaultMode: form.assistantDefaultMode,
                assistantDocsBackend: form.assistantDocsBackend,
                assistantDocsSourceRoot: form.assistantDocsSourceRoot,
                assistantDocsPaths: form.assistantDocsPaths,
                assistantDocsReindexOnBoot: form.assistantDocsReindexOnBoot,
                assistantLlmEnabled: form.assistantLlmEnabled,
                assistantLlmProvider: form.assistantLlmProvider,
                assistantLlmModel: form.assistantLlmModel,
                assistantLlmMaxInputTokens: form.assistantLlmMaxInputTokens,
                assistantLlmMaxOutputTokens: form.assistantLlmMaxOutputTokens,
                assistantLlmTimeoutMs: form.assistantLlmTimeoutMs,
                assistantQuotaRequestsPerMinute: form.assistantQuotaRequestsPerMinute,
                assistantQuotaRequestsPerDay: form.assistantQuotaRequestsPerDay,
              }}
              onChange={(patch) =>
                setForm((prev) => ({
                  ...prev,
                  ...patch,
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
