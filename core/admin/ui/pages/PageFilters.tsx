import { Columns2, Filter, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuthorOption = {
  value: string;
  label: string;
};

type PageFiltersProps = {
  search: string;
  status: string;
  author: string;
  authorOptions: AuthorOption[];
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
};

export function PageFilters({
  search,
  status,
  author,
  authorOptions,
  searchPlaceholder = "Search pages by title...",
  searchAriaLabel = "Search pages by title",
  onSearchChange,
  onStatusChange,
  onAuthorChange,
}: PageFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-full sm:w-[140px]">
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
        <Select value={author} onValueChange={onAuthorChange}>
          <SelectTrigger className="h-8 w-full sm:w-[160px]">
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
