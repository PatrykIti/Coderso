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
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { moveWidget, resizeWidget, sortWidgetsByPosition } from "./dashboardLayoutArrange";
import { WidgetConfigForm } from "./WidgetConfigForm";
import {
  canRenderWidgetType,
  createDashboardWidget,
  dashboardWidgetCatalog,
  getDashboardWidgetDescriptor,
} from "./widgetRegistry";
import {
  cloneLayout,
  DASHBOARD_MAX_WIDGETS,
  normalizeDashboardWidgetConfig,
} from "../../../services/dashboard/dashboardWidgetContract";
import type {
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetResolution,
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

const extractError = (error: unknown, fallback: string) =>
  isApiClientError(error) ? error.message : fallback;

const sortedWidgets = (layout: DashboardLayout | null) =>
  [...(layout?.widgets ?? [])].sort(
    (a, b) => a.position.y - b.position.y || a.position.x - b.position.x
  );

const nextY = (layout: DashboardLayout) =>
  layout.widgets.reduce((max, widget) => Math.max(max, widget.position.y + widget.position.h), 0);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Pointer-resize geometry constants — kept in sync with the render below:
// the grid uses `gap-4` (16px) and each wrapper's minHeight is `h * 88px`.
const GRID_GAP_PX = 16;
const GRID_ROW_UNIT_PX = 88;

// Hit-test the widget wrappers (which carry `data-widget-id`) for the point under
// the pointer during a reorder drag. Returns the topmost matching widget id.
const widgetIdAtPoint = (grid: HTMLElement, clientX: number, clientY: number): string | null => {
  const nodes = Array.from(grid.querySelectorAll<HTMLElement>("[data-widget-id]"));
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return node.getAttribute("data-widget-id");
    }
  }
  return null;
};

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
  can,
  onAdd,
}: {
  disabled?: boolean;
  // Presentational RBAC predicate (TASK-480-05-L02): the catalog only lists widget
  // types the current permission set can render data for. The widget-data route
  // stays the real boundary; this just hides types the viewer could never populate.
  can: (permission: string) => boolean;
  onAdd: (type: DashboardWidgetType) => void;
}) {
  const entries = dashboardWidgetCatalog.filter((item) => canRenderWidgetType(item.type, can));
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        No widget types are available for your permissions.
      </div>
    );
  }
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {entries.map((item) => {
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
              <span className="block text-sm font-medium">{item.label}</span>
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
  data,
  onUpdate,
  onClose,
}: {
  widget: DashboardWidget | null;
  data?: DashboardWidgetResolution;
  onUpdate: (widget: DashboardWidget) => void;
  onClose: () => void;
}) {
  if (!widget) return null;

  const descriptor = getDashboardWidgetDescriptor(widget.type);

  // Every field change routes through the schema owner, so an out-of-range or
  // unknown value can never enter the draft (reject-unknown preserved). Passing
  // `undefined` clears the key so the schema default applies.
  const setField = (key: string, value: unknown) => {
    const base: Record<string, unknown> = { ...widget.config };
    if (value === undefined) delete base[key];
    else base[key] = value;
    onUpdate({ ...widget, config: normalizeDashboardWidgetConfig(widget.type, base) });
  };

  const updateTitle = (title: string) => {
    onUpdate({ ...widget, title });
  };

  return (
    <Sheet open modal={false} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        className="flex w-full flex-col overflow-y-auto sm:max-w-md"
        overlayClassName="pointer-events-none bg-transparent"
      >
        <SheetHeader>
          <SheetTitle>{descriptor.label}</SheetTitle>
          <SheetDescription>{descriptor.description}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </span>
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <DashboardWidgetHost widget={widget} data={data} editMode={false} />
            </div>
          </div>
          <Field label="Title">
            <Input
              value={widget.title ?? ""}
              onChange={(event) => updateTitle(event.target.value)}
            />
          </Field>
          <WidgetConfigForm
            widgetId={widget.id}
            fields={descriptor.configFields}
            config={widget.config}
            onChange={setField}
          />
        </div>
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

export function DashboardBuilder({
  canWrite,
  can,
}: {
  canWrite: boolean;
  // Permission predicate for the presentational add-widget RBAC guard. Defaults to
  // "allow" so existing callers/tests that only assert layout mechanics are
  // unaffected; DashboardPage passes the live admin `can`.
  can?: (permission: string) => boolean;
}) {
  const canRender = can ?? (() => true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const previewSeq = useRef(0);

  // Pointer drag-and-drop (TASK-480-05-L01). `gridRef` measures a column's pixel
  // width for resize; the two "*Ref"s are the live pointer sessions (source of
  // truth read by the window listeners, which capture no reactive state); the
  // three states drive drag/drop/resize styling only. All mutations flow through
  // `applyGeometry`, keeping the same dirty-state + cache contract as the nudges.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{ id: string; overId: string | null } | null>(null);
  const resizeSessionRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    colWidth: number;
  } | null>(null);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Detach any in-flight pointer session on unmount. Cleanup-only (no state set),
  // so it does not violate the no-set-state-in-effect rule.
  useEffect(() => () => pointerCleanupRef.current?.(), []);

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

  // Geometry-only draft mutation (reorder/resize). Unlike `applyLayout` it does
  // NOT re-preview: moving or resizing a widget changes neither its resolved data
  // nor the data of any other widget, so a preview refetch would be wasted network
  // (and would spam on every pointermove). Dirty-state + save flow are unchanged.
  const applyGeometry = useCallback((layout: DashboardLayout) => {
    dispatch({ type: "layout:update", layout });
  }, []);

  const detachPointer = useCallback(() => {
    pointerCleanupRef.current?.();
    pointerCleanupRef.current = null;
  }, []);

  const beginReorder = useCallback(
    (id: string, event: React.PointerEvent<HTMLElement>) => {
      if (!stateRef.current.editMode) return;
      event.preventDefault();
      detachPointer();
      dragSessionRef.current = { id, overId: null };
      setDragId(id);
      setOverId(null);

      const handleMove = (moveEvent: PointerEvent) => {
        const grid = gridRef.current;
        const session = dragSessionRef.current;
        if (!grid || !session) return;
        const target = widgetIdAtPoint(grid, moveEvent.clientX, moveEvent.clientY);
        const nextOver = target && target !== session.id ? target : null;
        if (nextOver !== session.overId) {
          session.overId = nextOver;
          setOverId(nextOver);
        }
      };
      const finish = (commit: boolean) => {
        detachPointer();
        const session = dragSessionRef.current;
        dragSessionRef.current = null;
        setDragId(null);
        setOverId(null);
        if (commit && session?.overId && stateRef.current.layout) {
          applyGeometry(moveWidget(stateRef.current.layout, session.id, session.overId));
        }
      };
      const handleUp = () => finish(true);
      const handleCancel = () => finish(false);
      const handleKey = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape") finish(false);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
      window.addEventListener("keydown", handleKey);
      pointerCleanupRef.current = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        window.removeEventListener("keydown", handleKey);
      };
    },
    [applyGeometry, detachPointer]
  );

  const beginResize = useCallback(
    (id: string, event: React.PointerEvent<HTMLElement>) => {
      if (!stateRef.current.editMode) return;
      event.preventDefault();
      event.stopPropagation();
      detachPointer();
      const grid = gridRef.current;
      const layout = stateRef.current.layout;
      if (!grid || !layout) return;
      const widget = layout.widgets.find((entry) => entry.id === id);
      if (!widget) return;
      const gridWidth = grid.getBoundingClientRect().width;
      const colWidth = Math.max(1, (gridWidth - GRID_GAP_PX * 11) / 12);
      resizeSessionRef.current = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        startW: widget.position.w,
        startH: widget.position.h,
        colWidth,
      };
      setResizeId(id);

      const handleMove = (moveEvent: PointerEvent) => {
        const session = resizeSessionRef.current;
        const current = stateRef.current.layout;
        if (!session || !current) return;
        // Absolute target from the drag origin (not cumulative), so a one-frame
        // lag in `stateRef` can never accrue drift.
        const stepX = Math.round((moveEvent.clientX - session.startX) / session.colWidth);
        const stepY = Math.round((moveEvent.clientY - session.startY) / GRID_ROW_UNIT_PX);
        const next = resizeWidget(
          current,
          session.id,
          session.startW + stepX,
          session.startH + stepY
        );
        if (next !== current) applyGeometry(next);
      };
      const finish = () => {
        detachPointer();
        resizeSessionRef.current = null;
        setResizeId(null);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
      pointerCleanupRef.current = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };
    },
    [applyGeometry, detachPointer]
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
      // Remove changes which resolved data the grid shows, so it re-previews via
      // applyLayout. Everything else is geometry-only (reorder/resize) and reuses
      // the pointer path's applyGeometry — no wasted preview refetch, matching the
      // pointer drag/resize sessions exactly.
      if (action === "remove") {
        applyLayout(
          withWidget(state.layout, widget.id, () => null),
          null
        );
        return;
      }
      // Up/down reorder using the SAME dense-resequence model as pointer drag
      // (moveWidget): swap with the previous/next widget in visual order so one
      // keypress advances exactly one slot (no y-tie dead press).
      if (action === "up" || action === "down") {
        const order = sortWidgetsByPosition(state.layout.widgets);
        const index = order.findIndex((entry) => entry.id === widget.id);
        const targetIndex = action === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= order.length) return;
        applyGeometry(moveWidget(state.layout, widget.id, order[targetIndex].id));
        return;
      }
      // Positional (left/right) + size (wider/narrower/taller/shorter) nudges:
      // clamp to the same bounds the pointer resize + server normalizer use.
      const next = withWidget(state.layout, widget.id, (current) => {
        const position = { ...current.position };
        if (action === "left") position.x = clamp(position.x - 1, 0, 11);
        if (action === "right") position.x = clamp(position.x + 1, 0, 12 - position.w);
        if (action === "wider") position.w = clamp(position.w + 1, 1, 12 - position.x);
        if (action === "narrower") position.w = clamp(position.w - 1, 1, 12);
        if (action === "taller") position.h = clamp(position.h + 1, 1, 12);
        if (action === "shorter") position.h = clamp(position.h - 1, 1, 12);
        return { ...current, position };
      });
      applyGeometry(next);
    },
    [applyGeometry, applyLayout, state.layout]
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
              <Button onClick={save} disabled={!state.dirty || state.saving || state.remoteStale}>
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
            Saving is disabled to avoid overwriting the newer layout. Cancel to load it (discarding
            this draft), or reset to defaults.
          </AlertDescription>
        </Alert>
      ) : null}

      {state.editMode ? (
        <AddWidgetCatalog disabled={!canAdd} can={canRender} onAdd={addWidget} />
      ) : null}

      {state.loading ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      ) : null}

      <div
        ref={gridRef}
        aria-busy={state.loading || state.previewing}
        className={cn(
          "grid grid-cols-1 gap-4 lg:grid-cols-12",
          (dragId || resizeId) && "select-none"
        )}
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
              onReorderPointerDown={(event) => beginReorder(widget.id, event)}
              onResizePointerDown={(event) => beginResize(widget.id, event)}
              dragging={dragId === widget.id}
              dropTarget={overId === widget.id}
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
        data={selectedWidget ? dataMap.get(selectedWidget.id) : undefined}
        onClose={() => dispatch({ type: "select", id: null })}
        onUpdate={updateWidget}
      />
    </div>
  );
}
