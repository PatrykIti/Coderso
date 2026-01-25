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
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  handlers: RouteHandler[];
};

export type Router = {
  routes: RouteDefinition[];
  get: (path: string, ...handlers: RouteHandler[]) => void;
  post: (path: string, ...handlers: RouteHandler[]) => void;
  patch: (path: string, ...handlers: RouteHandler[]) => void;
  delete: (path: string, ...handlers: RouteHandler[]) => void;
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
    delete: add("DELETE"),
  };
}
