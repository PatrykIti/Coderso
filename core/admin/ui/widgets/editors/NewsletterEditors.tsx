import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { NewsletterData } from "../../../../widgets/core/newsletter";
import type { WidgetEditorProps } from "../../../../widgets/types";

export function NewsletterWizardEditor({ value, onChange }: WidgetEditorProps<NewsletterData>) {
  const update = (patch: Partial<NewsletterData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Title</p>
        <Input
          value={value.title ?? ""}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Join our newsletter"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <Textarea
          value={value.description ?? ""}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Short supporting line"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Button label</p>
        <Input
          value={value.submit?.label ?? ""}
          onChange={(event) =>
            update({ submit: { ...value.submit, label: event.target.value } })
          }
          placeholder="Subscribe"
        />
      </div>
    </div>
  );
}

export function NewsletterVisualEditor({ value, onChange }: WidgetEditorProps<NewsletterData>) {
  const update = (patch: Partial<NewsletterData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Placeholder</p>
        <Input
          value={value.placeholder ?? ""}
          onChange={(event) => update({ placeholder: event.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Success message</p>
        <Input
          value={value.submit?.successMessage ?? ""}
          onChange={(event) =>
            update({
              submit: {
                label: value.submit?.label ?? "",
                successMessage: event.target.value,
              },
            })
          }
          placeholder="Thanks for joining!"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Consent checkbox</p>
          <p className="text-xs text-muted-foreground">
            Ask for marketing consent before subscribing.
          </p>
        </div>
        <Switch
          checked={value.consent?.enabled ?? false}
          onCheckedChange={(checked) =>
            update({ consent: { ...value.consent, enabled: checked } })
          }
        />
      </div>
    </div>
  );
}

export function NewsletterAdvancedEditor({ value, onChange }: WidgetEditorProps<NewsletterData>) {
  const update = (patch: Partial<NewsletterData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Consent label</p>
        <Input
          value={value.consent?.label ?? ""}
          onChange={(event) =>
            update({ consent: { ...value.consent, label: event.target.value } })
          }
          placeholder="I agree to receive updates"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Form action URL</p>
        <Input
          value={value.integration?.actionUrl ?? ""}
          onChange={(event) =>
            update({ integration: { ...value.integration, actionUrl: event.target.value } })
          }
          placeholder="https://"
        />
      </div>
    </div>
  );
}
