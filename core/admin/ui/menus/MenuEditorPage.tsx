import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { MenuItemDrawer } from "@/ui/menus/MenuItemDrawer";
import { MenuTree } from "@/ui/menus/MenuTree";
import type { MenuItemNode } from "@/ui/menus/types";

const sampleItems: MenuItemNode[] = [
  {
    id: "home",
    label: "Home",
    href: "/home",
  },
  {
    id: "products",
    label: "Products",
    href: "/products",
    children: [
      {
        id: "electronics",
        label: "Electronics",
        href: "/electronics",
      },
      {
        id: "clothing",
        label: "Clothing",
        href: "",
        status: "error",
      },
    ],
  },
  {
    id: "about",
    label: "About Us",
    href: "/about",
  },
];

export function MenuEditorPage() {
  return (
    <SplitShell
      activeHref="/admin/menus"
      rightPanel={<MenuItemDrawer />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          <span>/</span>
          <span>Menus</span>
          <span>/</span>
          <span className="text-foreground">Main Menu</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost">Discard</Button>
          <Button>Save Changes</Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <PageHeader
          title="Main Menu Structure"
          description="Drag and drop items to reorder your site navigation hierarchy."
        />
        <Card className="border-border/60">
          <CardContent className="space-y-4">
            <MenuTree items={sampleItems} activeId="clothing" />
            <Button variant="outline" className="w-full gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Menu Item
            </Button>
          </CardContent>
        </Card>
      </div>
    </SplitShell>
  );
}
