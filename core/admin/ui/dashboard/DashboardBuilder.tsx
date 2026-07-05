import {
  AlertCircle,
  Check,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, type CSSProperties } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import {
  getDashboardLayoutCached,
  getDashboardWidgetDataCached,
  previewDashboardWidgetData,
  resetDashboardLayout,
  saveDashboardLayout,
  subscribeDashboardCache,
} from "@/services/dashboardClient";
import { cn } from "@/lib/utils";
import { DashboardWidgetHost } from "./DashboardWidgetHost";
import {
  createDashboardWidget,
  dashboardWidgetCatalog,
  getDashboardWidgetDescriptor,
} from "./widgetRegistry";
import {
  cloneLayout,
  DASHBOARD_MAX_WIDGETS,
} from "../../../services/dashboard/dashboardWidgetContract";
import type {
  DashboardContentOverTimeConfig,
  DashboardContentQueryConfig,
  DashboardCounterMetric,
  DashboardLayout,
  DashboardRecentActivityConfig,
  DashboardRecentEditType,
  DashboardTotalsCountersConfig,
  DashboardWidget,
  DashboardWidgetConfig,
  DashboardWidgetType,
} from "../../../services/dashboard/dashboardTypes";
import type { DashboardWidgetDataResponse } from "../../../services/dashboard/dashboardWidgetData";

type BuilderState = {
  layout: DashboardLayout | null;
  savedLayout: DashboardLayout | null;
  data: DashboardWidgetDataResponse | null;
  loading: boolean;
  previewing: boolean;
  saving: boolean;
  error: string | null;
  editMode: boolean;
  dirty: boolean;
  selectedId: string | null;
  remoteStale: boolean;
};

type BuilderAction =
  | { type: "load:start" }
  | { type: "load:success"; layout: DashboardLayout; data: DashboardWidgetDataResponse }
  | { type: "load:error"; error: string }
  | { type: "preview:start" }
  | { type: "preview:success"; data: DashboardWidgetDataResponse }
  | { type: "preview:error"; error: string }
  | { type: "layout:update"; layout: DashboardLayout; selectedId?: string | null }
  | { type: "edit:set"; value: boolean }
  | { type: "select"; id: string | null }
  | { type: "save:start" }
  | { type: "save:success"; layout: DashboardLayout; data: DashboardWidgetDataResponse }
  | { type: "save:error"; error: string }
  | { type: "remote:stale" };

const initialState: BuilderState = {
  layout: null,
  savedLayout: null,
  data: null,
  loading: true,
  previewing: false,
  saving: false,
  error: null,
  editMode: false,
  dirty: false,
  selectedId: null,
  remoteStale: false,
};

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "load:start":
      return { ...state, loading: true, error: null };
    case "load:success":
      return {
        ...state,
        layout: cloneLayout(action.layout),
        savedLayout: cloneLayout(action.layout),
        data: action.data,
        loading: false,
        previewing: false,
        error: null,
        dirty: false,
        remoteStale: false,
        selectedId: null,
      };
    case "load:error":
      return { ...state, loading: false, previewing: false, error: action.error };
    case "preview:start":
      return { ...state, previewing: true };
    case "preview:success":
      return { ...state, data: action.data, previewing: false };
    case "preview:error":
      return { ...state, previewing: false, error: action.error };
    case "layout:update":
      return {
        ...state,
        layout: action.layout,
        dirty: true,
        selectedId: action.selectedId === undefined ? state.selectedId : action.selectedId,
      };
    case "edit:set":
      return {
        ...state,
        editMode: action.value,
        layout: action.value
          ? state.layout
          : state.savedLayout
            ? cloneLayout(state.savedLayout)
            : state.layout,
        dirty: action.value ? state.dirty : false,
        selectedId: action.value ? state.selectedId : null,
        remoteStale: action.value ? state.remoteStale : false,
      };
    case "select":
      return { ...state, selectedId: action.id };
    case "save:start":
      return { ...state, saving: true, error: null };
    case "save:success":
      return {
        ...state,
        layout: cloneLayout(action.layout),
        savedLayout: cloneLayout(action.layout),
        data: action.data,
        saving: false,
        dirty: false,
        editMode: false,
        selectedId: null,
        remoteStale: false,
      };
    case "save:error":
      return { ...state, saving: false, error: action.error };
    case "remote:stale":
      return { ...state, remoteStale: true };
    default:
      return state;
  }
}

const spanClass: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

const counterMetrics: DashboardCounterMetric[] = [
  "pages",
  "entries",
  "media",
  "users",
  "visitors",
  "pageviews",
  "sessions",
  "bounceRate",
];

const recentTypes: DashboardRecentEditType[] = ["page", "entry", "media"];

const metricLabel: Record<DashboardCounterMetric, string> = {
  pages: "Pages",
  entries: "Entries",
  media: "Media",
  users: "Users",
  visitors: "Visitors",
  pageviews: "Pageviews",
  sessions: "Sessions",
  bounceRate: "Bounce rate",
};

const extractError = (error: unknown, fallback: string) =>
  isApiClientError(error) ? error.message : fallback;

const sortedWidgets = (layout: DashboardLayout | null) =>
  [...(layout?.widgets ?? [])].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x
  );

const nextY = (layout: DashboardLayout) =>
  layout.widgets.reduce((max, widget) => Math.max(max, widget.position.y + widget.position.h), 0);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const withWidget = (
  layout: DashboardLayout,
  id: string,
  updater: (widget: DashboardWidget) => DashboardWidget | null
) => ({
  ...layout,
  widgets: layout.widgets.flatMap((widget) => {
    if (widget.id !== id) return [widget];
    const updated = updater(widget);
    return updated ? [updated] : [];
  }),
});

const buildDataMap = (data: DashboardWidgetDataResponse | null) =>
  new Map((data?.widgets ?? []).map((entry) => [entry.id, entry.data]));

function AddWidgetCatalog({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (type: DashboardWidgetType) => void;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {dashboardWidgetCatalog.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.type}
            type="button"
            disabled={disabled}
            onClick={() => onAdd(item.type)}
            className="flex min-h-20 items-start gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-soft transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.title}</span>
              <span className="block text-xs text-muted-foreground">{item.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function ConfigPanel({
  widget,
  onUpdate,
  onClose,
}: {
  widget: DashboardWidget | null;
  onUpdate: (widget: DashboardWidget) => void;
  onClose: () => void;
}) {
  if (!widget) return null;

  const descriptor = getDashboardWidgetDescriptor(widget.type);

  const updateConfig = <T extends DashboardWidgetConfig>(config: T) => {
    if (!widget) return;
    onUpdate({ ...widget, config });
  };

  const updateTitle = (title: string) => {
    if (!widget) return;
    onUpdate({ ...widget, title });
  };

  const body = (
    <div className="grid gap-4">
      <Field label="Title">
        <Input value={widget.title ?? ""} onChange={(event) => updateTitle(event.target.value)} />
      </Field>

      {widget.config.kind === "totals-counters" ? (
        <TotalsConfig config={widget.config} onChange={updateConfig} />
      ) : null}
      {widget.config.kind === "content-over-time" ? (
        <TimelineConfig config={widget.config} onChange={updateConfig} />
      ) : null}
      {widget.config.kind === "recent-activity" ? (
        <RecentActivityConfig config={widget.config} onChange={updateConfig} />
      ) : null}
      {widget.config.kind === "content-query" ? (
        <ContentQueryConfig config={widget.config} onChange={updateConfig} />
      ) : null}
    </div>
  );

  return (
    <Sheet open modal={false} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-md"
        overlayClassName="pointer-events-none bg-transparent"
      >
        <SheetHeader>
          <SheetTitle>{descriptor.title}</SheetTitle>
          <SheetDescription>{descriptor.description}</SheetDescription>
        </SheetHeader>
        {body}
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" onClick={onClose}>
              <Check className="mr-2 size-4" />
              Done
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TotalsConfig({
  config,
  onChange,
}: {
  config: DashboardTotalsCountersConfig;
  onChange: (config: DashboardTotalsCountersConfig) => void;
}) {
  const allowed =
    config.source === "traffic"
      ? new Set(["visitors", "pageviews", "sessions", "bounceRate"])
      : new Set(["pages", "entries", "media", "users"]);
  return (
    <>
      <Field label="Source">
        <Select
          value={config.source ?? "cms"}
          onValueChange={(value) =>
            onChange({
              ...config,
              source: value as DashboardTotalsCountersConfig["source"],
              metrics:
                value === "traffic"
                  ? ["visitors", "pageviews", "sessions", "bounceRate"]
                  : ["pages", "entries", "media", "users"],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cms">CMS</SelectItem>
            <SelectItem value="traffic">Traffic</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-2 text-sm">
        <span className="font-medium">Metrics</span>
        {counterMetrics
          .filter((metric) => allowed.has(metric))
          .map((metric) => (
            <label key={metric} className="flex items-center gap-2">
              <Checkbox
                checked={(config.metrics ?? []).includes(metric)}
                onCheckedChange={(checked) => {
                  const current = new Set(config.metrics ?? []);
                  if (checked) current.add(metric);
                  else current.delete(metric);
                  const metrics = counterMetrics.filter(
                    (entry) => current.has(entry) && allowed.has(entry)
                  );
                  onChange({ ...config, metrics: metrics.length ? metrics : [metric] });
                }}
              />
              {metricLabel[metric]}
            </label>
          ))}
      </div>
    </>
  );
}

function TimelineConfig({
  config,
  onChange,
}: {
  config: DashboardContentOverTimeConfig;
  onChange: (config: DashboardContentOverTimeConfig) => void;
}) {
  return (
    <>
      <Field label="Source">
        <Select
          value={config.source ?? "content"}
          onValueChange={(value) =>
            onChange({ ...config, source: value as DashboardContentOverTimeConfig["source"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="content">Content</SelectItem>
            <SelectItem value="traffic">Traffic</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Chart">
        <Select
          value={config.variant ?? "area"}
          onValueChange={(value) =>
            onChange({ ...config, variant: value as DashboardContentOverTimeConfig["variant"] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="area">Area</SelectItem>
            <SelectItem value="bar">Bar</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Range days">
        <Input
          type="number"
          min={1}
          max={365}
          value={config.rangeDays ?? 30}
          onChange={(event) =>
            onChange({ ...config, rangeDays: clamp(Number(event.target.value), 1, 365) })
          }
        />
      </Field>
    </>
  );
}

function RecentActivityConfig({
  config,
  onChange,
}: {
  config: DashboardRecentActivityConfig;
  onChange: (config: DashboardRecentActivityConfig) => void;
}) {
  return (
    <>
      <Field label="Limit">
        <Input
          type="number"
          min={1}
          max={25}
          value={config.limit ?? 10}
          onChange={(event) =>
            onChange({ ...config, limit: clamp(Number(event.target.value), 1, 25) })
          }
        />
      </Field>
      <div className="grid gap-2 text-sm">
        <span className="font-medium">Types</span>
        {recentTypes.map((type) => (
          <label key={type} className="flex items-center gap-2 capitalize">
            <Checkbox
              checked={(config.types ?? recentTypes).includes(type)}
              onCheckedChange={(checked) => {
                const current = new Set(config.types ?? recentTypes);
                if (checked) current.add(type);
                else current.delete(type);
                const types = recentTypes.filter((entry) => current.has(entry));
                onChange({ ...config, types: types.length ? types : [type] });
              }}
            />
            {type}
          </label>
        ))}
      </div>
    </>
  );
}

function ContentQueryConfig({
  config,
  onChange,
}: {
  config: DashboardContentQueryConfig;
  onChange: (config: DashboardContentQueryConfig) => void;
}) {
  return (
    <>
      <Field label="Content type id">
        <Input
          value={config.contentTypeId ?? ""}
          onChange={(event) =>
            onChange({ ...config, contentTypeId: event.target.value.trim() || null })
          }
        />
      </Field>
      <Field label="Limit">
        <Input
          type="number"
          min={1}
          max={50}
          value={config.limit ?? 10}
          onChange={(event) =>
            onChange({ ...config, limit: clamp(Number(event.target.value), 1, 50) })
          }
        />
      </Field>
    </>
  );
}

export function DashboardBuilder({ canWrite }: { canWrite: boolean }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const previewSeq = useRef(0);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const load = useCallback(async (force = false) => {
    dispatch({ type: "load:start" });
    try {
      const [layoutResponse, data] = await Promise.all([
        getDashboardLayoutCached({ force }),
        getDashboardWidgetDataCached({ force }),
      ]);
      dispatch({ type: "load:success", layout: layoutResponse.layout, data });
    } catch (error) {
      dispatch({ type: "load:error", error: extractError(error, "Failed to load dashboard.") });
    }
  }, []);

  const refreshPreview = useCallback(async (layout: DashboardLayout) => {
    const seq = previewSeq.current + 1;
    previewSeq.current = seq;
    dispatch({ type: "preview:start" });
    try {
      const data = await previewDashboardWidgetData(layout.widgets);
      if (previewSeq.current === seq) {
        dispatch({ type: "preview:success", data });
      }
    } catch (error) {
      if (previewSeq.current === seq) {
        dispatch({
          type: "preview:error",
          error: extractError(error, "Failed to preview widgets."),
        });
      }
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(false));
  }, [load]);

  useEffect(
    () =>
      subscribeDashboardCache(() => {
        if (stateRef.current.dirty || stateRef.current.saving) {
          dispatch({ type: "remote:stale" });
          return;
        }
        void Promise.resolve().then(() => load(true));
      }),
    [load]
  );

  const dataMap = useMemo(() => buildDataMap(state.data), [state.data]);
  const widgets = useMemo(() => sortedWidgets(state.layout), [state.layout]);
  const selectedWidget = useMemo(
    () => widgets.find((widget) => widget.id === state.selectedId) ?? null,
    [state.selectedId, widgets]
  );

  const applyLayout = useCallback(
    (layout: DashboardLayout, selectedId?: string | null) => {
      dispatch({ type: "layout:update", layout, selectedId });
      void refreshPreview(layout);
    },
    [refreshPreview]
  );

  const addWidget = useCallback(
    (type: DashboardWidgetType) => {
      if (!state.layout || state.layout.widgets.length >= DASHBOARD_MAX_WIDGETS) return;
      const widget = createDashboardWidget(type, nextY(state.layout) + 1);
      applyLayout({ ...state.layout, widgets: [...state.layout.widgets, widget] }, widget.id);
    },
    [applyLayout, state.layout]
  );

  const updateWidget = useCallback(
    (updated: DashboardWidget) => {
      if (!state.layout) return;
      applyLayout(
        withWidget(state.layout, updated.id, () => updated),
        updated.id
      );
    },
    [applyLayout, state.layout]
  );

  const handleWidgetAction = useCallback(
    (
      widget: DashboardWidget,
      action: Parameters<
        NonNullable<React.ComponentProps<typeof DashboardWidgetHost>["onAction"]>
      >[0]
    ) => {
      if (!state.layout) return;
      if (action === "configure") {
        dispatch({ type: "select", id: widget.id });
        return;
      }
      const next = withWidget(state.layout, widget.id, (current) => {
        if (action === "remove") return null;
        const position = { ...current.position };
        if (action === "left") position.x = clamp(position.x - 1, 0, 11);
        if (action === "right") position.x = clamp(position.x + 1, 0, 12 - position.w);
        if (action === "up") position.y = clamp(position.y - 1, 0, 9999);
        if (action === "down") position.y = clamp(position.y + 1, 0, 9999);
        if (action === "wider") position.w = clamp(position.w + 1, 1, 12 - position.x);
        if (action === "narrower") position.w = clamp(position.w - 1, 1, 12);
        return { ...current, position };
      });
      applyLayout(next, action === "remove" ? null : widget.id);
    },
    [applyLayout, state.layout]
  );

  const save = useCallback(async () => {
    if (!state.layout) return;
    dispatch({ type: "save:start" });
    try {
      const response = await saveDashboardLayout(state.layout);
      const data = await getDashboardWidgetDataCached({ force: true });
      dispatch({ type: "save:success", layout: response.layout, data });
    } catch (error) {
      dispatch({ type: "save:error", error: extractError(error, "Failed to save dashboard.") });
    }
  }, [state.layout]);

  const reset = useCallback(async () => {
    dispatch({ type: "save:start" });
    try {
      const response = await resetDashboardLayout();
      const data = await getDashboardWidgetDataCached({ force: true });
      dispatch({ type: "save:success", layout: response.layout, data });
    } catch (error) {
      dispatch({ type: "save:error", error: extractError(error, "Failed to reset dashboard.") });
    }
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: "edit:set", value: false });
    void Promise.resolve().then(() => load(true));
  }, [load]);

  const canAdd =
    canWrite &&
    Boolean(state.layout) &&
    (state.layout?.widgets.length ?? 0) < DASHBOARD_MAX_WIDGETS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <LayoutGrid className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold">Dashboard Panels</div>
            <div className="text-sm text-muted-foreground">
              {state.previewing
                ? "Previewing draft data..."
                : `${widgets.length} panel${widgets.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => load(true)}
            disabled={state.loading || state.saving}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          {canWrite && !state.editMode ? (
            <Button onClick={() => dispatch({ type: "edit:set", value: true })}>
              <Settings2 className="mr-2 size-4" />
              Customize
            </Button>
          ) : null}
          {canWrite && state.editMode ? (
            <>
              <Button variant="outline" onClick={reset} disabled={state.saving}>
                <RotateCcw className="mr-2 size-4" />
                Reset
              </Button>
              <Button variant="outline" onClick={cancel} disabled={state.saving}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
              <Button onClick={save} disabled={!state.dirty || state.saving}>
                <Save className="mr-2 size-4" />
                Save
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Dashboard unavailable</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.remoteStale ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Saved layout changed elsewhere</AlertTitle>
          <AlertDescription>
            Finish or cancel this draft before loading the newer saved layout.
          </AlertDescription>
        </Alert>
      ) : null}

      {state.editMode ? <AddWidgetCatalog disabled={!canAdd} onAdd={addWidget} /> : null}

      {state.loading ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      ) : null}

      <div
        aria-busy={state.loading || state.previewing}
        className="grid grid-cols-1 gap-4 lg:grid-cols-12"
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={cn(spanClass[clamp(widget.position.w, 1, 12)], "min-w-0")}
            style={
              { minHeight: `${clamp(widget.position.h, 1, 12) * 88}px` } satisfies CSSProperties
            }
          >
            <DashboardWidgetHost
              widget={widget}
              data={dataMap.get(widget.id)}
              editMode={state.editMode}
              selected={state.selectedId === widget.id}
              onAction={(action) => handleWidgetAction(widget, action)}
            />
          </div>
        ))}
      </div>

      {widgets.length === 0 && !state.loading ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No dashboard panels saved.
        </div>
      ) : null}

      <ConfigPanel
        widget={selectedWidget}
        onClose={() => dispatch({ type: "select", id: null })}
        onUpdate={updateWidget}
      />
    </div>
  );
}
