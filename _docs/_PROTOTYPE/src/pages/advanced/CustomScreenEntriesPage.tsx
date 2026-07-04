import {
  Columns3,
  GripVertical,
  LayoutGrid,
  Lock,
  Pencil,
  Plus,
  Rows3,
  SlidersHorizontal,
  Table as TableIcon,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Link, usePath } from "@/lib/router";
import { cn } from "@/lib/cn";
import {
  getScreen,
  parseScreenPath,
  type ScreenColumn,
  type ScreenDef,
  type ScreenRow,
} from "@/lib/screensMock";

const VIEW_ICONS: Record<string, LucideIcon> = {
  Table: TableIcon,
  Board: Columns3,
  Gallery: LayoutGrid,
  Calendar: Rows3,
};

const TYPE_LABEL: Record<ScreenColumn["type"], string> = {
  title: "Title",
  status: "Status",
  person: "Person",
  badge: "Select",
  money: "Number",
  progress: "Progress",
  date: "Date",
  tags: "Tags",
  text: "Text",
};

function renderCell(screen: ScreenDef, col: ScreenColumn, row: ScreenRow, href: string): ReactNode {
  const value = row[col.key];
  switch (col.type) {
    case "title": {
      const Icon = screen.icon;
      return (
        <Link to={href} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{String(value)}</span>
            {col.subKey ? (
              <span className="block truncate text-xs text-muted-foreground">
                {String(row[col.subKey] ?? "")}
              </span>
            ) : null}
          </span>
        </Link>
      );
    }
    case "status":
      return <StatusBadge status={String(value)} />;
    case "person":
      return (
        <span className="flex items-center gap-2">
          <Avatar name={String(value)} size="sm" />
          <span className="text-sm">{String(value).split(" ")[0]}</span>
        </span>
      );
    case "badge":
      return value === "—" ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : (
        <Badge variant="soft">{String(value)}</Badge>
      );
    case "money":
      return <span className="text-sm font-medium tabular-nums">{String(value)}</span>;
    case "progress":
      return (
        <span className="flex items-center gap-2">
          <Progress
            value={Number(value)}
            tone={Number(value) >= 100 ? "success" : "primary"}
            className="w-20"
          />
          <span className="text-xs tabular-nums text-muted-foreground">{Number(value)}%</span>
        </span>
      );
    case "date":
      return <span className="text-sm text-muted-foreground">{String(value)}</span>;
    case "tags":
      return (
        <span className="flex flex-wrap gap-1">
          {(value as string[]).map((tag) => (
            <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">
              {tag}
            </Badge>
          ))}
        </span>
      );
    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

export function CustomScreenEntriesPage() {
  const path = usePath();
  const { id } = parseScreenPath(path);
  const screen = getScreen(id);

  const [visible, setVisible] = useState<string[]>(() =>
    screen.columns.filter((c) => c.visible).map((c) => c.key),
  );
  const [activeView, setActiveView] = useState(screen.views[0]);
  const [showConfig, setShowConfig] = useState(false);

  const toggle = (key: string) =>
    setVisible((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const tableColumns = useMemo<Column<ScreenRow>[]>(() => {
    const shown = screen.columns.filter((c) => visible.includes(c.key));
    const cols: Column<ScreenRow>[] = shown.map((col) => ({
      key: col.key,
      header: col.label,
      align: col.type === "money" ? "right" : "left",
      render: (row, index) =>
        renderCell(screen, col, row, `/advanced/custom-screens/${screen.id}/entries/${index + 1}`),
    }));
    return cols;
  }, [screen, visible]);

  return (
    <div>
      <PageHeader
        icon={<screen.icon />}
        title={screen.name}
        description={`Published screen · ${screen.description}`}
        actions={
          <>
            <Link to={`/advanced/custom-screens/${screen.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Pencil className="size-4" /> Edit screen
              </Button>
            </Link>
            <Button
              variant={showConfig ? "soft" : "outline"}
              className="gap-1.5"
              onClick={() => setShowConfig((v) => !v)}
            >
              <SlidersHorizontal className="size-4" /> Customize view
            </Button>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New {screen.singular.toLowerCase()}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="success">
          <span className="size-1.5 rounded-full bg-success" /> Published
        </Badge>
        <span className="text-xs text-muted-foreground">In sidebar · {screen.contentType} entries</span>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {screen.stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-2xl font-semibold tabular-nums">{stat.value}</span>
              {stat.delta ? (
                <span
                  className={cn(
                    "mb-0.5 text-xs font-medium",
                    stat.trend === "down" ? "text-destructive" : "text-success",
                  )}
                >
                  {stat.delta}
                </span>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {/* View type tabs */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1">
        {screen.views.map((view) => {
          const Icon = VIEW_ICONS[view] ?? TableIcon;
          const active = view === activeView;
          return (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {view}
            </button>
          );
        })}
      </div>

      <div className={cn("grid gap-5", showConfig && "lg:grid-cols-[1fr_320px]")}>
        <div className="min-w-0">
          <FilterBar searchPlaceholder={`Search ${screen.name.toLowerCase()}…`} view="list" />
          <DataTable columns={tableColumns} rows={screen.rows} selectable onRowClick={() => {}} />
          <Pagination page={1} pageCount={3} total={screen.rows.length} pageSize={screen.rows.length} />
        </div>

        {showConfig ? (
          <ViewConfigPanel screen={screen} visible={visible} onToggle={toggle} />
        ) : null}
      </div>
    </div>
  );
}

function ViewConfigPanel({
  screen,
  visible,
  onToggle,
}: {
  screen: ScreenDef;
  visible: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <Card className="h-fit lg:sticky lg:top-2">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-display text-sm font-semibold">View settings</span>
        <Badge variant="outline">Table</Badge>
      </div>

      <div className="p-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Columns
        </div>
        <p className="mb-2.5 text-xs text-muted-foreground">
          Toggle, reorder, and rename columns for everyone viewing this screen.
        </p>
        <div className="flex flex-col gap-0.5 rounded-xl border border-border p-1.5">
          {screen.columns.map((col) => {
            const on = visible.includes(col.key);
            return (
              <div
                key={col.key}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted/60"
              >
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/60" />
                {col.locked ? (
                  <Lock className="size-4 shrink-0 text-muted-foreground/70" />
                ) : (
                  <Checkbox checked={on} onCheckedChange={() => onToggle(col.key)} />
                )}
                <span className="flex-1 truncate text-sm">{col.label}</span>
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {TYPE_LABEL[col.type]}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <Field label="Group by">
            <Select defaultValue="none">
              <option value="none">None</option>
              <option value="status">Status</option>
              <option value="owner">Owner</option>
            </Select>
          </Field>
          <Field label="Sort by">
            <Select defaultValue="updated">
              <option value="updated">Recently updated</option>
              <option value="name">Name (A–Z)</option>
              <option value="created">Date created</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Row height">
              <Select defaultValue="cozy">
                <option value="compact">Compact</option>
                <option value="cozy">Cozy</option>
                <option value="comfy">Comfortable</option>
              </Select>
            </Field>
            <Field label="Page size">
              <Select defaultValue="25">
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">Saved to this screen</span>
        <Button size="sm">Save view</Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
