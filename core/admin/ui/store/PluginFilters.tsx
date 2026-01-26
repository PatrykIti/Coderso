import { ShieldCheck, Sparkles, Star, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const filters = [
  { label: "All plugins", icon: Sparkles, active: true },
  { label: "Popular", icon: Star },
  { label: "New", icon: Sparkles },
  { label: "Security verified", icon: ShieldCheck },
];

export function PluginFilters() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search plugins by name, tag, or ID..."
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.label}
            variant={filter.active ? "default" : "outline"}
            size="xs"
            className="gap-1.5"
          >
            <filter.icon className="h-3 w-3" />
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
