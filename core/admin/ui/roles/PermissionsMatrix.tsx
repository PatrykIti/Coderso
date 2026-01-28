import { Fragment } from "react";

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

type RoleId = "admin" | "editor" | "viewer" | "contributor";

type Role = {
  id: RoleId;
  label: string;
};

type PermissionItem = {
  id: string;
  label: string;
  description: string;
  allowed: RoleId[];
};

type PermissionGroup = {
  id: string;
  label: string;
  permissions: PermissionItem[];
};

const roles: Role[] = [
  { id: "admin", label: "Admin" },
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
  { id: "contributor", label: "Contributor" },
];

const permissionGroups: PermissionGroup[] = [
  {
    id: "content",
    label: "Content Management",
    permissions: [
      {
        id: "pages:create",
        label: "Create Pages",
        description: "Ability to create new page entries",
        allowed: ["admin", "editor"],
      },
      {
        id: "content:edit",
        label: "Edit Published Content",
        description: "Modify entries that are already live",
        allowed: ["admin", "editor"],
      },
      {
        id: "content:delete",
        label: "Delete Content",
        description: "Permanently remove content items",
        allowed: ["admin"],
      },
    ],
  },
  {
    id: "media",
    label: "Media Library",
    permissions: [
      {
        id: "media:upload",
        label: "Upload Assets",
        description: "Upload images, videos and documents",
        allowed: ["admin", "editor", "contributor"],
      },
      {
        id: "media:delete",
        label: "Delete Assets",
        description: "Remove files from media library",
        allowed: ["admin"],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    permissions: [
      {
        id: "users:invite",
        label: "Invite Users",
        description: "Send invitations to new team members",
        allowed: ["admin"],
      },
      {
        id: "billing:manage",
        label: "Manage Billing",
        description: "Update payment methods and view invoices",
        allowed: ["admin"],
      },
      {
        id: "api:configure",
        label: "Configure API",
        description: "Generate and revoke API keys",
        allowed: ["admin"],
      },
    ],
  },
];

const permissionCount = permissionGroups.reduce(
  (total, group) => total + group.permissions.length,
  0
);

export function PermissionsMatrix() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Bulk toggles</p>
            <p className="text-xs text-muted-foreground">
              Apply access across an entire role column in one click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {roles.length} roles
            </Badge>
            <Badge variant="outline" className="text-xs">
              {permissionCount} permissions
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <Checkbox
                defaultChecked={role.id === "admin"}
                aria-label={`Toggle all ${role.label} permissions`}
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>
      </div>
      <Separator />
      <ScrollArea className="max-h-[520px]">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b">
              <TableHead className="min-w-[260px] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permission Name
              </TableHead>
              {roles.map((role) => (
                <TableHead
                  key={role.id}
                  className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {role.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionGroups.map((group) => (
              <Fragment key={group.id}>
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={roles.length + 1}
                    className="px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70"
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.permissions.map((permission) => (
                  <TableRow key={permission.id} className="border-b">
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {permission.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {permission.description}
                        </span>
                      </div>
                    </TableCell>
                    {roles.map((role) => {
                      const isChecked = permission.allowed.includes(role.id);
                      return (
                        <TableCell
                          key={`${permission.id}-${role.id}`}
                          className="px-6 py-4 text-center"
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              defaultChecked={isChecked}
                              aria-label={`${permission.label} for ${role.label}`}
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
