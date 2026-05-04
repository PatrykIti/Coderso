import { type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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
  normalizeFormEmbedData,
  type FormEmbedData,
  type FormEmbedLayout,
  type FormEmbedStyle,
} from "../../../../widgets/core/formEmbed";
import type { WidgetEditorProps } from "../../../../widgets/types";
import { ClearableFieldHeader } from "./ClearableFields";
import { useForms } from "@/ui/forms/hooks/useForms";

const alignmentOptions = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
] as const;

const widthOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
] as const;

const spacingOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Compact" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Spacious" },
  { id: "xl", label: "Extra spacious" },
] as const;

const borderWidthOptions = [
  { id: "0", label: "None" },
  { id: "1", label: "Thin" },
  { id: "2", label: "Thick" },
] as const;

const radiusOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

const inputSizeOptions = [
  { id: "none", label: "None" },
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

const NO_FORM_VALUE = "__no_form__";

type AlignmentValue = NonNullable<FormEmbedLayout["alignment"]>;
type WidthValue = NonNullable<FormEmbedLayout["width"]>;
type SpacingValue = NonNullable<FormEmbedLayout["spacing"]>;
type ButtonAlignmentValue = NonNullable<FormEmbedLayout["buttonAlignment"]>;
type BorderWidthValue = NonNullable<FormEmbedStyle["borderWidth"]>;
type RadiusValue = NonNullable<FormEmbedStyle["radius"]>;
type InputSizeValue = NonNullable<FormEmbedStyle["inputSize"]>;

const isAlignmentValue = (value: string): value is AlignmentValue =>
  alignmentOptions.some((option) => option.id === value);

const isWidthValue = (value: string): value is WidthValue =>
  widthOptions.some((option) => option.id === value);

const isSpacingValue = (value: string): value is SpacingValue =>
  spacingOptions.some((option) => option.id === value);

const isButtonAlignmentValue = (value: string): value is ButtonAlignmentValue =>
  isAlignmentValue(value);

const isBorderWidthValue = (value: string): value is BorderWidthValue =>
  borderWidthOptions.some((option) => option.id === value);

const isRadiusValue = (value: string): value is RadiusValue =>
  radiusOptions.some((option) => option.id === value);

const isInputSizeValue = (value: string): value is InputSizeValue =>
  inputSizeOptions.some((option) => option.id === value);

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const resolvePickerColor = (value: string | undefined, fallback: string) =>
  value && hexColorPattern.test(value) ? value : fallback;

function normalizeValue(value: FormEmbedData): FormEmbedData {
  return normalizeFormEmbedData(value);
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
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  updater: (current: FormEmbedData) => FormEmbedData
) {
  const current = normalizeValue(value);
  const next = updater(current);
  onChange(normalizeValue(next));
}

function updateLayout(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["layout"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    layout: {
      ...current.layout,
      ...patch,
    },
  }));
}

function updateStyle(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["style"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    style: {
      ...current.style,
      ...patch,
    },
  }));
}

function clearStyleField(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  key: keyof NonNullable<FormEmbedData["style"]>
) {
  updateValue(value, onChange, (current) => {
    const { [key]: _removed, ...style } = current.style ?? {};
    return {
      ...current,
      style,
    };
  });
}

function updateFields(
  value: FormEmbedData,
  onChange: (next: FormEmbedData) => void,
  patch: Partial<NonNullable<FormEmbedData["fields"]>>
) {
  updateValue(value, onChange, (current) => ({
    ...current,
    fields: {
      ...current.fields,
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
  onClear,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder: string;
  pickerFallback: string;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={label} value={value} onClear={onClear} />
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

function FormSelection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const { items: forms, isLoading } = useForms();
  const normalized = normalizeValue(value);
  const normalizedFormId = normalized.formId?.trim() ?? "";
  const selectedForm = forms.find((form) => form.id === normalizedFormId) ?? null;
  const selectedValue = selectedForm ? selectedForm.id : NO_FORM_VALUE;
  const isInternal = selectedForm?.submissionAccess === "internal";

  return (
    <EditorSection title="Form selection" description="Pick the saved form to embed.">
      <Select
        value={selectedValue}
        onValueChange={(formId) =>
          updateValue(value, onChange, (current) => ({
            ...current,
            formId: formId === NO_FORM_VALUE ? "" : formId,
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading forms..." : "Select form"} />
        </SelectTrigger>
        <SelectContent>
          {selectedValue === NO_FORM_VALUE ? (
            <SelectItem value={NO_FORM_VALUE} disabled>
              {forms.length === 0
                ? isLoading
                  ? "Loading forms..."
                  : "No forms found"
                : "Select form"}
            </SelectItem>
          ) : null}
          {forms.map((form) => (
            <SelectItem key={form.id} value={form.id}>
              <div className="flex items-center gap-2">
                <span>{form.name}</span>
                <Badge variant={form.status === "published" ? "default" : "outline"}>
                  {form.status}
                </Badge>
                {form.submissionAccess === "internal" ? (
                  <Badge variant="outline">Internal</Badge>
                ) : null}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isInternal ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Internal submissions require an authenticated admin session or an API key with the
          <span className="font-semibold"> forms.submit </span>scope. Avoid embedding this form on
          public pages.
        </div>
      ) : null}
    </EditorSection>
  );
}

function ContentSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection title="Content" description="Override the title and messaging.">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
        <Input
          value={normalized.title ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Optional custom title"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
        <Textarea
          rows={3}
          value={normalized.description ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Optional description text"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Submit label
        </label>
        <Input
          value={normalized.submitLabel ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              submitLabel: event.target.value,
            }))
          }
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Success message
        </label>
        <Textarea
          rows={2}
          value={normalized.successMessage ?? ""}
          onChange={(event) =>
            updateValue(value, onChange, (current) => ({
              ...current,
              successMessage: event.target.value,
            }))
          }
          placeholder="Leave blank to use form fallback"
        />
      </div>
    </EditorSection>
  );
}

function LayoutSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection title="Layout" description="Control spacing and alignment.">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Alignment</label>
        <Select
          value={normalized.layout?.alignment ?? "start"}
          onValueChange={(alignment) => {
            if (!isAlignmentValue(alignment)) return;
            updateLayout(value, onChange, { alignment });
          }}
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
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Width</label>
        <Select
          value={normalized.layout?.width ?? "md"}
          onValueChange={(width) => {
            if (!isWidthValue(width)) return;
            updateLayout(value, onChange, { width });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Width" />
          </SelectTrigger>
          <SelectContent>
            {widthOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Spacing</label>
        <Select
          value={normalized.layout?.spacing ?? "md"}
          onValueChange={(spacing) => {
            if (!isSpacingValue(spacing)) return;
            updateLayout(value, onChange, { spacing });
          }}
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
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Button alignment
        </label>
        <Select
          value={normalized.layout?.buttonAlignment ?? "start"}
          onValueChange={(buttonAlignment) => {
            if (!isButtonAlignmentValue(buttonAlignment)) return;
            updateLayout(value, onChange, { buttonAlignment });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Button alignment" />
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
    </EditorSection>
  );
}

function FieldsSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection title="Field labels" description="Control label visibility and required badges.">
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Show labels</p>
          <p className="text-xs text-muted-foreground">Display field names above each input.</p>
        </div>
        <Switch
          checked={Boolean(normalized.fields?.showLabels)}
          onCheckedChange={(checked) =>
            updateFields(value, onChange, { showLabels: checked === true })
          }
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Required indicator</p>
          <p className="text-xs text-muted-foreground">Show a star for required fields.</p>
        </div>
        <Switch
          checked={Boolean(normalized.fields?.showRequiredIndicator)}
          onCheckedChange={(checked) =>
            updateFields(value, onChange, { showRequiredIndicator: checked === true })
          }
        />
      </div>
    </EditorSection>
  );
}

function StyleSection({
  value,
  onChange,
}: {
  value: FormEmbedData;
  onChange: (next: FormEmbedData) => void;
}) {
  const normalized = normalizeValue(value);
  return (
    <EditorSection title="Style" description="Adjust surfaces, borders, and inputs.">
      <ColorField
        label="Background"
        value={normalized.style?.background}
        onChange={(background) => updateStyle(value, onChange, { background })}
        onClear={() => clearStyleField(value, onChange, "background")}
        placeholder="transparent"
        pickerFallback="#ffffff"
      />
      <ColorField
        label="Surface"
        value={normalized.style?.surface}
        onChange={(surface) => updateStyle(value, onChange, { surface })}
        onClear={() => clearStyleField(value, onChange, "surface")}
        placeholder="var(--color-bg)"
        pickerFallback="#ffffff"
      />
      <ColorField
        label="Border color"
        value={normalized.style?.borderColor}
        onChange={(borderColor) => updateStyle(value, onChange, { borderColor })}
        placeholder="var(--color-border)"
        pickerFallback="#e2e8f0"
      />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">
          Border width
        </label>
        <Select
          value={normalized.style?.borderWidth ?? "1"}
          onValueChange={(borderWidth) => {
            if (!isBorderWidthValue(borderWidth)) return;
            updateStyle(value, onChange, { borderWidth });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Border width" />
          </SelectTrigger>
          <SelectContent>
            {borderWidthOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Radius</label>
        <Select
          value={normalized.style?.radius ?? "md"}
          onValueChange={(radius) => {
            if (!isRadiusValue(radius)) return;
            updateStyle(value, onChange, { radius });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Radius" />
          </SelectTrigger>
          <SelectContent>
            {radiusOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase text-muted-foreground">Input size</label>
        <Select
          value={normalized.style?.inputSize ?? "md"}
          onValueChange={(inputSize) => {
            if (!isInputSizeValue(inputSize)) return;
            updateStyle(value, onChange, { inputSize });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Input size" />
          </SelectTrigger>
          <SelectContent>
            {inputSizeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </EditorSection>
  );
}

function FormEmbedEditor({ value, onChange }: WidgetEditorProps<FormEmbedData>) {
  return (
    <div className="space-y-4">
      <FormSelection value={value} onChange={onChange} />
      <ContentSection value={value} onChange={onChange} />
      <LayoutSection value={value} onChange={onChange} />
      <FieldsSection value={value} onChange={onChange} />
      <StyleSection value={value} onChange={onChange} />
    </div>
  );
}

export function FormEmbedWizardEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedEditor {...props} />;
}

export function FormEmbedVisualEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedEditor {...props} />;
}

export function FormEmbedAdvancedEditor(props: WidgetEditorProps<FormEmbedData>) {
  return <FormEmbedEditor {...props} />;
}
