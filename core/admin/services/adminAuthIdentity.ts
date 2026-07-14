export type AdminAuthIdentitySnapshot = Readonly<{
  userId: string | null;
  epoch: number;
}>;

type AdminAuthIdentityListener = (next: AdminAuthIdentitySnapshot) => void;

let adminAuthIdentity: AdminAuthIdentitySnapshot = { userId: null, epoch: 0 };
let activeAdminAuthPublisher: symbol | null = null;
const adminAuthIdentityListeners = new Set<AdminAuthIdentityListener>();

export function getAdminAuthIdentity(): AdminAuthIdentitySnapshot {
  return adminAuthIdentity;
}

export function subscribeAdminAuthIdentity(listener: AdminAuthIdentityListener): () => void {
  adminAuthIdentityListeners.add(listener);
  return () => adminAuthIdentityListeners.delete(listener);
}

export function publishAdminAuthIdentity(
  publisher: symbol,
  userId: string | null
): AdminAuthIdentitySnapshot {
  if (activeAdminAuthPublisher === publisher && adminAuthIdentity.userId === userId) {
    return adminAuthIdentity;
  }
  activeAdminAuthPublisher = publisher;
  adminAuthIdentity = { userId, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
  return adminAuthIdentity;
}

export function clearAdminAuthIdentity(publisher: symbol): void {
  if (activeAdminAuthPublisher !== publisher) return;
  activeAdminAuthPublisher = null;
  adminAuthIdentity = { userId: null, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
}
