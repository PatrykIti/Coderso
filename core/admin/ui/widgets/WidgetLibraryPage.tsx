import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Columns,
  FileText,
  Filter,
  GalleryVerticalEnd,
  Grid2X2,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { WidgetCard } from "./WidgetCard";
import { WidgetCreateDialog } from "./WidgetCreateDialog";
import { WidgetDetailsDrawer } from "./WidgetDetailsDrawer";
import type { WidgetCategoryId, WidgetItem } from "./types";

type WidgetCategoryFilter = "all" | "favorites" | WidgetCategoryId;
type WidgetView = "grid" | "list";
type WidgetPreview =
  | "hero"
  | "grid"
  | "form"
  | "media"
  | "video"
  | "text"
  | "pricing"
  | "banner";

type CategoryItem = {
  id: WidgetCategoryFilter;
  label: string;
  icon: LucideIcon;
};
type WidgetWithPreview = WidgetItem & { preview: WidgetPreview };

const primaryCategories: CategoryItem[] = [
  { id: "all", label: "All Widgets", icon: LayoutGrid },
  { id: "favorites", label: "Favorites", icon: Star },
];

const secondaryCategories: CategoryItem[] = [
  { id: "hero", label: "Hero", icon: GalleryVerticalEnd },
  { id: "grid", label: "Grid", icon: Columns },
  { id: "forms", label: "Forms", icon: FileText },
  { id: "media", label: "Media", icon: ImageIcon },
];

const seedWidgets: WidgetWithPreview[] = [
  {
    id: "hero-split",
    name: "Hero Split",
    category: "hero",
    categoryLabel: "Hero Section",
    preview: "hero",
  },
  {
    id: "feature-grid",
    name: "Feature Grid",
    category: "grid",
    categoryLabel: "Grid Layout",
    preview: "grid",
    isFavorite: true,
    badge: "Popular",
  },
  {
    id: "contact-form",
    name: "Contact Form",
    category: "forms",
    categoryLabel: "Forms",
    preview: "form",
  },
  {
    id: "media-gallery",
    name: "Media Gallery",
    category: "media",
    categoryLabel: "Media",
    preview: "media",
  },
  {
    id: "video-embed",
    name: "Video Embed",
    category: "media",
    categoryLabel: "Media",
    preview: "video",
    isFavorite: true,
  },
  {
    id: "center-text",
    name: "Center Text",
    category: "grid",
    categoryLabel: "Grid",
    preview: "text",
  },
  {
    id: "price-table",
    name: "Price Table",
    category: "grid",
    categoryLabel: "Grid",
    preview: "pricing",
  },
  {
    id: "promo-banner",
    name: "Promo Banner",
    category: "hero",
    categoryLabel: "Hero",
    preview: "banner",
    badge: "New",
  },
];

function PreviewFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full w-full rounded-lg border bg-background/80 p-3 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function renderPreview(kind: WidgetPreview) {
  switch (kind) {
    case "grid":
      return (
        <PreviewFrame className="p-2">
          <div className="grid h-full grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`grid-${index}`}
                className="flex flex-col gap-2 rounded-md border bg-background p-2"
              >
                <div className="h-3 w-3 rounded-full bg-muted" />
                <div className="h-1 w-full rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </PreviewFrame>
      );
    case "form":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-1/3 rounded bg-muted" />
            <div className="h-6 w-full rounded border bg-muted/30" />
            <div className="mt-auto h-4 w-full rounded bg-primary/70" />
          </div>
        </PreviewFrame>
      );
    case "media":
      return (
        <PreviewFrame className="p-2">
          <div className="flex h-full gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={`media-${index}`}
                className="flex flex-1 flex-col gap-2 rounded-md border bg-background p-2"
              >
                <div className="flex-1 rounded bg-muted/60" />
                <div className="h-1 w-full rounded bg-muted/50" />
              </div>
            ))}
          </div>
        </PreviewFrame>
      );
    case "video":
      return (
        <PreviewFrame className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Play className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-1 w-16 rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "text":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-full rounded bg-muted/60" />
            <div className="h-2 w-full rounded bg-muted/60" />
            <div className="h-2 w-3/4 rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "pricing":
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="h-2 w-1/4 rounded bg-muted" />
              <div className="h-2 w-1/4 rounded bg-muted" />
            </div>
            <div className="mt-auto h-2 w-full rounded bg-muted/60" />
          </div>
        </PreviewFrame>
      );
    case "banner":
      return (
        <PreviewFrame className="flex items-center justify-center border-primary/20 bg-primary/5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/50">
            Banner
          </span>
        </PreviewFrame>
      );
    case "hero":
    default:
      return (
        <PreviewFrame>
          <div className="flex h-full flex-col gap-2">
            <div className="h-2 w-1/2 rounded bg-muted" />
            <div className="h-1 w-full rounded bg-muted/60" />
            <div className="h-1 w-2/3 rounded bg-muted/60" />
            <div className="mt-auto h-4 w-16 rounded bg-primary/30" />
          </div>
        </PreviewFrame>
      );
  }
}

export function WidgetLibraryPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<WidgetView>("grid");
  const [activeCategory, setActiveCategory] =
    useState<WidgetCategoryFilter>("all");
  const [widgets, setWidgets] = useState<WidgetWithPreview[]>(seedWidgets);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<WidgetItem | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<WidgetCategoryFilter, number> = {
      all: widgets.length,
      favorites: widgets.filter((widget) => widget.isFavorite).length,
      hero: widgets.filter((widget) => widget.category === "hero").length,
      grid: widgets.filter((widget) => widget.category === "grid").length,
      forms: widgets.filter((widget) => widget.category === "forms").length,
      media: widgets.filter((widget) => widget.category === "media").length,
    };
    return counts;
  }, [widgets]);

  const filteredWidgets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return widgets.filter((widget) => {
      const matchesQuery =
        normalized.length === 0 ||
        widget.name.toLowerCase().includes(normalized) ||
        widget.categoryLabel.toLowerCase().includes(normalized);

      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "favorites"
          ? widget.isFavorite
          : widget.category === activeCategory);

      return matchesQuery && matchesCategory;
    });
  }, [widgets, query, activeCategory]);

  const handleFavoriteToggle = (id: string) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === id
          ? { ...widget, isFavorite: !widget.isFavorite }
          : widget
      )
    );
  };

  const handleSelectWidget = (widget: WidgetItem) => {
    setSelectedWidget(widget);
    setDetailsOpen(true);
  };

  return (
    <AdminShell
      activeHref="/admin/widgets"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Widgets</span>
          <span>/</span>
          <span className="text-foreground">Library</span>
        </div>
      }
      search={
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search widgets..."
            className="pl-9"
          />
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Custom Widget
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Widget Library"
          description="Select and insert widgets to your content pages."
          actions={
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{filteredWidgets.length} widgets</Badge>
              <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
                <Button
                  variant={view === "grid" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setView("grid")}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "list" ? "secondary" : "ghost"}
                  size="icon-sm"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card className="h-fit border-border/60 py-0 shadow-sm">
            <CardContent className="space-y-4 px-4 pb-4 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Categories
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {categoryCounts.all}
                </Badge>
              </div>
              <Separator />
              <ScrollArea className="h-[420px] pr-2">
                <div className="space-y-2">
                  {[...primaryCategories, ...secondaryCategories].map(
                    (category, index) => {
                      const isActive = activeCategory === category.id;
                      const count = categoryCounts[category.id] ?? 0;
                      const isDivider =
                        index === primaryCategories.length - 1 &&
                        secondaryCategories.length > 0;

                      return (
                        <div key={category.id}>
                          <button
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition",
                              isActive
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-primary"
                            )}
                          >
                            <category.icon className="h-4 w-4" />
                            <span>{category.label}</span>
                            <Badge
                              variant="outline"
                              className="ml-auto text-[10px]"
                            >
                              {count}
                            </Badge>
                          </button>
                          {isDivider ? <Separator className="my-3" /> : null}
                        </div>
                      );
                    }
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div
              className={cn(
                "grid gap-6",
                view === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1"
              )}
            >
              {filteredWidgets.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                  No widgets match your search.
                </div>
              ) : (
                filteredWidgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    name={widget.name}
                    categoryLabel={widget.categoryLabel}
                    preview={renderPreview(widget.preview)}
                    badge={widget.badge}
                    isFavorite={widget.isFavorite}
                    onFavoriteToggle={() => handleFavoriteToggle(widget.id)}
                    onSelect={() =>
                      handleSelectWidget({
                        id: widget.id,
                        name: widget.name,
                        category: widget.category,
                        categoryLabel: widget.categoryLabel,
                        badge: widget.badge,
                        isFavorite: widget.isFavorite,
                      })
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <WidgetDetailsDrawer
        widget={selectedWidget}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <WidgetCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AdminShell>
  );
}
