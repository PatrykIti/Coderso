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
import {
  collectBindingPropPaths,
  getWidgetBindings,
} from "../../../services/customScreens/bindingResolver";
import type {
  CustomScreenBinding,
  CustomScreenBindingMode,
} from "../../../services/customScreens/customScreenSchemas";
import type { Block } from "@/ui/pages/builder/types";

import type { ContentField } from "../content-types/SchemaBuilder";

type FieldBindingPanelProps = {
  selectedBlock: Block | null;
  value: CustomScreenBinding[];
  fields: ContentField[];
  onChange: (next: CustomScreenBinding[]) => void;
};

type BindingFieldOption = {
  value: string;
  label: string;
  type: string;
  writable: boolean;
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

export function FieldBindingPanel({
  selectedBlock,
  value,
  fields,
  onChange,
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
  const fieldOptions = useMemo(
    () =>
      [
        ...systemFieldOptions,
        ...fields.map((field) => ({
          value: field.name,
          label: field.label,
          type: field.type,
          writable: true,
        })),
      ] satisfies BindingFieldOption[],
    [fields]
  );
  const propPathSuggestions = useMemo(() => {
    const current = selectedBlock?.data ?? {};
    return Array.from(
      new Set([
        ...collectBindingPropPaths(current),
        ...selectedBindings.map((binding) => binding.propPath),
      ])
    ).sort((left, right) => left.localeCompare(right));
  }, [selectedBindings, selectedBlock]);

  const updateBinding = (bindingId: string, updates: Partial<CustomScreenBinding>) => {
    onChange(
      value.map((binding) => (binding.id === bindingId ? { ...binding, ...updates } : binding))
    );
  };

  const removeBinding = (bindingId: string) => {
    onChange(value.filter((binding) => binding.id !== bindingId));
  };

  const addBinding = () => {
    if (!selectedBlock) return;
    const firstOption = fieldOptions[0];
    if (!firstOption) return;
    onChange([
      ...value,
      {
        id: createBindingId(),
        widgetId: selectedBlock.id,
        propPath: propPathSuggestions[0] ?? "value",
        field: firstOption.value,
        mode: firstOption.writable ? "readwrite" : "read",
      },
    ]);
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Field bindings</p>
          <p className="text-xs text-muted-foreground">
            Map screen widget props from <span className="font-medium">{selectedBlock.type}</span>{" "}
            to content fields.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addBinding}>
          <Plus className="h-4 w-4" />
          Add binding
        </Button>
      </div>

      {selectedBindings.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          No bindings configured for this widget yet.
        </div>
      ) : null}

      {selectedBindings.map((binding, index) => (
        <div key={binding.id} className="space-y-3 rounded-lg border p-3">
          {(() => {
            const selectedFieldOption =
              fieldOptions.find((field) => field.value === binding.field) ?? null;
            const allowedModeOptions = selectedFieldOption?.writable
              ? modeOptions
              : modeOptions.filter((option) => option.value === "read");
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span>Binding {index + 1}</span>
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Widget prop path
                  </label>
                  <Input
                    value={binding.propPath}
                    list={`binding-props-${selectedBlock.id}`}
                    placeholder="heading.title"
                    onChange={(event) =>
                      updateBinding(binding.id, { propPath: event.target.value })
                    }
                  />
                  <datalist id={`binding-props-${selectedBlock.id}`}>
                    {propPathSuggestions.map((path) => (
                      <option key={path} value={path} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    {propPathSuggestions.length > 0
                      ? "Suggestions come from the current widget defaults."
                      : "This widget has no detectable data paths yet. You can type one manually."}
                  </p>
                </div>

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
                          fieldOptions.find((field) => field.value === next)?.writable === false
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
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedFieldOption?.writable === false ? (
                    <p className="text-xs text-muted-foreground">
                      This system field is read-only in the screen-owned editor workflow.
                    </p>
                  ) : null}
                </div>
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
