import { Lock, Mail, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import type { RoleSummary } from "../roles/types";
import type { UserSummary } from "./types";

export type UserDetailsDrawerProps = {
  user?: UserSummary | null;
  roles: RoleSummary[];
  canManageUsers?: boolean;
  onEditUser: () => void;
  onResetPassword: () => void;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getPermissionSummary = (user: UserSummary, roles: RoleSummary[]) => {
  const roleMap = new Map(roles.map((role) => [role.id, role]));
  const permissions = new Set<string>();
  let hasFullAccess = false;

  user.roleIds.forEach((roleId) => {
    const role = roleMap.get(roleId);
    if (!role) return;
    if (role.permissions.includes("*")) {
      hasFullAccess = true;
      return;
    }
    role.permissions.forEach((permission) => permissions.add(permission));
  });

  return {
    hasFullAccess,
    count: hasFullAccess ? "Full access" : `${permissions.size} permissions`,
    items: hasFullAccess
      ? ["All admin capabilities"]
      : Array.from(permissions).slice(0, 3),
  };
};

export function UserDetailsDrawer({
  user,
  roles,
  canManageUsers = true,
  onEditUser,
  onResetPassword,
}: UserDetailsDrawerProps) {
  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="text-base font-medium text-foreground">No user selected</p>
        <p className="mt-1">Select a user to review permissions and activity.</p>
      </div>
    );
  }

  const roleMap = new Map(roles.map((role) => [role.id, role.name]));
  const roleNames = user.roleIds.map((roleId) => roleMap.get(roleId) ?? roleId);
  const permissionSummary = getPermissionSummary(user, roles);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {roleNames[0] ?? "User"}
        </Badge>
      </div>
      <Separator className="my-4" />
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Last active
            </p>
            <p className="mt-1 text-sm font-medium">{user.lastActive}</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Permissions summary
            </div>
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                {permissionSummary.count}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {permissionSummary.items.map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email notifications
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Weekly summary</p>
                <p className="text-xs text-muted-foreground">
                  Digest of changes and alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Security alerts</p>
                <p className="text-xs text-muted-foreground">
                  Login + permission changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Account controls
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Two-factor authentication {user.mfaEnabled ? "enabled" : "disabled"}.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
      <Separator className="my-4" />
      <div className="space-y-2">
        <Button className="w-full" onClick={onEditUser} disabled={!canManageUsers}>
          Edit permissions
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onResetPassword}
          disabled={!canManageUsers}
        >
          Reset password
        </Button>
      </div>
    </div>
  );
}
