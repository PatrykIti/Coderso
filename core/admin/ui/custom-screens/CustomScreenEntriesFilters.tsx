import { Filter, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CustomScreenEntriesFilterOption } from "./customScreenListModel";

type CustomScreenEntriesFiltersProps = {
  query: string;
  filters: Record<string, string>;
  filterOptions: CustomScreenEntriesFilterOption[];
  onQueryChange: (value: string) => void;
  onFilterChange: (id: string, value: string) => void;
};

export function CustomScreenEntriesFilters({
  query,
  filters,
  filterOptions,
  onQueryChange,
  onFilterChange,
}: CustomScreenEntriesFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search records..."
          aria-label="Search records"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <Select
            key={filter.id}
            value={filters[filter.id] ?? "all"}
            onValueChange={(value) => onFilterChange(filter.id, value)}
          >
            <SelectTrigger className="h-8 w-full sm:w-[180px]">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`${filter.label}: All`}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={`${filter.id}:${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>
    </div>
  );
}
