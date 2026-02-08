import { type ReactNode } from "react";

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

import {
  contactDefaults,
  contactFieldOptions,
  normalizeContactData,
  resolveContactVariant,
  type ContactColumns,
  type ContactData,
  type ContactFieldId,
  type ContactSpacing,
} from "../../../../widgets/core/contact";
import type { WidgetEditorProps } from "../../../../widgets/types";

const fieldLabels: Record<ContactFieldId, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  message: "Message",
};

const spacingOptions: Array<{ id: ContactSpacing; label: string }> = [
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
];

const columnOptions: Array<{ id: ContactColumns; label: string }> = [
  { id: "one", label: "One column" },
  { id: "two", label: "Two columns" },
];

const variantOptions = [
  {
    id: "form-left",
    label: "Form left",
    description: "Form on the left, contact details on the right.",
  },
  {
    id: "form-right",
    label: "Form right",
    description: "Contact details on the left, form on the right.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Contact details only, optional map below.",
  },
] as const;

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type FormData = NonNullable<ContactData["form"]>;
type ContactDetails = NonNullable<ContactData["contact"]>;
type MapData = NonNullable<ContactData["map"]>;
type StyleData = NonNullable<ContactData["style"]>;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

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
  value: ContactData,
  onChange: (next: ContactData) => void,
  updater: (current: ContactData) => ContactData
) {
  const current = normalizeContactData(value);
  const next = updater(current);
  onChange(normalizeContactData(next));
}

function updateForm(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<FormData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    form: {
      ...current.form,
      ...patch,
    },
  }));
}

function updateContactDetails(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<ContactDetails>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    contact: {
      ...current.contact,
      ...patch,
    },
  }));
}

function updateMap(
  value: ContactData,
  onChange: (next: ContactData) => void,
  patch: Partial<MapData>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    map: {
      ...current.map,
      ...patch,
    },
  }));
}

function updateStyle(
  value: ContactData,
  onChange: (next: ContactData) => void,
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

function toggleField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  enabled: boolean
) {
  updateValue(value, onChange, (current) => {
    const fields = current.form?.fields ?? contactDefaults.form?.fields ?? [];
    const required = current.form?.required ?? [];
    const hasField = fields.includes(field);
    if (enabled && hasField) return current;
    if (!enabled && !hasField) return current;

    if (!enabled && fields.length <= 1) return current;

    const nextFields = enabled
      ? [...fields, field]
      : fields.filter((item) => item !== field);
    const nextRequired = required.filter((item) => nextFields.includes(item));

    return {
      ...current,
      form: {
        ...current.form,
        fields: nextFields,
        required: nextRequired,
      },
    };
  });
}

function toggleRequiredField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  field: ContactFieldId,
  required: boolean
) {
  updateValue(value, onChange, (current) => {
    const selectedFields = current.form?.fields ?? contactDefaults.form?.fields ?? [];
    if (!selectedFields.includes(field)) return current;

    const currentRequired = current.form?.required ?? [];
    const hasRequired = currentRequired.includes(field);
    if (required && hasRequired) return current;
    if (!required && !hasRequired) return current;

    const nextRequired = required
      ? [...currentRequired, field]
      : currentRequired.filter((item) => item !== field);

    return {
      ...current,
      form: {
        ...current.form,
        required: nextRequired,
      },
    };
  });
}

function moveField(
  value: ContactData,
  onChange: (next: ContactData) => void,
  fromIndex: number,
  toIndex: number
) {
  updateValue(value, onChange, (current) => {
    const fields = [...(current.form?.fields ?? contactDefaults.form?.fields ?? [])];
    if (toIndex < 0 || toIndex >= fields.length) return current;
    const [item] = fields.splice(fromIndex, 1);
    if (!item) return current;
    fields.splice(toIndex, 0, item);

    return {
      ...current,
      form: {
        ...current.form,
        fields,
      },
    };
  });
}

function FieldToggleList({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const selectedFields = normalized.form?.fields ?? [];

  return (
    <div className="space-y-2">
      {contactFieldOptions.map((field) => (
        <div key={field} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">{fieldLabels[field]}</p>
            <p className="text-xs text-muted-foreground">
              {selectedFields.includes(field) ? "Visible in form." : "Hidden in form."}
            </p>
          </div>
          <Switch
            checked={selectedFields.includes(field)}
            onCheckedChange={(checked) => toggleField(value, onChange, field, checked)}
          />
        </div>
      ))}
    </div>
  );
}

function RequiredFieldList({
  value,
  onChange,
}: {
  value: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const normalized = normalizeContactData(value);
  const selectedFields = normalized.form?.fields ?? [];
  const requiredFields = new Set<ContactFieldId>(normalized.form?.required ?? []);

  return (
    <div className="space-y-2">
      {selectedFields.map((field, index) => (
        <div key={field} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{fieldLabels[field]}</p>
              <p className="text-xs text-muted-foreground">
                Mark as required and change order.
              </p>
            </div>
            <Switch
              checked={requiredFields.has(field)}
              onCheckedChange={(checked) =>
                toggleRequiredField(value, onChange, field, checked)
              }
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveField(value, onChange, index, index - 1)}
              disabled={index === 0}
            >
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => moveField(value, onChange, index, index + 1)}
              disabled={index === selectedFields.length - 1}
            >
              Move down
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
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

export function ContactWizardEditor({
  value,
  onChange,
  variant,
  onVariantChange,
}: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Contact layout</p>
        <Select
          value={resolveContactVariant(variant)}
          onValueChange={(next) => onVariantChange?.(next)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose layout" />
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

      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
        {
          variantOptions.find((option) => option.id === resolveContactVariant(variant))
            ?.description
        }
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Form fields</p>
        <FieldToggleList value={value} onChange={onChange} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Submit label</p>
        <Input
          value={normalized.form?.submitLabel ?? ""}
          onChange={(event) =>
            updateForm(value, onChange, { submitLabel: event.target.value })
          }
          placeholder="Send message"
        />
      </div>

      <EditorSection
        title="Contact details"
        description="Quick baseline information shown next to the form."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Phone</p>
          <Input
            value={normalized.contact?.phone ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { phone: event.target.value })
            }
            placeholder="+1 555 123 456"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Email</p>
          <Input
            value={normalized.contact?.email ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { email: event.target.value })
            }
            placeholder="hello@example.com"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Address</p>
          <Textarea
            value={normalized.contact?.address ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { address: event.target.value })
            }
            placeholder="123 Market Street"
          />
        </div>
      </EditorSection>
    </div>
  );
}

export function ContactVisualEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);
  const mapEnabled = normalized.map?.enabled ?? false;

  return (
    <div className="space-y-4">
      <EditorSection
        title="Form controls"
        description="Choose fields, set required status, and keep order clear."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Form fields</p>
          <FieldToggleList value={value} onChange={onChange} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Required fields and order</p>
          <RequiredFieldList value={value} onChange={onChange} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Submit label</p>
          <Input
            value={normalized.form?.submitLabel ?? ""}
            onChange={(event) =>
              updateForm(value, onChange, { submitLabel: event.target.value })
            }
            placeholder="Send message"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Contact details"
        description="Edit all details shown in the contact information panel."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Phone</p>
          <Input
            value={normalized.contact?.phone ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { phone: event.target.value })
            }
            placeholder="+1 555 123 456"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Email</p>
          <Input
            value={normalized.contact?.email ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { email: event.target.value })
            }
            placeholder="hello@example.com"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Address</p>
          <Textarea
            value={normalized.contact?.address ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { address: event.target.value })
            }
            placeholder="123 Market Street"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Business hours</p>
          <Input
            value={normalized.contact?.hours ?? ""}
            onChange={(event) =>
              updateContactDetails(value, onChange, { hours: event.target.value })
            }
            placeholder="Mon-Fri 9-5"
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Map settings"
        description="Enable map embed and provide external embed URL."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Show map</p>
            <p className="text-xs text-muted-foreground">
              Display embedded map in contact panel.
            </p>
          </div>
          <Switch
            checked={mapEnabled}
            onCheckedChange={(checked) => updateMap(value, onChange, { enabled: checked })}
          />
        </div>
        {mapEnabled ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Map embed URL</p>
            <Input
              value={normalized.map?.embedUrl ?? ""}
              onChange={(event) =>
                updateMap(value, onChange, { embedUrl: event.target.value })
              }
              placeholder="https://maps.google.com/..."
            />
          </div>
        ) : null}
      </EditorSection>

      <EditorSection
        title="Style"
        description="Control spacing, column density, and section background."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as ContactSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing" />
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
          <p className="text-sm font-medium">Columns (form variants)</p>
          <Select
            value={normalized.style?.columns ?? "two"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { columns: next as ContactColumns })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select columns" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ColorField
          label="Section background"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent or #f8fafc"
          pickerFallback="#ffffff"
        />
      </EditorSection>
    </div>
  );
}

export function ContactAdvancedEditor({ value, onChange }: WidgetEditorProps<ContactData>) {
  const normalized = normalizeContactData(value);

  return (
    <div className="space-y-4">
      <EditorSection
        title="Field order and requirements"
        description="Technical field structure controls used for deterministic rendering."
      >
        <RequiredFieldList value={value} onChange={onChange} />
      </EditorSection>

      <EditorSection
        title="Map source"
        description="Technical map embed controls."
      >
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Map enabled</p>
            <p className="text-xs text-muted-foreground">
              Runtime renders map only with a valid URL.
            </p>
          </div>
          <Switch
            checked={normalized.map?.enabled ?? false}
            onCheckedChange={(checked) => updateMap(value, onChange, { enabled: checked })}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Map embed URL</p>
          <Input
            value={normalized.map?.embedUrl ?? ""}
            onChange={(event) => updateMap(value, onChange, { embedUrl: event.target.value })}
            placeholder="https://maps.google.com/..."
          />
        </div>
      </EditorSection>

      <EditorSection
        title="Layout tokens"
        description="Technical spacing and density tokens for contact section."
      >
        <div className="space-y-2">
          <p className="text-sm font-medium">Spacing token</p>
          <Select
            value={normalized.style?.spacing ?? "md"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { spacing: next as ContactSpacing })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select spacing token" />
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
          <p className="text-sm font-medium">Columns token</p>
          <Select
            value={normalized.style?.columns ?? "two"}
            onValueChange={(next) =>
              updateStyle(value, onChange, { columns: next as ContactColumns })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select columns token" />
            </SelectTrigger>
            <SelectContent>
              {columnOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ColorField
          label="Background token"
          value={normalized.style?.background}
          onChange={(next) => updateStyle(value, onChange, { background: next })}
          placeholder="transparent or #f8fafc"
          pickerFallback="#ffffff"
        />
      </EditorSection>
    </div>
  );
}
