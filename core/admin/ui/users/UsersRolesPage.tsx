import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, UserCheck, UserCog, UserPlus, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import {
  createAdminRole,
  deleteAdminRole,
  listAdminRoles,
  listPermissionCatalog,
  updateAdminRole,
} from "@/services/adminRolesClient";
import {
  deleteAdminUser,
  disableAdminUser,
  enableAdminUser,
  inviteUserWithSetPassword,
  listAdminUsers,
  replaceAdminUserRoles,
  requestAdminPasswordReset,
  updateAdminUser,
  type AdminUser,
} from "@/services/adminUsersClient";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { useAdminAuth } from "@/ui/contexts/AdminAuthContext";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { SectionHeader } from "@/ui/shared/SectionHeader";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";

import { RoleEditor } from "../roles/RoleEditor";
import { RoleList } from "../roles/RoleList";
import { hasHighRiskPermissions } from "../roles/rolePermissionRisk";
import type { RoleDraft, RoleSummary } from "../roles/types";
import { fallbackPermissionGroups } from "../roles/permissionCatalog";
import { InviteUserDialog, type InviteUserValues } from "./InviteUserDialog";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserEditor } from "./UserEditor";
import { UserFilters } from "./UserFilters";
import { UserList } from "./UserList";
import type { UserDraft, UserSummary } from "./types";

const hasPermission = (permissions: string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

const roleFilterUnavailableReason =
  "Role filtering requires roles:read permission. TASK-355-01 keeps the Users list readable without fetching roles.";
const roleDetailsUnavailableReason =
  "Role names require roles:read permission. User rows hide role details in partial-read mode.";

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

type ConfirmActionRequest =
  | {
      kind: "user-status";
      user: UserSummary;
      nextStatus: "active" | "inactive";
      highRisk: boolean;
    }
  | {
      kind: "user-delete";
      user: UserSummary;
    }
  | {
      kind: "role-delete";
      role: RoleSummary;
    }
  | {
      kind: "role-duplicate";
      role: RoleSummary;
    };

export function UsersRolesPage({ permissions }: UsersRolesPageProps) {
  const adminAuth = useAdminAuth();
  const canAccess = useCallback(
    (permission: string) =>
      permissions ? hasPermission(permissions, permission) : adminAuth.can(permission),
    [adminAuth, permissions]
  );
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
  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [pendingSelectUserId, setPendingSelectUserId] = useState<string | null>(null);
  const [pendingSelectRoleId, setPendingSelectRoleId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState<UserSummary | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionRequest | null>(null);
  const [userEditorSeed, setUserEditorSeed] = useState(0);
  const [roleEditorSeed, setRoleEditorSeed] = useState(0);
  const [inviteDialogSeed, setInviteDialogSeed] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialUserId) && !initialIsLargeScreen);
  const [isLargeScreen, setIsLargeScreen] = useState(initialIsLargeScreen);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canReadUsers = canAccess("users:read");
  const canManageUsers = canAccess("users:write");
  const canReadRoles = canAccess("roles:read");
  const canManageRoles = canAccess("roles:write");
  const hasAnyReadAccess = canReadUsers || canReadRoles;

  const resolveErrorMessage = useCallback(
    (err: unknown, fallback: string) => {
      if (isApiClientError(err)) {
        if (err.sharedFailureKind === "permission_denied" || err.status === 403) {
          void adminAuth.refreshPermissions().catch(() => undefined);
          return "Your permissions changed. Refreshing access before enabling actions.";
        }
        return err.message;
      }
      return fallback;
    },
    [adminAuth]
  );

  const loadResources = useCallback(async () => {
    if (!hasAnyReadAccess) {
      return {
        usersData: [] as AdminUser[],
        rolesData: [] as RoleSummary[],
        permissionsData: fallbackPermissionGroups,
      };
    }
    const [usersData, rolesData, permissionsData] = await Promise.all([
      canReadUsers ? listAdminUsers() : Promise.resolve([] as AdminUser[]),
      canReadRoles ? listAdminRoles() : Promise.resolve([] as RoleSummary[]),
      canReadRoles ? listPermissionCatalog() : Promise.resolve(fallbackPermissionGroups),
    ]);
    return { usersData, rolesData: rolesData as RoleSummary[], permissionsData };
  }, [canReadRoles, canReadUsers, hasAnyReadAccess]);

  const applyResources = useCallback(
    ({
      permissionsData,
      rolesData,
      usersData,
    }: {
      usersData: AdminUser[];
      rolesData: RoleSummary[];
      permissionsData: typeof fallbackPermissionGroups;
    }) => {
      setRoles(canReadRoles ? rolesData : []);
      setUsers(canReadUsers ? usersData.map(mapUserSummary) : []);
      setPermissionGroups(
        canReadRoles && permissionsData.length > 0 ? permissionsData : fallbackPermissionGroups
      );
    },
    [canReadRoles, canReadUsers]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const refresh = useCallback(async () => {
    if (!hasAnyReadAccess) {
      applyResources({
        usersData: [],
        rolesData: [],
        permissionsData: fallbackPermissionGroups,
      });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      applyResources(await loadResources());
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to load users and roles."));
    } finally {
      setIsLoading(false);
    }
  }, [applyResources, hasAnyReadAccess, loadResources, resolveErrorMessage]);

  useEffect(() => {
    let active = true;
    if (!hasAnyReadAccess) {
      return () => {
        active = false;
      };
    }

    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setIsLoading(true);
        setError(null);
        return loadResources();
      })
      .then((resources) => {
        if (!active || !resources) return;
        applyResources(resources);
      })
      .catch((err) => {
        if (!active) return;
        setError(resolveErrorMessage(err, "Failed to load users and roles."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyResources, hasAnyReadAccess, loadResources, resolveErrorMessage]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole =
        !canReadRoles || roleFilter === "all" || user.roleIds.includes(roleFilter);
      const matchesStatus = statusFilter === "any" || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [canReadRoles, query, roleFilter, statusFilter, users]);

  // TASK-479-27-L01: render-time derivations only — counts/tab splits come from
  // the real `users` array (UserStatus is "active" | "inactive" | "pending"); no
  // new fetch, no setState-in-effect, no fabricated deltas.
  const memberCount = useMemo(
    () => users.filter((user) => user.status !== "pending").length,
    [users]
  );
  const inviteCount = useMemo(
    () => users.filter((user) => user.status === "pending").length,
    [users]
  );
  const userStats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      pending: inviteCount,
    }),
    [users, inviteCount]
  );
  const visibleUsers = useMemo(
    () =>
      filteredUsers.filter((user) =>
        tab === "invitations" ? user.status === "pending" : user.status !== "pending"
      ),
    [filteredUsers, tab]
  );

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

  const highRiskRoleIds = useMemo(
    () => roles.filter((role) => hasHighRiskPermissions(role.permissions)).map((role) => role.id),
    [roles]
  );

  const isHighRiskUser = useCallback(
    (user: UserSummary) => user.roleIds.some((roleId) => highRiskRoleIds.includes(roleId)),
    [highRiskRoleIds]
  );

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
    if (!canReadUsers || !canManageUsers || !canReadRoles) {
      setError("User changes require users:write and roles:read permissions.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      let selectedId: string | null = null;
      let noticeMessage: string | null = null;
      if (mode === "edit" && editingUser) {
        await updateAdminUser(editingUser.id, {
          name: draft.name,
          email: draft.email,
          status: draft.status,
        });
        await replaceAdminUserRoles(editingUser.id, draft.roleIds);
        selectedId = editingUser.id;
      } else {
        const created = await inviteUserWithSetPassword({
          name: draft.name,
          email: draft.email,
          roleIds: draft.roleIds,
          sendSetPasswordInvite: true,
        });
        selectedId = created.user.id;
        noticeMessage = `Invitation email sent to ${created.user.email}.`;
      }
      await refresh();
      if (selectedId) {
        setPendingSelectUserId(selectedId);
      }
      if (noticeMessage) {
        setNotice(noticeMessage);
      }
    } catch (err) {
      setError(resolveErrorMessage(err, "Failed to save user."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteUser = async (values: InviteUserValues) => {
    if (!canReadUsers || !canManageUsers || !canReadRoles) {
      const message = "Inviting users requires users:write and roles:read permissions.";
      setError(message);
      throw new Error(message);
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await inviteUserWithSetPassword({
        name: values.name,
        email: values.email,
        roleIds: [values.roleId],
        sendSetPasswordInvite: true,
      });
      await refresh();
      setPendingSelectUserId(result.user.id);
      setNotice(`Invitation email sent to ${result.user.email}.`);
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to send invitation.");
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async (draft: RoleDraft, mode: "create" | "edit") => {
    if (!canReadRoles || !canManageRoles) {
      setError("Role changes require roles:write permission.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
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
      setError(resolveErrorMessage(err, "Failed to save role."));
    } finally {
      setIsSaving(false);
    }
  };

  const performToggleStatus = async (user: UserSummary, options?: { rethrow?: boolean }) => {
    if (!canReadUsers || !canManageUsers) {
      setError("User status changes require users:write permission.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (user.status === "inactive") {
        await enableAdminUser(user.id);
      } else {
        await disableAdminUser(user.id);
      }
      await refresh();
      setPendingSelectUserId(user.id);
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to update user status.");
      setError(message);
      if (options?.rethrow) throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (user: UserSummary) => {
    if (!canReadUsers || !canManageUsers) {
      setError("User status changes require users:write permission.");
      return;
    }
    const nextStatus = user.status === "inactive" ? "active" : "inactive";
    const highRisk = !canReadRoles || isHighRiskUser(user);
    if (nextStatus === "active" && !highRisk) {
      void performToggleStatus(user);
      return;
    }
    setConfirmAction({
      kind: "user-status",
      user,
      nextStatus,
      highRisk,
    });
  };

  const performDeleteUser = async (user: UserSummary, options?: { rethrow?: boolean }) => {
    if (!canReadUsers || !canManageUsers) {
      setError("Deleting users requires users:write permission.");
      return;
    }
    if (protectedUserIds.includes(user.id)) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteAdminUser(user.id);
      await refresh();
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to delete user.");
      setError(message);
      if (options?.rethrow) throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = (user: UserSummary) => {
    if (!canReadUsers || !canManageUsers) {
      setError("Deleting users requires users:write permission.");
      return;
    }
    if (protectedUserIds.includes(user.id)) return;
    setConfirmAction({ kind: "user-delete", user });
  };

  const performDeleteRole = async (role: RoleSummary, options?: { rethrow?: boolean }) => {
    if (!canReadRoles || !canManageRoles) {
      setError("Deleting roles requires roles:write permission.");
      return;
    }
    if (role.system || role.name.toLowerCase() === "admin") return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await deleteAdminRole(role.id);
      await refresh();
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to delete role.");
      setError(message);
      if (options?.rethrow) throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = (role: RoleSummary) => {
    if (!canReadRoles || !canManageRoles) {
      setError("Deleting roles requires roles:write permission.");
      return;
    }
    if (role.system || role.name.toLowerCase() === "admin") return;
    setConfirmAction({ kind: "role-delete", role });
  };

  const performDuplicateRole = async (role: RoleSummary, options?: { rethrow?: boolean }) => {
    if (!canReadRoles || !canManageRoles) {
      setError("Duplicating roles requires roles:write permission.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createAdminRole({
        name: `${role.name} copy`,
        description: role.description,
        permissions: role.permissions,
        sourceRoleId: role.id,
        sourceRoleName: role.name,
      });
      await refresh();
      setPendingSelectRoleId(created.id);
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to duplicate role.");
      setError(message);
      if (options?.rethrow) throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateRole = (role: RoleSummary) => {
    if (!canReadRoles || !canManageRoles) {
      setError("Duplicating roles requires roles:write permission.");
      return;
    }
    if (hasHighRiskPermissions(role.permissions)) {
      setConfirmAction({ kind: "role-duplicate", role });
      return;
    }
    void performDuplicateRole(role);
  };

  const openUserEditor = (user?: UserSummary) => {
    if (!canReadUsers || !canManageUsers || !canReadRoles) return;
    setEditingUser(user ?? null);
    setUserEditorSeed((prev) => prev + 1);
    setUserEditorOpen(true);
  };

  const openRoleEditor = (role?: RoleSummary) => {
    if (!canReadRoles || !canManageRoles) return;
    setEditingRole(role ?? null);
    setRoleEditorSeed((prev) => prev + 1);
    setRoleEditorOpen(true);
  };

  const openInviteDialog = () => {
    if (!canReadUsers || !canManageUsers || !canReadRoles) return;
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

  const openPasswordResetDialog = (user: UserSummary) => {
    if (!canReadUsers || !canManageUsers) {
      setError("Password resets require users:write permission.");
      return;
    }
    setPasswordResetUser(user);
  };

  const handleConfirmPasswordReset = async () => {
    if (!passwordResetUser) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await requestAdminPasswordReset(passwordResetUser.id);
      setNotice(`Password reset email sent to ${passwordResetUser.email}.`);
    } catch (err) {
      const message = resolveErrorMessage(err, "Failed to send password reset email.");
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmActionConfig = useMemo(() => {
    if (!confirmAction) {
      return {
        title: "Confirm action",
        description: "Review the target before continuing.",
        targetLabel: undefined,
        confirmLabel: "Confirm",
        confirmingLabel: "Working...",
        tone: "destructive" as const,
      };
    }

    switch (confirmAction.kind) {
      case "user-status":
        return {
          title:
            confirmAction.nextStatus === "inactive"
              ? "Deactivate user?"
              : "Activate high-risk user?",
          description:
            confirmAction.nextStatus === "inactive"
              ? "This blocks the admin user from signing in until reactivated."
              : "This account may have high-risk access. Confirm before restoring access.",
          targetLabel: `${confirmAction.user.name} <${confirmAction.user.email}>`,
          confirmLabel:
            confirmAction.nextStatus === "inactive" ? "Deactivate user" : "Activate user",
          confirmingLabel:
            confirmAction.nextStatus === "inactive" ? "Deactivating..." : "Activating...",
          tone:
            confirmAction.nextStatus === "inactive"
              ? ("destructive" as const)
              : ("warning" as const),
        };
      case "user-delete":
        return {
          title: "Delete user?",
          description: "This removes the admin user and cannot be undone.",
          targetLabel: `${confirmAction.user.name} <${confirmAction.user.email}>`,
          confirmLabel: "Delete user",
          confirmingLabel: "Deleting...",
          tone: "destructive" as const,
        };
      case "role-delete":
        return {
          title: "Delete role?",
          description: "This removes the role from the admin RBAC catalog and cannot be undone.",
          targetLabel: confirmAction.role.name,
          confirmLabel: "Delete role",
          confirmingLabel: "Deleting...",
          tone: "destructive" as const,
        };
      case "role-duplicate":
        return {
          title: "Duplicate high-risk role?",
          description:
            "This copies a role that grants sensitive permissions. Review the source role before creating the copy.",
          targetLabel: confirmAction.role.name,
          confirmLabel: "Duplicate role",
          confirmingLabel: "Duplicating...",
          tone: "warning" as const,
        };
    }
  }, [confirmAction]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    switch (confirmAction.kind) {
      case "user-status":
        await performToggleStatus(confirmAction.user, { rethrow: true });
        return;
      case "user-delete":
        await performDeleteUser(confirmAction.user, { rethrow: true });
        return;
      case "role-delete":
        await performDeleteRole(confirmAction.role, { rethrow: true });
        return;
      case "role-duplicate":
        await performDuplicateRole(confirmAction.role, { rethrow: true });
        return;
    }
  };

  const readOnly =
    hasAnyReadAccess && (!canManageUsers || !canManageRoles || !canReadUsers || !canReadRoles);
  const userActionsEnabled =
    canReadUsers && canManageUsers && canReadRoles && !isSaving && !isLoading;
  const userLifecycleActionsEnabled = canReadUsers && canManageUsers && !isSaving && !isLoading;
  const roleActionsEnabled = canReadRoles && canManageRoles && !isSaving && !isLoading;

  if (!hasAnyReadAccess) {
    return (
      <SplitShell
        activeHref="/admin/users"
        rightPanel={
          <div className="p-6 text-sm text-muted-foreground">
            Users and roles are unavailable for this account.
          </div>
        }
        breadcrumbs={["Admin", "Users & Roles"]}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <PageHeader
            title="Users & Roles"
            description="Manage team access, roles, and platform permissions."
          />
          <Alert variant="destructive">
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              You need users:read or roles:read permission to open this admin area.
            </AlertDescription>
          </Alert>
        </div>
      </SplitShell>
    );
  }

  return (
    <SplitShell
      activeHref="/admin/users"
      rightPanel={
        <UserDetailsDrawer
          user={selectedUser}
          roles={roles}
          canManageUsers={userActionsEnabled}
          canEditUser={userActionsEnabled}
          canResetPassword={userLifecycleActionsEnabled}
          canManageUserLifecycle={userLifecycleActionsEnabled}
          isProtectedUser={selectedUser ? protectedUserIds.includes(selectedUser.id) : false}
          roleDetailsUnavailableReason={canReadRoles ? undefined : roleDetailsUnavailableReason}
          onEditUser={() => selectedUser && openUserEditor(selectedUser)}
          onResetPassword={() => selectedUser && openPasswordResetDialog(selectedUser)}
          onToggleStatus={() => selectedUser && handleToggleStatus(selectedUser)}
          onDeleteUser={() => selectedUser && handleDeleteUser(selectedUser)}
        />
      }
      breadcrumbs={["Admin", "Users & Roles"]}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader
          title="Users & Roles"
          description="Manage team access, roles, and platform permissions."
          icon={<Users />}
          actions={
            <div className="flex items-center gap-2">
              {readOnly ? (
                <Badge variant="secondary" className="text-xs">
                  Read-only access
                </Badge>
              ) : null}
              {canReadRoles ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => openRoleEditor()}
                  disabled={!roleActionsEnabled}
                >
                  <UserCog className="h-4 w-4" />
                  Create Role
                </Button>
              ) : null}
              {canReadUsers ? (
                <Button
                  className="gap-2"
                  onClick={openInviteDialog}
                  disabled={!canReadRoles || !userActionsEnabled}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite User
                </Button>
              ) : null}
            </div>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Users & Roles unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {notice ? (
          <Alert>
            <AlertTitle>Users & Roles updated</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
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
        {canReadUsers ? (
          <>
            <Tabs value={tab} onValueChange={(value) => setTab(value as "members" | "invitations")}>
              <TabsList variant="line">
                <TabsTrigger value="members">
                  Members
                  <Badge variant="soft">{memberCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="invitations">
                  Invitations
                  <Badge variant="soft">{inviteCount}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total users" value={String(userStats.total)} icon={<Users />} />
              <StatCard label="Active" value={String(userStats.active)} icon={<UserCheck />} />
              <StatCard
                label="Pending invites"
                value={String(userStats.pending)}
                icon={<MailPlus />}
              />
            </div>
            <UserFilters
              query={query}
              roleFilter={canReadRoles ? roleFilter : "all"}
              statusFilter={statusFilter}
              roles={roles}
              canReadRoles={canReadRoles}
              roleFilterUnavailableReason={roleFilterUnavailableReason}
              onQueryChange={setQuery}
              onRoleChange={setRoleFilter}
              onStatusChange={setStatusFilter}
            />
            <UserList
              items={visibleUsers}
              roles={roles}
              selectedId={selectedUser?.id}
              protectedIds={protectedUserIds}
              canManageUsers={userActionsEnabled}
              canEditUsers={userActionsEnabled}
              canManageUserLifecycle={userLifecycleActionsEnabled}
              canResetPassword={userLifecycleActionsEnabled}
              roleDetailsUnavailableReason={canReadRoles ? undefined : roleDetailsUnavailableReason}
              onSelect={handleSelectUser}
              onViewProfile={handleViewProfile}
              onEdit={openUserEditor}
              onToggleStatus={handleToggleStatus}
              onResetPassword={openPasswordResetDialog}
              onDelete={handleDeleteUser}
            />
          </>
        ) : (
          <Alert>
            <AlertTitle>User list unavailable</AlertTitle>
            <AlertDescription>
              Your account can review roles, but users:read is required to load users.
            </AlertDescription>
          </Alert>
        )}
        {canReadRoles ? (
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
        ) : (
          <Alert>
            <AlertTitle>Roles unavailable</AlertTitle>
            <AlertDescription>
              roles:read is required to load role cards, role filters, and permission catalog data.
            </AlertDescription>
          </Alert>
        )}
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
      <ConfirmActionDialog
        open={Boolean(passwordResetUser)}
        onOpenChange={(open) => {
          if (!open) setPasswordResetUser(null);
        }}
        title="Reset password"
        description="Send a single-use set-password email to this user."
        targetLabel={passwordResetUser?.email}
        confirmLabel="Send reset email"
        confirmingLabel="Sending..."
        tone="warning"
        closeOnSuccess
        isConfirming={isSaving}
        onConfirm={handleConfirmPasswordReset}
      />
      <ConfirmActionDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmActionConfig.title}
        description={confirmActionConfig.description}
        targetLabel={confirmActionConfig.targetLabel}
        confirmLabel={confirmActionConfig.confirmLabel}
        confirmingLabel={confirmActionConfig.confirmingLabel}
        tone={confirmActionConfig.tone}
        closeOnSuccess
        isConfirming={isSaving}
        onConfirm={handleConfirmAction}
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
              canManageUsers={userActionsEnabled}
              canEditUser={userActionsEnabled}
              canResetPassword={userLifecycleActionsEnabled}
              canManageUserLifecycle={userLifecycleActionsEnabled}
              isProtectedUser={selectedUser ? protectedUserIds.includes(selectedUser.id) : false}
              roleDetailsUnavailableReason={canReadRoles ? undefined : roleDetailsUnavailableReason}
              onEditUser={() => selectedUser && openUserEditor(selectedUser)}
              onResetPassword={() => selectedUser && openPasswordResetDialog(selectedUser)}
              onToggleStatus={() => selectedUser && handleToggleStatus(selectedUser)}
              onDeleteUser={() => selectedUser && handleDeleteUser(selectedUser)}
            />
          </SheetContent>
        </Sheet>
      ) : null}
    </SplitShell>
  );
}
