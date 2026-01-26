import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MenuItemForm } from "@/ui/menus/MenuItemForm";

export function MenuItemDrawer() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Edit Menu Item</h3>
        <Button variant="ghost" size="icon">
          ×
        </Button>
      </div>
      <Separator className="my-4" />
      <div className="flex-1 overflow-y-auto pr-1">
        <MenuItemForm />
      </div>
      <Separator className="my-4" />
      <div className="space-y-3">
        <Button className="w-full">Update Item</Button>
        <Button variant="ghost" className="w-full text-rose-600">
          Delete Item
        </Button>
      </div>
    </div>
  );
}
