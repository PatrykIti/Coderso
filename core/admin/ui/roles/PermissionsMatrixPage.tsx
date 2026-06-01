import { Info, Plus, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAdminAuth } from "@/ui/contexts/AdminAuthContext";

import { PermissionsMatrix, type RolePermissionsMap } from "./PermissionsMatrix";
import { RoleEditor } from "./RoleEditor";
import type { RoleDraft, RoleSummary } from "./types";
import { fallbackPermissionGroups, flattenPermissionGroups } from "./permissionCatalog";
import {
  buildRolePermissionDiffs,
  normalizeRolePermissionSet,
  summarizeRolePermissionDiffs,
  type RolePermissionDiff,
} from "./rolePermissionDiff";

const hasPermission = (permissions: string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

type MatrixMode = "denied" | "readonly" | "editable";

type RolesMatrixAccess = {
  canReadRoles: boolean;
  canWriteRoles: boolean;
};

const resolveMatrixMode = (access: RolesMatrixAccess): MatrixMode => {
  if (!access.canReadRoles) return "denied";
  if (!access.canWriteRoles) return "readonly";
  return "editable";
};

const readOnlyReason = "roles:write permission is required to edit roles.";
const stalePermissionMessage = "Permissions changed; refresh required.";

const isStaleRoleError = (err: unknown) =>
  isApiClientError(err) &&
  (err.status === 412 || err.code === "role_conflict" || err.code === "role_stale");

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

export type PermissionsMatrixPageProps = {
  permissions?: string[];
};

export function PermissionsMatrixPage({ permissions }: PermissionsMatrixPageProps = {}) {
  const adminAuth = useAdminAuth();
  const canAccess = useCallback(
    (permission: string) =>
      permissions ? hasPermission(permissions, permission) : adminAuth.can(permission),
    [adminAuth, permissions]
  );
  const canReadRoles = canAccess("roles:read");
  const canWriteRoles = canAccess("roles:write");
  const [serverAccessDenied, setServerAccessDenied] = useState(false);
  const matrixMode = serverAccessDenied
    ? "denied"
    : resolveMatrixMode({ canReadRoles, canWriteRoles });
  const canEditMatrix = matrixMode === "editable";
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [permissionGroups, setPermissionGroups] =
    useState<PermissionGroup[]>(fallbackPermissionGroups);
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionsMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [roleRefreshRequired, setRoleRefreshRequired] = useState(false);
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

  const buildRolePermissions = useCallback((roleList: typeof roles, groups: PermissionGroup[]) => {
    const available = flattenPermissionGroups(groups);
    const map: RolePermissionsMap = {};
    roleList.forEach((role) => {
      const permissions = role.permissions.includes("*") ? available : role.permissions;
      map[role.id] = Array.from(new Set(permissions));
    });
    return map;
  }, []);

  const refreshPermissionsOnDenied = useCallback(() => {
    void adminAuth.refreshPermissions().catch(() => undefined);
  }, [adminAuth]);

  const resolveErrorMessage = useCallback(
    (err: unknown, fallback: string, permissionFallback = stalePermissionMessage) => {
      if (isApiClientError(err)) {
        if (err.sharedFailureKind === "permission_denied" || err.status === 403) {
          refreshPermissionsOnDenied();
          return permissionFallback;
        }
        return err.message;
      }
      return fallback;
    },
    [refreshPermissionsOnDenied]
  );

  const refresh = useCallback(async () => {
    if (matrixMode === "denied") {
      return;
    }
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
      setReviewError(null);
      setRoleRefreshRequired(false);
    } catch (err) {
      const message = resolveErrorMessage(
        err,
        "Failed to load roles and permissions.",
        "Your permissions changed. Refreshing access before enabling actions."
      );
      setError(message);
      if (
        isApiClientError(err) &&
        (err.sharedFailureKind === "permission_denied" || err.status === 403)
      ) {
        setServerAccessDenied(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [buildRolePermissions, matrixMode, resolveErrorMessage, setServerAccessDenied]);

  useEffect(() => {
    let active = true;
    if (matrixMode === "denied") {
      return () => {
        active = false;
      };
    }
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setIsLoading(true);
        setServerAccessDenied(false);
        return Promise.all([listAdminRoles(), listPermissionCatalog()]);
      })
      .then((resources) => {
        if (!active || !resources) return;
        const [rolesData, permissionsData] = resources;
        const resolvedPermissions =
          permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups;
        setError(null);
        setRoles(rolesData);
        setPermissionGroups(resolvedPermissions);
        setDraftPermissions(buildRolePermissions(rolesData, resolvedPermissions));
        setReviewError(null);
        setRoleRefreshRequired(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = resolveErrorMessage(
          err,
          "Failed to load roles and permissions.",
          "Your permissions changed. Refreshing access before enabling actions."
        );
        setError(message);
        if (
          isApiClientError(err) &&
          (err.sharedFailureKind === "permission_denied" || err.status === 403)
        ) {
          setServerAccessDenied(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildRolePermissions, matrixMode, resolveErrorMessage]);

  const pendingDiffs = useMemo(
    () => buildRolePermissionDiffs(roles, draftPermissions, allPermissionIds),
    [allPermissionIds, draftPermissions, roles]
  );
  const diffSummary = useMemo(() => summarizeRolePermissionDiffs(pendingDiffs), [pendingDiffs]);
  const hasUnsavedChanges = pendingDiffs.length > 0;

  const formatDiffSummary = useMemo(() => {
    if (!hasUnsavedChanges) return "No pending permission changes.";
    const roleLabel = diffSummary.changedRoles === 1 ? "role" : "roles";
    const riskCopy = diffSummary.highRisk ? " High-risk permission grant included." : "";
    return `${diffSummary.changedRoles} ${roleLabel} changed: +${diffSummary.addedPermissions} / -${diffSummary.removedPermissions}.${riskCopy}`;
  }, [diffSummary, hasUnsavedChanges]);

  const draftPermissionsForRole = useCallback(
    (roleId: string) =>
      normalizeRolePermissionSet(draftPermissions[roleId] ?? [], allPermissionIds),
    [allPermissionIds, draftPermissions]
  );

  const toRoleUpdatePayload = useCallback(
    (roleId: string) => {
      const next = draftPermissionsForRole(roleId);
      return next.length === allPermissionIds.length ? ["*"] : next;
    },
    [allPermissionIds, draftPermissionsForRole]
  );

  const handleSaveRole = async (draft: RoleDraft) => {
    if (!canEditMatrix) {
      setError("Role changes require roles:write permission.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createAdminRole(draft);
      await refresh();
      setRoleEditorOpen(false);
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to create role."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = (roleId: string, permissionId: string) => {
    if (!canEditMatrix) return;
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
    if (!canEditMatrix) return;
    setDraftPermissions((prev) => {
      const current = new Set(prev[roleId] ?? []);
      const hasAll =
        allPermissionIds.length > 0 &&
        allPermissionIds.every((permission) => current.has(permission));
      return { ...prev, [roleId]: hasAll ? [] : [...allPermissionIds] };
    });
  };

  const openReviewModal = () => {
    if (!canEditMatrix) {
      setError("Permission matrix changes require roles:write permission.");
      return;
    }
    if (!hasUnsavedChanges) return;
    setReviewError(
      roleRefreshRequired ? "Role changed on the server. Refresh roles before retrying." : null
    );
    setReviewOpen(true);
  };

  const handleConfirmSaveChanges = async () => {
    if (!canEditMatrix || pendingDiffs.length === 0 || roleRefreshRequired) return;
    setIsSaving(true);
    setError(null);
    setReviewError(null);

    const successfulUpdates = new Map<string, RoleSummary>();
    const failures: Array<{ diff: RolePermissionDiff; message: string; stale: boolean }> = [];

    try {
      for (const diff of pendingDiffs) {
        try {
          const updated = await updateAdminRole(diff.roleId, {
            permissions: toRoleUpdatePayload(diff.roleId),
          });
          successfulUpdates.set(updated.id, updated);
        } catch (err) {
          const stale = isStaleRoleError(err);
          const message = stale
            ? "Role changed on the server. Refresh roles before retrying."
            : resolveErrorMessage(
                err,
                "Failed to save role permissions.",
                "Permissions changed; refresh required."
              );
          failures.push({
            diff,
            message,
            stale,
          });
        }
      }

      if (successfulUpdates.size > 0) {
        const nextRoles = roles.map((role) => successfulUpdates.get(role.id) ?? role);
        setRoles(nextRoles);
        setDraftPermissions((prev) => {
          const nextDraft = { ...prev };
          for (const updated of successfulUpdates.values()) {
            nextDraft[updated.id] = normalizeRolePermissionSet(
              updated.permissions,
              allPermissionIds
            );
          }
          return nextDraft;
        });
      }

      if (failures.length > 0) {
        if (failures.some((failure) => failure.stale)) {
          setRoleRefreshRequired(true);
        }
        const message = failures
          .map(({ diff, message: failureMessage }) => `${diff.roleName}: ${failureMessage}`)
          .join("; ");
        setReviewError(message);
        setError("Some role permission changes failed. Review the remaining diffs.");
        return;
      }

      setReviewOpen(false);
      await refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshRoles = async () => {
    setIsSaving(true);
    try {
      await refresh();
      setReviewOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    if (!canEditMatrix) return;
    setDraftPermissions(buildRolePermissions(roles, permissionGroups));
    setReviewError(null);
    setRoleRefreshRequired(false);
    setReviewOpen(false);
  };

  return (
    <AdminShell
      activeHref="/admin/roles"
      breadcrumbs={["Settings", "Permissions Matrix"]}
      search={
        matrixMode === "denied" ? undefined : (
          <PermissionsMatrixSearch value={searchQuery} onChange={setSearchQuery} />
        )
      }
      topbarActions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setRoleEditorOpen(true)}
          disabled={!canEditMatrix || isLoading || isSaving}
          title={!canEditMatrix && matrixMode !== "denied" ? readOnlyReason : undefined}
          aria-label={
            !canEditMatrix && matrixMode !== "denied"
              ? `Add Role unavailable: ${readOnlyReason}`
              : undefined
          }
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
            {matrixMode === "denied" ? (
              <Alert variant="destructive">
                <AlertTitle>Access denied</AlertTitle>
                <AlertDescription>
                  {error ?? "You need roles:read permission to open the permissions matrix."}
                </AlertDescription>
              </Alert>
            ) : null}
            {error && matrixMode !== "denied" ? (
              <Alert variant="destructive">
                <AlertTitle>Permissions unavailable</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {matrixMode === "readonly" ? (
              <Alert>
                <AlertTitle>Read-only permissions</AlertTitle>
                <AlertDescription>
                  You can inspect and search role permissions. Editing requires roles:write
                  permission.
                </AlertDescription>
              </Alert>
            ) : null}
            {isLoading && matrixMode !== "denied" ? (
              <div className="rounded-2xl border bg-card/60 p-6 text-sm text-muted-foreground">
                Loading permissions matrix...
              </div>
            ) : matrixMode !== "denied" ? (
              <PermissionsMatrix
                roles={roles}
                permissionGroups={filteredGroups}
                rolePermissions={draftPermissions}
                readOnlyReason={matrixMode === "readonly" ? readOnlyReason : undefined}
                onTogglePermission={canEditMatrix ? handleTogglePermission : undefined}
                onToggleRoleAll={canEditMatrix ? handleToggleRoleAll : undefined}
              />
            ) : null}
          </div>
        </div>
        {matrixMode !== "denied" ? (
          <div className="sticky bottom-0 z-10 border-t bg-background/80 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>
                  {matrixMode === "readonly"
                    ? "Role permissions are read-only for this account."
                    : formatDiffSummary}
                </span>
              </div>
              {canEditMatrix ? (
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
                    onClick={openReviewModal}
                    disabled={!hasUnsavedChanges || isSaving}
                  >
                    <Save className="h-4 w-4" />
                    Review changes
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <RoleEditor
        open={roleEditorOpen}
        onOpenChange={setRoleEditorOpen}
        onSave={(draft) => handleSaveRole(draft)}
        canManageRoles={canEditMatrix}
        permissionGroups={permissionGroups}
      />
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review permission changes</DialogTitle>
            <DialogDescription>
              Confirm role-by-role permission changes before updating RBAC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-semibold">{formatDiffSummary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only roles with listed diffs will be patched.
              </p>
            </div>
            {reviewError ? (
              <Alert variant="destructive">
                <AlertTitle>Some roles were not saved</AlertTitle>
                <AlertDescription>{reviewError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-3">
              {pendingDiffs.map((diff) => (
                <div key={diff.roleId} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{diff.roleName}</p>
                    {diff.highRisk ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                        High-risk grant
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Added</p>
                      {diff.added.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs">
                          {diff.added.map((permission) => (
                            <li key={permission}>+ {permission}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No additions</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Removed
                      </p>
                      {diff.removed.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs">
                          {diff.removed.map((permission) => (
                            <li key={permission}>- {permission}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No removals</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            {roleRefreshRequired ? (
              <Button variant="outline" onClick={handleRefreshRoles} disabled={isSaving}>
                Refresh roles
              </Button>
            ) : null}
            <Button
              onClick={handleConfirmSaveChanges}
              disabled={!hasUnsavedChanges || isSaving || roleRefreshRequired}
            >
              {isSaving ? "Saving..." : "Confirm changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
