import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ListingTemplateCondition,
  ListingTemplateConditionOperator,
  ListingTemplateField,
} from "@/services/listingsClient";

type BindingEditorProps = {
  value: ListingTemplateField[];
  onChange: (value: ListingTemplateField[]) => void;
};

const formatOptions: Array<{ value: ListingTemplateField["format"]; label: string }> = [
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "badge", label: "Badge" },
  { value: "currency", label: "Currency" },
];

const conditionOperatorOptions: Array<{
  value: ListingTemplateConditionOperator;
  label: string;
}> = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "in", label: "In list" },
  { value: "contains", label: "Contains" },
  { value: "exists", label: "Exists" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
];

const createConditionId = () =>
  `condition-${Math.random().toString(36).slice(2, 10)}`;

const parseScalar = (input: string): string | number | boolean | null => {
  const trimmed = input.trim();
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.length > 0) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && String(parsed) === trimmed) {
      return parsed;
    }
  }
  return trimmed;
};

const parseConditionValue = (
  op: ListingTemplateConditionOperator,
  input: string
): ListingTemplateCondition["value"] => {
  if (op === "exists") {
    return input.trim() !== "false";
  }
  if (op === "in") {
    return input
      .split(",")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => parseScalar(chunk));
  }
  return parseScalar(input);
};

const stringifyConditionValue = (value: ListingTemplateCondition["value"]) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "")).join(", ");
  }
  if (value === undefined || value === null) return "";
  return String(value);
};

const createEmptyField = (): ListingTemplateField => ({
  key: "",
  source: "",
  label: null,
  fallback: null,
  format: "text",
  conditions: [],
});

const move = <T,>(items: T[], index: number, nextIndex: number) => {
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const copy = [...items];
  const [current] = copy.splice(index, 1);
  if (current === undefined) return items;
  copy.splice(nextIndex, 0, current);
  return copy;
};

export function BindingEditor({ value, onChange }: BindingEditorProps) {
  const updateField = (index: number, updates: Partial<ListingTemplateField>) => {
    onChange(value.map((field, itemIndex) => (itemIndex === index ? { ...field, ...updates } : field)));
  };

  const updateCondition = (
    fieldIndex: number,
    conditionIndex: number,
    updates: Partial<ListingTemplateCondition>
  ) => {
    onChange(
      value.map((field, currentFieldIndex) => {
        if (currentFieldIndex !== fieldIndex) return field;
        const conditions = Array.isArray(field.conditions) ? field.conditions : [];
        return {
          ...field,
          conditions: conditions.map((condition, currentConditionIndex) =>
            currentConditionIndex === conditionIndex
              ? { ...condition, ...updates }
              : condition
          ),
        };
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">Dynamic field bindings</p>
          <p className="text-xs text-muted-foreground">
            Map listing row fields to template keys and define row visibility rules.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onChange([...value, createEmptyField()])}
        >
          <Plus className="h-4 w-4" />
          Add binding
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
          No field bindings defined yet.
        </div>
      ) : null}

      {value.map((binding, bindingIndex) => (
        (() => {
          const conditions = Array.isArray(binding.conditions) ? binding.conditions : [];
          return (
        <div key={`${binding.key}-${bindingIndex}`} className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
            <Input
              value={binding.key}
              onChange={(event) => updateField(bindingIndex, { key: event.target.value })}
              placeholder="Binding key (title, excerpt, image)"
            />
            <Input
              value={binding.source}
              onChange={(event) => updateField(bindingIndex, { source: event.target.value })}
              placeholder="Source path (data.title)"
            />
            <Select
              value={binding.format}
              onValueChange={(next) =>
                updateField(bindingIndex, {
                  format: next as ListingTemplateField["format"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={bindingIndex === 0}
                onClick={() => onChange(move(value, bindingIndex, bindingIndex - 1))}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={bindingIndex === value.length - 1}
                onClick={() => onChange(move(value, bindingIndex, bindingIndex + 1))}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== bindingIndex))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Input
            value={binding.fallback ?? ""}
            onChange={(event) =>
              updateField(bindingIndex, {
                fallback: event.target.value.trim().length > 0 ? event.target.value : null,
              })
            }
            placeholder="Fallback value (optional)"
          />

          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Visibility conditions
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() =>
                  updateField(bindingIndex, {
                    conditions: [
                      ...conditions,
                      {
                        id: createConditionId(),
                        field: "",
                        op: "eq",
                        value: "",
                      },
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add condition
              </Button>
            </div>

            {conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No conditions. This binding is always visible.
              </p>
            ) : null}

            {conditions.map((condition, conditionIndex) => (
              <div
                key={`${condition.id}-${conditionIndex}`}
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]"
              >
                <Input
                  value={condition.field}
                  onChange={(event) =>
                    updateCondition(bindingIndex, conditionIndex, {
                      field: event.target.value,
                    })
                  }
                  placeholder="Row field path (status, price, tags)"
                />
                <Select
                  value={condition.op}
                  onValueChange={(next) =>
                    updateCondition(bindingIndex, conditionIndex, {
                      op: next as ListingTemplateConditionOperator,
                      value:
                        next === "exists"
                          ? true
                          : condition.op === "exists"
                            ? ""
                            : condition.value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOperatorOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {condition.op === "exists" ? (
                  <Select
                    value={condition.value === false ? "false" : "true"}
                    onValueChange={(next) =>
                      updateCondition(bindingIndex, conditionIndex, {
                        value: next === "true",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Field exists</SelectItem>
                      <SelectItem value="false">Field missing</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={stringifyConditionValue(condition.value)}
                    onChange={(event) =>
                      updateCondition(bindingIndex, conditionIndex, {
                        value: parseConditionValue(condition.op, event.target.value),
                      })
                    }
                    placeholder={
                      condition.op === "in" ? "a, b, c" : "Condition value"
                    }
                  />
                )}
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={conditionIndex === 0}
                    onClick={() =>
                      updateField(bindingIndex, {
                        conditions: move(
                          conditions,
                          conditionIndex,
                          conditionIndex - 1
                        ),
                      })
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={conditionIndex === conditions.length - 1}
                    onClick={() =>
                      updateField(bindingIndex, {
                        conditions: move(
                          conditions,
                          conditionIndex,
                          conditionIndex + 1
                        ),
                      })
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      updateField(bindingIndex, {
                        conditions: conditions.filter(
                          (_, currentConditionIndex) =>
                            currentConditionIndex !== conditionIndex
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
          );
        })()
      ))}
    </div>
  );
}
