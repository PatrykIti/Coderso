import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type { RoleDraft, RoleSummary } from "./types";

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: Array<{ id: string; label: string }>; 
};

export const permissionGroups: PermissionGroup[] = [
  {
    id: "content",
    label: "Content",
    permissions: [
      { id: "content:read", label: "Read content" },
      { id: "content:write", label: "Create & edit content" },
      { id: "content:publish", label: "Publish content" },
    ],
  },
  {
    id: "media",
    label: "Media",
    permissions: [
      { id: "media:read", label: "View media" },
      { id: "media:write", label: "Upload & edit media" },
    ],
  },
  {
    id: "menus",
    label: "Menus",
    permissions: [
      { id: "menus:read", label: "View menus" },
      { id: "menus:write", label: "Edit menus" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [
      { id: "settings:read", label: "View settings" },
      { id: "settings:write", label: "Edit settings" },
    ],
  },
  {
    id: "plugins",
    label: "Plugins & Store",
    permissions: [
      { id: "plugins:read", label: "View plugins" },
      { id: "plugins:manage", label: "Manage plugins" },
      { id: "store:browse", label: "Browse store" },
    ],
  },
  {
    id: "users",
    label: "Users & Roles",
    permissions: [
      { id: "users:read", label: "View users" },
      { id: "users:write", label: "Manage users" },
      { id: "roles:read", label: "View roles" },
      { id: "roles:write", label: "Manage roles" },
    ],
  },
  {
    id: "audit",
    label: "Audit",
    permissions: [{ id: "audit:read", label: "Read audit logs" }],
  },
  {
    id: "themes",
    label: "Themes",
    permissions: [
      { id: "themes:read", label: "View themes" },
      { id: "themes:write", label: "Edit themes" },
    ],
  },
];

const emptyRole: RoleDraft = {
  name: "",
  description: "",
  permissions: [],
};

export type RoleEditorProps = {
  open: boolean;
  role?: RoleSummary | null;
  canManageRoles?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: RoleDraft, mode: "create" | "edit") => void;
};

export function RoleEditor({
  open,
  role,
  canManageRoles = true,
  onOpenChange,
  onSave,
}: RoleEditorProps) {
  const allPermissions = useMemo(
    () =>
      permissionGroups.flatMap((group) =>
        group.permissions.map((permission) => permission.id)
      ),
    []
  );

  const initialFullAccess = role?.permissions.includes("*") ?? false;
  const initialDraft: RoleDraft = role
    ? {
        name: role.name,
        description: role.description ?? "",
        permissions: initialFullAccess ? allPermissions : role.permissions,
      }
    : emptyRole;

  const [draft, setDraft] = useState<RoleDraft>(initialDraft);
  const [fullAccess, setFullAccess] = useState(initialFullAccess);

  const isValid = draft.name.trim().length > 0;
  const mode: "create" | "edit" = role ? "edit" : "create";

  const togglePermission = (permissionId: string) => {
    setDraft((prev) => {
      const exists = prev.permissions.includes(permissionId);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((id) => id !== permissionId)
          : [...prev.permissions, permissionId],
      };
    });
  };

  const handleSelectAll = () => {
    setFullAccess(true);
    setDraft((prev) => ({ ...prev, permissions: allPermissions }));
  };

  const handleClearAll = () => {
    setFullAccess(false);
    setDraft((prev) => ({ ...prev, permissions: [] }));
  };

  const handleSave = () => {
    if (!isValid || !canManageRoles) return;
    onSave(
      {
        ...draft,
        permissions: fullAccess ? ["*"] : draft.permissions,
      },
      mode
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? "Edit role" : "Create new role"}
          </DialogTitle>
          <DialogDescription>
            Define access rules for teams and automation workflows.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Role name
              </label>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Editor"
                disabled={!canManageRoles}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Description
              </label>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Short summary of responsibilities"
                rows={2}
                disabled={!canManageRoles}
              />
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Permission scope</p>
              <p className="text-xs text-muted-foreground">
                Select the capabilities this role can access.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {fullAccess ? "Full access" : `${draft.permissions.length} selected`}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={!canManageRoles}
              >
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={!canManageRoles}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {permissionGroups.map((group) => (
              <div key={group.id} className="rounded-lg border p-4">
                <p className="text-sm font-semibold">{group.label}</p>
                <div className="mt-3 space-y-2">
                  {group.permissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={draft.permissions.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                        disabled={!canManageRoles || fullAccess}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {fullAccess ? (
            <Alert>
              <AlertTitle>Full access enabled</AlertTitle>
              <AlertDescription>
                This role grants every permission. Use for admins only.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!isValid || !canManageRoles} onClick={handleSave}>
            {role ? "Save role" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
