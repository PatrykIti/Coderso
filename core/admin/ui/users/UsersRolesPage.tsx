import { useMemo, useState } from "react";
import { UserPlus, UserCog } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionHeader } from "@/ui/shared/SectionHeader";

import { RoleEditor } from "../roles/RoleEditor";
import { RoleList } from "../roles/RoleList";
import type { RoleDraft, RoleSummary } from "../roles/types";
import { UserDetailsDrawer } from "./UserDetailsDrawer";
import { UserEditor } from "./UserEditor";
import { UserFilters } from "./UserFilters";
import { UserList } from "./UserList";
import type { UserDraft, UserSummary } from "./types";

const defaultPermissions = ["users:read", "users:write", "roles:read", "roles:write"];

const seedRoles: RoleSummary[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access to all admin modules.",
    permissions: ["*"],
    system: true,
  },
  {
    id: "editor",
    name: "Editor",
    description: "Content and media management permissions.",
    permissions: [
      "content:read",
      "content:write",
      "content:publish",
      "media:read",
      "media:write",
      "menus:read",
      "menus:write",
      "settings:read",
    ],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to content and settings.",
    permissions: [
      "content:read",
      "media:read",
      "menus:read",
      "settings:read",
    ],
  },
  {
    id: "api",
    name: "API Access",
    description: "Programmatic access for automation workflows.",
    permissions: ["content:read", "media:read"],
  },
];

const seedUsers: UserSummary[] = [
  {
    id: "sarah",
    name: "Sarah Jenks",
    email: "sarah@nextless.com",
    roleIds: ["admin"],
    status: "active",
    lastActive: "2 mins ago",
    mfaEnabled: true,
  },
  {
    id: "michael",
    name: "Michael Chen",
    email: "m.chen@nextless.com",
    roleIds: ["editor"],
    status: "inactive",
    lastActive: "Yesterday",
  },
  {
    id: "dev-bot",
    name: "Dev Bot",
    email: "bot@nextless.com",
    roleIds: ["api"],
    status: "active",
    lastActive: "10 mins ago",
  },
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex@nextless.com",
    roleIds: ["viewer"],
    status: "pending",
    lastActive: "Pending invite",
  },
];

const hasPermission = (permissions: string[], permission: string) =>
  permissions.includes("*") || permissions.includes(permission);

const createLocalId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export type UsersRolesPageProps = {
  permissions?: string[];
};

export function UsersRolesPage({ permissions = defaultPermissions }: UsersRolesPageProps) {
  const [users, setUsers] = useState<UserSummary[]>(seedUsers);
  const [roles, setRoles] = useState<RoleSummary[]>(seedRoles);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("any");
  const [selectedUserId, setSelectedUserId] = useState(seedUsers[0]?.id ?? "");
  const [selectedRoleId, setSelectedRoleId] = useState(seedRoles[0]?.id ?? "");
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  const [editingRole, setEditingRole] = useState<RoleSummary | null>(null);
  const [userEditorOpen, setUserEditorOpen] = useState(false);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [userEditorSeed, setUserEditorSeed] = useState(0);
  const [roleEditorSeed, setRoleEditorSeed] = useState(0);

  const canManageUsers = hasPermission(permissions, "users:write");
  const canManageRoles = hasPermission(permissions, "roles:write");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesRole =
        roleFilter === "all" || user.roleIds.includes(roleFilter);
      const matchesStatus =
        statusFilter === "any" || user.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const selectedUser = useMemo(() => {
    return (
      users.find((user) => user.id === selectedUserId) ?? filteredUsers[0]
    );
  }, [filteredUsers, selectedUserId, users]);

  const adminUsers = useMemo(
    () => users.filter((user) => user.roleIds.includes("admin")),
    [users]
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

  const handleSaveUser = (draft: UserDraft, mode: "create" | "edit") => {
    if (mode === "edit" && editingUser) {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === editingUser.id
            ? { ...user, ...draft, lastActive: user.lastActive }
            : user
        )
      );
      setSelectedUserId(editingUser.id);
      return;
    }

    const id = createLocalId("user");
    const nextUser: UserSummary = {
      id,
      ...draft,
      lastActive: "Invited just now",
      mfaEnabled: false,
    };
    setUsers((prev) => [nextUser, ...prev]);
    setSelectedUserId(id);
  };

  const handleSaveRole = (draft: RoleDraft, mode: "create" | "edit") => {
    if (mode === "edit" && editingRole) {
      setRoles((prev) =>
        prev.map((role) =>
          role.id === editingRole.id ? { ...role, ...draft } : role
        )
      );
      setSelectedRoleId(editingRole.id);
      return;
    }

    const id = createLocalId(draft.name.toLowerCase().replace(/\s+/g, "-"));
    const nextRole: RoleSummary = {
      id,
      ...draft,
      system: false,
    };
    setRoles((prev) => [nextRole, ...prev]);
    setSelectedRoleId(id);
  };

  const handleToggleStatus = (user: UserSummary) => {
    const nextStatus = user.status === "inactive" ? "active" : "inactive";
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, status: nextStatus } : item
      )
    );
  };

  const handleDeleteUser = (user: UserSummary) => {
    if (protectedUserIds.includes(user.id)) return;
    setUsers((prev) => {
      const next = prev.filter((item) => item.id !== user.id);
      if (selectedUserId === user.id) {
        setSelectedUserId(next[0]?.id ?? "");
      }
      return next;
    });
  };

  const handleDeleteRole = (role: RoleSummary) => {
    if (role.system || role.id === "admin") return;
    setRoles((prev) => prev.filter((item) => item.id !== role.id));
    setUsers((prev) =>
      prev.map((user) => {
        const nextRoles = user.roleIds.filter((id) => id !== role.id);
        const fallbackRole = roles.find((item) => item.id !== role.id);
        return {
          ...user,
          roleIds: nextRoles.length
            ? nextRoles
            : fallbackRole
              ? [fallbackRole.id]
              : [],
        };
      })
    );
  };

  const handleDuplicateRole = (role: RoleSummary) => {
    const duplicate: RoleSummary = {
      ...role,
      id: createLocalId(role.id),
      name: `${role.name} copy`,
      system: false,
    };
    setRoles((prev) => [duplicate, ...prev]);
    setSelectedRoleId(duplicate.id);
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

  const readOnly = !canManageUsers || !canManageRoles;

  return (
    <SplitShell
      activeHref="/admin/users"
      rightPanel={
        <UserDetailsDrawer
          user={selectedUser}
          roles={roles}
          canManageUsers={canManageUsers}
          onEditUser={() => selectedUser && openUserEditor(selectedUser)}
          onResetPassword={() => undefined}
        />
      }
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">Users & Roles</span>
        </div>
      }
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
                disabled={!canManageRoles}
              >
                <UserCog className="h-4 w-4" />
                Create Role
              </Button>
              <Button
                className="gap-2"
                onClick={() => openUserEditor()}
                disabled={!canManageUsers}
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </Button>
            </div>
          }
        />
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
          canManageUsers={canManageUsers}
          onSelect={setSelectedUserId}
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
                disabled={!canManageRoles}
              >
                Create role
              </Button>
            }
          />
          <RoleList
            roles={roles}
            selectedId={selectedRoleId}
            usageCounts={roleUsageCounts}
            canManageRoles={canManageRoles}
            onSelect={setSelectedRoleId}
            onEdit={openRoleEditor}
            onDuplicate={handleDuplicateRole}
            onDelete={handleDeleteRole}
          />
        </div>
      </div>
      <UserEditor
        key={`${editingUser?.id ?? "new"}-${userEditorSeed}`}
        open={userEditorOpen}
        user={editingUser}
        roles={roles}
        lockedRoleIds={
          editingUser && protectedUserIds.includes(editingUser.id)
            ? ["admin"]
            : []
        }
        canManageUsers={canManageUsers}
        onOpenChange={setUserEditorOpen}
        onSave={handleSaveUser}
      />
      <RoleEditor
        key={`${editingRole?.id ?? "new"}-${roleEditorSeed}`}
        open={roleEditorOpen}
        role={editingRole}
        canManageRoles={canManageRoles}
        onOpenChange={setRoleEditorOpen}
        onSave={handleSaveRole}
      />
    </SplitShell>
  );
}
