import {
  AlignLeft,
  AtSign,
  Calendar,
  CheckSquare,
  ListChecks,
  Save,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  getCachedFormActions,
  getCachedFormDetail,
  getFormDetailCached,
  listFormActionsCached,
  updateForm,
  updateFormActions,
  updateFormFields,
  type FormDetail,
  type FormAction,
  type FormActionInput,
  type FormAutomationRetrySettings,
  type FormField as ApiFormField,
  type FormFieldInput,
  type FormPresetId,
  type FormRecord,
  type FormSettings,
  type FormStatus,
} from "@/services/formsClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  getDefaultFormSettings,
  normalizeFormSettings,
  normalizeFormStep,
} from "../../../services/forms/formSettings";
import {
  clonePresetFields,
  getFormPresetDefinition,
  listFormPresets,
} from "../../../services/forms/formPresets";

import { FieldLibrary, type FieldLibraryItem } from "./FieldLibrary";
import { FieldListPanel, type FormFieldListItem } from "./FieldListPanel";
import { FormActionsPanel } from "./FormActionsPanel";
import { FieldSettingsPanel, type FieldSettings } from "./FieldSettingsPanel";
import { FormCanvas } from "./FormCanvas";
import { FormSettingsPanel } from "./FormSettingsPanel";

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

type SelectedTarget = { type: "form" } | { type: "field"; id: string } | null;

type FormMetaState = {
  name: string;
  description: string;
  status: FormStatus;
  submissionAccess: "public" | "internal";
  successMessage: string;
  successRedirectUrl: string;
  settings: FormSettings;
};

const resolveFormId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "forms");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

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
    step: normalizeFormStep((field.settings ?? {}).step),
  },
});

const toFormMeta = (form: FormRecord): FormMetaState => ({
  name: form.name ?? "",
  description: form.description ?? "",
  status: form.status ?? "draft",
  submissionAccess: form.submissionAccess ?? "public",
  successMessage: form.successMessage ?? "",
  successRedirectUrl: form.successRedirectUrl ?? "",
  settings: normalizeFormSettings(form.settings),
});

const toFormActionInput = (action: FormAction): FormActionInput => ({
  id: action.id,
  type: action.type,
  label: action.label,
  enabled: action.enabled,
  continueOnError: action.continueOnError,
  condition: action.condition,
  config: action.config,
  orderIndex: action.orderIndex,
});

const formPresetOptions = [
  {
    id: "custom" as FormPresetId,
    label: "Custom",
    description: "Keep your current custom structure.",
  },
  ...listFormPresets(),
];

const resolveStepCount = (fields: FormFieldState[]) => {
  if (fields.length === 0) return 1;
  return fields.reduce((max, field) => {
    const step = normalizeFormStep(field.settings.step);
    return step > max ? step : max;
  }, 1);
};

export function FormBuilderPage() {
  const { navigate } = useAdminRouter();
  const [formId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveFormId(window.location.pathname);
  });
  const [activeForm, setActiveForm] = useState<FormRecord | null>(null);
  const [meta, setMeta] = useState<FormMetaState>({
    name: "",
    description: "",
    status: "draft",
    submissionAccess: "public",
    successMessage: "",
    successRedirectUrl: "",
    settings: getDefaultFormSettings(),
  });
  const [formActions, setFormActions] = useState<FormActionInput[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentTypeSummary[]>([]);
  const [inspectorTab, setInspectorTab] = useState<"settings" | "automation">(
    "settings"
  );
  const [fields, setFields] = useState<FormFieldState[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>({ type: "form" });
  const [leftTab, setLeftTab] = useState("fields");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const [remoteUpdatePending, setRemoteUpdatePending] = useState(false);
  const [mobileFieldsOpen, setMobileFieldsOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const setUnsavedChanges = (value: boolean) => {
    hasUnsavedChangesRef.current = value;
    setHasUnsavedChanges(value);
  };

  const selectedFieldId = selectedTarget?.type === "field" ? selectedTarget.id : null;
  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  const fieldListItems = useMemo<FormFieldListItem[]>(
    () =>
      fields.map((field) => ({
        id: field.id,
        label: field.label,
        name: field.name,
        type: field.type,
        required: field.required,
      })),
    [fields]
  );
  const stepCount = useMemo(
    () => Math.max(resolveStepCount(fields), meta.settings.stepTitles.length, 1),
    [fields, meta.settings.stepTitles.length]
  );

  const applyDetail = useCallback((detail: FormDetail) => {
    setActiveForm(detail.form);
    setMeta(toFormMeta(detail.form));
    const mapped = detail.fields.map(toFieldState);
    setFields(mapped);
    if (mapped.length > 0) {
      setSelectedTarget({ type: "field", id: mapped[0].id });
    } else {
      setSelectedTarget({ type: "form" });
    }
    setUnsavedChanges(false);
    setRemoteUpdatePending(false);
  }, []);

  const refreshActions = useCallback(
    async (options?: { setDirty?: boolean }) => {
      if (!formId) return;
      const actions = await listFormActionsCached(formId, { force: true });
      setFormActions(actions.map(toFormActionInput));
      if (options?.setDirty === false) return;
      setUnsavedChanges(true);
    },
    [formId]
  );

  const refreshContentTypes = useCallback(async () => {
    const list = await listContentTypesCached({ force: true });
    setContentTypes(list);
  }, []);

  const refreshForm = useCallback(
    async (options?: { allowUnsaved?: boolean; setLoading?: boolean }) => {
      if (!formId) return;
      const shouldSetLoading = options?.setLoading !== false;
      if (shouldSetLoading) setIsLoading(true);
      try {
        const detail = await getFormDetailCached(formId, { force: true });
        if (!detail) {
          setLoadError("Form not found.");
          return;
        }
        if (!options?.allowUnsaved && hasUnsavedChangesRef.current) {
          setRemoteUpdatePending(true);
          return;
        }
        applyDetail(detail);
        setLoadError(null);
      } catch (err) {
        if (isApiClientError(err)) {
          setLoadError(err.message);
        } else {
          setLoadError("Failed to load form.");
        }
      } finally {
        if (shouldSetLoading) setIsLoading(false);
      }
    },
    [applyDetail, formId]
  );

  useEffect(() => {
    if (!formId) return;
    const cached = getCachedFormDetail(formId);
    const cachedActions = getCachedFormActions(formId);
    if (cached) {
      applyDetail(cached);
      setLoadError(null);
      setIsLoading(false);
    }
    if (cachedActions) {
      setFormActions(cachedActions.map(toFormActionInput));
    }
    refreshActions({ setDirty: false }).catch(() => undefined);
    refreshContentTypes().catch(() => undefined);
    refreshForm({ setLoading: !cached }).catch(() => undefined);
  }, [applyDetail, formId, refreshActions, refreshContentTypes, refreshForm]);

  useEffect(() => {
    if (!formId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.formDetail(formId)) {
        refreshForm({ setLoading: false }).catch(() => undefined);
      }
      if (event.key === cacheKeys.formActions(formId)) {
        refreshActions({ setDirty: false }).catch(() => undefined);
      }
    });
  }, [formId, refreshActions, refreshForm]);

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
        step: 1,
      },
    };
    setFields((prev) => [...prev, newField]);
    setSelectedTarget({ type: "field", id: newField.id });
    setLeftTab("fields");
    setUnsavedChanges(true);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) =>
      prev
        .filter((field) => field.id !== id)
        .map((field, index) => ({ ...field, orderIndex: index }))
    );
    setSelectedTarget((prev) =>
      prev?.type === "field" && prev.id === id ? { type: "form" } : prev
    );
    setUnsavedChanges(true);
  };

  const handleFieldChange = (fieldId: string, updates: Partial<FormFieldState>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...updates } : field))
    );
    setUnsavedChanges(true);
  };

  const handleFieldSettingsChange = (
    fieldId: string,
    updates: Partial<FormFieldState["settings"]>
  ) => {
    setFields((prev) =>
      prev.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              settings: {
                ...field.settings,
                ...updates,
                step: normalizeFormStep(
                  updates.step ?? field.settings.step ?? 1
                ),
              },
            }
          : field
      )
    );
    setUnsavedChanges(true);
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
    setSelectedTarget({ type: "field", id: copy.id });
    setUnsavedChanges(true);
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
      const actionsPayload: FormActionInput[] = formActions.map((action, index) => ({
        ...action,
        orderIndex: index,
      }));
      const [updatedForm, refreshedFields, refreshedActions] = await Promise.all([
        updateForm(activeForm.id, {
          name: meta.name,
          description: meta.description,
          status: meta.status,
          submissionAccess: meta.submissionAccess,
          successMessage: meta.successMessage,
          successRedirectUrl: meta.successRedirectUrl,
          settings: meta.settings,
        }),
        updateFormFields(activeForm.id, payload),
        updateFormActions(activeForm.id, actionsPayload),
      ]);
      const updated = updatedForm ?? activeForm;
      const mapped = refreshedFields.map(toFieldState);
      applyDetail({ form: updated, fields: mapped });
      setFormActions(refreshedActions.map(toFormActionInput));
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
  const formTitle = meta.name || activeForm?.name || "Form";
  const formDescription = meta.description || activeForm?.description || "";

  const setMetaField = <K extends keyof FormMetaState>(
    field: K,
    value: FormMetaState[K]
  ) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };

  const setFormSettings = (updates: Partial<FormSettings>) => {
    setMeta((prev) => ({
      ...prev,
      settings: normalizeFormSettings({
        ...prev.settings,
        ...updates,
      }),
    }));
    setUnsavedChanges(true);
  };

  const setAutomationRetry = (updates: Partial<FormAutomationRetrySettings>) => {
    setMeta((prev) => ({
      ...prev,
      settings: normalizeFormSettings({
        ...prev.settings,
        automationRetry: {
          ...prev.settings.automationRetry,
          ...updates,
        },
      }),
    }));
    setUnsavedChanges(true);
  };

  const setStepTitles = (titles: string[]) => {
    setMeta((prev) => ({
      ...prev,
      settings: normalizeFormSettings({
        ...prev.settings,
        stepTitles: titles,
      }),
    }));
    setUnsavedChanges(true);
  };

  const applyPreset = (presetId: FormPresetId) => {
    if (presetId === "custom") return;
    const preset = getFormPresetDefinition(presetId);
    if (!preset) return;

    const shouldReplace = fields.length > 0;
    if (shouldReplace) {
      const confirmed = window.confirm(
        "Apply preset will replace current fields. Continue?"
      );
      if (!confirmed) return;
    }

    const existingNames = new Set<string>();
    const nextFields: FormFieldState[] = clonePresetFields(preset.fields).map((field, index) => {
      const baseName = field.name ?? `field_${index + 1}`;
      let name = baseName;
      let suffix = 1;
      while (existingNames.has(name)) {
        name = `${baseName}_${suffix}`;
        suffix += 1;
      }
      existingNames.add(name);

      return {
        id: createLocalId(),
        label: field.label,
        type: field.type,
        name,
        required: Boolean(field.required),
        orderIndex: index,
        settings: {
          ...(field.settings ?? {}),
          step: normalizeFormStep(field.settings?.step),
        },
      };
    });

    setFields(nextFields);
    setSelectedTarget(nextFields.length > 0 ? { type: "field", id: nextFields[0].id } : { type: "form" });
    setMeta((prev) => ({
      ...prev,
      successMessage:
        prev.successMessage.trim().length > 0 ? prev.successMessage : preset.successMessage,
      settings: normalizeFormSettings({
        ...prev.settings,
        preset: preset.id,
        layoutMode: preset.layoutMode,
        saveProgress: preset.saveProgress,
        stepTitles: preset.stepTitles,
      }),
    }));
    setUnsavedChanges(true);
  };

  const openActionLogs = () => {
    if (!formId) return;
    navigate(`/forms/${encodeURIComponent(formId)}/action-runs`);
  };

  const renderFormInspector = () => (
    <Tabs
      value={inspectorTab}
      onValueChange={(value) => setInspectorTab(value as "settings" | "automation")}
      className="flex h-full flex-col"
    >
      <TabsList variant="line" className="border-b border-border px-4 pt-4">
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="automation">Automation</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="min-h-0 flex-1">
        <FormSettingsPanel
          name={meta.name}
          description={meta.description}
          status={meta.status}
          submissionAccess={meta.submissionAccess}
          successMessage={meta.successMessage}
          successRedirectUrl={meta.successRedirectUrl}
          settings={meta.settings}
          presetOptions={formPresetOptions}
          stepCount={stepCount}
          onNameChange={(value) => setMetaField("name", value)}
          onDescriptionChange={(value) => setMetaField("description", value)}
          onStatusChange={(value) => setMetaField("status", value)}
          onSubmissionAccessChange={(value) => setMetaField("submissionAccess", value)}
          onSuccessMessageChange={(value) => setMetaField("successMessage", value)}
          onSuccessRedirectUrlChange={(value) => setMetaField("successRedirectUrl", value)}
          onSettingsChange={setFormSettings}
          onAutomationRetryChange={setAutomationRetry}
          onStepTitlesChange={setStepTitles}
          onApplyPreset={applyPreset}
        />
      </TabsContent>
      <TabsContent value="automation" className="min-h-0 flex-1">
        <FormActionsPanel
          actions={formActions}
          contentTypes={contentTypes}
          onChange={(actions) => {
            setFormActions(actions);
            setUnsavedChanges(true);
          }}
          onOpenLogs={openActionLogs}
        />
      </TabsContent>
    </Tabs>
  );

  return (
    <EditorShell
      activeHref="/admin/forms"
      leftPanel={
        <Tabs
          value={leftTab}
          onValueChange={setLeftTab}
          className="flex h-full flex-col"
        >
          <TabsList variant="line" className="border-b border-border px-4 pt-4">
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
          </TabsList>
          <TabsContent value="fields" className="flex-1">
            <FieldListPanel
              fields={fieldListItems}
              selectedId={selectedFieldId}
              onSelect={(id) => setSelectedTarget({ type: "field", id })}
              onAdd={() => setLeftTab("library")}
            />
          </TabsContent>
          <TabsContent value="library" className="flex-1">
            <FieldLibrary items={fieldLibraryItems} onAddField={handleAddField} />
          </TabsContent>
        </Tabs>
      }
      rightPanel={
        selectedTarget?.type === "form" ? (
          renderFormInspector()
        ) : (
          <FieldSettingsPanel
            field={selectedField}
            onChange={handleFieldChange}
            onSettingsChange={handleFieldSettingsChange}
            onDuplicate={handleDuplicate}
          />
        )
      }
      rightPanelClassName="p-0"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span>Forms</span>
          <span>/</span>
          <span className="text-foreground">{formTitle}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            {meta.status}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
    >
      <div className="sticky top-0 z-10 border-b bg-background/80 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openActionLogs}>
              Action logs
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={isBusy || !hasUnsavedChanges}
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save form"}
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFieldsOpen(true)}
            >
              Fields
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileSettingsOpen(true)}
            >
              Details
            </Button>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 py-6">
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load form</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}
        {remoteUpdatePending ? (
          <Alert>
            <AlertTitle>Updated in another tab</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>New changes are available. Refresh to load the latest version.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshForm({ allowUnsaved: true })}
              >
                Refresh
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
            Loading form builder...
          </div>
        ) : (
          <FormCanvas
            formTitle={formTitle}
            formDescription={formDescription}
            layoutMode={meta.settings.layoutMode}
            stepTitles={meta.settings.stepTitles}
            formSelected={selectedTarget?.type === "form"}
            selectedFieldId={selectedFieldId}
            fields={fields}
            onSelectField={(id) => setSelectedTarget({ type: "field", id })}
            onSelectForm={() => setSelectedTarget({ type: "form" })}
            onRemoveField={handleRemoveField}
          />
        )}
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
      <Sheet open={mobileFieldsOpen} onOpenChange={setMobileFieldsOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Fields</SheetTitle>
          <SheetDescription className="sr-only">
            Browse form fields and add new ones.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto">
            <Tabs
              value={leftTab}
              onValueChange={setLeftTab}
              className="flex h-full flex-col"
            >
              <TabsList variant="line" className="border-b border-border px-4 pt-4">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="library">Library</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="flex-1">
                <FieldListPanel
                  fields={fieldListItems}
                  selectedId={selectedFieldId}
                  onSelect={(id) => {
                    setSelectedTarget({ type: "field", id });
                    setMobileFieldsOpen(false);
                  }}
                  onAdd={() => setLeftTab("library")}
                />
              </TabsContent>
              <TabsContent value="library" className="flex-1">
                <FieldLibrary
                  items={fieldLibraryItems}
                  onAddField={(item) => {
                    handleAddField(item);
                    setMobileFieldsOpen(false);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
        <SheetContent side="right" className="w-80 p-0">
          <SheetTitle className="sr-only">Form settings</SheetTitle>
          <SheetDescription className="sr-only">
            Update form settings or field details.
          </SheetDescription>
          <div className="flex h-full flex-col overflow-y-auto">
            {selectedTarget?.type === "form" ? (
              renderFormInspector()
            ) : (
              <FieldSettingsPanel
                field={selectedField}
                onChange={handleFieldChange}
                onSettingsChange={handleFieldSettingsChange}
                onDuplicate={handleDuplicate}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </EditorShell>
  );
}
