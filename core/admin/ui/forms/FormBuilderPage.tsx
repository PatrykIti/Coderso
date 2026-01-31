import {
  AlignLeft,
  ArrowLeft,
  AtSign,
  Calendar,
  CheckSquare,
  Eye,
  ListChecks,
  Loader2,
  Save,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createForm,
  listFormFields,
  listForms,
  updateFormFields,
  type FormFieldInput,
  type FormField as ApiFormField,
  type FormRecord,
} from "@/services/formsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { FieldLibrary, type FieldLibraryItem } from "./FieldLibrary";
import { FieldSettingsPanel, type FieldSettings } from "./FieldSettingsPanel";
import { FormCanvas } from "./FormCanvas";

const fieldLibraryItems: FieldLibraryItem[] = [
  {
    id: "text",
    label: "Text Input",
    icon: Type,
    type: "text",
    helper: "Single line text field.",
  },
  {
    id: "email",
    label: "Email Field",
    icon: AtSign,
    type: "email",
    helper: "Validates email addresses automatically.",
  },
  {
    id: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    type: "checkbox",
    helper: "Toggle a yes/no value.",
  },
  {
    id: "select",
    label: "Select Menu",
    icon: ListChecks,
    type: "select",
    helper: "Choose one option from a list.",
  },
  {
    id: "textarea",
    label: "Textarea",
    icon: AlignLeft,
    type: "textarea",
    helper: "Multi-line text input.",
  },
  {
    id: "date",
    label: "Date Picker",
    icon: Calendar,
    type: "date",
    helper: "Pick a date from the calendar.",
  },
];

type FormFieldState = FieldSettings & {
  name: string;
  required: boolean;
  orderIndex: number;
  settings: FieldSettings["settings"];
};

const defaultFields: FormFieldInput[] = [
  {
    type: "text",
    label: "Full Name",
    name: "full_name",
    required: true,
    settings: { placeholder: "John Doe" },
  },
  {
    type: "email",
    label: "Email Address",
    name: "email",
    required: true,
    settings: { placeholder: "example@email.com" },
  },
  {
    type: "textarea",
    label: "Message",
    name: "message",
    required: true,
    settings: { placeholder: "Type your request..." },
  },
];

const createLocalId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `field_${Math.random().toString(36).slice(2, 10)}`;
};

const toFieldState = (field: ApiFormField): FormFieldState => ({
  id: field.id,
  label: field.label,
  type: field.type,
  name: field.name,
  required: field.required,
  orderIndex: field.orderIndex,
  settings: {
    ...(field.settings ?? {}),
  },
});

export function FormBuilderPage() {
  const [activeForm, setActiveForm] = useState<FormRecord | null>(null);
  const [fields, setFields] = useState<FormFieldState[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    listForms()
      .then(async (result) => {
        if (!active) return;
        if (result.length === 0) {
          const created = await createForm({
            name: "Contact Support Form",
            status: "draft",
          });
          await updateFormFields(created.id, defaultFields);
          const fieldsResult = await listFormFields(created.id);
          if (!active) return;
          setActiveForm(created);
          const mapped = fieldsResult.map(toFieldState);
          setFields(mapped);
          setSelectedFieldId(mapped[0]?.id ?? null);
          setDirty(false);
          return;
        }

        const first = result[0] ?? null;
        setActiveForm(first);
        if (first) {
          const fieldsResult = await listFormFields(first.id);
          if (!active) return;
          const mapped = fieldsResult.map(toFieldState);
          setFields(mapped);
          setSelectedFieldId(mapped[0]?.id ?? null);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setLoadError(err.message);
        } else {
          setLoadError("Failed to load forms.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddField = (item: FieldLibraryItem) => {
    const baseName = item.id;
    let name = baseName;
    let suffix = 1;
    const existingNames = new Set(fields.map((field) => field.name));
    while (existingNames.has(name)) {
      name = `${baseName}_${suffix}`;
      suffix += 1;
    }
    const newField: FormFieldState = {
      id: createLocalId(),
      label: item.label,
      type: item.type,
      name,
      required: false,
      orderIndex: fields.length,
      settings: {
        placeholder: item.type === "textarea" ? "Type your response..." : "",
      },
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setDirty(true);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) =>
      prev
        .filter((field) => field.id !== id)
        .map((field, index) => ({ ...field, orderIndex: index }))
    );
    setSelectedFieldId((prev) => (prev === id ? null : prev));
    setDirty(true);
  };

  const handleFieldChange = (fieldId: string, updates: Partial<FormFieldState>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );
    setDirty(true);
  };

  const handleFieldSettingsChange = (
    fieldId: string,
    updates: Partial<FormFieldState["settings"]>
  ) => {
    setFields((prev) =>
      prev.map((field) =>
        field.id === fieldId
          ? { ...field, settings: { ...field.settings, ...updates } }
          : field
      )
    );
    setDirty(true);
  };

  const handleDuplicate = (fieldId: string) => {
    const source = fields.find((field) => field.id === fieldId);
    if (!source) return;
    let name = `${source.name}_copy`;
    let suffix = 1;
    const existingNames = new Set(fields.map((field) => field.name));
    while (existingNames.has(name)) {
      name = `${source.name}_copy_${suffix}`;
      suffix += 1;
    }
    const copy: FormFieldState = {
      ...source,
      id: createLocalId(),
      name,
      orderIndex: fields.length,
    };
    setFields((prev) => [...prev, copy]);
    setSelectedFieldId(copy.id);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!activeForm) return;
    setIsSaving(true);
    setSaveError(null);
    setSuccess(null);
    try {
      const payload: FormFieldInput[] = fields.map((field, index) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        name: field.name,
        required: field.required,
        orderIndex: index,
        settings: field.settings,
      }));
      await updateFormFields(activeForm.id, payload);
      const refreshed = await listFormFields(activeForm.id);
      const mapped = refreshed.map(toFieldState);
      setFields(mapped);
      setSelectedFieldId(mapped[0]?.id ?? null);
      setDirty(false);
      setSuccess("Form saved.");
    } catch (err) {
      if (isApiClientError(err)) {
        setSaveError(err.message);
      } else {
        setSaveError("Failed to save form.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isLoading || isSaving;

  return (
    <AdminShell
      activeHref="/admin/forms"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {activeForm?.name ?? "Forms"}
            </span>
            <span className="text-xs text-muted-foreground">
              {activeForm?.status ? `Status: ${activeForm.status}` : "Loading form"}
            </span>
          </div>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button size="sm" className="gap-2" disabled={isBusy || !dirty} onClick={handleSave}>
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Form"}
          </Button>
        </div>
      }
    >
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <aside className="hidden min-h-0 w-72 shrink-0 overflow-hidden border-r bg-background lg:block">
          <FieldLibrary
            items={fieldLibraryItems}
            onAddField={handleAddField}
          />
        </aside>
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden bg-muted/20">
          <div className="h-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading form builder...
              </div>
            ) : loadError ? (
              <div className="p-6">
                <Alert variant="destructive">
                  <AlertTitle>Unable to load forms</AlertTitle>
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <FormCanvas
                selectedFieldId={selectedFieldId}
                fields={fields}
                onSelectField={setSelectedFieldId}
                onRemoveField={handleRemoveField}
              />
            )}
          </div>
        </section>
        <aside className="hidden min-h-0 w-80 shrink-0 overflow-hidden border-l bg-background lg:block">
          <FieldSettingsPanel
            field={selectedField}
            onChange={handleFieldChange}
            onSettingsChange={handleFieldSettingsChange}
            onDuplicate={handleDuplicate}
          />
        </aside>
      </div>
      {success ? (
        <div className="pointer-events-none fixed bottom-6 right-6 rounded-md border bg-background px-4 py-2 text-xs text-muted-foreground shadow">
          {success}
        </div>
      ) : null}
      {saveError ? (
        <div className="pointer-events-none fixed bottom-6 left-6 rounded-md border border-destructive/40 bg-background px-4 py-2 text-xs text-destructive shadow">
          {saveError}
        </div>
      ) : null}
    </AdminShell>
  );
}
