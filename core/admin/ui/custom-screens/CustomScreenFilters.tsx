import { Columns2, Filter, Layers3, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  CustomScreenContentTypeFilterOption,
  CustomScreenFilterStatus,
} from "./customScreenListModel";

type CustomScreenFiltersProps = {
  search: string;
  status: CustomScreenFilterStatus;
  contentTypeId: string;
  contentTypeOptions: CustomScreenContentTypeFilterOption[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CustomScreenFilterStatus) => void;
  onContentTypeChange: (value: string) => void;
};

export function CustomScreenFilters({
  search,
  status,
  contentTypeId,
  contentTypeOptions,
  onSearchChange,
  onStatusChange,
  onContentTypeChange,
}: CustomScreenFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search custom screens..."
          aria-label="Search custom screens"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) =>
            onStatusChange(value as CustomScreenFilterStatus)
          }
        >
          <SelectTrigger className="h-8 w-full sm:w-[140px]">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={contentTypeId} onValueChange={onContentTypeChange}>
          <SelectTrigger className="h-8 w-full sm:w-[190px]">
            <Layers3 className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Content type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Content type: All</SelectItem>
            {contentTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Custom screen columns"
        >
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
