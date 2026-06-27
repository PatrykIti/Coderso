import { Blocks, LayoutGrid, Link2, PanelLeft, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

const SCREENS = [
  { id: "project-catalog", name: "Projects", status: "active", published: true, blocks: 15, bindings: 6, tone: "bg-success-soft text-success" },
  { id: "clients", name: "Clients", status: "active", published: true, blocks: 11, bindings: 5, tone: "bg-info-soft text-info" },
  { id: "support-tickets", name: "Support tickets", status: "active", published: false, blocks: 12, bindings: 4, tone: "bg-primary-soft text-primary-soft-foreground" },
  { id: "inventory", name: "Inventory", status: "draft", published: false, blocks: 9, bindings: 3, tone: "bg-warning-soft text-warning" },
  { id: "leads", name: "Leads", status: "draft", published: false, blocks: 7, bindings: 2, tone: "bg-primary-soft text-primary-soft-foreground" },
  { id: "events", name: "Events calendar", status: "draft", published: false, blocks: 6, bindings: 2, tone: "bg-info-soft text-info" },
];

export function CustomScreensPage() {
  return (
    <div>
      <PageHeader
        title="Screens"
        description="Build bespoke admin surfaces from blocks bound to your data, then publish them to the sidebar."
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
            key={screen.id}
            className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-start justify-between">
              <span className={`flex size-12 items-center justify-center rounded-xl ${screen.tone}`}>
                <LayoutGrid className="size-6" />
              </span>
              <StatusBadge status={screen.status} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="font-display text-[15px] font-semibold">{screen.name}</span>
              {screen.published ? (
                <Badge variant="success" className="gap-1">
                  <PanelLeft className="size-3" /> In sidebar
                </Badge>
              ) : null}
            </div>
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
              <Link to={`/advanced/custom-screens/${screen.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  Edit
                </Button>
              </Link>
              <Link to={`/advanced/custom-screens/${screen.id}/entries`} className="flex-1">
                <Button variant="soft" size="sm" className="w-full">
                  {screen.published ? "Open" : "Entries"}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
