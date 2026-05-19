import { CirclePlus, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { resolveFormFieldStyle } from "../../../services/forms/fieldSettings";

type FieldPreviewProps = {
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  options?: string[];
  selected?: boolean;
  multiline?: boolean;
  kind?: "text" | "select" | "checkbox" | "radio" | "range";
  labelHidden?: boolean;
  onSelect?: (id: string) => void;
  onRemove?: (id: string) => void;
};

function FieldPreview({
  id,
  label,
  placeholder,
  value,
  options,
  selected = false,
  multiline = false,
  kind = "text",
  labelHidden = false,
  onSelect,
  onRemove,
}: FieldPreviewProps) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(id);
      }}
      className={cn(
        "group relative rounded-xl border p-4 transition",
        selected ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border/70"
      )}
    >
      <div className="absolute -left-10 top-1/2 hidden -translate-y-1/2 opacity-0 transition group-hover:opacity-100 lg:flex">
        <Button variant="ghost" size="icon-xs" aria-label="Reorder field">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      {selected ? (
        <div className="absolute -right-2 -top-2">
          <Button
            variant="ghost"
            size="icon-xs"
            className="border bg-background/90 shadow-sm"
            aria-label="Remove field"
            onClick={(event) => {
              event.stopPropagation();
              onRemove?.(id);
            }}
          >
            <Trash2 className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        {!labelHidden ? (
          <label
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.2em]",
              selected ? "text-primary" : "text-muted-foreground"
            )}
          >
            {label}
          </label>
        ) : null}
        {multiline ? (
          <Textarea
            placeholder={placeholder}
            defaultValue={value}
            rows={4}
            readOnly
            className={cn(
              "resize-none",
              selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground"
            )}
          />
        ) : kind === "checkbox" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 rounded border bg-background" />
            <span>{value ?? "Yes, I agree"}</span>
          </div>
        ) : kind === "radio" ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            {(options && options.length > 0 ? options : [value ?? "Option"])
              .slice(0, 3)
              .map((option) => (
                <div key={`${id}-${option}`} className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border bg-background" />
                  <span>{option}</span>
                </div>
              ))}
          </div>
        ) : kind === "range" ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <input type="range" value={value ?? "0"} readOnly className="w-full" />
            <span>{value ?? "0"}</span>
          </div>
        ) : (
          <Input
            placeholder={placeholder}
            defaultValue={value}
            readOnly
            className={cn(
              selected ? "border-primary/30 bg-background" : "bg-muted/40 text-muted-foreground"
            )}
          />
        )}
      </div>
    </div>
  );
}

type FormCanvasProps = {
  formTitle: string;
  formDescription?: string;
  layoutMode?: "single" | "multi_step";
  stepTitles?: string[];
  formSelected: boolean;
  selectedFieldId: string | null;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required: boolean;
    settings: {
      placeholder?: string;
      helper?: string;
      options?: string[];
      defaultValue?: string | boolean;
      step?: number;
      style?: {
        width?: "full" | "half";
        labelPosition?: "above" | "inline" | "hidden";
      };
    };
  }>;
  onSelectField: (id: string) => void;
  onSelectForm: () => void;
  onRemoveField: (id: string) => void;
};

export function FormCanvas({
  formTitle,
  formDescription,
  layoutMode = "single",
  stepTitles = [],
  formSelected,
  selectedFieldId,
  fields,
  onSelectField,
  onSelectForm,
  onRemoveField,
}: FormCanvasProps) {
  const hasFields = fields.length > 0;
  const groupedFields = fields.reduce(
    (acc, field) => {
      const rawStep = field.settings.step;
      const step = Number.isFinite(rawStep) ? Math.max(1, Number(rawStep)) : 1;
      if (!acc[step]) {
        acc[step] = [];
      }
      acc[step].push(field);
      return acc;
    },
    {} as Record<number, FormCanvasProps["fields"]>
  );
  const sortedSteps = Object.keys(groupedFields)
    .map((value) => Number(value))
    .sort((left, right) => left - right);

  const renderField = (field: FormCanvasProps["fields"][number]) => {
    const kind =
      field.type === "checkbox"
        ? "checkbox"
        : field.type === "radio"
          ? "radio"
          : field.type === "range" || field.type === "rating"
            ? "range"
            : field.type === "select"
              ? "select"
              : "text";
    const multiline = field.type === "textarea";
    const value =
      typeof field.settings.defaultValue === "string" ? field.settings.defaultValue : undefined;
    const style = resolveFormFieldStyle(field.settings.style);
    return (
      <FieldPreview
        key={field.id}
        id={field.id}
        label={field.label}
        placeholder={field.settings.placeholder}
        value={value}
        options={Array.isArray(field.settings.options) ? field.settings.options : undefined}
        selected={selectedFieldId === field.id}
        multiline={multiline}
        kind={kind}
        labelHidden={style.labelPosition === "hidden"}
        onSelect={onSelectField}
        onRemove={onRemoveField}
      />
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.25),_transparent_0)] bg-[size:20px_20px] px-8 py-10 dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(51,65,85,0.45),_transparent_0)] lg:px-12">
        <div className="mx-auto flex w-full max-w-2xl flex-col">
          <Card
            className={cn(
              "gap-6 rounded-3xl border-border/60 bg-background p-8 shadow-xl transition",
              formSelected ? "border-primary/40 ring-1 ring-primary/20" : "hover:border-border"
            )}
            role="button"
            onClick={onSelectForm}
          >
            <div className="space-y-1 border-b border-border/60 pb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                {formTitle.trim().length > 0 ? formTitle : "Form title"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formDescription && formDescription.trim().length > 0
                  ? formDescription
                  : "Add a short description for this form."}
              </p>
            </div>
            <div className="space-y-4">
              {hasFields ? (
                layoutMode === "multi_step" ? (
                  sortedSteps.map((step) => (
                    <div
                      key={`step-${step}`}
                      className="space-y-3 rounded-xl border bg-muted/10 p-4"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {stepTitles[step - 1]?.trim() || `Step ${step}`}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(groupedFields[step] ?? []).map((field) => {
                          const style = resolveFormFieldStyle(field.settings.style);
                          const spanClass =
                            style.width === "half" ? "md:col-span-1" : "md:col-span-2";
                          return (
                            <div key={field.id} className={spanClass}>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {fields.map((field) => {
                      const style = resolveFormFieldStyle(field.settings.style);
                      const spanClass = style.width === "half" ? "md:col-span-1" : "md:col-span-2";
                      return (
                        <div key={field.id} className={spanClass}>
                          {renderField(field)}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 text-center text-muted-foreground">
                  <CirclePlus className="mb-2 h-6 w-6" />
                  <p className="text-xs font-medium">Drop a field here to add to your form</p>
                </div>
              )}
            </div>
            <div className="pt-4">
              <Button className="w-full">Submit Form</Button>
            </div>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
