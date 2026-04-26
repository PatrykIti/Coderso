import { Columns2, LayoutGrid, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingTemplateLayout } from "@/services/listingsClient";

import { listingLayoutOptions } from "./defaults";

export type ListingTemplateLayoutFilter = "all" | ListingTemplateLayout;

type ListingTemplateFiltersProps = {
  search: string;
  layout: ListingTemplateLayoutFilter;
  onSearchChange: (value: string) => void;
  onLayoutChange: (value: ListingTemplateLayoutFilter) => void;
};

export function ListingTemplateFilters({
  search,
  layout,
  onSearchChange,
  onLayoutChange,
}: ListingTemplateFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search templates by name..."
          aria-label="Search listing templates by name, slug, or description"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={layout}
          onValueChange={(value) =>
            onLayoutChange(value as ListingTemplateLayoutFilter)
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-[170px]">
            <LayoutGrid className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Layout" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Layout: All</SelectItem>
            {listingLayoutOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
