import { ApiError, toErrorResponse } from "./errorHandler";
import { checkRateLimit } from "./middleware/rateLimit";
import { parseRequestBody } from "./requestBody";
import { validate } from "./validation/schemaValidator";
import { getEntryAccessPasswordHash } from "../services/content/entryReadService";
import {
  createEntryUnlockToken,
  hashEntryCookieId,
  resolveEntryUnlockTtlMs,
} from "../services/content/entryUnlockToken";
import { hashPassword, verifyPassword } from "../services/auth/password";
import type { SecuritySettings } from "../services/settings/securitySettings";

const UNLOCK_RE = /^\/entries\/([^/]+)\/unlock$/;

const unlockSchema = {
  type: "object",
  properties: {
    password: { type: "string", minLength: 1, maxLength: 256 },
    // return path is accepted (same-origin validated) so the strict validator
    // does not 400 the real prompt form which POSTs { password, returnPath }.
    returnPath: { type: "string", maxLength: 2048 },
  },
  required: ["password"],
  additionalProperties: false,
} as const;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// LOCAL copy mirroring publicFormsApi.ts errorResponse (that helper is a
// file-local non-exported const). Construct failures as ApiError, wrap the
// handler body in try/catch, and map through toErrorResponse.
const errorResponse = (error: unknown) => {
  const mapped =
    error instanceof ApiError ? error : new ApiError("internal_error", "Unexpected error", 500);
  return jsonResponse(toErrorResponse(mapped), mapped.status);
};

// LOW (a): DUMMY_ARGON2_HASH MUST be produced by the LIVE hashPassword (Argon2id
// defaultOptions) so its embedded m/t/p params are byte-identical to real entry
// hashes — never a hand-pinned literal with different params. Memoized per deps
// instance (the default deps singleton memoizes across production requests; test
// deps are fresh objects, so tests never pollute each other).
const dummyHashMemo = new WeakMap<EntryUnlockApiDeps, Promise<string>>();
const resolveDummyArgon2Hash = (deps: EntryUnlockApiDeps) => {
  let promise = dummyHashMemo.get(deps);
  if (!promise) {
    promise = deps.hashPassword("entry-unlock-dummy-throwaway");
    dummyHashMemo.set(deps, promise);
  }
  return promise;
};

export type EntryUnlockApiDeps = {
  verifyPassword: (hash: string, password: string) => Promise<boolean>;
  getEntryAccessPasswordHash: (entryId: string) => Promise<string | null>;
  hashPassword: (password: string) => Promise<string>;
};

const defaultEntryUnlockApiDeps: EntryUnlockApiDeps = {
  verifyPassword,
  getEntryAccessPasswordHash,
  hashPassword,
};

let entryUnlockApiTestDeps: Partial<EntryUnlockApiDeps> | null = null;

// Mirrors __setFormWriteExecutorDepsForTests: lets the Bun flow suite spy on the
// argon2 verify path (timing-parity assertion) without wall-clock thresholds.
export function __setEntryUnlockApiDepsForTests(
  overrides: Partial<EntryUnlockApiDeps> | null
): void {
  if (process.env.NODE_ENV === "production" && overrides !== null) {
    throw new Error("entry_unlock_api_test_override_forbidden_in_production");
  }
  entryUnlockApiTestDeps = overrides === null ? null : { ...overrides };
}

const resolveDeps = (): EntryUnlockApiDeps => ({
  ...defaultEntryUnlockApiDeps,
  ...(entryUnlockApiTestDeps ?? {}),
});

// PINNED same-origin return-path contract (TASK-517-02-L02). Rejects raw URLs,
// protocol-relative, backslash, encoded-double-slash and leading-control-char
// vectors; falls back to a same-origin-re-validated Referer, then "/".
const resolveSafeEntryReturnPath = (
  candidate: string | undefined | null,
  req: Request,
  url: URL
): string => {
  const validateSameOriginPath = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    let decoded: string;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    let parsed: URL;
    try {
      parsed = new URL(decoded, url.origin);
    } catch {
      return null;
    }
    if (parsed.origin !== url.origin) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  };

  const fromBody = validateSameOriginPath(candidate);
  if (fromBody !== null) return fromBody;

  const referer = req.headers.get("referer");
  const fromReferer = referer ? validateSameOriginPath(referer) : null;
  if (fromReferer !== null) return fromReferer;

  return "/";
};

export async function handlePublicEntryUnlockApi(
  req: Request,
  ctx: { url: URL; ip?: string; userAgent?: string; security: SecuritySettings }
): Promise<Response | null> {
  const m = UNLOCK_RE.exec(ctx.url.pathname);
  if (!m) return null; // not our route → let dispatch continue

  try {
    if (req.method !== "POST") {
      throw new ApiError("method_not_allowed", "Method Not Allowed", 405);
    }

    // LOW (b): SAFE decode — a malformed %-sequence in the path segment makes
    // decodeURIComponent throw URIError → 400, never a 500.
    let entryId: string;
    try {
      entryId = decodeURIComponent(m[1]!);
    } catch {
      throw new ApiError("validation_error", "Invalid entry id", 400);
    }

    checkRateLimit(
      "public_write",
      { ip: ctx.ip, userAgent: ctx.userAgent, identifier: entryId },
      ctx.security.rateLimit
    );

    const body = await parseRequestBody(req);
    validate(unlockSchema, body); // reject-unknown → 400 on extra keys (throws ApiError)
    const submitted = (body as { password: string }).password;
    const deps = resolveDeps();

    // UNIFORM FAILURE (body AND timing): wrong password, no hash (no password/no
    // entry), non-password entry all return the SAME 401 shape AND pay the SAME
    // argon2 cost — never confirm which entries exist by response OR by latency.
    const hash = await deps.getEntryAccessPasswordHash(entryId); // null if no entry / no password
    const ok = hash
      ? await deps.verifyPassword(hash, submitted)
      : (await deps.verifyPassword(await resolveDummyArgon2Hash(deps), submitted), false);
    if (!ok) {
      throw new ApiError("entry_unlock_failed", "Unable to unlock entry", 401);
    }

    const token = createEntryUnlockToken(entryId);
    const cookieName = `entry_unlock_${hashEntryCookieId(entryId)}`;
    // LOW (c): grounded secure/maxAge — mirrors buildSessionCookieOptions
    // (sessionService.ts:53-68): COOKIE_SECURE override, else NODE_ENV==='production'.
    const secureOverride = process.env.COOKIE_SECURE;
    const secure =
      secureOverride !== undefined
        ? secureOverride !== "false"
        : process.env.NODE_ENV === "production";
    const maxAge = Math.floor(resolveEntryUnlockTtlMs() / 1000); // same source as the verifier
    // Flag ordering mirrors createCookieValue (httpServer.ts:93).
    const setCookie = `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Strict; HttpOnly${secure ? "; Secure" : ""}`;

    const redirectTo = resolveSafeEntryReturnPath(
      (body as { returnPath?: string }).returnPath,
      req,
      ctx.url
    );
    return new Response(null, {
      status: 302,
      headers: { Location: redirectTo, "Set-Cookie": setCookie },
    });
  } catch (err) {
    return errorResponse(err); // ApiError → its .status; else 500
  }
}
