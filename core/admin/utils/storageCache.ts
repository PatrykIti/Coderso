export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CacheValidator<T> = (value: unknown) => value is T;

type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
};

type MemoryBackedStorageCacheInput<T> = {
  key: string;
  ttlMs: number;
  validate: CacheValidator<T>;
  storage?: () => StorageLike | null;
};

export type MemoryBackedStorageCache<T> = {
  read: () => T | null;
  readStorageFirst: () => T | null;
  peekFresh: () => T | null;
  write: (value: T) => void;
  clear: () => void;
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
  const parsed = readStorageCacheEnvelope(key, ttlMs, validate, storage);
  return parsed?.value ?? null;
};

const readStorageCacheEnvelope = <T>(
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
    return parsed;
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

export const createMemoryBackedStorageCache = <T>({
  key,
  ttlMs,
  validate,
  storage,
}: MemoryBackedStorageCacheInput<T>): MemoryBackedStorageCache<T> => {
  const resolveStorage = storage ?? getLocalStorage;
  let memory: CacheEnvelope<T> | null = null;

  const isFresh = (entry: CacheEnvelope<T>) =>
    Date.now() - entry.savedAt <= ttlMs && validate(entry.value);

  const readMemory = () => {
    if (!memory) return null;
    if (!isFresh(memory)) {
      memory = null;
      return null;
    }
    return memory.value;
  };

  const readStorage = () => {
    const cached = readStorageCacheEnvelope(key, ttlMs, validate, resolveStorage());
    if (!cached) return null;
    memory = cached;
    return cached.value;
  };

  return {
    read: () => readMemory() ?? readStorage(),
    readStorageFirst: () => readStorage() ?? readMemory(),
    peekFresh: readMemory,
    write: (value: T) => {
      const savedAt = Date.now();
      memory = { value, savedAt };
      writeStorageCache(key, value, resolveStorage());
    },
    clear: () => {
      memory = null;
      clearStorageCache(key, resolveStorage());
    },
  };
};

export const createMemoryBackedLocalCache = <T>(
  input: Omit<MemoryBackedStorageCacheInput<T>, "storage">
) => createMemoryBackedStorageCache({ ...input, storage: getLocalStorage });
