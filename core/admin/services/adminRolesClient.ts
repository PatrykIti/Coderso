import { apiRequest } from "./apiClient";

export type PermissionItem = {
  id: string;
  label: string;
  description?: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: PermissionItem[];
};

export type AdminRole = {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  system?: boolean;
};

export type AdminRoleCreate = {
  name: string;
  description?: string;
  permissions: string[];
  sourceRoleId?: string;
  sourceRoleName?: string;
};

export type AdminRoleUpdate = Partial<AdminRoleCreate>;

export async function listAdminRoles() {
  return apiRequest<AdminRole[]>("/admin-roles", { method: "GET" });
}

export async function listPermissionCatalog() {
  return apiRequest<PermissionGroup[]>("/admin-roles/permissions", {
    method: "GET",
  });
}

export async function createAdminRole(payload: AdminRoleCreate) {
  return apiRequest<AdminRole>(
    "/admin-roles",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateAdminRole(id: string, payload: AdminRoleUpdate) {
  return apiRequest<AdminRole>(
    `/admin-roles/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteAdminRole(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/admin-roles/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
