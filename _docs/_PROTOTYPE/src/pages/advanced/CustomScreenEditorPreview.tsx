import {
  BarChart3,
  CalendarDays,
  CircleDot,
  Filter,
  FormInput,
  LayoutGrid,
  Rocket,
  Table as TableIcon,
  Type,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import {
  EditorPreviewFrame,
  EditorRailGroup,
  EditorRailItem,
} from "@/components/patterns/EditorPreviewFrame";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/router";

const STATS = [
  { label: "Open", value: "128" },
  { label: "Pending", value: "34" },
  { label: "Solved", value: "92" },
];

const COLUMNS = [
  { label: "Subject", checked: true },
  { label: "Status", checked: true },
  { label: "Assignee", checked: true },
  { label: "Priority", checked: false },
  { label: "Updated", checked: true },
];

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function CustomScreenEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Screens", to: "/advanced/custom-screens" },
          { label: "Support tickets" },
        ]}
        title="Support tickets"
        description="Compose a custom admin screen from widgets bound to your data."
        actions={
          <>
            <Button variant="ghost">Save</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <EditorPreviewFrame
        title="Screen builder"
        toolbar={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                List view
              </span>
              <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Entry view
              </span>
            </div>
            <Badge variant="outline">draft</Badge>
          </div>
        }
        left={
          <>
            <EditorRailGroup label="Widgets">
              <EditorRailItem icon={<LayoutGrid />} active>
                Stat card
              </EditorRailItem>
              <EditorRailItem icon={<TableIcon />}>Table</EditorRailItem>
              <EditorRailItem icon={<BarChart3 />}>Chart</EditorRailItem>
              <EditorRailItem icon={<Filter />}>Filters</EditorRailItem>
              <EditorRailItem icon={<FormInput />}>Form</EditorRailItem>
            </EditorRailGroup>
            <EditorRailGroup label="Fields">
              <EditorRailItem icon={<Type />}>Text</EditorRailItem>
              <EditorRailItem icon={<CircleDot />}>Status</EditorRailItem>
              <EditorRailItem icon={<User />}>Assignee</EditorRailItem>
              <EditorRailItem icon={<CalendarDays />}>Date</EditorRailItem>
            </EditorRailGroup>
          </>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Table block</span>
              <Badge variant="soft">Selected</Badge>
            </div>
            <InspectorRow label="Data source">
              <Select defaultValue="tickets">
                <option value="tickets">Support tickets</option>
                <option value="orders">Orders</option>
                <option value="users">Users</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Columns">
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                {COLUMNS.map((col) => (
                  <label key={col.label} className="flex items-center gap-2.5 text-sm">
                    <Checkbox defaultChecked={col.checked} />
                    {col.label}
                  </label>
                ))}
              </div>
            </InspectorRow>
            <InspectorRow label="Mode">
              <Select defaultValue="read">
                <option value="read">Read</option>
                <option value="readwrite">Read &amp; write</option>
              </Select>
            </InspectorRow>
          </>
        }
        canvas={
          <div className="mx-auto max-w-3xl">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-lg font-semibold">Support tickets</div>
                  <div className="text-xs text-muted-foreground">Generated screen · live data</div>
                </div>
                <Badge variant="info">Auto-generated</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {STATS.map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="mt-1 font-display text-2xl font-semibold tabular-nums">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-border">
                <div className="flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="h-2.5 w-40 rounded bg-muted-foreground/30" />
                  <div className="h-2.5 w-20 rounded bg-muted-foreground/30" />
                  <div className="ml-auto h-2.5 w-24 rounded bg-muted-foreground/30" />
                </div>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="size-8 shrink-0 rounded-lg bg-primary-soft" />
                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 w-2/3 rounded bg-muted-foreground/20" />
                      <div className="mt-1.5 h-2 w-1/3 rounded bg-muted-foreground/10" />
                    </div>
                    <span className="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                      Open
                    </span>
                    <div className="ml-2 size-6 shrink-0 rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Non-functional preview. Publishing adds this screen to the sidebar — the{" "}
        <span className="font-medium text-foreground">List view</span> becomes its entries table and the{" "}
        <span className="font-medium text-foreground">Entry view</span> renders each record.{" "}
        <Link to="/advanced/custom-screens/project-catalog/entries" className="text-primary hover:underline">
          See a published screen →
        </Link>
      </p>
    </div>
  );
}
