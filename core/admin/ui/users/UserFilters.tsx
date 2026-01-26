import { Filter, Search, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserFilters() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select defaultValue="all">
          <SelectTrigger className="h-8 w-[160px]">
            <ShieldCheck className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="api">API Access</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="any">
          <SelectTrigger className="h-8 w-[150px]">
            <User className="h-3 w-3 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
