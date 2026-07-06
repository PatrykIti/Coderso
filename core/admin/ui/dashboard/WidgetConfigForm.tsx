import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getCachedContentTypes, listContentTypesCached } from "@/services/contentTypesClient";
import {
  DASHBOARD_COUNTER_METRIC_OPTIONS,
  DASHBOARD_QUICK_ACTION_TARGET_OPTIONS,
  type WidgetConfigField,
  type WidgetConfigOption,
  type WidgetConfigOptionSource,
} from "./widgetRegistry";
import type {
  DashboardQuickAction,
  DashboardWidgetConfig,
} from "../../../services/dashboard/dashboardTypes";

// Sentinel DOM value for a select's "clear" option (Radix Select forbids empty
// string item values). Selecting it emits the field's `emptyOption.value`.
const CLEAR_VALUE = "__widget_config_clear__";

const MAX_QUICK_ACTIONS = 8;

const clampInt = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

// Cached content-type options for the `contentTypes` field source. Reads the
// synchronous cache for initial paint and revalidates once (force:false) — no
// mount-force refetch loop; guarded by a ref so it fires a single request.
function useContentTypeOptions(): WidgetConfigOption[] {
  const [options, setOptions] = useState<WidgetConfigOption[]>(() =>
    (getCachedContentTypes() ?? []).map((type) => ({ value: type.id, label: type.name }))
  );
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    let active = true;
    void listContentTypesCached({ force: false })
      .then((items) => {
        if (active) setOptions(items.map((type) => ({ value: type.id, label: type.name })));
      })
      .catch(() => {
        // Degrade to whatever is cached; the selector stays usable and other
        // fields are unaffected.
      });
    return () => {
      active = false;
    };
  }, []);

  return options;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function newQuickActionId() {
  return `qa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Repeating quick-action editor (label / target / optional icon). Holds a local
// draft so a half-typed row with an empty label does not crash the schema
// normalizer; only complete rows (non-empty label) are emitted upstream.
function ActionsField({
  value,
  onChange,
}: {
  value: DashboardQuickAction[];
  onChange: (value: DashboardQuickAction[] | undefined) => void;
}) {
  const [drafts, setDrafts] = useState<DashboardQuickAction[]>(() =>
    value.map((action) => ({ ...action }))
  );

  const commit = (next: DashboardQuickAction[]) => {
    setDrafts(next);
    const valid = next
      .filter((action) => action.label.trim().length > 0)
      .map((action) => {
        const icon = action.icon?.trim();
        return {
          id: action.id,
          label: action.label.trim(),
          target: action.target,
          ...(icon ? { icon } : {}),
        } satisfies DashboardQuickAction;
      });
    onChange(valid.length > 0 ? valid : undefined);
  };

  const update = (id: string, patch: Partial<DashboardQuickAction>) =>
    commit(drafts.map((action) => (action.id === id ? { ...action, ...patch } : action)));

  return (
    <div className="grid gap-3 text-sm">
      <span className="font-medium">Actions</span>
      {drafts.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          No actions yet. Add up to {MAX_QUICK_ACTIONS} shortcuts.
        </span>
      ) : null}
      {drafts.map((action) => (
        <div key={action.id} className="grid gap-2 rounded-lg border border-border p-3">
          <Input
            aria-label="Action label"
            placeholder="Label"
            value={action.label}
            onChange={(event) => update(action.id, { label: event.target.value })}
          />
          <Select
            value={action.target}
            onValueChange={(next) =>
              update(action.id, { target: next as DashboardQuickAction["target"] })
            }
          >
            <SelectTrigger className="w-full" aria-label="Action target">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DASHBOARD_QUICK_ACTION_TARGET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Action icon"
              placeholder="Icon (optional)"
              value={action.icon ?? ""}
              onChange={(event) => update(action.id, { icon: event.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove action"
              onClick={() => commit(drafts.filter((entry) => entry.id !== action.id))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={drafts.length >= MAX_QUICK_ACTIONS}
        onClick={() => commit([...drafts, { id: newQuickActionId(), label: "", target: "pages" }])}
      >
        <Plus className="mr-2 size-4" />
        Add action
      </Button>
    </div>
  );
}

export type WidgetConfigFormProps = {
  // The widget instance id being configured. Used to key the stateful
  // <ActionsField> so switching the non-modal config panel from one quick-actions
  // widget to another REMOUNTS it (reseeding its local drafts from the new
  // widget's value) instead of keeping the first widget's rows.
  widgetId: string;
  fields: WidgetConfigField[];
  config: DashboardWidgetConfig;
  // Emits a single field change. `undefined` clears the key so the schema
  // default applies; the caller routes every change through
  // `normalizeDashboardWidgetConfig` (schema-first, reject-unknown preserved).
  onChange: (key: string, value: unknown) => void;
};

// Generic, schema-driven control renderer. Reads each field's current value from
// the (already-normalized) widget config and renders the matching control; it
// owns no per-kind knowledge beyond the declared `configFields`.
export function WidgetConfigForm({ widgetId, fields, config, onChange }: WidgetConfigFormProps) {
  const contentTypeOptions = useContentTypeOptions();
  const record = config as Record<string, unknown>;
  const source = record.source === "traffic" ? "traffic" : "cms";

  const resolveOptions = (
    options: WidgetConfigOption[] | WidgetConfigOptionSource
  ): WidgetConfigOption[] => {
    if (options === "contentTypes") return contentTypeOptions;
    if (options === "counterMetrics") return DASHBOARD_COUNTER_METRIC_OPTIONS[source];
    return options;
  };

  return (
    <div className="grid gap-4">
      {fields.map((field) => {
        const value = record[field.key];

        switch (field.control) {
          case "text":
            return (
              <Field key={field.key} label={field.label}>
                <Input
                  placeholder={field.placeholder}
                  value={typeof value === "string" ? value : ""}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              </Field>
            );

          case "select": {
            const options = resolveOptions(field.options);
            const isCleared = value === null || value === undefined;
            const current = isCleared ? (field.emptyOption ? CLEAR_VALUE : "") : String(value);
            return (
              <Field key={field.key} label={field.label}>
                <Select
                  value={current}
                  onValueChange={(next) => {
                    if (next === CLEAR_VALUE && field.emptyOption) {
                      onChange(field.key, field.emptyOption.value);
                    } else {
                      onChange(field.key, next);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.emptyOption ? (
                      <SelectItem value={CLEAR_VALUE}>{field.emptyOption.label}</SelectItem>
                    ) : null}
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            );
          }

          case "multiselect": {
            const options = resolveOptions(field.options);
            const selected = Array.isArray(value) ? (value as string[]) : [];
            return (
              <div key={field.key} className="grid gap-2 text-sm">
                <span className="font-medium">{field.label}</span>
                {options.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No options available.</span>
                ) : null}
                {options.map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onCheckedChange={(checked) => {
                        const set = new Set(selected);
                        if (checked) set.add(option.value);
                        else set.delete(option.value);
                        const next = options
                          .filter((entry) => set.has(entry.value))
                          .map((entry) => entry.value);
                        onChange(field.key, next.length > 0 ? next : undefined);
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            );
          }

          case "checkbox":
            return (
              <label key={field.key} className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={Boolean(value)}
                  onCheckedChange={(checked) => onChange(field.key, checked === true)}
                />
                {field.label}
              </label>
            );

          case "number":
            return (
              <Field key={field.key} label={field.label}>
                <Input
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={typeof value === "number" ? value : field.min}
                  onChange={(event) =>
                    onChange(field.key, clampInt(Number(event.target.value), field.min, field.max))
                  }
                />
              </Field>
            );

          case "slider": {
            const numeric = typeof value === "number" ? value : field.min;
            return (
              <Field key={field.key} label={`${field.label}: ${numeric}`}>
                <Slider
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  value={[numeric]}
                  onValueChange={(values) =>
                    onChange(field.key, clampInt(values[0] ?? field.min, field.min, field.max))
                  }
                />
              </Field>
            );
          }

          case "actions":
            return (
              // Keyed by widget id (not the stable field key) so switching the
              // config panel between two quick-actions widgets remounts the local
              // draft state onto the new widget's actions.
              <ActionsField
                key={`${field.key}-${widgetId}`}
                value={Array.isArray(value) ? (value as DashboardQuickAction[]) : []}
                onChange={(next) => onChange(field.key, next)}
              />
            );

          default: {
            const _never: never = field;
            return _never;
          }
        }
      })}
    </div>
  );
}
