import { MoreHorizontal, ShieldCheck } from "lucide-react";

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
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { cn } from "@/lib/utils";

import type { RoleSummary } from "../roles/types";
import type { UserSummary } from "./types";

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
  canEditUsers?: boolean;
  canManageUserLifecycle?: boolean;
  canResetPassword?: boolean;
  roleDetailsUnavailableReason?: string;
  resetPasswordUnavailableReason?: string;
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
  canEditUsers,
  canManageUserLifecycle,
  canResetPassword,
  roleDetailsUnavailableReason,
  resetPasswordUnavailableReason,
  onSelect,
  onViewProfile,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
}: UserListProps) {
  const roleMap = new Map(roles.map((role) => [role.id, role.name]));
  const canEdit = canEditUsers ?? canManageUsers;
  const canManageLifecycle = canManageUserLifecycle ?? canManageUsers;
  const canReset = canResetPassword ?? canManageUsers;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>2FA</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((user) => {
            const isSelected = selectedId === user.id;
            const isProtected = protectedIds.includes(user.id);
            const roleNames = roleDetailsUnavailableReason
              ? []
              : user.roleIds.map((roleId) => roleMap.get(roleId) ?? roleId);
            const overflowRoles = Math.max(roleNames.length - 2, 0);

            return (
              <TableRow
                key={user.id}
                onClick={() => onSelect(user.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected && "border-l-4 border-l-primary bg-primary/5",
                  !isSelected && "hover:bg-muted/40"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {roleNames.slice(0, 2).map((roleName) => (
                      <Badge key={roleName} variant="soft">
                        {roleName}
                      </Badge>
                    ))}
                    {overflowRoles > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        +{overflowRoles}
                      </Badge>
                    ) : null}
                    {roleDetailsUnavailableReason && user.roleIds.length > 0 ? (
                      <Badge
                        variant="outline"
                        className="border-dashed text-xs"
                        title={roleDetailsUnavailableReason}
                      >
                        Role details unavailable
                      </Badge>
                    ) : null}
                    {isProtected ? (
                      <Badge variant="warning" className="text-xs">
                        Last admin
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  {user.mfaEnabled ? (
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck className="size-3" /> Enabled
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Off</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{user.lastActive}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => (onViewProfile ? onViewProfile(user) : onSelect(user.id))}
                      >
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={!canEdit} onClick={() => onEdit(user)}>
                        Edit user
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canReset || Boolean(resetPasswordUnavailableReason)}
                        title={resetPasswordUnavailableReason}
                        data-no-op-control={
                          resetPasswordUnavailableReason ? "users-reset-password" : undefined
                        }
                        onClick={() => onResetPassword(user)}
                      >
                        Reset password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canManageLifecycle}
                        onClick={() => onToggleStatus(user)}
                      >
                        {user.status === "inactive" ? "Activate user" : "Deactivate user"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={!canManageLifecycle || isProtected}
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
