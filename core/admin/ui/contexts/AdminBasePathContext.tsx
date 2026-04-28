import { createContext, useContext } from "react";

import { DEFAULT_ADMIN_PATH, resolveAdminBasePath } from "@/utils/adminPaths";

const AdminBasePathContext = createContext(DEFAULT_ADMIN_PATH);

type AdminBasePathProviderProps = {
  value?: string;
  children: React.ReactNode;
};

export function AdminBasePathProvider({
  value,
  children,
}: AdminBasePathProviderProps) {
  const resolved = value ? resolveAdminBasePath(value) : DEFAULT_ADMIN_PATH;
  return (
    <AdminBasePathContext.Provider value={resolved}>
      {children}
    </AdminBasePathContext.Provider>
  );
}

export function useAdminBasePath() {
  return useContext(AdminBasePathContext);
}
