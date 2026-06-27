import { Sparkles } from "lucide-react";

import { SettingsLayout } from "@/components/shell/SettingsLayout";
import { SettingsSection, SettingsField } from "@/components/patterns/SettingsSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

const FEATURE_ROWS = [
  { label: "Content suggestions", desc: "Inline drafting and rewrite suggestions while you type.", on: true },
  { label: "Auto alt-text", desc: "Generate descriptive alt text for uploaded images.", on: true },
  { label: "Translation", desc: "Translate posts and pages into other languages.", on: false },
  { label: "Summaries", desc: "Produce short summaries and excerpts automatically.", on: true },
];

export function AssistantSettingsPage() {
  return (
    <SettingsLayout title="Assistant" description="AI writing assistant configuration.">
      <div className="divide-y divide-border">
        <SettingsSection title="Provider" description="The model that powers writing assistance.">
          <div className="flex flex-col gap-4">
            <SettingsField label="Provider">
              <Select defaultValue="anthropic">
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </Select>
            </SettingsField>
            <SettingsField label="Model" hint="The latest Claude models offer the best quality for content work.">
              <Select defaultValue="claude-opus-4-8">
                <option value="claude-opus-4-8">Claude Opus 4.8</option>
                <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
              </Select>
            </SettingsField>
            <SettingsField label="API key" htmlFor="api-key" hint="Stored encrypted; never exposed to the browser.">
              <Input id="api-key" type="password" defaultValue="sk-ant-xxxxxxxxxxxxxxxx" />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Behavior" description="Tune tone and ground rules for the assistant.">
          <div className="flex flex-col gap-4">
            <SettingsField label="Temperature">
              <Select defaultValue="balanced">
                <option value="low">Low — precise and consistent</option>
                <option value="balanced">Balanced</option>
                <option value="creative">Creative — varied and expressive</option>
              </Select>
            </SettingsField>
            <SettingsField label="System prompt" hint="Guidance prepended to every assistant request.">
              <Textarea
                rows={4}
                defaultValue="You are the in-house editor for Acme Studio. Write in a warm, clear, friendly voice. Prefer short sentences and active verbs."
              />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="Features" description="Enable specific assistant capabilities.">
          <div className="divide-y divide-border">
            {FEATURE_ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="text-sm text-muted-foreground">{row.desc}</div>
                </div>
                <Switch defaultChecked={row.on} />
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="Usage" description="Token consumption against your monthly plan.">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="size-4 text-primary" /> This month
              </span>
              <span className="font-medium">620K / 1M tokens</span>
            </div>
            <Progress value={62} />
            <p className="text-xs text-muted-foreground">Resets on the 1st. 38% of your monthly allowance remaining.</p>
          </div>
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
