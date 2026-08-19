// TASK-467 admin authentication: the shared storage-state factory creates a
// browser-ready Playwright auth state from the worker-created credentials.
import { createAdminAuthStorageState } from "../../browser/admin-auth";
import type { AdminAuthStorageStateResult } from "../../browser/admin-auth";

export async function createTask467AuthState(input: {
  readonly adminUrl: string;
  readonly workspace: string;
  readonly storageStatePath: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly environment: NodeJS.ProcessEnv;
}): Promise<AdminAuthStorageStateResult> {
  // The browser authenticates as the uniquely scoped worker-created admin, not
  // a seeded shared account, so the smoke is immune to concurrent-login
  // session caps on shared identities and every created session is owned by
  // the per-run fixture that cleanup/prove must fully remove.
  return createAdminAuthStorageState({
    adminUrl: input.adminUrl,
    workspace: input.workspace,
    storageStatePath: input.storageStatePath,
    environment: Object.freeze({
      ...input.environment,
      CODERSO_PLAYWRIGHT_EMAIL: input.adminEmail,
      CODERSO_PLAYWRIGHT_PASSWORD: input.adminPassword,
    }),
  });
}

export function assertTask467AuthState(result: AdminAuthStorageStateResult): void {
  if (result.attempted !== true || result.authenticated !== true) {
    throw new Error(`task467_auth_failed:${result.error ?? "unknown"}`);
  }
}
