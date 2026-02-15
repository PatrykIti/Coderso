export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CacheValidator<T> = (value: unknown) => value is T;

type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
};

const getStorage = (storage?: StorageLike | null) => {
  if (storage) return storage;
  return null;
};

export const getLocalStorage = () => {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
};

export const getSessionStorage = () => {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
};

export const readStorageCache = <T>(
  key: string,
  ttlMs: number,
  validate: CacheValidator<T>,
  storage?: StorageLike | null
) => {
  const target = getStorage(storage);
  if (!target) return null;
  const raw = target.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T> | null;
    if (!parsed || typeof parsed.savedAt !== "number") {
      target.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > ttlMs) {
      target.removeItem(key);
      return null;
    }
    if (!validate(parsed.value)) {
      target.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    target.removeItem(key);
    return null;
  }
};

export const writeStorageCache = <T>(
  key: string,
  value: T,
  storage?: StorageLike | null
) => {
  const target = getStorage(storage);
  if (!target) return;
  const payload: CacheEnvelope<T> = { value, savedAt: Date.now() };
  target.setItem(key, JSON.stringify(payload));
};

export const clearStorageCache = (key: string, storage?: StorageLike | null) => {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(key);
};

export const readLocalCache = <T>(
  key: string,
  ttlMs: number,
  validate: CacheValidator<T>
) => readStorageCache(key, ttlMs, validate, getLocalStorage());

export const writeLocalCache = <T>(key: string, value: T) =>
  writeStorageCache(key, value, getLocalStorage());

export const clearLocalCache = (key: string) =>
  clearStorageCache(key, getLocalStorage());

export const readSessionCache = <T>(
  key: string,
  ttlMs: number,
  validate: CacheValidator<T>
) => readStorageCache(key, ttlMs, validate, getSessionStorage());

export const writeSessionCache = <T>(key: string, value: T) =>
  writeStorageCache(key, value, getSessionStorage());

export const clearSessionCache = (key: string) =>
  clearStorageCache(key, getSessionStorage());
