import { Columns2, Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ListingSource } from "@/services/listingsClient";

import { listingSourceOptions } from "./defaults";

export type ListingQuerySourceFilter = "all" | ListingSource;

type ListingQueryFiltersProps = {
  search: string;
  source: ListingQuerySourceFilter;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: ListingQuerySourceFilter) => void;
};

export function ListingQueryFilters({
  search,
  source,
  onSearchChange,
  onSourceChange,
}: ListingQueryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search queries by name..."
          aria-label="Search listing queries by name or description"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={source}
          onValueChange={(value) =>
            onSourceChange(value as ListingQuerySourceFilter)
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-[180px]">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Source: All</SelectItem>
            {listingSourceOptions.map((option) => (
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
