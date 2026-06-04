export type GeneralSettingsValues = {
  siteName: string;
  siteLocale: string;
};

export type AssistantSettingsValues = {
  assistantEnabled: boolean;
  assistantLauncherAvatarEnabled: boolean;
  assistantLauncherAvatarAsset: string;
  assistantDefaultMode: "docs-only" | "llm-guide";
  assistantDocsReindexOnBoot: boolean;
  assistantLlmEnabled: boolean;
  assistantLlmProvider: "openai" | "openrouter" | "none";
  assistantLlmModel: string;
  assistantLlmMaxInputTokens: number;
  assistantLlmMaxOutputTokens: number;
  assistantLlmTimeoutMs: number;
  assistantQuotaRequestsPerMinute: number;
  assistantQuotaRequestsPerDay: number;
};

export type SettingsValues = GeneralSettingsValues &
  AssistantSettingsValues & {
    publicBaseUrl: string;
    authSessionTtlDays: number;
    authResetTtlMinutes: number;
    setupCompleted: boolean;
  };

export const GENERAL_SETTINGS_DEFAULT_VALUES: GeneralSettingsValues = {
  siteName: "Coderso",
  siteLocale: "en",
};

export const ASSISTANT_SETTINGS_DEFAULT_VALUES: AssistantSettingsValues = {
  assistantEnabled: false,
  assistantLauncherAvatarEnabled: false,
  assistantLauncherAvatarAsset: "",
  assistantDefaultMode: "docs-only",
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

export const defaultSettingsValues: SettingsValues = {
  ...GENERAL_SETTINGS_DEFAULT_VALUES,
  ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
  publicBaseUrl: "",
  authSessionTtlDays: 14,
  authResetTtlMinutes: 60,
  setupCompleted: false,
};
