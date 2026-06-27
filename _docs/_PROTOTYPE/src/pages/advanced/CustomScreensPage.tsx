import { Blocks, LayoutGrid, Link2, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

const SCREENS = [
  { name: "Support tickets", status: "active", blocks: 12, bindings: 4, tone: "bg-primary-soft text-primary-soft-foreground" },
  { name: "Inventory", status: "active", blocks: 9, bindings: 3, tone: "bg-info-soft text-info" },
  { name: "Leads", status: "draft", blocks: 7, bindings: 2, tone: "bg-warning-soft text-warning" },
  { name: "Projects", status: "active", blocks: 15, bindings: 6, tone: "bg-success-soft text-success" },
  { name: "Events calendar", status: "draft", blocks: 6, bindings: 2, tone: "bg-primary-soft text-primary-soft-foreground" },
  { name: "Team directory", status: "active", blocks: 8, bindings: 3, tone: "bg-info-soft text-info" },
];

export function CustomScreensPage() {
  return (
    <div>
      <PageHeader
        title="Screens"
        description="Build bespoke admin surfaces from blocks bound to your data."
        icon={<LayoutGrid />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Link to="/advanced/custom-screens/sample">
              <Button className="gap-1.5">
                <Plus className="size-4" /> New screen
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCREENS.map((screen) => (
          <Card
            key={screen.name}
            className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-start justify-between">
              <span className={`flex size-12 items-center justify-center rounded-xl ${screen.tone}`}>
                <LayoutGrid className="size-6" />
              </span>
              <StatusBadge status={screen.status} />
            </div>
            <div className="mt-4 font-display text-[15px] font-semibold">{screen.name}</div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Blocks className="size-3.5" /> {screen.blocks} blocks
              </span>
              <span className="flex items-center gap-1.5">
                <Link2 className="size-3.5" /> {screen.bindings} bindings
              </span>
            </div>
            <Separator className="my-4" />
            <div className="mt-auto flex items-center gap-2">
              <Link to="/advanced/custom-screens/sample" className="flex-1">
                <Button variant="soft" size="sm" className="w-full">
                  Open
                </Button>
              </Link>
              <Link to="/advanced/custom-screens/sample/entries" className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Entries
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
