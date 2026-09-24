// Page-lifetime authority for Admin browser cache installation. A token captured
// before an async read may install its result only while it is still current;
// advancing the authority invalidates every outstanding token and synchronously
// runs the registered module cache resets. Tokens and resets carry no identity.
// This module has zero value imports and touches no host global, network or
// hashing API at import or call time.

declare const tokenBrand: unique symbol;
export type AdminCacheInstallationToken = { readonly [tokenBrand]: never };

const AUTHORITY_INVALID = "admin_cache_authority_invalid";

// Frozen, prototype-less and own-key-less, so it serializes to "{}".
const mintToken = (): AdminCacheInstallationToken =>
  Object.freeze(Object.create(null)) as AdminCacheInstallationToken;

// A reset returning a thenable gets a no-op rejection handler so a rejected
// promise never surfaces as an unhandled rejection.
const swallowThenable = (result: unknown): void => {
  if (result !== null && (typeof result === "object" || typeof result === "function")) {
    try {
      const then = (result as { then?: unknown }).then;
      if (typeof then === "function") {
        then.call(
          result,
          () => undefined,
          () => undefined
        );
      }
    } catch {
      // A throwing `then` getter is swallowed like a throwing reset.
    }
  }
};

export const createAdminCacheInstallationAuthority = (options?: { initialGeneration?: number }) => {
  // `=== undefined`, not `??`: an explicit null must reach validation and throw.
  const initial = options?.initialGeneration === undefined ? 0 : options.initialGeneration;
  if (!Number.isSafeInteger(initial) || initial < 0) {
    throw new TypeError(AUTHORITY_INVALID);
  }
  let generation: number = initial;
  let disabled = false;
  let currentToken: AdminCacheInstallationToken = mintToken();
  // Insertion-ordered; each value is the live registration record for that reset.
  const resets = new Map<() => void, object>();

  // After the overflow disable every capture is a fresh never-current sentinel.
  const capture = (): AdminCacheInstallationToken => (disabled ? mintToken() : currentToken);

  const isCurrent = (token: unknown): boolean => !disabled && token === currentToken;

  const register = (reset: () => void): (() => void) => {
    // Keyed by reference: a duplicate registration adds nothing.
    let record = resets.get(reset);
    if (record === undefined) {
      record = {};
      resets.set(reset, record);
    }
    const bound = record;
    // Per-handle flag: every unsubscribe handle is single-use.
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      // A stale handle from an earlier registration of the same function is a
      // no-op after re-registration, because its record is no longer live.
      if (resets.get(reset) === bound) resets.delete(reset);
    };
  };

  const advance = (): void => {
    // Step 1: generation or disable, then a NEW token, before any dispatch.
    // At the safe-integer ceiling the authority never wraps or reuses a token.
    if (generation === Number.MAX_SAFE_INTEGER) disabled = true;
    else generation += 1;
    currentToken = mintToken();
    // Step 2: dispatch over a SNAPSHOT in registration (insertion) order.
    for (const reset of [...resets.keys()]) {
      try {
        swallowThenable((reset as () => unknown)());
      } catch {
        // Swallowed: no rethrow, no scheduled rethrow, no console output.
      }
    }
  };

  return { capture, isCurrent, register, advance };
};

const defaultAuthority = createAdminCacheInstallationAuthority();

export const captureAdminCacheInstallationToken = (): AdminCacheInstallationToken =>
  defaultAuthority.capture();

export const isCurrentAdminCacheInstallationToken = (token: unknown): boolean =>
  defaultAuthority.isCurrent(token);

export const registerAdminModuleCacheReset = (reset: () => void): (() => void) =>
  defaultAuthority.register(reset);

export const advanceAdminCacheInstallationAuthority = (): void => defaultAuthority.advance();
