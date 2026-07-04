import { List, PenLine, Plus, Workflow } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";

const MENUS = [
  { name: "Header navigation", location: "Header", items: 7, updated: "Updated Jun 27, 2026" },
  { name: "Footer", location: "Footer", items: 12, updated: "Updated Jun 18, 2026" },
  { name: "Mobile", location: "Mobile", items: 6, updated: "Updated Jun 09, 2026" },
  { name: "Legal", location: "Footer", items: 4, updated: "Updated May 30, 2026" },
];

export function MenuListPage() {
  return (
    <div>
      <PageHeader
        title="Menus"
        description="Build and organize the navigation menus across your site."
        actions={
          <Link to="/menus/sample">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New menu
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {MENUS.map((menu) => (
          <Card key={menu.name} className="flex flex-col p-5 transition-all hover:shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <List className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-display text-[15px] font-semibold">{menu.name}</div>
                  <div className="text-xs text-muted-foreground">{menu.updated}</div>
                </div>
              </div>
              <Badge variant="soft">{menu.location}</Badge>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Workflow className="size-4" />
              {menu.items} items
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Link to="/menus/sample" className="flex-1">
                <Button variant="soft" size="sm" className="w-full gap-1.5">
                  <PenLine className="size-4" /> Edit
                </Button>
              </Link>
              <Link to="/menus/sample/design" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5">
                  <Workflow className="size-4" /> Design
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
