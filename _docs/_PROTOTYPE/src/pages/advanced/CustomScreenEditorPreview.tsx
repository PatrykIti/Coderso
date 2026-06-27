import {
  AlignLeft,
  BarChart3,
  Braces,
  Columns3,
  Image as ImageIcon,
  List,
  Minus,
  Plus,
  Rocket,
  Square,
  Type,
} from "lucide-react";
import { type ReactNode } from "react";

import { CanvasEditor, BlockChip } from "@/components/patterns/CanvasEditor";
import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { Link } from "@/lib/router";

/** A selectable template section on the canvas, tagged with its block type. */
function Section({
  tag,
  selected,
  className,
  children,
}: {
  tag: string;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mt-3 rounded-2xl bg-card p-5",
        selected ? "border-2 border-primary" : "border border-border",
        className,
      )}
    >
      <Badge
        variant="outline"
        className="absolute -top-2 left-3 px-1.5 py-0 text-[10px] font-medium"
      >
        {tag}
      </Badge>
      {children}
    </div>
  );
}

/** Muted "{{ field }}" binding token shown in place of real values. */
function Token({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

const FIELD_TILES = [
  { label: "Budget", token: "{{ Budget }}" },
  { label: "Progress", token: "{{ Progress }}" },
  { label: "Phase", token: "{{ Phase }}" },
  { label: "Due date", token: "{{ Due date }}" },
];

const BG_SWATCHES = ["#ffffff", "#f5f3ff", "#ecfdf5", "#fff7ed"];

function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
          { label: "Projects" },
        ]}
        title="Projects"
        description="Design the entry view — the layout shown when someone opens a Project."
        actions={
          <>
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
              <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
                List view
              </span>
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                Entry view
              </span>
            </div>
            <Button variant="ghost">Save</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <CanvasEditor
        title="Entry-view builder"
        badge={<Badge variant="soft">Preview only</Badge>}
        toolbar={<Badge variant="outline">Entry view</Badge>}
        panelTitle="Header section"
        panelPosition="right"
        canvas={
          <div className="mx-auto max-w-2xl">
            {/* (1) Header — selected */}
            <Section tag="Header" selected>
              <div className="font-display text-2xl font-semibold">
                <Token>{"{{ Project name }}"}</Token>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5">
                  <Token className="bg-transparent px-0 py-0">{"{{ Status }}"}</Token>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-5 shrink-0 rounded-full bg-primary-soft" />
                  <Token>{"{{ Owner }}"}</Token>
                </span>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                  <Token className="bg-transparent px-0 py-0">{"{{ Phase }}"}</Token>
                </span>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                  <Token className="bg-transparent px-0 py-0">{"{{ Due date }}"}</Token>
                </span>
              </div>
            </Section>

            {/* (2) Fields */}
            <Section tag="Fields">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {FIELD_TILES.map((tile) => (
                  <div key={tile.label} className="rounded-xl bg-muted/50 p-3">
                    <div className="text-[11px] text-muted-foreground">{tile.label}</div>
                    <div className="mt-1.5 text-xs">
                      <Token>{tile.token}</Token>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* (3) Description — rich text */}
            <Section tag="Rich text">
              <div className="flex flex-col gap-2">
                <div className="h-2.5 w-1/3 rounded bg-muted-foreground/25" />
                <div className="h-2 w-full rounded bg-muted-foreground/15" />
                <div className="h-2 w-11/12 rounded bg-muted-foreground/15" />
                <div className="h-2 w-4/5 rounded bg-muted-foreground/15" />
                <div className="h-2 w-2/3 rounded bg-muted-foreground/15" />
              </div>
            </Section>

            {/* (4) Related list */}
            <Section tag="Related list">
              <div className="mb-3 text-sm font-medium">Milestones</div>
              <div className="flex flex-col gap-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-8 shrink-0 rounded-lg bg-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 w-2/3 rounded bg-muted-foreground/20" />
                      <div className="mt-1.5 h-2 w-1/3 rounded bg-muted-foreground/10" />
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-soft-foreground">
                      Chip
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            {/* (5) Add section */}
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-ring/50 hover:text-foreground"
            >
              <Plus className="size-4" /> Add section
            </button>
          </div>
        }
        panel={
          <div className="flex flex-col gap-3 p-3">
            <div>
              <div className="mb-2 text-xs font-medium text-muted-foreground">Add block</div>
              <div className="grid grid-cols-3 gap-1.5">
                <BlockChip icon={<Type />} label="Heading" />
                <BlockChip icon={<AlignLeft />} label="Text" />
                <BlockChip icon={<Braces />} label="Field" />
                <BlockChip icon={<BarChart3 />} label="Stat" />
                <BlockChip icon={<Minus />} label="Divider" />
                <BlockChip icon={<ImageIcon />} label="Image" />
                <BlockChip icon={<List />} label="Related list" />
                <BlockChip icon={<Columns3 />} label="Tabs" />
                <BlockChip icon={<Square />} label="Button" />
              </div>
            </div>

            <Separator />

            <InspectorRow label="Layout">
              <Select defaultValue="1">
                <option value="1">1 column</option>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
              </Select>
            </InspectorRow>

            <InspectorRow label="Bound field">
              <Select defaultValue="name">
                <option value="name">Project name</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </Select>
            </InspectorRow>

            <InspectorRow label="Spacing">
              <Select defaultValue="comfortable">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </Select>
            </InspectorRow>

            <InspectorRow label="Background">
              <div className="flex items-center gap-2">
                {BG_SWATCHES.map((hex, i) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Background ${hex}`}
                    style={{ backgroundColor: hex }}
                    className={cn(
                      "size-7 rounded-lg border border-border shadow-soft transition-transform hover:scale-105",
                      i === 1 && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
                    )}
                  />
                ))}
              </div>
            </InspectorRow>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Visible</span>
              <Switch defaultChecked />
            </div>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Build the entry view from sections &amp; blocks — it renders in Published → Projects →
        entry.{" "}
        <Link
          to="/advanced/custom-screens/project-catalog/entries"
          className="text-primary hover:underline"
        >
          See a published screen →
        </Link>
      </p>
    </div>
  );
}
