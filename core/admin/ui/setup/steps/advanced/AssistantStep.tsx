import { useCallback } from "react";

import {
  getSettingsCached,
  updateSettings,
  type AssistantSettingsPayload,
  type SettingsResponse,
} from "@/services/settingsClient";
import {
  AssistantSettingsCard,
  ASSISTANT_SETTINGS_DEFAULT_VALUES,
  type AssistantSettingsValues,
} from "@/ui/settings/AssistantSettingsCard";

import type { WizardStepBodyProps } from "../stepTypes";
import { AdvancedStepShell } from "./AdvancedStepShell";
import { useAdapterForm, useSaveAction } from "./advancedStepUtils";

// TASK-482-07-L01: Advanced-track Assistant step. Composes the EXISTING
// `AssistantSettingsCard` (single source of the assistant fields + validation)
// and writes the `assistant.*` keys through the same bulk `PATCH /settings`
// (updateSettings) that the standalone screen and AdminApp's saveAssistantSettings
// use. The `assistant.*` keys carry NO secrets; provider API keys live in the
// Integrations surface (the card links to it) and are never entered here.

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const asPositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const toForm = (settings: SettingsResponse): AssistantSettingsValues => ({
  assistantEnabled: asBoolean(
    settings["assistant.enabled"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantEnabled
  ),
  assistantLauncherAvatarEnabled: asBoolean(
    settings["assistant.launcher.avatarEnabled"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLauncherAvatarEnabled
  ),
  assistantLauncherAvatarAsset:
    typeof settings["assistant.launcher.avatarAsset"] === "string"
      ? (settings["assistant.launcher.avatarAsset"] as string)
      : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLauncherAvatarAsset,
  assistantDefaultMode:
    settings["assistant.defaultMode"] === "llm-guide"
      ? "llm-guide"
      : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDefaultMode,
  assistantDocsReindexOnBoot: asBoolean(
    settings["assistant.docs.reindexOnBoot"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantDocsReindexOnBoot
  ),
  assistantLlmEnabled: asBoolean(
    settings["assistant.llm.enabled"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmEnabled
  ),
  assistantLlmProvider:
    settings["assistant.llm.provider"] === "openai" ||
    settings["assistant.llm.provider"] === "openrouter"
      ? settings["assistant.llm.provider"]
      : ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmProvider,
  assistantLlmModel: asString(
    settings["assistant.llm.model"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmModel
  ),
  assistantLlmMaxInputTokens: asPositiveInteger(
    settings["assistant.llm.maxInputTokens"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmMaxInputTokens
  ),
  assistantLlmMaxOutputTokens: asPositiveInteger(
    settings["assistant.llm.maxOutputTokens"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmMaxOutputTokens
  ),
  assistantLlmTimeoutMs: asPositiveInteger(
    settings["assistant.llm.timeoutMs"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmTimeoutMs
  ),
  assistantQuotaRequestsPerMinute: asPositiveInteger(
    settings["assistant.quotas.requestsPerMinute"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantQuotaRequestsPerMinute
  ),
  assistantQuotaRequestsPerDay: asPositiveInteger(
    settings["assistant.quotas.requestsPerDay"],
    ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantQuotaRequestsPerDay
  ),
});

// Mirrors AdminApp's `buildAssistantSettingsUpdate` — the canonical `assistant.*`
// key mapping (no secrets among them).
const toPayload = (values: AssistantSettingsValues): AssistantSettingsPayload => ({
  "assistant.enabled": values.assistantEnabled,
  "assistant.defaultMode": values.assistantDefaultMode,
  "assistant.docs.reindexOnBoot": values.assistantDocsReindexOnBoot,
  "assistant.launcher.avatarEnabled": values.assistantLauncherAvatarEnabled,
  "assistant.launcher.avatarAsset":
    values.assistantLauncherAvatarAsset.trim().length > 0
      ? values.assistantLauncherAvatarAsset.trim()
      : null,
  "assistant.llm.enabled": values.assistantLlmEnabled,
  "assistant.llm.provider": values.assistantLlmProvider,
  "assistant.llm.model": values.assistantLlmModel,
  "assistant.llm.maxInputTokens": values.assistantLlmMaxInputTokens,
  "assistant.llm.maxOutputTokens": values.assistantLlmMaxOutputTokens,
  "assistant.llm.timeoutMs": values.assistantLlmTimeoutMs,
  "assistant.quotas.requestsPerMinute": values.assistantQuotaRequestsPerMinute,
  "assistant.quotas.requestsPerDay": values.assistantQuotaRequestsPerDay,
});

const loadAssistantSettings = () => getSettingsCached();

export function AssistantStep({ disabled }: WizardStepBodyProps) {
  const { form, setForm, loading, loadError } = useAdapterForm(
    loadAssistantSettings,
    toForm,
    "Failed to load assistant settings."
  );
  const { saving, saveError, saved, run } = useSaveAction();

  const handleSave = useCallback(() => {
    if (!form) return;
    void run(async () => {
      await updateSettings(toPayload(form));
    }, "Failed to save assistant settings.");
  }, [form, run]);

  return (
    <AdvancedStepShell
      loading={loading}
      loadError={loadError}
      saving={saving}
      saveError={saveError}
      saved={saved}
      savedLabel="Assistant settings saved."
      onSave={handleSave}
      disabled={disabled}
    >
      {form ? (
        <AssistantSettingsCard
          values={form}
          onChange={(patch) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))}
          disabled={disabled}
        />
      ) : null}
    </AdvancedStepShell>
  );
}
