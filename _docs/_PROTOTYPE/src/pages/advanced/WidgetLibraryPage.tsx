import { Eye, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";

const WIDGETS = [
  { name: "Hero", category: "Layout", kind: "hero" },
  { name: "Feature grid", category: "Content", kind: "grid" },
  { name: "Pricing table", category: "Marketing", kind: "pricing" },
  { name: "Testimonials", category: "Content", kind: "testimonials" },
  { name: "FAQ", category: "Content", kind: "faq" },
  { name: "Call to action", category: "Marketing", kind: "cta" },
  { name: "Gallery", category: "Media", kind: "gallery" },
  { name: "Logo cloud", category: "Media", kind: "logos" },
  { name: "Stats", category: "Content", kind: "stats" },
  { name: "Newsletter", category: "Forms", kind: "newsletter" },
  { name: "Team", category: "Content", kind: "team" },
  { name: "Steps", category: "Layout", kind: "steps" },
];

function WidgetPreview({ kind }: { kind: string }) {
  let inner;
  switch (kind) {
    case "grid":
      inner = (
        <div className="grid h-full grid-cols-3 grid-rows-2 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-md bg-muted-foreground/15" />
          ))}
        </div>
      );
      break;
    case "pricing":
      inner = (
        <div className="grid h-full grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 rounded-md p-1.5 ${i === 1 ? "bg-muted-foreground/15" : "bg-muted-foreground/10"}`}
            >
              <div className="h-1.5 w-3/4 rounded bg-muted-foreground/30" />
              <div className="h-3 w-1/2 rounded bg-muted-foreground/25" />
              <div className="mt-auto h-2.5 rounded bg-muted-foreground/20" />
            </div>
          ))}
        </div>
      );
      break;
    case "testimonials":
      inner = (
        <div className="flex h-full flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="size-5 rounded-full bg-muted-foreground/25" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-1/3 rounded bg-muted-foreground/25" />
              <div className="h-1.5 w-1/4 rounded bg-muted-foreground/15" />
            </div>
          </div>
          <div className="h-1.5 w-full rounded bg-muted-foreground/15" />
          <div className="h-1.5 w-5/6 rounded bg-muted-foreground/15" />
          <div className="h-1.5 w-2/3 rounded bg-muted-foreground/15" />
        </div>
      );
      break;
    case "faq":
      inner = (
        <div className="flex h-full flex-col gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-muted-foreground/10 px-2 py-1.5">
              <div className="h-1.5 flex-1 rounded bg-muted-foreground/25" />
              <div className="size-2 rounded bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      );
      break;
    case "cta":
      inner = (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="h-2 w-1/2 rounded bg-muted-foreground/25" />
          <div className="h-1.5 w-1/3 rounded bg-muted-foreground/15" />
          <div className="mt-1 h-4 w-16 rounded-md bg-muted-foreground/30" />
        </div>
      );
      break;
    case "gallery":
      inner = (
        <div className="grid h-full grid-cols-4 grid-rows-2 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded bg-muted-foreground/20" />
          ))}
        </div>
      );
      break;
    case "logos":
      inner = (
        <div className="flex h-full flex-wrap items-center justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 w-12 rounded-md bg-muted-foreground/15" />
          ))}
        </div>
      );
      break;
    case "stats":
      inner = (
        <div className="flex h-full items-center justify-around">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-4 w-8 rounded bg-muted-foreground/30" />
              <div className="h-1.5 w-10 rounded bg-muted-foreground/15" />
            </div>
          ))}
        </div>
      );
      break;
    case "newsletter":
      inner = (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="h-2 w-1/2 rounded bg-muted-foreground/25" />
          <div className="flex w-full gap-1.5">
            <div className="h-5 flex-1 rounded-md bg-muted-foreground/15" />
            <div className="h-5 w-12 rounded-md bg-muted-foreground/30" />
          </div>
        </div>
      );
      break;
    case "team":
      inner = (
        <div className="flex h-full items-center justify-around">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="size-7 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-8 rounded bg-muted-foreground/15" />
            </div>
          ))}
        </div>
      );
      break;
    case "steps":
      inner = (
        <div className="flex h-full items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) =>
            i % 2 === 0 ? (
              <div key={i} className="size-6 rounded-full bg-muted-foreground/25" />
            ) : (
              <div key={i} className="h-0.5 w-6 bg-muted-foreground/15" />
            ),
          )}
        </div>
      );
      break;
    default:
      inner = (
        <div className="flex h-full flex-col">
          <div className="h-2 w-1/3 rounded bg-muted-foreground/25" />
          <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/15" />
          <div className="mt-auto flex gap-1.5">
            <div className="h-4 w-12 rounded-md bg-muted-foreground/30" />
            <div className="h-4 w-10 rounded-md bg-muted-foreground/15" />
          </div>
        </div>
      );
  }
  return <div className="mb-4 h-28 rounded-xl bg-muted p-3">{inner}</div>;
}

export function WidgetLibraryPage() {
  return (
    <div>
      <PageHeader
        title="Widgets"
        description="Drag-ready building blocks for every page in your site."
      />

      <div className="mb-5">
        <Tabs
          items={[
            { value: "all", label: "All" },
            { value: "layout", label: "Layout" },
            { value: "content", label: "Content" },
            { value: "marketing", label: "Marketing" },
            { value: "media", label: "Media" },
            { value: "forms", label: "Forms" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {WIDGETS.map((widget) => (
          <Card key={widget.name} className="flex h-full flex-col p-4">
            <WidgetPreview kind={widget.kind} />
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[15px] font-semibold">{widget.name}</div>
              <Badge variant="outline">{widget.category}</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="soft" size="sm" className="flex-1 gap-1.5">
                <Plus className="size-4" /> Insert
              </Button>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Eye className="size-4" /> Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
