import { Grid2X2, List, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MediaToolbar() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            All Files
          </Button>
          <Button variant="ghost" size="sm">
            Images
          </Button>
          <Button variant="ghost" size="sm">
            Documents
          </Button>
          <Button variant="ghost" size="sm">
            Audio
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon">
          <Grid2X2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
