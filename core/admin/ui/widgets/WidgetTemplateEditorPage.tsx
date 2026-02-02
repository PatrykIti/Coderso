import { useMemo, useState } from "react";
import {
  ChevronRight,
  History,
  LayoutGrid,
  Palette,
  Search,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { listRegisteredWidgets } from "@/ui/widgets/registry";

const categoryLabels = {
  layout: "Layout",
  content: "Content",
  forms: "Forms",
  navigation: "Navigation",
  media: "Media",
} as const;

type TemplateTab = "wizard" | "visual" | "advanced";

export function WidgetTemplateEditorPage() {
  const widgets = useMemo(() => listRegisteredWidgets(), []);
  const [activeTab, setActiveTab] = useState<TemplateTab>("wizard");

  return (
    <AdminShell
      activeHref="/admin/widgets"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Widgets</span>
          <ChevronRight className="h-4 w-4" />
          <span>Templates</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">New Template</span>
          <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
            Draft
          </Badge>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Preview
          </Button>
          <Button variant="ghost" size="sm">
            Discard
          </Button>
          <Button size="sm">Save Template</Button>
        </div>
      }
      contentClassName="p-0 overflow-hidden"
    >
      <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col">
        <div className="border-b bg-card px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-[220px] flex-1 flex-col gap-2">
              <Input
                className="text-lg font-semibold"
                defaultValue="New Marketing Template"
                placeholder="Template name"
              />
              <Textarea
                className="min-h-[0px] resize-none text-xs"
                defaultValue="Standard layout for conversion landing pages"
                placeholder="Add description..."
              />
            </div>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <aside className="hidden w-72 flex-col border-r bg-card lg:flex">
            <div className="border-b p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 text-xs" placeholder="Search widgets..." />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Categories
                </p>
                <div className="space-y-2">
                  {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(
                    (category) => (
                      <button
                        key={category}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        {categoryLabels[category]}
                      </button>
                    )
                  )}
                </div>
                <div className="mt-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Draggable items
                  </p>
                  <div className="space-y-3">
                    {widgets.slice(0, 6).map((widget) => (
                      <div
                        key={widget.type}
                        className="rounded-xl border border-border/60 bg-muted/20 p-3"
                      >
                        <div className="mb-3 aspect-video rounded-lg border border-border/60 bg-muted/30" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            {widget.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Drag</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </aside>

          <main
            className={cn(
              "flex-1 overflow-auto p-10",
              "bg-[radial-gradient(circle,var(--admin-base-border)_1px,transparent_1px)]",
              "bg-[size:24px_24px]"
            )}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border/60 bg-background/40 px-10 py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 text-primary">
                <Settings2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Build your template
              </h2>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                Drag widgets from the library to build a reusable template layout.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="rounded-full border border-border/60 px-3 py-1">Section 1</span>
                <span className="rounded-full border border-primary/30 px-3 py-1 text-primary">
                  Drop target
                </span>
              </div>
            </div>
          </main>

          <aside className="hidden w-80 flex-col border-l bg-card lg:flex">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TemplateTab)}
              className="flex h-full flex-col"
            >
              <TabsList variant="line" className="w-full justify-between border-b px-4">
                <TabsTrigger value="wizard" className="flex-1 justify-center text-xs">
                  Wizard
                </TabsTrigger>
                <TabsTrigger value="visual" className="flex-1 justify-center text-xs">
                  Visual
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="flex-1 justify-center text-xs"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab} className="flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-8 p-6">
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">Layout</h3>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {["Stacked", "Parallel"].map((label, index) => (
                          <button
                            key={label}
                            type="button"
                            className={cn(
                              "rounded-xl border px-3 py-2 text-xs",
                              index === 0
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 text-muted-foreground"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">Spacing</h3>
                      <div className="mt-4 space-y-4 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Global padding</span>
                          <span>48px</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted" />
                        <div className="flex items-center justify-between">
                          <span>Section gap</span>
                          <span>24px</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">Colors</h3>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {["bg-primary", "bg-indigo-500", "bg-rose-500", "bg-amber-500"].map(
                          (color) => (
                            <div
                              key={color}
                              className={cn(
                                "h-8 w-8 rounded-lg border border-border/60",
                                color
                              )}
                            />
                          )
                        )}
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground">
                          <Palette className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              <div className="border-t bg-muted/20 p-4">
                <Button variant="secondary" className="w-full gap-2">
                  <History className="h-4 w-4" />
                  Revision History
                </Button>
              </div>
            </Tabs>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
