type ReadThroughCacheInput<T> = {
  ttlMs: number;
  load: () => Promise<T>;
  now?: () => number;
};

type ReadThroughCacheGetOptions = {
  force?: boolean;
};

export type ReadThroughCache<T> = {
  get: (options?: ReadThroughCacheGetOptions) => Promise<T>;
  peek: () => T | null;
  set: (value: T) => void;
  invalidate: () => void;
};

export const createReadThroughCache = <T>(
  input: ReadThroughCacheInput<T>
): ReadThroughCache<T> => {
  const now = input.now ?? (() => Date.now());
  const ttlMs = Number.isFinite(input.ttlMs) && input.ttlMs > 0 ? input.ttlMs : 0;

  let hasValue = false;
  let value: T | null = null;
  let savedAt = 0;
  let inFlight: Promise<T> | null = null;

  const isFresh = () => hasValue && now() - savedAt <= ttlMs;

  const setValue = (next: T) => {
    value = next;
    hasValue = true;
    savedAt = now();
  };

  return {
    get: async (options?: ReadThroughCacheGetOptions) => {
      if (!options?.force && isFresh()) {
        return value as T;
      }

      if (!options?.force && inFlight) {
        return inFlight;
      }

      const request = input
        .load()
        .then((result) => {
          setValue(result);
          return result;
        })
        .finally(() => {
          inFlight = null;
        });

      inFlight = request;
      return request;
    },
    peek: () => (hasValue ? (value as T) : null),
    set: setValue,
    invalidate: () => {
      hasValue = false;
      value = null;
      savedAt = 0;
    },
  };
};
