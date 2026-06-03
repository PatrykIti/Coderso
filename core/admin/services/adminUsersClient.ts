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
};

export type AdminUserUpdate = {
  name?: string;
  email?: string;
  status?: AdminUserStatus;
};

export type AdminUserInvite = {
  name: string;
  email: string;
  roleIds: string[];
  sendSetPasswordInvite: true;
};

export type AdminUserSetPasswordDelivery = {
  delivery: "email";
  status: "sent";
  expiresAt: string;
};

export type AdminUserInviteResult = {
  user: AdminUser;
  setPassword: AdminUserSetPasswordDelivery;
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

export async function inviteUserWithSetPassword(payload: AdminUserInvite) {
  return apiRequest<AdminUserInviteResult>(
    "/admin-users/invite",
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
  return apiRequest<AdminUser>(`/admin-users/${id}/enable`, { method: "POST" }, { withCsrf: true });
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

export async function requestAdminPasswordReset(id: string) {
  return apiRequest<AdminUserSetPasswordDelivery>(
    `/admin-users/${id}/password-reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delivery: "email" }),
    },
    { withCsrf: true }
  );
}
