import { createContext, useContext } from "react";

export type AdminAssistantConfigValue = {
  enabled: boolean;
  launcherAvatarEnabled: boolean;
  launcherAvatarAsset: string | null;
};

const DEFAULT_ADMIN_ASSISTANT_CONFIG: AdminAssistantConfigValue = {
  enabled: false,
  launcherAvatarEnabled: false,
  launcherAvatarAsset: null,
};

const AdminAssistantConfigContext = createContext<AdminAssistantConfigValue>(
  DEFAULT_ADMIN_ASSISTANT_CONFIG
);

type AdminAssistantConfigProviderProps = {
  value: AdminAssistantConfigValue;
  children: React.ReactNode;
};

export function AdminAssistantConfigProvider({
  value,
  children,
}: AdminAssistantConfigProviderProps) {
  return (
    <AdminAssistantConfigContext.Provider value={value}>
      {children}
    </AdminAssistantConfigContext.Provider>
  );
}

export function useAdminAssistantConfig() {
  return useContext(AdminAssistantConfigContext);
}
