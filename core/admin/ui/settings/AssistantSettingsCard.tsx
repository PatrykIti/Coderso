import { Bot } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminLink } from "@/ui/shared/AdminLink";

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


type AssistantSettingsCardProps = {
  values: AssistantSettingsValues;
  onChange?: (patch: Partial<AssistantSettingsValues>) => void;
  disabled?: boolean;
};

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const parsePositiveNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
};

export function AssistantSettingsCard({
  values,
  onChange,
  disabled = false,
}: AssistantSettingsCardProps) {
  const llmConfigDisabled = disabled || !values.assistantLlmEnabled;

  return (
    <Card className="border-border/60">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Assistant</CardTitle>
            <CardDescription>
              Configure Doc Navigator defaults and optional LLM behavior.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enable assistant</p>
                <p className="text-xs text-muted-foreground">
                  Global toggle for assistant availability in Admin UI.
                </p>
              </div>
              <Switch
                checked={values.assistantEnabled}
                onCheckedChange={(checked) =>
                  onChange?.({ assistantEnabled: Boolean(checked) })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Launcher avatar</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, the floating assistant launcher uses the configured avatar asset instead of the default message bubble.
                </p>
              </div>
              <Switch
                checked={values.assistantLauncherAvatarEnabled}
                onCheckedChange={(checked) =>
                  onChange?.({ assistantLauncherAvatarEnabled: Boolean(checked) })
                }
                disabled={disabled}
              />
            </div>
            <Input
              value={values.assistantLauncherAvatarAsset}
              onChange={(event) =>
                onChange?.({ assistantLauncherAvatarAsset: event.target.value })
              }
              placeholder="https://cdn.example.com/assistant-avatar.png"
              disabled={disabled || !values.assistantLauncherAvatarEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Optional image/video/asset URL used by the floating launcher surface.
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Default mode</label>
            <Select
              value={values.assistantDefaultMode}
              onValueChange={(next) =>
                onChange?.({
                  assistantDefaultMode: next as AssistantSettingsValues["assistantDefaultMode"],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docs-only">Docs Assistant</SelectItem>
                <SelectItem value="llm-guide">LLM Guide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>LLM provider</label>
            <Select
              value={values.assistantLlmProvider}
              onValueChange={(next) =>
                onChange?.({
                  assistantLlmProvider: next as AssistantSettingsValues["assistantLlmProvider"],
                })
              }
              disabled={llmConfigDisabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
            {values.assistantLlmProvider === "openrouter" ? (
              <p className="text-xs text-muted-foreground">
                OpenRouter API key is stored as an encrypted integration secret.{" "}
                <AdminLink
                  href="/admin/settings/integrations"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Configure OpenRouter API key
                </AdminLink>
                .
              </p>
            ) : null}
            {values.assistantLlmProvider === "openai" ? (
              <p className="text-xs text-muted-foreground">
                OpenAI API key is stored as an encrypted integration secret.{" "}
                <AdminLink
                  href="/admin/settings/integrations"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Configure OpenAI API key
                </AdminLink>
                .
              </p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <p className={labelClassName}>Official assistant corpus</p>
            <p className="text-sm font-medium text-foreground">
              Root <code>docs/</code> corpus seeded to database knowledge base
            </p>
            <p className="text-xs text-muted-foreground">
              Assistant documentation is sourced from the official English
              <code> docs/ </code>
              directory and becomes available to runtime only after DB reindex/seeding.
              The official corpus does not rely on filesystem fallback.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Reindex on boot</p>
                <p className="text-xs text-muted-foreground">
                  Rebuild docs index automatically at startup.
                </p>
              </div>
              <Switch
                checked={values.assistantDocsReindexOnBoot}
                onCheckedChange={(checked) =>
                  onChange?.({ assistantDocsReindexOnBoot: Boolean(checked) })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enable LLM mode</p>
                <p className="text-xs text-muted-foreground">
                  Allows guide planning and LLM-backed assistant responses when provider and model are configured.
                </p>
              </div>
              <Switch
                checked={values.assistantLlmEnabled}
                onCheckedChange={(checked) =>
                  onChange?.({ assistantLlmEnabled: Boolean(checked) })
                }
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className={labelClassName}>LLM model</label>
            <Input
              value={values.assistantLlmModel}
              onChange={(event) => onChange?.({ assistantLlmModel: event.target.value })}
              placeholder="google/gemma-3n-e2b-it:free"
              disabled={llmConfigDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Max input tokens</label>
            <Input
              type="number"
              min={1}
              value={values.assistantLlmMaxInputTokens}
              onChange={(event) =>
                onChange?.({
                  assistantLlmMaxInputTokens: parsePositiveNumber(
                    event.target.value,
                    values.assistantLlmMaxInputTokens
                  ),
                })
              }
              disabled={llmConfigDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Max output tokens</label>
            <Input
              type="number"
              min={1}
              value={values.assistantLlmMaxOutputTokens}
              onChange={(event) =>
                onChange?.({
                  assistantLlmMaxOutputTokens: parsePositiveNumber(
                    event.target.value,
                    values.assistantLlmMaxOutputTokens
                  ),
                })
              }
              disabled={llmConfigDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>LLM timeout (ms)</label>
            <Input
              type="number"
              min={1}
              value={values.assistantLlmTimeoutMs}
              onChange={(event) =>
                onChange?.({
                  assistantLlmTimeoutMs: parsePositiveNumber(
                    event.target.value,
                    values.assistantLlmTimeoutMs
                  ),
                })
              }
              disabled={llmConfigDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Requests per minute</label>
            <Input
              type="number"
              min={1}
              value={values.assistantQuotaRequestsPerMinute}
              onChange={(event) =>
                onChange?.({
                  assistantQuotaRequestsPerMinute: parsePositiveNumber(
                    event.target.value,
                    values.assistantQuotaRequestsPerMinute
                  ),
                })
              }
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className={labelClassName}>Requests per day</label>
            <Input
              type="number"
              min={1}
              value={values.assistantQuotaRequestsPerDay}
              onChange={(event) =>
                onChange?.({
                  assistantQuotaRequestsPerDay: parsePositiveNumber(
                    event.target.value,
                    values.assistantQuotaRequestsPerDay
                  ),
                })
              }
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
