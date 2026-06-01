import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, UserCog } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { isApiClientError } from "@/services/apiClient";
import {
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  listPermissionCatalog,
  updateAdminRole,
} from "@/services/adminRolesClient";
import {
  createAdminUser,
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  listAdminUsers,
  replaceAdminUserRoles,
  updateAdminUser,
  type AdminUser,
} from "@/services/adminUsersClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionHeader } from "@/ui/shared/SectionHeader";

import { RoleEditor } from "../roles/RoleEditor";
import { RoleList } from "../roles/RoleList";
import type { RoleDraft, RoleSummary } from "../roles/types";
import { fallbackPermissionGroups } from "../roles/permissionCatalog";
import { InviteUserDialog, type InviteUserValues } from "./InviteUserDialog";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserEditor } from "./UserEditor";
import { UserFilters } from "./UserFilters";
import { UserList } from "./UserList";
import type { UserDraft, UserSummary } from "./types";

const defaultPermissions = ["users:read", "users:write", "roles:read", "roles:write"];

const hasPermission = (permissions: string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

const resetPasswordUnavailableReason =
  "Reset password is not wired yet. TASK-355-02 owns the reset-token flow.";

const formatLastActive = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const mapUserSummary = (user: AdminUser): UserSummary => ({
  id: user.id,
  name: user.name ?? user.email,
  email: user.email,
  roleIds: user.roleIds ?? [],
  status: user.status,
  lastActive: formatLastActive(user.lastLoginAt ?? user.updatedAt ?? user.createdAt),
  mfaEnabled: false,
});

export type UsersRolesPageProps = {
  permissions?: string[];
};

export function UsersRolesPage({ permissions = defaultPermissions }: UsersRolesPageProps) {
  const initialUserId =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("user") ?? "");
  const initialIsLargeScreen =
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 1024px)").matches;
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [permissionGroups, setPermissionGroups] = useState(fallbackPermissionGroups);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("any");
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [pendingSelectUserId, setPendingSelectUserId] = useState<string | null>(null);
  const [pendingSelectRoleId, setPendingSelectRoleId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [userEditorSeed, setUserEditorSeed] = useState(0);
  const [roleEditorSeed, setRoleEditorSeed] = useState(0);
  const [inviteDialogSeed, setInviteDialogSeed] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialUserId) && !initialIsLargeScreen);
  const [isLargeScreen, setIsLargeScreen] = useState(initialIsLargeScreen);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManageUsers = hasPermission(permissions, "users:write");
  const canManageRoles = hasPermission(permissions, "roles:write");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, rolesData, permissionsData] = await Promise.all([
        listAdminUsers(),
        listAdminRoles(),
        listPermissionCatalog(),
      ]);
      const roleList = rolesData as RoleSummary[];
      setRoles(roleList);
      setUsers(usersData.map(mapUserSummary));
      setPermissionGroups(permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load users and roles.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listAdminUsers(), listAdminRoles(), listPermissionCatalog()])
      .then(([usersData, rolesData, permissionsData]) => {
        if (!active) return;
        const roleList = rolesData as RoleSummary[];
        setRoles(roleList);
        setUsers(usersData.map(mapUserSummary));
        setPermissionGroups(
          permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups
        );
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load users and roles.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "all" || user.roleIds.includes(roleFilter);
      const matchesStatus = statusFilter === "any" || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const selectedUser = useMemo(() => {
    const pendingUser = pendingSelectUserId
      ? users.find((user) => user.id === pendingSelectUserId)
      : null;
    return pendingUser ?? users.find((user) => user.id === selectedUserId) ?? filteredUsers[0];
  }, [filteredUsers, pendingSelectUserId, selectedUserId, users]);
  const activeSelectedRoleId =
    roles.find((role) => role.id === (pendingSelectRoleId ?? selectedRoleId))?.id ??
    roles[0]?.id ??
    "";

  const adminRoleIds = useMemo(
    () =>
      roles
        .filter((role) => role.permissions.includes("*") || role.name.toLowerCase() === "admin")
        .map((role) => role.id),
    [roles]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => user.roleIds.some((roleId) => adminRoleIds.includes(roleId))),
    [adminRoleIds, users]
  );

  const protectedUserIds = adminUsers.length === 1 ? [adminUsers[0]?.id] : [];

  const roleUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((user) => {
      user.roleIds.forEach((roleId) => {
        counts[roleId] = (counts[roleId] ?? 0) + 1;
      });
    });
    return counts;
  }, [users]);

  const handleSaveUser = async (draft: UserDraft, mode: "create" | "edit") => {
    setIsSaving(true);
    setError(null);
    try {
      let selectedId: string | null = null;
      if (mode === "edit" && editingUser) {
        await updateAdminUser(editingUser.id, {
          name: draft.name,
          email: draft.email,
          status: draft.status,
        });
        await replaceAdminUserRoles(editingUser.id, draft.roleIds);
        selectedId = editingUser.id;
      } else {
        const created = await createAdminUser({
          name: draft.name,
          email: draft.email,
          roleIds: draft.roleIds,
          status: draft.status,
        });
        selectedId = created.id;
      }
      await refresh();
      if (selectedId) {
        setPendingSelectUserId(selectedId);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save user.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteUser = async (values: InviteUserValues) => {
    await handleSaveUser(
      {
        name: values.name,
        email: values.email,
        roleIds: [values.roleId],
        status: "pending",
      },
      "create"
    );
  };

  const handleSaveRole = async (draft: RoleDraft, mode: "create" | "edit") => {
    setIsSaving(true);
    setError(null);
    try {
      let selectedId: string | null = null;
      if (mode === "edit" && editingRole) {
        const updated = await updateAdminRole(editingRole.id, draft);
        selectedId = updated.id;
      } else {
        const created = await createAdminRole(draft);
        selectedId = created.id;
      }
      await refresh();
      if (selectedId) {
        setPendingSelectRoleId(selectedId);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to save role.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserSummary) => {
    setIsSaving(true);
    setError(null);
    try {
      if (user.status === "inactive") {
        await enableAdminUser(user.id);
      } else {
        await disableAdminUser(user.id);
      }
      await refresh();
      setPendingSelectUserId(user.id);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update user status.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserSummary) => {
    if (protectedUserIds.includes(user.id)) return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete user.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleSummary) => {
    if (role.system || role.name.toLowerCase() === "admin") return;
    setIsSaving(true);
    setError(null);
    try {
      await deleteAdminRole(role.id);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete role.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateRole = async (role: RoleSummary) => {
    setIsSaving(true);
    setError(null);
    try {
      const created = await createAdminRole({
        name: `${role.name} copy`,
        description: role.description,
        permissions: role.permissions,
      });
      await refresh();
      setPendingSelectRoleId(created.id);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to duplicate role.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openUserEditor = (user?: UserSummary) => {
    setEditingUser(user ?? null);
    setUserEditorSeed((prev) => prev + 1);
    setUserEditorOpen(true);
  };

  const openRoleEditor = (role?: RoleSummary) => {
    setEditingRole(role ?? null);
    setRoleEditorSeed((prev) => prev + 1);
    setRoleEditorOpen(true);
  };

  const openInviteDialog = () => {
    setInviteDialogSeed((prev) => prev + 1);
    setInviteDialogOpen(true);
  };

  const handleSelectUser = (id: string) => {
    setPendingSelectUserId(null);
    setSelectedUserId(id);
    if (!isLargeScreen) setDetailsOpen(true);
  };

  const handleViewProfile = (user: UserSummary) => {
    handleSelectUser(user.id);
  };

  const readOnly = !canManageUsers || !canManageRoles;
  const userActionsEnabled = canManageUsers && !isSaving && !isLoading;
  const roleActionsEnabled = canManageRoles && !isSaving && !isLoading;

  return (
    <SplitShell
      activeHref="/admin/users"
      rightPanel={
        <UserDetailsDrawer
          user={selectedUser}
          roles={roles}
          canManageUsers={canManageUsers}
          resetPasswordUnavailableReason={resetPasswordUnavailableReason}
          onEditUser={() => selectedUser && openUserEditor(selectedUser)}
          onResetPassword={() => undefined}
        />
      }
      breadcrumbs={["Settings", "Users & Roles"]}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Users & Roles"
          description="Manage team access, roles, and platform permissions."
          actions={
            <div className="flex items-center gap-2">
              {readOnly ? (
                <Badge variant="secondary" className="text-xs">
                  Read-only access
                </Badge>
              ) : null}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => openRoleEditor()}
                disabled={!roleActionsEnabled}
              >
                <UserCog className="h-4 w-4" />
                Create Role
              </Button>
              <Button className="gap-2" onClick={openInviteDialog} disabled={!userActionsEnabled}>
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </div>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Users & Roles unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {isLoading ? (
          <div className="rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground">
            Loading users and roles...
          </div>
        ) : null}
        {readOnly ? (
          <Alert>
            <AlertTitle>Read-only permissions</AlertTitle>
            <AlertDescription>
              You can review users and roles, but edits require elevated access.
            </AlertDescription>
          </Alert>
        ) : null}
        <UserFilters
          query={query}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          roles={roles}
          onQueryChange={setQuery}
          onRoleChange={setRoleFilter}
          onStatusChange={setStatusFilter}
        />
        <UserList
          items={filteredUsers}
          roles={roles}
          selectedId={selectedUser?.id}
          protectedIds={protectedUserIds}
          canManageUsers={userActionsEnabled}
          resetPasswordUnavailableReason={resetPasswordUnavailableReason}
          onSelect={handleSelectUser}
          onViewProfile={handleViewProfile}
          onEdit={openUserEditor}
          onToggleStatus={handleToggleStatus}
          onResetPassword={() => undefined}
          onDelete={handleDeleteUser}
        />
        <div className="flex flex-col gap-4 border-t pt-6">
          <SectionHeader
            title="Roles"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => openRoleEditor()}
                disabled={!roleActionsEnabled}
              >
                Create role
              </Button>
            }
          />
          <RoleList
            roles={roles}
            selectedId={activeSelectedRoleId}
            usageCounts={roleUsageCounts}
            canManageRoles={roleActionsEnabled}
            onSelect={(id) => {
              setPendingSelectRoleId(null);
              setSelectedRoleId(id);
            }}
            onEdit={openRoleEditor}
            onDuplicate={handleDuplicateRole}
            onDelete={handleDeleteRole}
          />
        </div>
      </div>
      <UserEditor
        key={`user-${editingUser?.id ?? "new"}-${userEditorSeed}`}
        open={userEditorOpen}
        user={editingUser}
        roles={roles}
        lockedRoleIds={editingUser && protectedUserIds.includes(editingUser.id) ? adminRoleIds : []}
        canManageUsers={userActionsEnabled}
        onOpenChange={setUserEditorOpen}
        onSave={handleSaveUser}
      />
      <InviteUserDialog
        key={`invite-${inviteDialogSeed}`}
        open={inviteDialogOpen}
        roles={roles}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInviteUser}
      />
      <RoleEditor
        key={`role-${editingRole?.id ?? "new"}-${roleEditorSeed}`}
        open={roleEditorOpen}
        role={editingRole}
        canManageRoles={roleActionsEnabled}
        onOpenChange={setRoleEditorOpen}
        onSave={handleSaveRole}
        permissionGroups={permissionGroups}
      />
      {!isLargeScreen ? (
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetTitle className="sr-only">User details</SheetTitle>
            <SheetDescription className="sr-only">
              {selectedUser
                ? "Review the selected user's roles, permissions, and account activity."
                : "Select a user to review permissions and activity."}
            </SheetDescription>
            <UserDetailsDrawer
              user={selectedUser}
              roles={roles}
              canManageUsers={canManageUsers}
              resetPasswordUnavailableReason={resetPasswordUnavailableReason}
              onEditUser={() => selectedUser && openUserEditor(selectedUser)}
              onResetPassword={() => undefined}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </SplitShell>
  );
}
