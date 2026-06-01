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

import type { RoleSummary } from "../roles/types";

const advancedFiltersUnavailableReason =
  "Advanced user filters are not wired yet. Use search, role, and status filters for now.";
const defaultRoleFilterUnavailableReason = "Role filtering requires roles:read permission.";

export type UserFiltersProps = {
  query: string;
  roleFilter: string;
  statusFilter: string;
  roles: RoleSummary[];
  canReadRoles?: boolean;
  roleFilterUnavailableReason?: string;
  onQueryChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function UserFilters({
  query,
  roleFilter,
  statusFilter,
  roles,
  canReadRoles = true,
  roleFilterUnavailableReason = defaultRoleFilterUnavailableReason,
  onQueryChange,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          className="pl-9"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canReadRoles ? (
          <Select value={roleFilter} onValueChange={onRoleChange}>
            <SelectTrigger className="h-8 w-[160px]">
              <ShieldCheck className="h-3 w-3 text-muted-foreground" />
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span
            className="rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
            title={roleFilterUnavailableReason}
          >
            Role filter unavailable
          </span>
        )}
        <Select value={statusFilter} onValueChange={onStatusChange}>
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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled
          aria-label="Advanced user filters unavailable"
          title={advancedFiltersUnavailableReason}
          data-no-op-control="users-advanced-filters"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
