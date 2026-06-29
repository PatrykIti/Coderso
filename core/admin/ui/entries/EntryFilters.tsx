import { CalendarDays, Filter, Layers, Search, SlidersHorizontal, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EntryFilterOption = {
  value: string;
  label: string;
};

type EntryFiltersProps = {
  search: string;
  status: string;
  typeValue: string;
  typeOptions: EntryFilterOption[];
  author: string;
  authorOptions: EntryFilterOption[];
  updatedFrom: string;
  updatedTo: string;
  advancedOpen: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onUpdatedFromChange: (value: string) => void;
  onUpdatedToChange: (value: string) => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onClear: () => void;
};

export function EntryFilters({
  search,
  status,
  typeValue,
  typeOptions,
  author,
  authorOptions,
  updatedFrom,
  updatedTo,
  advancedOpen,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onAuthorChange,
  onUpdatedFromChange,
  onUpdatedToChange,
  onAdvancedOpenChange,
  onClear,
}: EntryFiltersProps) {
  return (
    <Collapsible
      open={advancedOpen}
      onOpenChange={onAdvancedOpenChange}
      className="rounded-2xl border border-border bg-card p-3 shadow-soft"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search entries by title or slug..."
              aria-label="Search entries by title or slug"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 w-full sm:w-[150px]">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeValue} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 w-full sm:w-[180px]">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Content type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" aria-expanded={advancedOpen} className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </CollapsibleTrigger>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
      <CollapsibleContent className="pt-3">
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select value={author} onValueChange={onAuthorChange}>
            <SelectTrigger className="h-8 w-full">
              <User className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Author: All</SelectItem>
              {authorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={updatedFrom}
              onChange={(event) => onUpdatedFromChange(event.target.value)}
              aria-label="Updated from"
              className="h-8 pl-8"
            />
          </div>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={updatedTo}
              onChange={(event) => onUpdatedToChange(event.target.value)}
              aria-label="Updated to"
              className="h-8 pl-8"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
