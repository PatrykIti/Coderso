import { Info, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  formFieldLabelPositionOptions,
  formFieldLogicOperatorOptions,
  formFieldWidthOptions,
  isValueLogicOperator,
  type FormFieldLogic,
  type FormFieldLogicOperator,
  type FormFieldStyle,
} from "../../../services/forms/fieldSettings";

export type FieldSettings = {
  id: string;
  label: string;
  type: string;
  name: string;
  required: boolean;
  settings: {
    placeholder?: string;
    helper?: string;
    options?: string[];
    defaultValue?: boolean | string;
    pattern?: string;
    min?: number;
    max?: number;
    formStep?: number;
    inputStep?: number;
    step?: number;
    logic?: FormFieldLogic;
    style?: FormFieldStyle;
  };
};

type FieldSettingsPanelProps = {
  field: FieldSettings | null;
  allFields: Array<Pick<FieldSettings, "id" | "name" | "label">>;
  onChange: (fieldId: string, updates: Partial<FieldSettings>) => void;
  onSettingsChange: (fieldId: string, updates: Partial<FieldSettings["settings"]>) => void;
  onDuplicate?: (fieldId: string) => void;
};

const supportsPlaceholder = new Set([
  "text",
  "email",
  "textarea",
  "phone",
  "date",
  "number",
  "time",
]);
const supportsOptions = new Set(["select", "radio"]);
const supportsDefault = new Set(["checkbox"]);
const supportsChoiceDefault = new Set(["select", "radio"]);
const supportsNumericBounds = new Set(["number", "range", "rating"]);
const supportsStep = new Set(["number", "range"]);
const supportsTextDefault = new Set(["hidden"]);

const createLogicPatch = (
  current: FormFieldLogic | undefined,
  patch: Partial<FormFieldLogic>
): FormFieldLogic => {
  const base = current ?? { operator: "always" as FormFieldLogicOperator };
  const merged: FormFieldLogic = {
    ...base,
    ...patch,
  };

  if (merged.operator === "always") {
    return { operator: "always" };
  }

  const field = merged.field?.trim() ?? "";
  if (!field) {
    return {
      operator: merged.operator,
      field: "",
      ...(isValueLogicOperator(merged.operator) ? { value: merged.value?.trim() ?? "" } : {}),
    };
  }

  if (isValueLogicOperator(merged.operator)) {
    return {
      operator: merged.operator,
      field,
      value: merged.value?.trim() ?? "",
    };
  }

  return {
    operator: merged.operator,
    field,
  };
};

export function FieldSettingsPanel({
  field,
  allFields,
  onChange,
  onSettingsChange,
  onDuplicate,
}: FieldSettingsPanelProps) {
  if (!field) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Select a field to configure.
      </div>
    );
  }

  const optionsValue = field.settings.options?.join("\n") ?? "";
  const dependentFieldOptions = allFields.filter((entry) => entry.id !== field.id);
  const logic = field.settings.logic ?? { operator: "always" as FormFieldLogicOperator };
  const style = field.settings.style ?? { width: "full", labelPosition: "above" };
  const needsField = logic.operator !== "always";
  const needsValue = isValueLogicOperator(logic.operator);

  const patchLogic = (patch: Partial<FormFieldLogic>) => {
    const next = createLogicPatch(field.settings.logic, patch);
    onSettingsChange(field.id, { logic: next });
  };

  const patchStyle = (patch: Partial<FormFieldStyle>) => {
    onSettingsChange(field.id, {
      style: {
        ...(field.settings.style ?? {}),
        ...patch,
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1 text-primary">
              <Settings2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Field Settings</p>
              <p className="text-xs text-muted-foreground">{field.label}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {field.type}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-5">
        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="w-full" variant="default">
            <TabsTrigger value="general" className="flex-1 text-xs uppercase">
              General
            </TabsTrigger>
            <TabsTrigger value="logic" className="flex-1 text-xs uppercase">
              Logic
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1 text-xs uppercase">
              Style
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Label
                </label>
                <Input
                  value={field.label}
                  onChange={(event) => onChange(field.id, { label: event.target.value })}
                />
              </div>
              {supportsPlaceholder.has(field.type) ? (
                <div className="space-y-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Placeholder
                  </label>
                  <Input
                    value={field.settings.placeholder ?? ""}
                    onChange={(event) =>
                      onSettingsChange(field.id, {
                        placeholder: event.target.value,
                      })
                    }
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Helper Text
                </label>
                <Textarea
                  rows={2}
                  value={field.settings.helper ?? ""}
                  onChange={(event) => onSettingsChange(field.id, { helper: event.target.value })}
                />
              </div>
            </div>
            {supportsOptions.has(field.type) ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Options
                  </label>
                  <Textarea
                    rows={4}
                    value={optionsValue}
                    onChange={(event) => {
                      const options = event.target.value
                        .split(/\n+/)
                        .map((option) => option.trim())
                        .filter(Boolean);
                      onSettingsChange(field.id, { options });
                    }}
                    className="text-xs"
                    placeholder="Option 1&#10;Option 2"
                  />
                </div>
              </>
            ) : null}
            {supportsDefault.has(field.type) ? (
              <>
                <Separator />
                <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Default state</p>
                    <p className="text-xs text-muted-foreground">
                      Pre-check this option for new submissions.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(field.settings.defaultValue)}
                    onCheckedChange={(value) => onSettingsChange(field.id, { defaultValue: value })}
                  />
                </div>
              </>
            ) : null}
            {supportsChoiceDefault.has(field.type) ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Default option
                  </label>
                  {field.settings.options && field.settings.options.length > 0 ? (
                    <Select
                      value={
                        typeof field.settings.defaultValue === "string"
                          ? field.settings.defaultValue
                          : "__none__"
                      }
                      onValueChange={(value) =>
                        onSettingsChange(field.id, {
                          defaultValue: value === "__none__" ? undefined : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No default option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No default option</SelectItem>
                        {field.settings.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Add options before selecting a default value.
                    </p>
                  )}
                </div>
              </>
            ) : null}
            {supportsTextDefault.has(field.type) ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Trusted default value
                  </label>
                  <Input
                    value={
                      typeof field.settings.defaultValue === "string"
                        ? field.settings.defaultValue
                        : ""
                    }
                    onChange={(event) =>
                      onSettingsChange(field.id, { defaultValue: event.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Hidden fields submit this exact value and reject client-side tampering.
                  </p>
                </div>
              </>
            ) : null}
            {supportsNumericBounds.has(field.type) ? (
              <>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Minimum
                    </label>
                    <Input
                      type="number"
                      value={field.settings.min ?? ""}
                      onChange={(event) =>
                        onSettingsChange(field.id, {
                          min:
                            event.target.value.trim().length === 0
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Maximum
                    </label>
                    <Input
                      type="number"
                      value={field.settings.max ?? ""}
                      onChange={(event) =>
                        onSettingsChange(field.id, {
                          max:
                            event.target.value.trim().length === 0
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}
            {supportsStep.has(field.type) ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Input increment
                  </label>
                  <Input
                    type="number"
                    value={field.settings.inputStep ?? ""}
                    onChange={(event) =>
                      onSettingsChange(field.id, {
                        inputStep:
                          event.target.value.trim().length === 0
                            ? undefined
                            : Number(event.target.value),
                      })
                    }
                  />
                </div>
              </>
            ) : null}
            <Separator />
            <div className="space-y-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Validation Rules
              </label>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Step number</label>
                <Input
                  inputMode="numeric"
                  value={String(field.settings.formStep ?? field.settings.step ?? 1)}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    const step = Number.isFinite(parsed) ? Math.max(1, Math.min(10, parsed)) : 1;
                    onSettingsChange(field.id, { formStep: step });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Use this to group fields in multi-step forms.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Required Field</p>
                  <p className="text-xs text-muted-foreground">Prevent empty submissions.</p>
                </div>
                <Switch
                  checked={field.required}
                  onCheckedChange={(value) => onChange(field.id, { required: value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Regex Pattern</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={field.settings.pattern ?? ""}
                    onChange={(event) =>
                      onSettingsChange(field.id, {
                        pattern: event.target.value,
                      })
                    }
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon-sm" aria-label="Regex help">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="logic" className="space-y-4">
            <div className="space-y-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Visibility rule
              </label>
              <Select
                value={logic.operator}
                onValueChange={(value) => patchLogic({ operator: value as FormFieldLogicOperator })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rule" />
                </SelectTrigger>
                <SelectContent>
                  {formFieldLogicOperatorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsField ? (
              <div className="space-y-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Dependent field
                </label>
                {dependentFieldOptions.length === 0 ? (
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Add at least one more field to create conditional visibility.
                  </div>
                ) : (
                  <Select
                    value={logic.field && logic.field.length > 0 ? logic.field : undefined}
                    onValueChange={(value) => patchLogic({ field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose field" />
                    </SelectTrigger>
                    <SelectContent>
                      {dependentFieldOptions.map((entry) => (
                        <SelectItem key={entry.id} value={entry.name}>
                          {entry.label} ({entry.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            {needsValue ? (
              <div className="space-y-2">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Match value
                </label>
                <Input
                  value={logic.value ?? ""}
                  onChange={(event) => patchLogic({ value: event.target.value })}
                  placeholder="Value to match"
                />
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              Hidden fields are excluded from required validation and submission payload.
            </div>
          </TabsContent>
          <TabsContent value="style" className="space-y-4">
            <div className="space-y-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Field width
              </label>
              <Select
                value={style.width ?? "full"}
                onValueChange={(value) => patchStyle({ width: value as FormFieldStyle["width"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                  {formFieldWidthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Label position
              </label>
              <Select
                value={style.labelPosition ?? "above"}
                onValueChange={(value) =>
                  patchStyle({
                    labelPosition: value as FormFieldStyle["labelPosition"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select label position" />
                </SelectTrigger>
                <SelectContent>
                  {formFieldLabelPositionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
              Style options apply in runtime preview and frontend form rendering.
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <div className="border-t p-4">
        <Button variant="secondary" className="w-full" onClick={() => onDuplicate?.(field.id)}>
          Duplicate Field
        </Button>
      </div>
    </div>
  );
}
