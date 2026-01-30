import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ContactData } from "../../../../widgets/core/contact";
import type { WidgetEditorProps } from "../../../../widgets/types";

export function ContactWizardEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const update = (patch: Partial<ContactData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Form headline</p>
        <Input
          value={value.form?.submitLabel ?? ""}
          onChange={(event) =>
            update({ form: { ...value.form, submitLabel: event.target.value, fields: value.form?.fields ?? [] } })
          }
          placeholder="Send message"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Contact email</p>
        <Input
          value={value.contact?.email ?? ""}
          onChange={(event) =>
            update({ contact: { ...value.contact, email: event.target.value } })
          }
          placeholder="hello@example.com"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Phone number</p>
        <Input
          value={value.contact?.phone ?? ""}
          onChange={(event) =>
            update({ contact: { ...value.contact, phone: event.target.value } })
          }
          placeholder="+1 555 123 456"
        />
      </div>
    </div>
  );
}

export function ContactVisualEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const update = (patch: Partial<ContactData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Address</p>
        <Textarea
          value={value.contact?.address ?? ""}
          onChange={(event) =>
            update({ contact: { ...value.contact, address: event.target.value } })
          }
          placeholder="123 Market Street"
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Business hours</p>
        <Input
          value={value.contact?.hours ?? ""}
          onChange={(event) =>
            update({ contact: { ...value.contact, hours: event.target.value } })
          }
          placeholder="Mon-Fri 9-5"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Show map</p>
          <p className="text-xs text-muted-foreground">
            Display embedded map next to the form.
          </p>
        </div>
        <Switch
          checked={value.map?.enabled ?? false}
          onCheckedChange={(checked) =>
            update({ map: { ...value.map, enabled: checked } })
          }
        />
      </div>
    </div>
  );
}

export function ContactAdvancedEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const update = (patch: Partial<ContactData>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Map embed URL</p>
        <Input
          value={value.map?.embedUrl ?? ""}
          onChange={(event) =>
            update({ map: { ...value.map, embedUrl: event.target.value } })
          }
          placeholder="https://maps.google.com/..."
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Form fields (comma separated)</p>
        <Input
          value={(value.form?.fields ?? []).join(", ")}
          onChange={(event) =>
            update({
              form: {
                ...value.form,
                submitLabel: value.form?.submitLabel ?? "",
                fields: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
            })
          }
          placeholder="name, email, message"
        />
      </div>
    </div>
  );
}
