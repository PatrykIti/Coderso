import { Filter, Layers, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onClear: () => void;
};

export function EntryFilters({
  search,
  status,
  typeValue,
  typeOptions,
  author,
  authorOptions,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onAuthorChange,
  onClear,
}: EntryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search entries..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Filters:
          </span>
          <Select value={typeValue} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 w-full sm:w-[180px]">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 w-full sm:w-[150px]">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={author} onValueChange={onAuthorChange} disabled>
            <SelectTrigger className="h-8 w-full sm:w-[160px]">
              <User className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Author" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All Authors</SelectItem>
              {authorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="self-start lg:self-auto"
        onClick={onClear}
      >
        Clear All
      </Button>
    </div>
  );
}
