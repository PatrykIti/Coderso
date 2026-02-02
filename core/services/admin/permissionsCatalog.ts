export type PermissionItem = {
  id: string;
  label: string;
  description: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: PermissionItem[];
};

const permissionGroups: PermissionGroup[] = [
  {
    id: "content",
    label: "Content",
    permissions: [
      {
        id: "content:read",
        label: "Read content",
        description: "View pages and content entries",
      },
      {
        id: "content:write",
        label: "Create and edit content",
        description: "Create new pages and edit drafts",
      },
      {
        id: "content:publish",
        label: "Publish content",
        description: "Publish and unpublish content items",
      },
    ],
  },
  {
    id: "widgets",
    label: "Widgets",
    permissions: [
      {
        id: "widgets:read",
        label: "View widgets",
        description: "Browse widget library and templates",
      },
      {
        id: "widgets:write",
        label: "Manage widgets",
        description: "Create, edit, and delete widget templates",
      },
    ],
  },
  {
    id: "media",
    label: "Media",
    permissions: [
      {
        id: "media:read",
        label: "View media",
        description: "Browse media library items",
      },
      {
        id: "media:write",
        label: "Manage media",
        description: "Upload, edit, and delete media assets",
      },
    ],
  },
  {
    id: "menus",
    label: "Menus",
    permissions: [
      {
        id: "menus:read",
        label: "View menus",
        description: "Read navigation menus and links",
      },
      {
        id: "menus:write",
        label: "Edit menus",
        description: "Create and update navigation menus",
      },
    ],
  },
  {
    id: "forms",
    label: "Forms",
    permissions: [
      {
        id: "forms:read",
        label: "View forms",
        description: "Browse form definitions and submissions",
      },
      {
        id: "forms:write",
        label: "Manage forms",
        description: "Create, edit, and publish form definitions",
      },
    ],
  },
  {
    id: "themes",
    label: "Themes",
    permissions: [
      {
        id: "themes:read",
        label: "View themes",
        description: "Inspect theme templates and profiles",
      },
      {
        id: "themes:write",
        label: "Edit themes",
        description: "Create and update theme profiles",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [
      {
        id: "settings:read",
        label: "View settings",
        description: "Read system and security settings",
      },
      {
        id: "settings:write",
        label: "Edit settings",
        description: "Update system settings and integrations",
      },
    ],
  },
  {
    id: "plugins",
    label: "Plugins & Store",
    permissions: [
      {
        id: "plugins:read",
        label: "View plugins",
        description: "Review installed plugins and status",
      },
      {
        id: "plugins:manage",
        label: "Manage plugins",
        description: "Install, update, or remove plugins",
      },
      {
        id: "store:browse",
        label: "Browse plugin store",
        description: "Search available plugins and widgets",
      },
    ],
  },
  {
    id: "users",
    label: "Users & Roles",
    permissions: [
      {
        id: "users:read",
        label: "View users",
        description: "Read user profiles and activity",
      },
      {
        id: "users:write",
        label: "Manage users",
        description: "Invite, edit, disable, and remove users",
      },
      {
        id: "roles:read",
        label: "View roles",
        description: "Inspect roles and permission sets",
      },
      {
        id: "roles:write",
        label: "Manage roles",
        description: "Create, edit, and delete roles",
      },
    ],
  },
  {
    id: "audit",
    label: "Audit & Logs",
    permissions: [
      {
        id: "audit:read",
        label: "View audit logs",
        description: "Read audit trail and compliance logs",
      },
    ],
  },
  {
    id: "backups",
    label: "Backups",
    permissions: [
      {
        id: "backups:read",
        label: "View backups",
        description: "Read backup history and schedules",
      },
      {
        id: "backups:write",
        label: "Manage backups",
        description: "Create, restore, and manage backups",
      },
    ],
  },
];

export function listPermissions() {
  return permissionGroups.map((group) => ({
    ...group,
    permissions: [...group.permissions],
  }));
}

export function listPermissionIds() {
  return permissionGroups.flatMap((group) =>
    group.permissions.map((permission) => permission.id)
  );
}
