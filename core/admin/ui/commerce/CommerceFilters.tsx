import { Boxes, Filter, PackageCheck, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  CommerceCollectionFilter,
  CommerceStatusFilter,
  CommerceStockFilter,
} from "./CommerceListPage";

type CommerceCollectionOption = {
  value: string;
  label: string;
};

type CommerceFiltersProps = {
  search: string;
  status: CommerceStatusFilter;
  collection: CommerceCollectionFilter;
  stock: CommerceStockFilter;
  collectionOptions: CommerceCollectionOption[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CommerceStatusFilter) => void;
  onCollectionChange: (value: CommerceCollectionFilter) => void;
  onStockChange: (value: CommerceStockFilter) => void;
};

export function CommerceFilters({
  search,
  status,
  collection,
  stock,
  collectionOptions,
  onSearchChange,
  onStatusChange,
  onCollectionChange,
  onStockChange,
}: CommerceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-card lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products by title, slug, or excerpt..."
          aria-label="Search products by title, slug, or excerpt"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as CommerceStatusFilter)}
        >
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
        <Select
          value={collection}
          onValueChange={(value) => onCollectionChange(value as CommerceCollectionFilter)}
        >
          <SelectTrigger className="h-8 w-full sm:w-[180px]">
            <Boxes className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Collection: All</SelectItem>
            {collectionOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stock}
          onValueChange={(value) => onStockChange(value as CommerceStockFilter)}
        >
          <SelectTrigger className="h-8 w-full sm:w-[160px]">
            <PackageCheck className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Stock: All</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
            <SelectItem value="backorder">Backorder</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
