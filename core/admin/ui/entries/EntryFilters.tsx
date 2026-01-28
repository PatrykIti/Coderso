import { Filter, Layers, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EntryFilters() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Filters:
        </span>
        <Select defaultValue="blog-posts">
          <SelectTrigger className="h-8 w-[160px]">
            <Layers className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blog-posts">Blog Posts</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="authors">Authors</SelectItem>
            <SelectItem value="categories">Categories</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-status">
          <SelectTrigger className="h-8 w-[150px]">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-status">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="any-author">
          <SelectTrigger className="h-8 w-[160px]">
            <User className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Author" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any-author">All Authors</SelectItem>
            <SelectItem value="sarah">Sarah Jenks</SelectItem>
            <SelectItem value="michael">Michael Chen</SelectItem>
            <SelectItem value="admin">Admin User</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="sm" className="self-start lg:self-auto">
        Clear All
      </Button>
    </div>
  );
}
