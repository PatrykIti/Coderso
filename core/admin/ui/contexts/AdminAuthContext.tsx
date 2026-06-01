import { createContext, useCallback, useContext, useMemo } from "react";

import { canAdmin, type AdminPermissionSnapshot, type AuthUser } from "@/services/authClient";

type AdminAuthContextValue = {
  user: AuthUser | null;
  permissionSnapshot: AdminPermissionSnapshot | null;
  can: (permission?: string) => boolean;
  refreshPermissions: () => Promise<void>;
};

const defaultContext: AdminAuthContextValue = {
  user: null,
  permissionSnapshot: null,
  can: (permission?: string) => !permission,
  refreshPermissions: async () => undefined,
};

const AdminAuthContext = createContext<AdminAuthContextValue>(defaultContext);

export function AdminAuthProvider({
  children,
  refreshPermissions,
  user,
}: {
  children: React.ReactNode;
  refreshPermissions?: () => Promise<void>;
  user: AuthUser | null;
}) {
  const permissionSnapshot = user?.permissionSnapshot ?? null;
  const can = useCallback(
    (permission?: string) => {
      if (!permission) return true;
      return canAdmin(permission, permissionSnapshot);
    },
    [permissionSnapshot]
  );
  const value = useMemo<AdminAuthContextValue>(
    () => ({
      user,
      permissionSnapshot,
      can,
      refreshPermissions: refreshPermissions ?? defaultContext.refreshPermissions,
    }),
    [can, permissionSnapshot, refreshPermissions, user]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export const useAdminAuth = () => useContext(AdminAuthContext);

export const useAdminCan = () => useAdminAuth().can;
