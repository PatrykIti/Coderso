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
  setCookie?: (name: string, value: string, options: CookieOptions) => void;
  clearCookie?: (name: string) => void;
};

export type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  maxAge: number;
};

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

  const add = (method: RouteDefinition["method"]) =>
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
