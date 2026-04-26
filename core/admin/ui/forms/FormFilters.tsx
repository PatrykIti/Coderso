import { Columns2, Filter, Search, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FormStatus } from "@/services/formsClient";

export type FormStatusFilter = FormStatus | "all";
export type FormAccessFilter = "all" | "public" | "internal";

type FormFiltersProps = {
  search: string;
  status: FormStatusFilter;
  access: FormAccessFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: FormStatusFilter) => void;
  onAccessChange: (value: FormAccessFilter) => void;
};

export function FormFilters({
  search,
  status,
  access,
  onSearchChange,
  onStatusChange,
  onAccessChange,
}: FormFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search forms by name, slug, or description..."
          aria-label="Search forms by name, slug, or description"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(value) => onStatusChange(value as FormStatusFilter)}>
          <SelectTrigger className="h-8 w-full sm:w-[150px]">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status: All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={access} onValueChange={(value) => onAccessChange(value as FormAccessFilter)}>
          <SelectTrigger className="h-8 w-full sm:w-[150px]">
            <ShieldCheck className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Access: All</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
