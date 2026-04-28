import { apiRequest } from "./apiClient";

export type AdminUserStatus = "active" | "inactive" | "pending";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  status: AdminUserStatus;
  roleIds: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
};

export type AdminUserCreate = {
  name: string;
  email: string;
  roleIds: string[];
  status?: AdminUserStatus;
  password?: string;
};

export type AdminUserUpdate = {
  name?: string;
  email?: string;
  status?: AdminUserStatus;
  password?: string;
};

export async function listAdminUsers() {
  return apiRequest<AdminUser[]>("/admin-users", { method: "GET" });
}

export async function createAdminUser(payload: AdminUserCreate) {
  return apiRequest<AdminUser>(
    "/admin-users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateAdminUser(id: string, payload: AdminUserUpdate) {
  return apiRequest<AdminUser>(
    `/admin-users/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function enableAdminUser(id: string) {
  return apiRequest<AdminUser>(
    `/admin-users/${id}/enable`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function disableAdminUser(id: string) {
  return apiRequest<AdminUser>(
    `/admin-users/${id}/disable`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function replaceAdminUserRoles(id: string, roleIds: string[]) {
  return apiRequest<AdminUser>(
    `/admin-users/${id}/roles`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds }),
    },
    { withCsrf: true }
  );
}

export async function deleteAdminUser(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/admin-users/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
