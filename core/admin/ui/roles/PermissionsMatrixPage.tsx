import { Info, Plus, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isApiClientError } from "@/services/apiClient";
import {
  createAdminRole,
  listAdminRoles,
  listPermissionCatalog,
  updateAdminRole,
  type PermissionGroup,
} from "@/services/adminRolesClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import {
  PermissionsMatrix,
  type RolePermissionsMap,
} from "./PermissionsMatrix";
import { RoleEditor } from "./RoleEditor";
import type { RoleDraft, RoleSummary } from "./types";
import {
  fallbackPermissionGroups,
  flattenPermissionGroups,
} from "./permissionCatalog";

function PermissionsMatrixSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search permissions..."
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function PermissionsMatrixPage() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(
    fallbackPermissionGroups
  );
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionsMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allPermissionIds = useMemo(
    () => flattenPermissionGroups(permissionGroups),
    [permissionGroups]
  );

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return permissionGroups;
    return permissionGroups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.label.toLowerCase().includes(query) ||
            permission.id.toLowerCase().includes(query) ||
            (permission.description ?? "").toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [permissionGroups, searchQuery]);

  const buildRolePermissions = useCallback(
    (roleList: typeof roles, groups: PermissionGroup[]) => {
      const available = flattenPermissionGroups(groups);
      const map: RolePermissionsMap = {};
      roleList.forEach((role) => {
        const permissions = role.permissions.includes("*")
          ? available
          : role.permissions;
        map[role.id] = Array.from(new Set(permissions));
      });
      return map;
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        listAdminRoles(),
        listPermissionCatalog(),
      ]);
      const resolvedPermissions =
        permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups;
      setError(null);
      setRoles(rolesData);
      setPermissionGroups(resolvedPermissions);
      setDraftPermissions(buildRolePermissions(rolesData, resolvedPermissions));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load roles and permissions.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildRolePermissions]);

  useEffect(() => {
    let active = true;
    Promise.all([listAdminRoles(), listPermissionCatalog()])
      .then(([rolesData, permissionsData]) => {
        if (!active) return;
        const resolvedPermissions =
          permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups;
        setError(null);
        setRoles(rolesData);
        setPermissionGroups(resolvedPermissions);
        setDraftPermissions(buildRolePermissions(rolesData, resolvedPermissions));
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load roles and permissions.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildRolePermissions]);

  const hasUnsavedChanges = useMemo(() => {
    return roles.some((role) => {
      const current = role.permissions.includes("*")
        ? allPermissionIds
        : role.permissions;
      const next = draftPermissions[role.id] ?? [];
      const sortedCurrent = [...new Set(current)].sort();
      const sortedNext = [...new Set(next)].sort();
      if (sortedCurrent.length !== sortedNext.length) return true;
      return sortedCurrent.some((permission, index) => permission !== sortedNext[index]);
    });
  }, [allPermissionIds, draftPermissions, roles]);

  const handleSaveRole = async (draft: RoleDraft) => {
    setIsSaving(true);
    setError(null);
    try {
      await createAdminRole(draft);
      await refresh();
      setRoleEditorOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create role.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    setDraftPermissions((prev) => {
      const current = new Set(prev[roleId] ?? []);
      if (current.has(permissionId)) {
        current.delete(permissionId);
      } else {
        current.add(permissionId);
      }
      return { ...prev, [roleId]: Array.from(current) };
    });
  };

  const handleToggleRoleAll = (roleId: string) => {
    setDraftPermissions((prev) => {
      const current = new Set(prev[roleId] ?? []);
      const hasAll =
        allPermissionIds.length > 0 &&
        allPermissionIds.every((permission) => current.has(permission));
      return { ...prev, [roleId]: hasAll ? [] : [...allPermissionIds] };
    });
  };

  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    setError(null);
    try {
      const updates = roles.filter((role) => {
        const current = role.permissions.includes("*")
          ? allPermissionIds
          : role.permissions;
        const next = draftPermissions[role.id] ?? [];
        const sortedCurrent = [...new Set(current)].sort();
        const sortedNext = [...new Set(next)].sort();
        if (sortedCurrent.length !== sortedNext.length) return true;
        return sortedCurrent.some(
          (permission, index) => permission !== sortedNext[index]
        );
      });

      await Promise.all(
        updates.map((role) => {
          const next = draftPermissions[role.id] ?? [];
          const payload = next.length === allPermissionIds.length ? ["*"] : next;
          return updateAdminRole(role.id, { permissions: payload });
        })
      );

      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save permission changes.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setDraftPermissions(buildRolePermissions(roles, permissionGroups));
  };

  return (
    <AdminShell
      activeHref="/admin/roles"
      breadcrumbs={
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-foreground">
            Permissions Matrix
          </span>
          <span className="text-xs text-muted-foreground">
            Manage access across roles and admin modules.
          </span>
        </div>
      }
      search={<PermissionsMatrixSearch value={searchQuery} onChange={setSearchQuery} />}
      topbarActions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setRoleEditorOpen(true)}
          disabled={isLoading || isSaving}
        >
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      }
      contentClassName="p-0"
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 pb-28">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Permissions unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {isLoading ? (
              <div className="rounded-2xl border bg-card/60 p-6 text-sm text-muted-foreground">
                Loading permissions matrix...
              </div>
            ) : (
              <PermissionsMatrix
                roles={roles}
                permissionGroups={filteredGroups}
                rolePermissions={draftPermissions}
                onTogglePermission={handleTogglePermission}
                onToggleRoleAll={handleToggleRoleAll}
              />
            )}
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/80 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                {hasUnsavedChanges
                  ? "Unsaved permission changes detected."
                  : "No pending permission changes."}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelChanges}
                disabled={!hasUnsavedChanges || isSaving}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSaveChanges}
                disabled={!hasUnsavedChanges || isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <RoleEditor
        open={roleEditorOpen}
        onOpenChange={setRoleEditorOpen}
        onSave={(draft) => handleSaveRole(draft)}
        permissionGroups={permissionGroups}
      />
    </AdminShell>
  );
}
