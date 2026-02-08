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

import {
  normalizeNewsletterData,
  resolveNewsletterVariant,
  type NewsletterData,
} from "../../../../widgets/core/newsletter";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions = [
  { id: "inline", label: "Inline" },
  { id: "stacked", label: "Stacked" },
  { id: "minimal", label: "Minimal" },
] as const;

const spacingOptions = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
] as const;

const alignmentOptions = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
] as const;

const integrationModeOptions = [
  { id: "action-url", label: "Action URL" },
  { id: "webhook", label: "Webhook" },
] as const;

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

type ConsentData = NonNullable<NewsletterData["consent"]>;
type SubmitData = NonNullable<NewsletterData["submit"]>;
type IntegrationData = NonNullable<NewsletterData["integration"]>;
type StyleData = NonNullable<NewsletterData["style"]>;

function normalizeValue(value: NewsletterData): NewsletterData {
  return normalizeNewsletterData(value);
}

function updateValue(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  updater: (current: NewsletterData) => NewsletterData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateConsent(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<ConsentData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    consent: {
      ...current.consent,
      ...patch,
    },
  }));
}

function updateSubmit(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<SubmitData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    submit: {
      ...current.submit,
      ...patch,
    },
  }));
}

function updateIntegration(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<IntegrationData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    integration: {
      ...current.integration,
      ...patch,
    },
  }));
}

function updateStyle(
  value: NewsletterData,
  onChange: (next: NewsletterData) => void,
  patch: Partial<StyleData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
  pickerFallback,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-[2.5rem_1fr] gap-2">
        <Input
          type="color"
          value={resolvePickerColor(value, pickerFallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-10 p-1"
        />
        <Input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

export function NewsletterWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Newsletter style</p>
        <Select
          value={resolveNewsletterVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select style" />
          </SelectTrigger>
          <SelectContent>
            {variantOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Title</p>
        <Input
          value={normalized.title ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Join our newsletter"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <Textarea
          value={normalized.description ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Short supporting line"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Button label</p>
        <Input
          value={normalized.submit?.label ?? ""}
          onChange={(event) => updateSubmit(value, onChange, { label: event.target.value })}
          placeholder="Subscribe"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Consent checkbox</p>
          <p className="text-xs text-muted-foreground">
            Ask visitors to confirm marketing consent.
          </p>
        </div>
        <Switch
          checked={normalized.consent?.enabled ?? false}
          onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
        />
      </div>

      {normalized.consent?.enabled ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Consent label</p>
          <Input
            value={normalized.consent?.label ?? ""}
            onChange={(event) => updateConsent(value, onChange, { label: event.target.value })}
            placeholder="I agree to receive updates."
          />
        </div>
      ) : null}
    </div>
  );
}

export function NewsletterVisualEditor({
  value,
  onChange,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeValue(value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Placeholder</p>
        <Input
          value={normalized.placeholder ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              placeholder: event.target.value,
            }))
          }
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Success message</p>
        <Input
          value={normalized.submit?.successMessage ?? ""}
          onChange={(event) =>
            updateSubmit(value, onChange, { successMessage: event.target.value })
          }
          placeholder="Thanks for joining!"
        />
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Consent checkbox</p>
            <p className="text-xs text-muted-foreground">
              Toggle marketing consent requirement.
            </p>
          </div>
          <Switch
            checked={normalized.consent?.enabled ?? false}
            onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
          />
        </div>

        {normalized.consent?.enabled ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Consent label</p>
              <Input
                value={normalized.consent?.label ?? ""}
                onChange={(event) =>
                  updateConsent(value, onChange, { label: event.target.value })
                }
                placeholder="I agree to receive updates."
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <p className="text-sm font-medium">Consent required</p>
              <Switch
                checked={normalized.consent?.required ?? false}
                onCheckedChange={(checked) =>
                  updateConsent(value, onChange, { required: checked })
                }
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                spacing: next as StyleData["spacing"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={normalized.style?.alignment ?? "start"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                alignment: next as StyleData["alignment"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ColorField
          label="Background color"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </div>
    </div>
  );
}

export function NewsletterAdvancedEditor({
  value,
  onChange,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeValue(value);
  const integrationMode = normalized.integration?.mode ?? "action-url";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Integration mode</p>
        <Select
          value={integrationMode}
          onValueChange={(next) =>
            updateIntegration(value, onChange, {
              mode: next as IntegrationData["mode"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select integration mode" />
          </SelectTrigger>
          <SelectContent>
            {integrationModeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Form action URL</p>
        <Input
          value={normalized.integration?.actionUrl ?? ""}
          onChange={(event) =>
            updateIntegration(value, onChange, {
              actionUrl: event.target.value,
            })
          }
          placeholder="https://example.com/subscribe"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Webhook ID</p>
        <Input
          value={normalized.integration?.webhookId ?? ""}
          onChange={(event) =>
            updateIntegration(value, onChange, {
              webhookId: event.target.value,
            })
          }
          placeholder="webhook_newsletter_signup"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Consent required</p>
          <p className="text-xs text-muted-foreground">
            Require checkbox acceptance before submit.
          </p>
        </div>
        <Switch
          checked={normalized.consent?.required ?? false}
          onCheckedChange={(checked) => updateConsent(value, onChange, { required: checked })}
        />
      </div>

      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                spacing: next as StyleData["spacing"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent>
              {spacingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Alignment</p>
          <Select
            value={normalized.style?.alignment ?? "start"}
            onValueChange={(next) =>
              updateStyle(value, onChange, {
                alignment: next as StyleData["alignment"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Alignment" />
            </SelectTrigger>
            <SelectContent>
              {alignmentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ColorField
          label="Background color"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </div>
    </div>
  );
}
