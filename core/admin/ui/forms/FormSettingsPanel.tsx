import { ClipboardList } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import type {
  FormAutomationRetrySettings,
  FormPresetId,
  FormSettings,
  FormStatus,
} from "@/services/formsClient";

type FormPresetOption = {
  id: FormPresetId;
  label: string;
  description: string;
};

type FormSettingsPanelProps = {
  name: string;
  description: string;
  status: FormStatus;
  submissionAccess: "public" | "internal";
  successMessage: string;
  successRedirectUrl: string;
  settings: FormSettings;
  presetOptions: FormPresetOption[];
  stepCount: number;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: FormStatus) => void;
  onSubmissionAccessChange: (value: "public" | "internal") => void;
  onSuccessMessageChange: (value: string) => void;
  onSuccessRedirectUrlChange: (value: string) => void;
  onSettingsChange: (updates: Partial<FormSettings>) => void;
  onAutomationRetryChange: (updates: Partial<FormAutomationRetrySettings>) => void;
  onStepTitlesChange: (titles: string[]) => void;
  onApplyPreset: (presetId: FormPresetId) => void;
};

const clampInt = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

const buildStepTitlesForView = (settings: FormSettings, stepCount: number) => {
  const total = Math.max(1, stepCount);
  return Array.from({ length: total }, (_, index) => {
    const existing = settings.stepTitles[index];
    if (typeof existing === "string" && existing.trim().length > 0) {
      return existing;
    }
    return `Step ${index + 1}`;
  });
};

export function FormSettingsPanel({
  name,
  description,
  status,
  submissionAccess,
  successMessage,
  successRedirectUrl,
  settings,
  presetOptions,
  stepCount,
  onNameChange,
  onDescriptionChange,
  onStatusChange,
  onSubmissionAccessChange,
  onSuccessMessageChange,
  onSuccessRedirectUrlChange,
  onSettingsChange,
  onAutomationRetryChange,
  onStepTitlesChange,
  onApplyPreset,
}: FormSettingsPanelProps) {
  const stepTitlesForView = buildStepTitlesForView(settings, stepCount);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 p-1 text-primary">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Form Settings</p>
            <p className="text-xs text-muted-foreground">Define behavior and submission flow.</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-5">
        <div className="space-y-5 pb-4">
          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Basics
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Form name
              </label>
              <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Description
              </label>
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="Short summary shown in the form list"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </label>
              <Select value={status} onValueChange={(value) => onStatusChange(value as FormStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Experience
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Preset
              </label>
              <Select
                value={settings.preset}
                onValueChange={(value) => onSettingsChange({ preset: value as FormPresetId })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {presetOptions.find((preset) => preset.id === settings.preset)?.description ? (
                <p className="text-xs text-muted-foreground">
                  {presetOptions.find((preset) => preset.id === settings.preset)?.description}
                </p>
              ) : null}
              {settings.preset !== "custom" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyPreset(settings.preset)}
                >
                  Apply preset fields
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Layout mode
              </label>
              <Select
                value={settings.layoutMode}
                onValueChange={(value) =>
                  onSettingsChange({ layoutMode: value as FormSettings["layoutMode"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single page</SelectItem>
                  <SelectItem value="multi_step">Multi-step wizard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Save progress</p>
                <p className="text-xs text-muted-foreground">
                  Store partially filled values in the browser for returning visitors.
                </p>
              </div>
              <Switch
                checked={settings.saveProgress}
                onCheckedChange={(checked) => onSettingsChange({ saveProgress: checked === true })}
              />
            </div>
            {settings.layoutMode === "multi_step" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Step titles
                </label>
                <div className="space-y-2">
                  {stepTitlesForView.map((title, index) => (
                    <Input
                      key={`step-title-${index + 1}`}
                      value={title}
                      onChange={(event) => {
                        const next = [...stepTitlesForView];
                        next[index] = event.target.value;
                        onStepTitlesChange(next);
                      }}
                      placeholder={`Step ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Submission Access
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Access mode
              </label>
              <Select
                value={submissionAccess}
                onValueChange={(value) => onSubmissionAccessChange(value as "public" | "internal")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (recommended)</SelectItem>
                  <SelectItem value="internal">Internal (auth or API key)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Public forms use bot protection when enabled. Internal forms require an authenticated
                admin session or an API key.
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Success Fallback
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Success message
              </label>
              <Textarea
                rows={2}
                value={successMessage}
                onChange={(event) => onSuccessMessageChange(event.target.value)}
                placeholder="Shown after submit when using inline success"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Redirect URL
              </label>
              <Input
                value={successRedirectUrl}
                onChange={(event) => onSuccessRedirectUrlChange(event.target.value)}
                placeholder="/thank-you"
              />
              <p className="text-xs text-muted-foreground">
                If set, runtime preview and frontend redirect to this URL after successful submit.
              </p>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border bg-muted/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Automation Reliability
            </p>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-retry failed actions</p>
                <p className="text-xs text-muted-foreground">
                  Retry transient failures before marking action as failed.
                </p>
              </div>
              <Switch
                checked={settings.automationRetry.enabled}
                onCheckedChange={(checked) =>
                  onAutomationRetryChange({ enabled: checked === true })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Max attempts</label>
                <Input
                  inputMode="numeric"
                  value={String(settings.automationRetry.maxAttempts)}
                  onChange={(event) =>
                    onAutomationRetryChange({
                      maxAttempts: clampInt(event.target.value, 1, 1, 5),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Base delay (ms)</label>
                <Input
                  inputMode="numeric"
                  value={String(settings.automationRetry.baseDelayMs)}
                  onChange={(event) =>
                    onAutomationRetryChange({
                      baseDelayMs: clampInt(event.target.value, 300, 50, 5000),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Max delay (ms)</label>
              <Input
                inputMode="numeric"
                value={String(settings.automationRetry.maxDelayMs)}
                onChange={(event) =>
                  onAutomationRetryChange({
                    maxDelayMs: clampInt(event.target.value, 2000, 100, 20000),
                  })
                }
              />
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
