export interface AdminStrictModeEnv {
  DEV?: boolean;
  VITE_ADMIN_STRICT_MODE?: string;
}

function normalizeFlag(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function shouldEnableAdminStrictMode(env: AdminStrictModeEnv): boolean {
  if (!env.DEV) {
    return false;
  }
  const value = normalizeFlag(env.VITE_ADMIN_STRICT_MODE);
  return value === "true" || value === "1" || value === "on";
}
