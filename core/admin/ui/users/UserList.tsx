import { MoreHorizontal } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { RoleSummary } from "../roles/types";
import type { UserStatus, UserSummary } from "./types";

const statusMeta: Record<
  UserStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "Active",
    className: "text-emerald-600",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    className: "text-slate-500",
    dot: "bg-slate-400",
  },
  pending: {
    label: "Pending",
    className: "text-amber-600",
    dot: "bg-amber-500",
  },
};

const roleBadgeClasses: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  editor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  viewer: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  api: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

const fallbackRoleClass = "bg-muted text-muted-foreground border-border";

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export type UserListProps = {
  items: UserSummary[];
  roles: RoleSummary[];
  selectedId?: string;
  protectedIds?: string[];
  canManageUsers?: boolean;
  onSelect: (id: string) => void;
  onViewProfile?: (user: UserSummary) => void;
  onEdit: (user: UserSummary) => void;
  onToggleStatus: (user: UserSummary) => void;
  onResetPassword: (user: UserSummary) => void;
  onDelete: (user: UserSummary) => void;
};

export function UserList({
  items,
  roles,
  selectedId,
  protectedIds = [],
  canManageUsers = true,
  onSelect,
  onViewProfile,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
}: UserListProps) {
  const roleMap = new Map(roles.map((role) => [role.id, role.name]));

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((user) => {
            const status = statusMeta[user.status];
            const isSelected = selectedId === user.id;
            const isProtected = protectedIds.includes(user.id);
            const roleNames = user.roleIds.map(
              (roleId) => roleMap.get(roleId) ?? roleId
            );
            const overflowRoles = Math.max(roleNames.length - 2, 0);

            return (
              <TableRow
                key={user.id}
                onClick={() => onSelect(user.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected &&
                    "border-l-4 border-l-primary bg-primary/5",
                  !isSelected && "hover:bg-muted/30"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    {roleNames.slice(0, 2).map((roleName, index) => {
                      const roleId = user.roleIds[index] ?? roleName;
                      return (
                        <Badge
                          key={roleName}
                          variant="outline"
                          className={
                            roleBadgeClasses[roleId] ?? fallbackRoleClass
                          }
                        >
                          {roleName}
                        </Badge>
                      );
                    })}
                    {overflowRoles > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        +{overflowRoles}
                      </Badge>
                    ) : null}
                    {isProtected ? (
                      <Badge
                        variant="secondary"
                        className="text-xs text-amber-700"
                      >
                        Last admin
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                    <span className={cn("text-sm", status.className)}>
                      {status.label}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastActive}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => (onViewProfile ? onViewProfile(user) : onSelect(user.id))}
                      >
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canManageUsers}
                        onClick={() => onEdit(user)}
                      >
                        Edit user
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canManageUsers}
                        onClick={() => onResetPassword(user)}
                      >
                        Reset password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canManageUsers}
                        onClick={() => onToggleStatus(user)}
                      >
                        {user.status === "inactive"
                          ? "Activate user"
                          : "Deactivate user"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canManageUsers || isProtected}
                        onClick={() => onDelete(user)}
                      >
                        Delete user
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
