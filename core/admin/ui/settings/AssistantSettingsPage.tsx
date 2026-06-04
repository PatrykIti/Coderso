import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiClientError } from "@/services/apiClient";
import {
  getAssistantModelMetadata,
  reindexAssistantDocs,
  type AssistantModelMetadataResponse,
} from "@/services/assistantClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { useRegisterSettingsDirty } from "@/ui/settings/SettingsDirtyNavigation";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import { AssistantSettingsCard } from "./AssistantSettingsCard";
import { SettingsSidebar } from "./SettingsSidebar";
import { ASSISTANT_SETTINGS_DEFAULT_VALUES, type AssistantSettingsValues } from "./settingsValues";

export type AssistantSettingsPageProps = {
  values?: Partial<AssistantSettingsValues>;
  onSave?: (values: AssistantSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

const resolveAssistantValidationError = (input: AssistantSettingsValues): string | null => {
  if (
    input.assistantDefaultMode === "llm-guide" &&
    (!input.assistantLlmEnabled || input.assistantLlmProvider === "none")
  ) {
    return "LLM Guide requires enabled LLM and a provider different than 'none'.";
  }
  return null;
};

const normalizeAssistantSettingsValues = (
  input: Partial<AssistantSettingsValues>
): AssistantSettingsValues => {
  const rawMode = input.assistantDefaultMode as unknown;
  return {
    ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
    ...input,
    assistantDefaultMode:
      rawMode === "llm-rag"
        ? "llm-guide"
        : rawMode === "llm-guide" || rawMode === "docs-only"
          ? rawMode
          : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDefaultMode,
    assistantLlmProvider:
      input.assistantLlmProvider === "openai" ||
      input.assistantLlmProvider === "openrouter" ||
      input.assistantLlmProvider === "none"
        ? input.assistantLlmProvider
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmProvider,
    assistantLlmModel:
      typeof input.assistantLlmModel === "string"
        ? input.assistantLlmModel
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmModel,
  };
};

export function AssistantSettingsPage({
  values = ASSISTANT_SETTINGS_DEFAULT_VALUES,
  onSave,
  isLoading = false,
  isSaving = false,
  error = null,
}: AssistantSettingsPageProps) {
  const persistedValues = (() => {
    return {
      ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
      ...values,
    };
  })();

  const [formState, setFormState] = useState(() => ({
    source: values,
    form: normalizeAssistantSettingsValues(values),
    savedForm: normalizeAssistantSettingsValues(values),
  }));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [reindexSuccess, setReindexSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexReviewOpen, setReindexReviewOpen] = useState(false);
  const [modelMetadata, setModelMetadata] = useState<AssistantModelMetadataResponse | null>(null);
  const [modelMetadataError, setModelMetadataError] = useState<string | null>(null);
  const [isModelMetadataLoading, setIsModelMetadataLoading] = useState(false);
  const lastAutoLimitValuesRef = useRef<{
    key: string;
    maxInputTokens: number;
    maxOutputTokens: number;
  } | null>(null);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } = useSettingsAutoSave();

  const form =
    formState.source === values ? formState.form : normalizeAssistantSettingsValues(values);
  const savedForm =
    formState.source === values ? formState.savedForm : normalizeAssistantSettingsValues(values);
  const setForm = useCallback(
    (
      next:
        | AssistantSettingsValues
        | ((previous: AssistantSettingsValues) => AssistantSettingsValues)
    ) => {
      setFormState((previous) => {
        const current =
          previous.source === values ? previous.form : normalizeAssistantSettingsValues(values);
        const saved =
          previous.source === values
            ? previous.savedForm
            : normalizeAssistantSettingsValues(values);
        return {
          source: values,
          form: typeof next === "function" ? next(current) : next,
          savedForm: saved,
        };
      });
    },
    [values]
  );
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  useRegisterSettingsDirty(isDirty);

  const validationError = resolveAssistantValidationError(form);
  const hasValidationErrors = Boolean(validationError);
  const latestFormRef = useRef(form);

  useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!onSave) return false;
    if (hasValidationErrors) return false;
    setSaveError(null);
    setSaveSuccess(null);
    setLocalSaving(true);
    try {
      await onSave(form);
      setFormState({
        source: values,
        form,
        savedForm: form,
      });
      setSaveSuccess("Assistant settings updated.");
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save assistant settings.");
      }
      return false;
    } finally {
      setLocalSaving(false);
    }
  }, [form, hasValidationErrors, onSave, values]);

  const handleReindex = useCallback(async () => {
    setReindexError(null);
    setReindexSuccess(null);

    if (!persistedValues.assistantEnabled) {
      setReindexError("Enable assistant in saved settings before running reindex.");
      return false;
    }

    setIsReindexing(true);
    try {
      const result = await reindexAssistantDocs();
      setReindexSuccess(
        `Assistant docs reindexed: ${result.docCount} docs, ${result.chunkCount} chunks.`
      );
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setReindexError(err.message);
      } else {
        setReindexError("Failed to run assistant reindex.");
      }
      return false;
    } finally {
      setIsReindexing(false);
    }
  }, [persistedValues.assistantEnabled]);

  const modelMetadataRequestKey =
    form.assistantLlmEnabled &&
    form.assistantLlmProvider === "openrouter" &&
    form.assistantLlmModel.trim().length > 0
      ? `${form.assistantLlmProvider}:${form.assistantLlmModel.trim()}`
      : null;

  useEffect(() => {
    let active = true;

    void (async () => {
      await Promise.resolve();

      if (!modelMetadataRequestKey) {
        if (!active) return;
        setModelMetadata(null);
        setModelMetadataError(null);
        setIsModelMetadataLoading(false);
        return;
      }

      const requestForm = latestFormRef.current;
      const requestModel = requestForm.assistantLlmModel.trim();
      const requestInputTokens = requestForm.assistantLlmMaxInputTokens;
      const requestOutputTokens = requestForm.assistantLlmMaxOutputTokens;

      setIsModelMetadataLoading(true);
      setModelMetadataError(null);

      try {
        const metadata = await getAssistantModelMetadata({
          provider: "openrouter",
          model: requestModel,
        });
        if (!active) return;
        setModelMetadata(metadata);
        setFormState((previous) => {
          const current =
            previous.source === values ? previous.form : normalizeAssistantSettingsValues(values);
          if (
            current.assistantLlmProvider !== "openrouter" ||
            current.assistantLlmModel.trim() !== requestModel
          ) {
            return previous;
          }

          const lastAuto = lastAutoLimitValuesRef.current;
          const canApplyProviderLimits =
            (current.assistantLlmMaxInputTokens === requestInputTokens &&
              current.assistantLlmMaxOutputTokens === requestOutputTokens) ||
            (lastAuto?.key === modelMetadataRequestKey &&
              current.assistantLlmMaxInputTokens === lastAuto.maxInputTokens &&
              current.assistantLlmMaxOutputTokens === lastAuto.maxOutputTokens);

          if (!canApplyProviderLimits) return previous;

          lastAutoLimitValuesRef.current = {
            key: modelMetadataRequestKey,
            maxInputTokens: metadata.maxInputTokens,
            maxOutputTokens: metadata.maxOutputTokens,
          };

          return {
            source: values,
            form: {
              ...current,
              assistantLlmMaxInputTokens: metadata.maxInputTokens,
              assistantLlmMaxOutputTokens: metadata.maxOutputTokens,
            },
            savedForm:
              previous.source === values
                ? previous.savedForm
                : normalizeAssistantSettingsValues(values),
          };
        });
      } catch (err) {
        if (!active) return;
        setModelMetadata(null);
        setModelMetadataError(
          isApiClientError(err) ? err.message : "Could not read OpenRouter model limits."
        );
      } finally {
        if (active) {
          setIsModelMetadataLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [modelMetadataRequestKey, values]);

  const handleRefreshModelMetadata = useCallback(() => {
    const requestModel = latestFormRef.current.assistantLlmModel.trim();
    if (!requestModel) return;
    setIsModelMetadataLoading(true);
    setModelMetadataError(null);
    getAssistantModelMetadata({
      provider: "openrouter",
      model: requestModel,
    })
      .then((metadata) => {
        setModelMetadata(metadata);
        setForm((previous) => ({
          ...previous,
          assistantLlmMaxInputTokens: metadata.maxInputTokens,
          assistantLlmMaxOutputTokens: metadata.maxOutputTokens,
        }));
      })
      .catch((err) => {
        setModelMetadata(null);
        setModelMetadataError(
          isApiClientError(err) ? err.message : "Could not read OpenRouter model limits."
        );
      })
      .finally(() => setIsModelMetadataLoading(false));
  }, [setForm]);

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: !isLoading,
    hasErrors: hasValidationErrors,
    value: form,
    onSave: handleSave,
  });

  const busy = isLoading || isSaving || localSaving || isReindexing;
  const disableSave = busy || hasValidationErrors;

  return (
    <SettingsShell
      activeHref="/admin/settings/assistant"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="assistant" />}
      breadcrumbs={["Settings", "Assistant"]}
      topbarActions={null}
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
            {reindexError ? (
              <Alert variant="destructive">
                <AlertTitle>Reindex failed</AlertTitle>
                <AlertDescription>{reindexError}</AlertDescription>
              </Alert>
            ) : null}
            {saveSuccess ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{saveSuccess}</AlertDescription>
              </Alert>
            ) : null}
            {reindexSuccess ? (
              <Alert>
                <AlertTitle>Reindex complete</AlertTitle>
                <AlertDescription>{reindexSuccess}</AlertDescription>
              </Alert>
            ) : null}

            <AssistantSettingsCard
              values={form}
              onChange={(patch) =>
                setForm((prev) => ({
                  ...prev,
                  ...patch,
                }))
              }
              disabled={busy}
              modelMetadata={modelMetadata}
              modelMetadataError={modelMetadataError}
              isModelMetadataLoading={isModelMetadataLoading}
              onRefreshModelMetadata={handleRefreshModelMetadata}
              onRunReindex={() => setReindexReviewOpen(true)}
              isReindexing={isReindexing}
              reindexDisabled={busy || !persistedValues.assistantEnabled}
            />
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
              <Button size="sm" className="gap-2" onClick={handleSave} disabled={disableSave}>
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmActionDialog
        open={reindexReviewOpen}
        onOpenChange={setReindexReviewOpen}
        title="Run assistant reindex?"
        description="This rebuilds the assistant documentation index from the saved guide corpus."
        targetLabel="docs/guide"
        confirmLabel="Run reindex"
        confirmingLabel="Reindexing..."
        tone="warning"
        closeOnSuccess
        onConfirm={async () => {
          await handleReindex();
        }}
      >
        Reindexing can affect the answers returned by the assistant once the new index is active.
      </ConfirmActionDialog>
    </SettingsShell>
  );
}
