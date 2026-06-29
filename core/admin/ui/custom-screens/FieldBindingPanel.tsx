import { Link2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  collectBindingPropPaths,
  getWidgetBindings,
  listSelectedEntryWidgetBindingTargets,
  type CustomScreenBindingWidgetSource,
  type WidgetBindingTargetCard,
} from "../../../services/customScreens/bindingResolver";
import type {
  CustomScreenBinding,
  CustomScreenBindingMode,
} from "../../../services/customScreens/customScreenSchemas";
import type { WidgetDefinition } from "../../../widgets/types";
import type { Block } from "@/ui/pages/builder/types";

import type { ContentField } from "../content-types/SchemaBuilder";

type FieldBindingPanelProps = {
  selectedBlock: Block | null;
  selectedWidget?: WidgetDefinition | null;
  selectedWidgetSource?: CustomScreenBindingWidgetSource | null;
  value: CustomScreenBinding[];
  fields: ContentField[];
  onChange: (next: CustomScreenBinding[]) => void;
  focusedPropPath?: string | null;
  onFocusedPropPathChange?: (propPath: string | null) => void;
};

type BindingFieldOption = {
  value: string;
  label: string;
  type: string;
  writable: boolean;
};

type ManualPanelModel = {
  mode: "manual";
  title: string;
  description: string;
  allowAdd: boolean;
  suggestedPaths: string[];
};

type BindingPanelModel =
  | {
      mode: "declared-targets";
      targets: WidgetBindingTargetCard[];
    }
  | ManualPanelModel
  | {
      mode: "layout-read-only";
      message: string;
    };

const modeOptions: Array<{ value: CustomScreenBindingMode; label: string }> = [
  { value: "readwrite", label: "Read / write" },
  { value: "read", label: "Read only" },
  { value: "write", label: "Write only" },
];

const createBindingId = () => `binding-${crypto.randomUUID().slice(0, 8)}`;

const systemFieldOptions: BindingFieldOption[] = [
  { value: "title", label: "Title", type: "system", writable: true },
  { value: "slug", label: "Slug", type: "system", writable: true },
  { value: "status", label: "Status", type: "system", writable: false },
  { value: "createdAt", label: "Created", type: "system", writable: false },
  { value: "updatedAt", label: "Updated", type: "system", writable: false },
  { value: "publishedAt", label: "Published", type: "system", writable: false },
];
const systemFieldNames = new Set(systemFieldOptions.map((field) => field.value));

export const buildBindingFieldOptions = (fields: ContentField[]): BindingFieldOption[] => [
  ...systemFieldOptions,
  ...fields
    .filter((field) => !systemFieldNames.has(field.name))
    .map((field) => ({
      value: field.name,
      label: field.label,
      type: field.type,
      writable: true,
    })),
];

const preferredBindingPropPaths: Record<string, string[]> = {
  "screen-record-header": ["title", "subtitle", "description", "eyebrow", "badge"],
  "screen-field-value": ["value", "label", "helper"],
  "screen-field-group": ["title", "description"],
  "screen-two-column": ["leftTitle", "rightTitle"],
};

const hiddenBindingPropPaths = new Set([
  "align",
  "style",
  "style.frameBackground",
  "style.frameGradient",
  "style.frameBorderColor",
  "style.badgeBackground",
  "style.badgeBorderColor",
  "style.columnBackground",
  "style.columnBorderColor",
]);

const resolveBindingPropPathOptions = (
  block: Block | null,
  existingBindings: CustomScreenBinding[]
) => {
  const current = block?.data ?? {};
  const detectedPaths = collectBindingPropPaths(current).filter(
    (path) => !hiddenBindingPropPaths.has(path)
  );
  const preferredPaths = block ? (preferredBindingPropPaths[block.type] ?? []) : [];
  const existingPaths = existingBindings.map((binding) => binding.propPath);

  return Array.from(new Set([...preferredPaths, ...existingPaths, ...detectedPaths])).filter(
    Boolean
  );
};

const resolveAllowedModeOptions = (input: {
  binding: CustomScreenBinding;
  field: BindingFieldOption | null;
  target: WidgetBindingTargetCard | null;
}) => {
  const fieldWritable = input.field?.writable === true;
  const targetWritable = input.target?.modes.includes("write") === true;
  const baseOptions =
    fieldWritable && targetWritable
      ? modeOptions
      : modeOptions.filter((option) => option.value === "read");
  const hasUnsupportedMode = !baseOptions.some((option) => option.value === input.binding.mode);

  return {
    hasUnsupportedMode,
    options: hasUnsupportedMode
      ? [{ value: input.binding.mode, label: "Unsupported saved mode" }, ...baseOptions]
      : baseOptions,
  };
};

const createBindingFromTarget = (input: {
  selectedBlock: Block;
  target: WidgetBindingTargetCard;
  field: BindingFieldOption;
}) => ({
  id: createBindingId(),
  widgetId: input.selectedBlock.id,
  propPath: input.target.propPath,
  field: input.field.value,
  mode:
    input.target.modes.includes("write") && input.field.writable
      ? ("readwrite" as const)
      : ("read" as const),
});

const resolveBindingPanelModel = (input: {
  selectedWidget: WidgetDefinition | null;
  selectedWidgetSource: CustomScreenBindingWidgetSource | null;
  selectedBindings: CustomScreenBinding[];
  propPathSuggestions: string[];
}): BindingPanelModel => {
  if (input.selectedWidget?.dataAccess?.source === "selected-entry") {
    return {
      mode: "declared-targets",
      targets: listSelectedEntryWidgetBindingTargets({
        widget: input.selectedWidget,
        existingBindings: input.selectedBindings,
      }),
    };
  }

  if (!input.selectedWidget || input.selectedWidgetSource === "legacy-fallback") {
    return {
      mode: "manual",
      title: "Legacy compatibility",
      description:
        "This block is preserved through the legacy widget fallback path. Manual bindings stay editable here.",
      allowAdd: true,
      suggestedPaths: input.propPathSuggestions,
    };
  }

  if (input.selectedBindings.length > 0) {
    return {
      mode: "manual",
      title: "Compatibility bindings",
      description:
        "This widget keeps its layout or selected-content-type contract. Existing bindings remain visible for compatibility, but new entry bindings are not advertised here.",
      allowAdd: false,
      suggestedPaths: input.propPathSuggestions,
    };
  }

  return {
    mode: "layout-read-only",
    message:
      "This widget exposes layout and content-type settings only. Entry field bindings are not available here.",
  };
};

export function FieldBindingPanel({
  selectedBlock,
  selectedWidget,
  selectedWidgetSource,
  value,
  fields,
  onChange,
  focusedPropPath,
  onFocusedPropPathChange,
}: FieldBindingPanelProps) {
  const selectedBindings = useMemo(
    () =>
      selectedBlock
        ? getWidgetBindings(value, selectedBlock.id, {
            includeRead: true,
            includeWrite: true,
          })
        : [],
    [selectedBlock, value]
  );
  const fieldOptions = useMemo(() => buildBindingFieldOptions(fields), [fields]);
  const propPathSuggestions = useMemo(
    () => resolveBindingPropPathOptions(selectedBlock, selectedBindings),
    [selectedBindings, selectedBlock]
  );
  const panelModel = useMemo(
    () =>
      resolveBindingPanelModel({
        selectedWidget: selectedWidget ?? null,
        selectedWidgetSource: selectedWidgetSource ?? null,
        selectedBindings,
        propPathSuggestions,
      }),
    [propPathSuggestions, selectedBindings, selectedWidget, selectedWidgetSource]
  );
  const declaredTargetsByPath = useMemo(
    () =>
      panelModel.mode === "declared-targets"
        ? new Map(panelModel.targets.map((target) => [target.propPath, target] as const))
        : new Map<string, WidgetBindingTargetCard>(),
    [panelModel]
  );
  const unboundDeclaredTargets = useMemo(() => {
    if (panelModel.mode !== "declared-targets") return [];
    const bound = new Set(selectedBindings.map((binding) => binding.propPath));
    return panelModel.targets.filter(
      (target) => target.kind === "declared" && !bound.has(target.propPath)
    );
  }, [panelModel, selectedBindings]);

  const updateBinding = (bindingId: string, updates: Partial<CustomScreenBinding>) => {
    onChange(
      value.map((binding) => (binding.id === bindingId ? { ...binding, ...updates } : binding))
    );
  };

  const removeBinding = (bindingId: string) => {
    onChange(value.filter((binding) => binding.id !== bindingId));
  };

  const addBinding = (preferredPropPath?: string) => {
    if (!selectedBlock) return;
    const firstOption = fieldOptions[0];
    if (!firstOption) return;
    const usedPropPaths = new Set(selectedBindings.map((binding) => binding.propPath));

    if (panelModel.mode === "declared-targets") {
      const nextTarget =
        panelModel.targets.find(
          (target) => target.propPath === preferredPropPath && !usedPropPaths.has(target.propPath)
        ) ??
        panelModel.targets.find(
          (target) => target.kind === "declared" && !usedPropPaths.has(target.propPath)
        );
      if (!nextTarget) return;
      onChange([
        ...value,
        createBindingFromTarget({ selectedBlock, target: nextTarget, field: firstOption }),
      ]);
      onFocusedPropPathChange?.(nextTarget.propPath);
      return;
    }

    if (panelModel.mode !== "manual" || !panelModel.allowAdd) return;

    const nextPropPath =
      preferredPropPath && !usedPropPaths.has(preferredPropPath)
        ? preferredPropPath
        : (panelModel.suggestedPaths.find((path) => !usedPropPaths.has(path)) ??
          panelModel.suggestedPaths[0] ??
          "value");
    onChange([
      ...value,
      {
        id: createBindingId(),
        widgetId: selectedBlock.id,
        propPath: nextPropPath,
        field: firstOption.value,
        mode: firstOption.writable ? "readwrite" : "read",
      },
    ]);
    onFocusedPropPathChange?.(nextPropPath);
  };

  if (!selectedBlock) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a screen widget block to configure field bindings.
      </div>
    );
  }

  if (fieldOptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a content type before mapping widget props to fields.
      </div>
    );
  }

  if (panelModel.mode === "layout-read-only") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        {panelModel.message}
      </div>
    );
  }

  const renderBindingEditor = (
    binding: CustomScreenBinding,
    target: WidgetBindingTargetCard | null
  ) => {
    const selectedFieldOption = fieldOptions.find((field) => field.value === binding.field) ?? null;
    const { options: allowedModeOptions, hasUnsupportedMode } = resolveAllowedModeOptions({
      binding,
      field: selectedFieldOption,
      target,
    });

    return (
      <>
        {target?.kind === "compatibility" ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Widget prop path
            </label>
            <Input
              value={binding.propPath}
              list={`binding-props-${selectedBlock.id}`}
              placeholder="heading.title"
              onChange={(event) => {
                onFocusedPropPathChange?.(event.target.value);
                updateBinding(binding.id, { propPath: event.target.value });
              }}
            />
            <datalist id={`binding-props-${selectedBlock.id}`}>
              {propPathSuggestions.map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Compatibility rows keep custom prop paths editable instead of hiding them.
            </p>
          </div>
        ) : (
          <div className="space-y-1 rounded-md border border-dashed bg-muted/10 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Widget prop path
            </p>
            <p className="text-sm font-medium">{binding.propPath}</p>
            <p className="text-xs text-muted-foreground">
              This prop path is owned by the widget binding contract.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content field
          </label>
          <Select
            value={binding.field}
            onValueChange={(next) =>
              updateBinding(binding.id, {
                field: next,
                mode:
                  fieldOptions.find((field) => field.value === next)?.writable === false ||
                  target?.modes.includes("write") !== true
                    ? "read"
                    : binding.mode,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select content field" />
            </SelectTrigger>
            <SelectContent>
              {fieldOptions.map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label} ({field.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mode
          </label>
          <Select
            value={binding.mode}
            onValueChange={(next) =>
              updateBinding(binding.id, { mode: next as CustomScreenBindingMode })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedModeOptions.map((option) => (
                <SelectItem key={`${binding.id}-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasUnsupportedMode ? (
            <p className="text-xs text-warning">
              This saved binding mode is no longer supported for the current widget contract. Choose
              a supported mode before saving.
            </p>
          ) : selectedFieldOption?.writable === false ? (
            <p className="text-xs text-muted-foreground">
              This system field is read-only in the screen-owned editor workflow.
            </p>
          ) : target && target.modes.includes("write") !== true ? (
            <p className="text-xs text-muted-foreground">
              This widget prop is read-only in the current Custom Screens contract.
            </p>
          ) : null}
        </div>
      </>
    );
  };

  if (panelModel.mode === "declared-targets") {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Field bindings</p>
            <p className="text-xs text-muted-foreground">
              Map widget-owned props from <span className="font-medium">{selectedBlock.type}</span>{" "}
              to content fields.
            </p>
          </div>
          {unboundDeclaredTargets.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => addBinding()}
            >
              <Plus className="h-4 w-4" />
              Add binding
            </Button>
          ) : null}
        </div>

        {panelModel.targets.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            This widget does not expose any selected-entry binding targets.
          </div>
        ) : null}

        <div className="space-y-3">
          {panelModel.targets.map((target) => {
            const existing =
              selectedBindings.find((binding) => binding.propPath === target.propPath) ?? null;

            return (
              <div
                key={target.propPath}
                data-prop-path={target.propPath}
                data-focused={focusedPropPath === target.propPath ? "true" : "false"}
                className={cn(
                  "space-y-3 rounded-lg border p-3",
                  focusedPropPath === target.propPath && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{target.label}</p>
                      {target.kind === "compatibility" ? (
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Compatibility
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{target.propPath}</p>
                    {target.description ? (
                      <p className="text-xs text-muted-foreground">{target.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => onFocusedPropPathChange?.(target.propPath)}
                    >
                      Focus
                    </Button>
                    {existing ? (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeBinding(existing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => addBinding(target.propPath)}
                      >
                        <Plus className="h-4 w-4" />
                        Add binding
                      </Button>
                    )}
                  </div>
                </div>

                {existing ? (
                  renderBindingEditor(existing, target)
                ) : (
                  <div className="rounded-md border border-dashed bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                    No binding configured for this widget prop yet.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const unboundPropPaths = panelModel.allowAdd
    ? (() => {
        const bound = new Set(selectedBindings.map((binding) => binding.propPath));
        return panelModel.suggestedPaths.filter((path) => !bound.has(path));
      })()
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">{panelModel.title}</p>
          <p className="text-xs text-muted-foreground">{panelModel.description}</p>
        </div>
        {panelModel.allowAdd ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => addBinding()}
          >
            <Plus className="h-4 w-4" />
            Add binding
          </Button>
        ) : null}
      </div>

      {selectedBindings.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          {panelModel.allowAdd
            ? "No bindings configured for this widget yet."
            : "No compatibility bindings are stored for this widget."}
        </div>
      ) : null}

      {panelModel.allowAdd && unboundPropPaths.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Available widget props
          </p>
          <div className="grid gap-2">
            {unboundPropPaths.map((path) => (
              <div
                key={path}
                data-prop-path={path}
                data-focused={focusedPropPath === path ? "true" : "false"}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2",
                  focusedPropPath === path && "border-primary bg-primary/5"
                )}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{path}</p>
                  <p className="text-xs text-muted-foreground">
                    {focusedPropPath === path
                      ? "Focused from widget settings."
                      : "Add a binding for this widget prop."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => onFocusedPropPathChange?.(path)}
                  >
                    Focus
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => addBinding(path)}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {selectedBindings.map((binding) => {
        const target = declaredTargetsByPath.get(binding.propPath) ?? null;
        return (
          <div
            key={binding.id}
            data-prop-path={binding.propPath}
            data-focused={focusedPropPath === binding.propPath ? "true" : "false"}
            className={cn(
              "space-y-3 rounded-lg border p-3",
              focusedPropPath === binding.propPath && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span>{binding.propPath}</span>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => removeBinding(binding.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {renderBindingEditor(binding, target)}
          </div>
        );
      })}
    </div>
  );
}
