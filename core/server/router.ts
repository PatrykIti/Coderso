import { ApiError } from "./errorHandler";

export type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  headers?: Record<string, string | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: { id: string; email?: string; name?: string | null };
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  requestStart?: number;
  setCookie?: (name: string, value: string, options: CookieOptions) => void;
  clearCookie?: (name: string) => void;
  setResponseHeader?: <K extends keyof RouteResponseHeaderContractV1>(
    name: K,
    value: RouteResponseHeaderContractV1[K]
  ) => void;
};

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
};

/**
 * Closed v1 response-header contract for route handlers (TASK-551-08-L03
 * INITIAL). Exactly these name/value pairs are accepted; anything else fails
 * `route_response_header_invalid` before any mutation.
 */
export type RouteResponseHeaderContractV1 = Readonly<{
  "Cache-Control": "private, no-store, max-age=0";
  Pragma: "no-cache";
  Expires: "0";
}>;

const ROUTE_RESPONSE_HEADER_CONTRACT_V1: RouteResponseHeaderContractV1 = Object.freeze({
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
});

type RouteResponseHeaderNameV1 = keyof RouteResponseHeaderContractV1;

/** ASCII-lowercase lookup key -> contract pair. */
type RouteResponseHeaderLookupKeyV1 = "cache-control" | "pragma" | "expires";

type RouteResponseHeaderPairTableV1 = Readonly<
  Record<
    RouteResponseHeaderLookupKeyV1,
    Readonly<{ name: RouteResponseHeaderNameV1; value: string }>
  >
>;

/**
 * Lookup table kept prototype-free (`Object.create(null)`), so exotic names
 * such as "__proto__" or "constructor" resolve to plain undefined instead of
 * inherited object members. Safety never rests on strict-value equality alone.
 */
const ROUTE_RESPONSE_HEADER_PAIRS_V1: RouteResponseHeaderPairTableV1 = Object.freeze(
  Object.assign(Object.create(null), {
    "cache-control": Object.freeze({
      name: "Cache-Control",
      value: ROUTE_RESPONSE_HEADER_CONTRACT_V1["Cache-Control"],
    }),
    pragma: Object.freeze({
      name: "Pragma",
      value: ROUTE_RESPONSE_HEADER_CONTRACT_V1.Pragma,
    }),
    expires: Object.freeze({
      name: "Expires",
      value: ROUTE_RESPONSE_HEADER_CONTRACT_V1.Expires,
    }),
  })
);

const ROUTE_RESPONSE_HEADER_MAX_VALUE_BYTES_V1 = 64;

/** Machine-readable failure code emitted for every rejected write. */
const ROUTE_RESPONSE_HEADER_INVALID_CODE = "route_response_header_invalid";

const rejectRouteResponseHeader = (): never => {
  throw new ApiError(ROUTE_RESPONSE_HEADER_INVALID_CODE, "Route response header rejected.", 400);
};

/**
 * True when the string carries any code unit that must never reach the wire
 * from this seam: C0 controls, DEL, C1 controls (U+0080..U+009F), the byte-order
 * mark, zero-width/direction-mark format characters (U+200B..U+200F),
 * line/paragraph separators and invisible operators (U+2060..U+2064). Exact-match
 * acceptance already rejects every contract mismatch; this scan only hardens a
 * future widened contract against header smuggling.
 */
const hasControlByte = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
    if (code >= 0x80 && code <= 0x9f) return true;
    if (code === 0xfeff) return true;
    if (code >= 0x200b && code <= 0x200f) return true;
    if (code === 0x2028 || code === 0x2029) return true;
    if (code >= 0x2060 && code <= 0x2064) return true;
  }
  return false;
};

const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * Header-name case folding restricted to A-Z so Unicode lookalikes can never
 * alias a contract key (e.g. U+212A KELVIN SIGN, whose full Unicode lowercase
 * fold is "k", or Turkish dotted I, which folds to two code points).
 */
const asciiLowercaseName = (value: string): string =>
  value.replace(/[A-Z]/g, (char) => char.toLowerCase());

/**
 * Write-only, request-local collector for the closed v1 route-response-header
 * contract. `set` validates strictly and mutates only after every check passes;
 * handlers receive the closure bound to it and can neither read nor obtain the
 * bag itself.
 */
export type RouteResponseHeaderBag = {
  set: (name: string, value: string) => void;
  entries: () => ReadonlyArray<readonly [RouteResponseHeaderNameV1, string]>;
};

export function createRouteResponseHeaderBag(): RouteResponseHeaderBag {
  const accepted = new Map<RouteResponseHeaderLookupKeyV1, string>();

  const set = (rawName: string, rawValue: string): void => {
    if (typeof rawName !== "string" || typeof rawValue !== "string") rejectRouteResponseHeader();
    if (hasControlByte(rawName) || hasControlByte(rawValue)) rejectRouteResponseHeader();

    const key = asciiLowercaseName(rawName) as RouteResponseHeaderLookupKeyV1;
    const pair: RouteResponseHeaderPairTableV1[RouteResponseHeaderLookupKeyV1] | undefined =
      ROUTE_RESPONSE_HEADER_PAIRS_V1[key];
    if (!pair) rejectRouteResponseHeader();
    if (utf8ByteLength(rawValue) > ROUTE_RESPONSE_HEADER_MAX_VALUE_BYTES_V1) {
      rejectRouteResponseHeader();
    }
    if (rawValue !== pair.value) rejectRouteResponseHeader();

    const previous = accepted.get(key);
    if (previous !== undefined && previous !== rawValue) rejectRouteResponseHeader();

    accepted.set(key, rawValue);
  };

  return {
    set,
    entries: () =>
      Object.freeze(
        [...accepted.entries()].map(([key, value]) =>
          Object.freeze([ROUTE_RESPONSE_HEADER_PAIRS_V1[key].name, value] as const)
        )
      ),
  };
}

export type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

export type RouteDefinition = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  handlers: RouteHandler[];
};

export type Router = {
  routes: RouteDefinition[];
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  put: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
  static: (path: string, ...handlers: RouteHandler[]) => void;
};

export function createRouter(): Router {
  const routes: RouteDefinition[] = [];

  const add =
    (method: RouteDefinition["method"]) =>
    (path: string, ...handlers: RouteHandler[]) => {
      routes.push({ method, path, handlers });
    };

  return {
    routes,
    get: add("GET"),
    post: add("POST"),
    patch: add("PATCH"),
    put: add("PUT"),
    delete: add("DELETE"),
    static: add("GET"),
  };
}

export function normalizePath(input: string) {
  const base = input.split("?")[0] ?? input;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function matchRoute(pathPattern: string, path: string) {
  const normalizedPattern = normalizePath(pathPattern);
  const normalizedPath = normalizePath(path);

  const patternParts = normalizedPattern.split("/").filter(Boolean);
  const pathParts = normalizedPath.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return { matched: false, params: {} as Record<string, string> };
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const part = patternParts[index];
    const value = pathParts[index];
    if (part?.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value ?? "");
      continue;
    }
    if (part !== value) {
      return { matched: false, params: {} };
    }
  }

  return { matched: true, params };
}
