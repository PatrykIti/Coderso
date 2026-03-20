import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { isApiClientError } from "@/services/apiClient";
import { reindexAssistantDocs } from "@/services/assistantClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import {
  AssistantSettingsCard,
  ASSISTANT_SETTINGS_DEFAULT_VALUES,
  type AssistantSettingsValues,
} from "./AssistantSettingsCard";
import { SettingsSidebar } from "./SettingsSidebar";

export type AssistantSettingsPageProps = {
  values?: Partial<AssistantSettingsValues>;
  onSave?: (values: AssistantSettingsValues) => Promise<void> | void;
  isLoading?: boolean;
  isSaving?: boolean;
  error?: string | null;
};

const resolveAssistantValidationError = (
  input: AssistantSettingsValues
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

export function AssistantSettingsPage({
  values = ASSISTANT_SETTINGS_DEFAULT_VALUES,
  onSave,
  isLoading = false,
  isSaving = false,
  error = null,
}: AssistantSettingsPageProps) {
  const normalizeValues = (input: Partial<AssistantSettingsValues>) => ({
    ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
    ...input,
    assistantDocsBackend:
      input.assistantDocsBackend === "db" || input.assistantDocsBackend === "filesystem"
        ? input.assistantDocsBackend
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDocsBackend,
    assistantDocsSourceRoot:
      typeof input.assistantDocsSourceRoot === "string" &&
      input.assistantDocsSourceRoot.trim().length > 0
        ? input.assistantDocsSourceRoot
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDocsSourceRoot,
    assistantDocsPaths: Array.isArray(input.assistantDocsPaths)
      ? input.assistantDocsPaths.filter((entry) => typeof entry === "string")
      : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDocsPaths,
    assistantDefaultMode:
      input.assistantDefaultMode === "llm-rag" || input.assistantDefaultMode === "docs-only"
        ? input.assistantDefaultMode
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDefaultMode,
    assistantLlmProvider:
      input.assistantLlmProvider === "openrouter" || input.assistantLlmProvider === "none"
        ? input.assistantLlmProvider
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmProvider,
    assistantLlmModel:
      typeof input.assistantLlmModel === "string"
        ? input.assistantLlmModel
        : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmModel,
  });

  const [form, setForm] = useState(() => normalizeValues(values));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [reindexError, setReindexError] = useState<string | null>(null);
  const [reindexSuccess, setReindexSuccess] = useState<string | null>(null);
  const [localSaving, setLocalSaving] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();

  const validationError = resolveAssistantValidationError(form);
  const hasValidationErrors = Boolean(validationError);

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
  }, [form, hasValidationErrors, onSave]);

  const handleReindex = useCallback(async () => {
    setReindexError(null);
    setReindexSuccess(null);

    if (hasValidationErrors) return false;
    if (!form.assistantEnabled) {
      setReindexError("Enable assistant before running reindex.");
      return false;
    }

    if (onSave) {
      const saved = await handleSave();
      if (!saved) return false;
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
  }, [form.assistantEnabled, handleSave, hasValidationErrors, onSave]);

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
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            Assistant Settings
          </span>
          <span className="text-xs text-muted-foreground">
            Control Doc Navigator defaults and LLM behavior
          </span>
        </div>
      }
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleReindex()}
                disabled={disableSave || !form.assistantEnabled}
              >
                {isReindexing ? "Reindexing..." : "Run reindex"}
              </Button>
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
