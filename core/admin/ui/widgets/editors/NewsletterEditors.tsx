import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

import {
  newsletterDefaults,
  normalizeNewsletterData,
  resolveNewsletterVariant,
  type NewsletterData,
  type NewsletterVariantId,
} from "../../../../widgets/core/newsletter";
import type { WidgetEditorProps } from "../../../../widgets/types";

const variantOptions: Array<{
  id: NewsletterVariantId;
  label: string;
  description: string;
}> = [
  {
    id: "inline",
    label: "Inline",
    description: "Input and submit button share one row where possible.",
  },
  {
    id: "stacked",
    label: "Stacked",
    description: "Input sits above button for a clear vertical flow.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Compact signup layout with reduced supporting text.",
  },
];

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

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
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

function VariantCards({
  value,
  onChange,
}: {
  value: string;
  onChange?: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {variantOptions.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange?.(option.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition",
            value === option.id
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <div className="flex w-full items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">{option.label}</p>
            <Badge className="shrink-0" variant={value === option.id ? "default" : "outline"}>
              {value === option.id ? "Selected" : "Pick"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
        </button>
      ))}
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
  const submit = normalized.submit ?? newsletterDefaults.submit!;
  const consent = normalized.consent ?? newsletterDefaults.consent!;

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
          value={normalized.title}
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
          value={normalized.description}
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
          value={submit.label}
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
          checked={consent.enabled}
          onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
        />
      </div>

      {consent.enabled ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Consent label</p>
          <Input
            value={consent.label}
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
  variant,
  onVariantChange,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeValue(value);
  const submit = normalized.submit ?? newsletterDefaults.submit!;
  const consent = normalized.consent ?? newsletterDefaults.consent!;
  const integration = normalized.integration ?? newsletterDefaults.integration!;
  const style = normalized.style ?? newsletterDefaults.style!;
  const resolvedVariant = resolveNewsletterVariant(variant);
  const integrationMode = integration.mode;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Variant and form structure"
        description="Choose the signup layout and keep structure clear in preview."
      >
        <VariantCards value={resolvedVariant} onChange={onVariantChange} />
      </EditorSection>

      <EditorSection
        title="Content and copy"
        description="Edit visible text fields for heading, description, and input placeholder."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Title</p>
          <Input
            value={normalized.title}
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
            value={normalized.description}
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
          <p className="text-sm font-medium">Email placeholder</p>
          <Input
            value={normalized.placeholder}
            onChange={(event) =>
              updateValue(value, onChange, (current) => ({
                ...current,
                placeholder: event.target.value,
              }))
            }
            placeholder="you@example.com"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Consent and submit behavior"
        description="Configure CTA copy, confirmation state, and consent requirement."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Button label</p>
          <Input
            value={submit.label}
            onChange={(event) => updateSubmit(value, onChange, { label: event.target.value })}
            placeholder="Subscribe"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Success message</p>
          <Input
            value={submit.successMessage}
            onChange={(event) =>
              updateSubmit(value, onChange, { successMessage: event.target.value })
            }
            placeholder="Thanks for joining!"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Consent checkbox</p>
            <p className="text-xs text-muted-foreground">
              Display a marketing consent option below the form.
            </p>
          </div>
          <Switch
            checked={consent.enabled}
            onCheckedChange={(checked) => updateConsent(value, onChange, { enabled: checked })}
          />
        </div>

        {consent.enabled ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">Consent label</p>
              <Input
                value={consent.label}
                onChange={(event) =>
                  updateConsent(value, onChange, { label: event.target.value })
                }
                placeholder="I agree to receive updates."
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2">
              <p className="text-sm font-medium">Consent required</p>
              <Switch
                checked={consent.required}
                onCheckedChange={(checked) =>
                  updateConsent(value, onChange, { required: checked })
                }
              />
            </div>
          </>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Integration target"
        description="Decide if submissions go to external action URL or internal webhook flow."
      >
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

        {integrationMode === "action-url" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Form action URL</p>
            <Input
              value={integration.actionUrl}
              onChange={(event) =>
                updateIntegration(value, onChange, {
                  actionUrl: event.target.value,
                })
              }
              placeholder="https://example.com/subscribe"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Webhook ID</p>
            <Input
              value={integration.webhookId}
              onChange={(event) =>
                updateIntegration(value, onChange, {
                  webhookId: event.target.value,
                })
              }
              placeholder="webhook_newsletter_signup"
            />
          </div>
        )}
      </EditorSection>

      <EditorSection
        title="Colors and emphasis"
        description="Control panel surface color. Primary CTA color inherits current theme tokens."
      >
        <ColorField
          label="Background color"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent"
          pickerFallback="#ffffff"
        />
      </EditorSection>

      <EditorSection
        title="Spacing and alignment"
        description="Fine-tune density and alignment for desktop/tablet/mobile runtime preview."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing</p>
            <Select
              value={style.spacing}
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
              value={style.alignment}
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
        </div>

        <p className="text-xs text-muted-foreground">
          Use runtime preview device tabs to validate spacing and input/button readability per viewport.
        </p>
      </EditorSection>
    </div>
  );
}

export function NewsletterAdvancedEditor({
  value,
  onChange,
  variant,
}: WidgetEditorProps<NewsletterData>) {
  const normalized = normalizeValue(value);
  const consent = normalized.consent ?? newsletterDefaults.consent!;
  const integration = normalized.integration ?? newsletterDefaults.integration!;
  const style = normalized.style ?? newsletterDefaults.style!;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Layout tokens"
        description="Technical control for spacing/alignment tokens used by runtime renderer."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Spacing token</p>
            <Select
              value={style.spacing}
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
            <p className="text-sm font-medium">Alignment token</p>
            <Select
              value={style.alignment}
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
        </div>
      </EditorSection>

      <EditorSection
        title="Raw integration metadata"
        description="Expert-only transport metadata for action URL and webhook fallback flows."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Integration mode</p>
          <Select
            value={integration.mode}
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

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Action URL (raw)</p>
            <Input
              value={integration.actionUrl}
              onChange={(event) =>
                updateIntegration(value, onChange, {
                  actionUrl: event.target.value,
                })
              }
              placeholder="https://example.com/subscribe"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Webhook ID (raw)</p>
            <Input
              value={integration.webhookId}
              onChange={(event) =>
                updateIntegration(value, onChange, {
                  webhookId: event.target.value,
                })
              }
              placeholder="webhook_newsletter_signup"
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title="Normalization and fallback"
        description="Enforce deterministic defaults and inspect resolved runtime metadata."
      >
        <p className="text-xs text-muted-foreground">
          Resolved variant: {resolveNewsletterVariant(variant)}. Resolved integration mode:
          {" "}
          {integration.mode}. Consent required:
          {" "}
          {consent.required ? "true" : "false"}.
        </p>
        <Button type="button" variant="outline" onClick={() => onChange(normalized)}>
          Normalize newsletter payload
        </Button>
      </EditorSection>
    </div>
  );
}
