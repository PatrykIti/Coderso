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
import { Textarea } from "@/components/ui/textarea";

export type AssistantSettingsValues = {
  assistantEnabled: boolean;
  assistantLauncherAvatarEnabled: boolean;
  assistantLauncherAvatarAsset: string;
  assistantDefaultMode: "docs-only" | "llm-rag";
  assistantDocsBackend: "filesystem" | "db";
  assistantDocsSourceRoot: string;
  assistantDocsPaths: string[];
  assistantDocsReindexOnBoot: boolean;
  assistantLlmEnabled: boolean;
  assistantLlmProvider: "openrouter" | "none";
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


type AssistantSettingsCardProps = {
  values: AssistantSettingsValues;
  onChange?: (patch: Partial<AssistantSettingsValues>) => void;
  disabled?: boolean;
};

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const parseDocsPaths = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

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
  const docsPathsText = values.assistantDocsPaths.join("\n");
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
                <SelectItem value="docs-only">Docs only</SelectItem>
                <SelectItem value="llm-rag">LLM + RAG</SelectItem>
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
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Docs backend</label>
            <Select
              value={values.assistantDocsBackend}
              onValueChange={(next) =>
                onChange?.({
                  assistantDocsBackend: next as AssistantSettingsValues["assistantDocsBackend"],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose backend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filesystem">Filesystem (in-memory index)</SelectItem>
                <SelectItem value="db">Database KB (ingest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Docs source root</label>
            <Input
              value={values.assistantDocsSourceRoot}
              onChange={(event) =>
                onChange?.({ assistantDocsSourceRoot: event.target.value })
              }
              placeholder="_docs/_internal"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Used by DB ingest backend (`assistant.docs.backend=db`).
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className={labelClassName}>Docs paths</label>
            <Textarea
              value={docsPathsText}
              onChange={(event) =>
                onChange?.({ assistantDocsPaths: parseDocsPaths(event.target.value) })
              }
              placeholder="_docs"
              className="min-h-[88px]"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              One path per line (or comma separated). Used by filesystem backend and
              fallback. Example: `_docs`
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
                  Allows `llm-rag` responses when provider and model are configured.
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
