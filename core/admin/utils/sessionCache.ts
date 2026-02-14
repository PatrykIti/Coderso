export type SessionCacheValidator<T> = (value: unknown) => value is T;

type SessionCacheEnvelope<T> = {
  value: T;
  savedAt: number;
};

const getSessionStorage = () => {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
};

export const readSessionCache = <T>(
  key: string,
  ttlMs: number,
  validate: SessionCacheValidator<T>
) => {
  const storage = getSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionCacheEnvelope<T> | null;
    if (!parsed || typeof parsed.savedAt !== "number") {
      storage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > ttlMs) {
      storage.removeItem(key);
      return null;
    }
    if (!validate(parsed.value)) {
      storage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const writeSessionCache = <T>(key: string, value: T) => {
  const storage = getSessionStorage();
  if (!storage) return;
  const payload: SessionCacheEnvelope<T> = { value, savedAt: Date.now() };
  storage.setItem(key, JSON.stringify(payload));
};

export const clearSessionCache = (key: string) => {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.removeItem(key);
};
