import {
  AtSign,
  Calendar,
  ChevronDown,
  CirclePlus,
  Clock,
  GripVertical,
  Hash,
  Paperclip,
  Phone,
  Star,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { resolveFormFieldStyle } from "../../../services/forms/fieldSettings";
import {
  buildFormThemeStyleVars,
  formThemeBorderWidthClass,
  formThemeButtonAlignClass,
  formThemeColumnsClass,
  formThemeFontFamilyClass,
  formThemeGapClass,
  formThemeInputSizeClass,
  formThemePaddingClass,
  formThemeRadiusClass,
  formThemeShadowClass,
  formThemeTitleSizeClass,
  formThemeTitleWeightClass,
  formThemeWidthClass,
  resolveFormTheme,
  type FormFormTheme,
} from "../../../services/forms/formTheme";

type FieldPreviewKind =
  | "text"
  | "select"
  | "checkbox"
  | "radio"
  | "range"
  | "hidden"
  | "rating"
  | "date"
  | "time"
  | "number"
  | "phone"
  | "file"
  | "email";

type FieldPreviewProps = {
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  options?: string[];
  selected?: boolean;
  multiline?: boolean;
  kind?: FieldPreviewKind;
  labelHidden?: boolean;
  min?: number;
  max?: number;
  step?: number;
  // Resolved-from-theme styling forwarded once from FormCanvas (single source of
  // truth): input size + radius for single-line controls, radius-only for the
  // textarea (so a themed input.size height never squashes the multiline box),
  // the resolved normal-case label typography, and the color-var classes emitted
  // only when the matching theme color token is set (undefined ⇒ un-themed look).
  inputClass?: string;
  inputRadiusClass?: string;
  labelClass?: string;
  labelColorClass?: string;
  inputBgClass?: string;
  inputBorderColorClass?: string;
  inputTextColorClass?: string;
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
  min,
  max,
  step,
  inputClass,
  inputRadiusClass,
  labelClass = "text-sm font-medium",
  labelColorClass,
  inputBgClass,
  inputBorderColorClass,
  inputTextColorClass,
  onSelect,
  onRemove,
}: FieldPreviewProps) {
  // Control tone: when the theme sets an input color the var-class wins; otherwise
  // keep the muted/selected preview affordance so the un-themed canvas is unchanged.
  const toneClass = cn(
    inputBgClass ?? (selected ? "bg-background" : "bg-muted/40 text-muted-foreground"),
    selected ? "border-primary/30" : undefined,
    inputBorderColorClass,
    inputTextColorClass
  );
  const TypeIcon =
    kind === "date"
      ? Calendar
      : kind === "time"
        ? Clock
        : kind === "number"
          ? Hash
          : kind === "phone"
            ? Phone
            : kind === "email"
              ? AtSign
              : null;
  const ratingCount = Math.min(10, Math.max(3, Number.isFinite(max) ? Number(max) : 5));
  return (
    <div
      role={onSelect ? "button" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(id);
      }}
      className={cn(
        "group relative rounded-xl border p-4 transition",
        selected
          ? "border-transparent bg-primary-soft/40 ring-2 ring-primary"
          : "border-transparent hover:border-border/70"
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
          <label className={cn(labelClass, labelColorClass, selected ? "text-primary" : undefined)}>
            {label}
          </label>
        ) : null}
        {multiline ? (
          <Textarea
            placeholder={placeholder}
            defaultValue={value}
            rows={4}
            readOnly
            className={cn("resize-none", inputRadiusClass, toneClass)}
          />
        ) : kind === "select" ? (
          // Real native <select> (styled like the prototype's select, disabled for the
          // non-interactive preview) — a real <select> DOM node, NOT a text look-alike
          // and NOT the Radix combobox.
          <div className="relative">
            <select
              disabled
              defaultValue={(options && options[0]) ?? ""}
              className={cn("w-full appearance-none border px-3 pr-9", inputClass, toneClass)}
            >
              {(options ?? []).map((option) => (
                <option key={`${id}-${option}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
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
        ) : kind === "rating" ? (
          // Scale of `max` stars (clamped 3..10 to mirror the backend) — NOT a slider.
          <div className="flex gap-1" aria-label={`Rating scale of ${ratingCount}`}>
            {Array.from({ length: ratingCount }).map((_, index) => (
              <Star
                key={`${id}-star-${index}`}
                className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground/60")}
              />
            ))}
          </div>
        ) : kind === "range" ? (
          <input
            type="range"
            min={min}
            max={max}
            disabled
            defaultValue={value}
            className="w-full"
          />
        ) : kind === "date" ||
          kind === "time" ||
          kind === "number" ||
          kind === "phone" ||
          kind === "email" ? (
          // Real typed <input> (readOnly for the preview) + a leading type-hint icon.
          <div className="relative">
            {TypeIcon ? (
              <TypeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            ) : null}
            <input
              type={kind === "phone" ? "tel" : kind}
              readOnly
              placeholder={placeholder}
              defaultValue={value}
              step={kind === "number" ? step : undefined}
              className={cn("w-full border pl-9 pr-3", inputClass, toneClass)}
            />
          </div>
        ) : kind === "file" ? (
          // File attachment preview: a real (readOnly/disabled) file control affordance.
          <div
            className={cn(
              "flex items-center gap-2 border px-3 py-2 text-sm text-muted-foreground",
              inputRadiusClass,
              toneClass
            )}
          >
            <Paperclip className="h-4 w-4" />
            <span>{placeholder ?? "Choose a file to upload"}</span>
          </div>
        ) : kind === "hidden" ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Hidden field submits trusted value: {value ?? "(empty)"}
          </div>
        ) : (
          <Input
            placeholder={placeholder}
            defaultValue={value}
            readOnly
            className={cn(inputClass, toneClass)}
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
  // Optional (no-op until 516-03 wires them — declared here first so 516-03's
  // FormBuilderPage can pass them without an excess-prop typecheck failure).
  deviceWidth?: "desktop" | "mobile";
  theme?: FormFormTheme;
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
      formStep?: number;
      inputStep?: number;
      step?: number;
      // Already validated/stored by validation.ts (min/max, rating max clamped
      // 3..10); just not previously forwarded to the canvas.
      min?: number;
      max?: number;
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
  deviceWidth = "desktop",
  theme,
  fields,
  onSelectField,
  onSelectForm,
  onRemoveField,
}: FormCanvasProps) {
  const hasFields = fields.length > 0;

  // Resolve the whole-form theme ONCE (fully-defaulted; the un-themed default
  // reproduces the prototype canvas) and derive every class/var from it.
  const t = resolveFormTheme(theme);
  const isMobile = deviceWidth === "mobile";
  const styleVars = buildFormThemeStyleVars(t);

  const containerClass = cn(
    "flex w-full flex-col",
    isMobile ? "max-w-sm" : formThemeWidthClass[t.layout.width],
    t.layout.align === "left" ? "mr-auto" : t.layout.align === "right" ? "ml-auto" : "mx-auto"
  );

  const cardClass = cn(
    "gap-6 transition",
    t.surface.card
      ? cn(
          formThemeRadiusClass[t.surface.radius],
          formThemeBorderWidthClass[t.surface.borderWidth],
          formThemeShadowClass[t.surface.shadow],
          t.surface.borderColor ? "border-[color:var(--form-border)]" : undefined,
          t.surface.background ? "bg-[var(--form-surface-bg)]" : undefined
        )
      : "border-0 shadow-none bg-transparent",
    formThemePaddingClass[t.surface.padding],
    formSelected
      ? "border-primary/40 ring-1 ring-primary/20"
      : t.surface.card
        ? "hover:border-border"
        : undefined
  );

  // Field-width precedence: a field's own style.width OVERRIDES the form-wide
  // `columns` default. `columns:1` (and mobile) collapse every field to one column.
  const formColumnsClass = formThemeColumnsClass[t.layout.columns];
  const gridColsClass = isMobile ? "grid-cols-1" : formColumnsClass;
  const gridClass = cn("grid", gridColsClass, formThemeGapClass[t.layout.fieldGap]);
  const spanClassFor = (width: "full" | "half") => {
    if (isMobile || t.layout.columns === 1) {
      return "col-span-1";
    }
    return width === "half" ? "md:col-span-1" : "md:col-span-2";
  };

  const titleClass = cn(
    formThemeTitleSizeClass[t.typography.titleSize],
    formThemeTitleWeightClass[t.typography.titleWeight],
    formThemeFontFamilyClass[t.typography.fontFamily],
    t.typography.titleColor ? "text-[color:var(--form-title)]" : "text-foreground"
  );
  const descriptionClass = cn(
    "text-sm",
    t.typography.helperColor ? "text-[color:var(--form-helper)]" : "text-muted-foreground"
  );

  // Forwarded-to-FieldPreview styling (same value for every field).
  const inputClass = cn(
    formThemeInputSizeClass[t.input.size],
    formThemeRadiusClass[t.input.radius]
  );
  const inputRadiusClass = formThemeRadiusClass[t.input.radius];
  const labelClass = "text-sm font-medium";
  const labelColorClass = t.typography.labelColor ? "text-[color:var(--form-label)]" : undefined;
  const inputBgClass = t.input.background ? "bg-[var(--form-input-bg)]" : undefined;
  const inputBorderColorClass = t.input.borderColor
    ? "border-[color:var(--form-input-border)]"
    : undefined;
  const inputTextColorClass = t.input.textColor ? "text-[color:var(--form-input-text)]" : undefined;

  const submitFullWidth = t.submit.fullWidth || t.layout.buttonAlignment === "full";
  const submitClass = cn(
    formThemeRadiusClass[t.submit.radius],
    submitFullWidth ? "w-full" : cn("w-auto", formThemeButtonAlignClass[t.layout.buttonAlignment]),
    t.submit.background ? "bg-[var(--form-submit-bg)]" : undefined,
    t.submit.textColor ? "text-[color:var(--form-submit-text)]" : undefined
  );

  const groupedFields = fields.reduce(
    (acc, field) => {
      const rawStep = field.settings.formStep ?? field.settings.step;
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
    const kind: FieldPreviewKind =
      field.type === "select"
        ? "select"
        : field.type === "rating"
          ? "rating"
          : field.type === "range"
            ? "range"
            : field.type === "date"
              ? "date"
              : field.type === "time"
                ? "time"
                : field.type === "number"
                  ? "number"
                  : field.type === "phone"
                    ? "phone"
                    : field.type === "email"
                      ? "email"
                      : field.type === "file"
                        ? "file"
                        : field.type === "checkbox"
                          ? "checkbox"
                          : field.type === "radio"
                            ? "radio"
                            : field.type === "hidden"
                              ? "hidden"
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
        min={field.settings.min}
        max={field.settings.max}
        step={field.settings.inputStep ?? field.settings.step}
        inputClass={inputClass}
        inputRadiusClass={inputRadiusClass}
        labelClass={labelClass}
        labelColorClass={labelColorClass}
        inputBgClass={inputBgClass}
        inputBorderColorClass={inputBorderColorClass}
        inputTextColorClass={inputTextColorClass}
        labelHidden={style.labelPosition === "hidden"}
        onSelect={onSelectField}
        onRemove={onRemoveField}
      />
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.25),_transparent_0)] bg-[size:20px_20px] px-8 py-10 dark:bg-[radial-gradient(circle_at_1px_1px,_rgba(51,65,85,0.45),_transparent_0)] lg:px-12">
        <div className={containerClass}>
          <Card className={cardClass} style={styleVars} role="button" onClick={onSelectForm}>
            <div className="space-y-1 border-b border-border/60 pb-6">
              <h2 className={titleClass}>
                {formTitle.trim().length > 0 ? formTitle : "Form title"}
              </h2>
              <p className={descriptionClass}>
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
                      <div className={gridClass}>
                        {(groupedFields[step] ?? []).map((field) => {
                          const style = resolveFormFieldStyle(field.settings.style);
                          return (
                            <div key={field.id} className={spanClassFor(style.width)}>
                              {renderField(field)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={gridClass}>
                    {fields.map((field) => {
                      const style = resolveFormFieldStyle(field.settings.style);
                      return (
                        <div key={field.id} className={spanClassFor(style.width)}>
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
            <div className="flex pt-4">
              <Button type="button" disabled className={submitClass}>
                {t.submit.label ?? "Submit"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
