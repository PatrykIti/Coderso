import { Bot, ChevronDown, RefreshCw, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AssistantModelMetadataResponse } from "@/services/assistantClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { ASSISTANT_SETTINGS_DEFAULT_VALUES, type AssistantSettingsValues } from "./settingsValues";

export { ASSISTANT_SETTINGS_DEFAULT_VALUES };
export type { AssistantSettingsValues };

type AssistantSettingsCardProps = {
  values: AssistantSettingsValues;
  onChange?: (patch: Partial<AssistantSettingsValues>) => void;
  disabled?: boolean;
  modelMetadata?: AssistantModelMetadataResponse | null;
  modelMetadataError?: string | null;
  isModelMetadataLoading?: boolean;
  onRefreshModelMetadata?: () => void;
  onRunReindex?: () => void;
  isReindexing?: boolean;
  reindexDisabled?: boolean;
};

const labelClassName = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

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
  modelMetadata = null,
  modelMetadataError = null,
  isModelMetadataLoading = false,
  onRefreshModelMetadata,
  onRunReindex,
  isReindexing = false,
  reindexDisabled = false,
}: AssistantSettingsCardProps) {
  const llmConfigDisabled = disabled || !values.assistantLlmEnabled;
  const showOpenRouterMetadata = values.assistantLlmProvider === "openrouter";

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
              Configure Docs Assistant defaults and optional LLM Guide behavior.
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
                onCheckedChange={(checked) => onChange?.({ assistantEnabled: Boolean(checked) })}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Launcher avatar</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, the floating assistant launcher uses the configured avatar asset
                  instead of the default message bubble.
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
              onChange={(event) => onChange?.({ assistantLauncherAvatarAsset: event.target.value })}
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

          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enable LLM Guide</p>
                <p className="text-xs text-muted-foreground">
                  Allows reviewed setup planning and typed assistant actions when provider and model
                  are configured.
                </p>
              </div>
              <Switch
                checked={values.assistantLlmEnabled}
                onCheckedChange={(checked) => onChange?.({ assistantLlmEnabled: Boolean(checked) })}
                disabled={disabled}
              />
            </div>
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

          <div className="space-y-2 md:col-span-2">
            <label className={labelClassName}>LLM model</label>
            <Input
              value={values.assistantLlmModel}
              onChange={(event) => onChange?.({ assistantLlmModel: event.target.value })}
              placeholder="google/gemma-3n-e2b-it:free"
              disabled={llmConfigDisabled}
            />
            {showOpenRouterMetadata ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {isModelMetadataLoading ? (
                  <Badge variant="outline">Reading OpenRouter limits...</Badge>
                ) : null}
                {modelMetadata ? (
                  <Badge variant={modelMetadata.source === "provider" ? "secondary" : "outline"}>
                    {modelMetadata.source === "provider"
                      ? "OpenRouter limits loaded"
                      : "Safe default limits"}
                  </Badge>
                ) : null}
                {modelMetadata ? (
                  <span>
                    Input {modelMetadata.maxInputTokens.toLocaleString()} / output{" "}
                    {modelMetadata.maxOutputTokens.toLocaleString()} tokens
                  </span>
                ) : null}
                {modelMetadataError ? <span>{modelMetadataError}</span> : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
            <p className={labelClassName}>Official assistant corpus</p>
            <p className="text-sm font-medium text-foreground">
              Official <code>docs/guide</code> docs are indexed automatically for assistant answers
            </p>
            <p className="text-xs text-muted-foreground">
              Docker startup seeds the database index from the English
              <code> docs/guide </code>
              directory when the image or docs change. If the assistant says docs are not ready,
              support can rebuild the index from Advanced.
            </p>
          </div>

          <Collapsible className="md:col-span-2">
            <div className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-auto w-full justify-between rounded-lg px-3 py-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="block text-sm font-medium">Advanced</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        Token limits, quotas, timeout, and support indexing actions.
                      </span>
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-4 border-t p-3 md:grid-cols-2">
                  <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Reindex on boot</p>
                        <p className="text-xs text-muted-foreground">
                          Docker startup owns normal docs indexing. Keep this off unless support
                          needs a temporary startup rebuild.
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

                  {showOpenRouterMetadata ? (
                    <div className="space-y-2 md:col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={onRefreshModelMetadata}
                        disabled={disabled || isModelMetadataLoading || !values.assistantLlmModel}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {isModelMetadataLoading ? "Reading limits..." : "Read model limits"}
                      </Button>
                    </div>
                  ) : null}

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

                  <div className="space-y-2">
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

                  {onRunReindex ? (
                    <div className="space-y-2 rounded-lg border p-3 md:col-span-2">
                      <p className="text-sm font-medium">Support reindex</p>
                      <p className="text-xs text-muted-foreground">
                        Normal Docker startup should seed docs once per image/docs version. Use this
                        only for support recovery after confirming saved settings.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onRunReindex}
                        disabled={reindexDisabled}
                      >
                        {isReindexing ? "Reindexing..." : "Run support reindex"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
