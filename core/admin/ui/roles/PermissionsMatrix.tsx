import { Fragment, useMemo } from "react";
import { Check, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { PermissionGroup } from "@/services/adminRolesClient";

import type { RoleSummary } from "./types";
import { fallbackPermissionGroups, flattenPermissionGroups } from "./permissionCatalog";

export type RolePermissionsMap = Record<string, string[]>;

export type PermissionsMatrixProps = {
  roles?: RoleSummary[];
  permissionGroups?: PermissionGroup[];
  rolePermissions?: RolePermissionsMap;
  readOnlyReason?: string;
  onTogglePermission?: (roleId: string, permissionId: string) => void;
  onToggleRoleAll?: (roleId: string) => void;
};

export function PermissionsMatrix({
  roles = [],
  permissionGroups,
  rolePermissions = {},
  readOnlyReason,
  onTogglePermission,
  onToggleRoleAll,
}: PermissionsMatrixProps) {
  const resolvedGroups =
    permissionGroups && permissionGroups.length > 0 ? permissionGroups : fallbackPermissionGroups;
  const allPermissionIds = useMemo(() => flattenPermissionGroups(resolvedGroups), [resolvedGroups]);
  const permissionCount = resolvedGroups.reduce(
    (total, group) => total + group.permissions.length,
    0
  );
  const readOnlyReasonId = readOnlyReason ? "permissions-matrix-readonly-reason" : undefined;

  const rolePermissionSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    roles.forEach((role) => {
      map.set(role.id, new Set(rolePermissions[role.id] ?? []));
    });
    return map;
  }, [roles, rolePermissions]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {readOnlyReason ? (
        <p id={readOnlyReasonId} className="sr-only">
          {readOnlyReason}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Bulk toggles</p>
            <p className="text-xs text-muted-foreground">
              Apply access across an entire role column in one click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> Allowed
              </span>
              <span className="flex items-center gap-1.5">
                <Minus className="size-3.5 text-muted-foreground/40" /> No access
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {roles.length} roles
            </Badge>
            <Badge variant="outline" className="text-xs">
              {permissionCount} permissions
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {roles.map((role) => {
            const selected = rolePermissionSets.get(role.id) ?? new Set();
            const hasAll =
              allPermissionIds.length > 0 && allPermissionIds.every((id) => selected.has(id));

            return (
              <label
                key={role.id}
                className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                title={readOnlyReason}
              >
                <Checkbox
                  checked={hasAll}
                  aria-label={`Toggle all ${role.name} permissions`}
                  aria-describedby={readOnlyReasonId}
                  title={readOnlyReason}
                  onCheckedChange={() => onToggleRoleAll?.(role.id)}
                  disabled={Boolean(readOnlyReason) || !onToggleRoleAll}
                />
                <span>{role.name}</span>
              </label>
            );
          })}
        </div>
      </div>
      <Separator />
      <ScrollArea className="max-h-[520px]">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b">
              <TableHead className="sticky left-0 z-20 min-w-[260px] bg-muted px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permission Name
              </TableHead>
              {roles.map((role) => (
                <TableHead
                  key={role.id}
                  className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resolvedGroups.map((group) => (
              <Fragment key={group.id}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="sticky left-0 z-10 px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.permissions.map((permission) => (
                  <TableRow key={permission.id} className="border-b">
                    <TableCell className="sticky left-0 z-10 bg-card px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {permission.label}
                        </span>
                        {permission.description ? (
                          <span className="text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    {roles.map((role) => {
                      const selected = rolePermissionSets.get(role.id);
                      const isChecked = selected?.has(permission.id) ?? false;
                      return (
                        <TableCell
                          key={`${permission.id}-${role.id}`}
                          className="px-6 py-4 text-center"
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              checked={isChecked}
                              aria-label={`${permission.label} for ${role.name}`}
                              aria-describedby={readOnlyReasonId}
                              title={readOnlyReason}
                              onCheckedChange={() => onTogglePermission?.(role.id, permission.id)}
                              disabled={Boolean(readOnlyReason) || !onTogglePermission}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
