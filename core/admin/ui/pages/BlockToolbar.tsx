import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BlockToolbar() {
  const buttonClass = "rounded-none text-primary-foreground hover:bg-primary/20";

  return (
    <div className="flex items-center overflow-hidden rounded-md bg-primary text-primary-foreground shadow-sm">
      <Button size="icon-xs" className={buttonClass} variant="ghost">
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button size="icon-xs" className={buttonClass} variant="ghost">
        <ArrowDown className="h-3 w-3" />
      </Button>
      <Button size="icon-xs" className={buttonClass} variant="ghost">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
