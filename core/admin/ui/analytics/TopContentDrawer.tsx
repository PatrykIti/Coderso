import { BarChart3, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";

type TopContentDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const rows = [
  { title: "Modern UI Trends", views: "12,402", path: "/blog/modern-ui-trends" },
  { title: "Analytics Dashboard", views: "9,821", path: "/features/analytics-dashboard" },
  { title: "Getting Started", views: "7,240", path: "/docs/getting-started" },
  { title: "Pricing", views: "5,112", path: "/pricing" },
];

export function TopContentDrawer({ open, onOpenChange }: TopContentDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Top Content</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Full ranking for the selected date range.
            </p>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close top content drawer">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 px-6 py-6">
            {rows.map((row) => (
              <div key={row.path} className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.path}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {row.views} views
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)}>Export</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
