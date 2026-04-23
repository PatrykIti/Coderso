import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WidgetCategory } from "../../../../widgets/types";
import { widgetCategoryLabels, widgetCategoryOrder } from "../../widgets/widgetCategoryMeta";

import { getWidgetRegistry } from "./widgetRegistry";

type WidgetPickerProps = {
  onAdd: (type: string) => void;
  widgets?: Array<{
    type: string;
    title: string;
    description?: string;
    category?: WidgetCategory;
  }>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, type: string) => void;
  allowedTypes?: string[] | null;
  contextLabel?: string | null;
  onClearContext?: () => void;
};

export function WidgetPicker({
  onAdd,
  widgets,
  searchPlaceholder = "Find components...",
  emptyMessage = "No components match this search.",
  draggable = false,
  onDragStart,
  allowedTypes,
  contextLabel,
  onClearContext,
}: WidgetPickerProps) {
  const widgetRegistry = (widgets ?? getWidgetRegistry()).filter(
    (widget) => widget.type !== "template-section"
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredWidgets = useMemo(() => {
    const slotScopedWidgets =
      Array.isArray(allowedTypes) && allowedTypes.length > 0
        ? widgetRegistry.filter((widget) => allowedTypes.includes(widget.type))
        : widgetRegistry;
    if (!normalizedQuery) return slotScopedWidgets;
    return slotScopedWidgets.filter((widget) => {
      const haystack = [widget.title, widget.description, widget.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [allowedTypes, normalizedQuery, widgetRegistry]);
  const groupedWidgets = useMemo(
    () =>
      widgetCategoryOrder
        .map((category) => ({
          category,
          label: widgetCategoryLabels[category],
          items: filteredWidgets.filter((widget) => widget.category === category),
        }))
        .filter((group) => group.items.length > 0),
    [filteredWidgets]
  );
  const uncategorizedWidgets = useMemo(
    () =>
      filteredWidgets.filter(
        (widget) => !widget.category || !widgetCategoryOrder.includes(widget.category)
      ),
    [filteredWidgets]
  );
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b p-4">
        {contextLabel ? (
          <div className="mb-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>Insert into {contextLabel}</span>
              {onClearContext ? (
                <Button type="button" variant="ghost" size="xs" onClick={onClearContext}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 p-4">
        <div className="space-y-3">
          {filteredWidgets.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : null}
          {groupedWidgets.map((group) => (
            <div key={group.category} className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{group.label}</span>
                <span>{group.items.length}</span>
              </div>
              {group.items.map((widget) => (
                <div
                  key={widget.type}
                  className="rounded-lg border bg-background p-3 shadow-sm"
                  draggable={draggable}
                  onDragStart={(event) => onDragStart?.(event, widget.type)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{widget.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => onAdd(widget.type)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {uncategorizedWidgets.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Other</span>
                <span>{uncategorizedWidgets.length}</span>
              </div>
              {uncategorizedWidgets.map((widget) => (
                <div
                  key={widget.type}
                  className="rounded-lg border bg-background p-3 shadow-sm"
                  draggable={draggable}
                  onDragStart={(event) => onDragStart?.(event, widget.type)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{widget.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {widget.description}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => onAdd(widget.type)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
