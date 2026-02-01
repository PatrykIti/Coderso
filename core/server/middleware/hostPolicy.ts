import { getSetting } from "../../services/settings/settingsService";

export type HostPolicyDecision = {
  allow: boolean;
  reason?: "admin_host_required" | "public_host_required" | "host_mismatch";
};

const extractHost = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-host");
  const raw = forwarded ? forwarded.split(",")[0]?.trim() : req.headers.get("host");
  return raw ? raw.toLowerCase() : null;
};

const hostFromBaseUrl = (value: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeAdminPath = (path: string) => {
  const trimmed = path.trim();
  if (!trimmed) return "/admin";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.length > 1 && prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
};

const isAdminPath = (pathname: string, adminPath: string) =>
  pathname === adminPath || pathname.startsWith(`${adminPath}/`);
const isMediaPath = (pathname: string) => pathname.startsWith("/media");

export const evaluateHostPolicy = (input: {
  requestHost: string | null;
  pathname: string;
  adminBaseUrl: string | null;
  publicBaseUrl: string | null;
  adminPath: string;
}): HostPolicyDecision => {
  const adminHost = hostFromBaseUrl(input.adminBaseUrl);
  const publicHost = hostFromBaseUrl(input.publicBaseUrl);
  const adminPath = normalizeAdminPath(input.adminPath);

  if (!adminHost && !publicHost) return { allow: true };
  if (adminHost && !publicHost) return { allow: true };
  if (!adminHost && publicHost) return { allow: true };
  if (adminHost && publicHost && adminHost === publicHost) return { allow: true };

  const requestHost = input.requestHost;
  if (!requestHost) return { allow: true };

  if (requestHost === adminHost) {
    if (isAdminPath(input.pathname, adminPath) || isMediaPath(input.pathname)) {
      return { allow: true };
    }
    return { allow: false, reason: "public_host_required" };
  }

  if (requestHost === publicHost) {
    if (isAdminPath(input.pathname, adminPath)) {
      return { allow: false, reason: "admin_host_required" };
    }
    return { allow: true };
  }

  return { allow: false, reason: "host_mismatch" };
};

export async function enforceHostPolicy(req: Request) {
  const [adminBaseUrl, publicBaseUrl, adminPath, adminRedirectEnabled] = await Promise.all([
    getSetting("site.adminBaseUrl"),
    getSetting("site.publicBaseUrl"),
    getSetting("site.adminPath"),
    getSetting("site.adminRedirectEnabled"),
  ]);
  const adminHost = hostFromBaseUrl(
    typeof adminBaseUrl === "string" ? adminBaseUrl : null
  );
  const url = new URL(req.url);
  const requestHost = extractHost(req);
  const normalizedAdminPath = normalizeAdminPath(
    typeof adminPath === "string" ? adminPath : "/admin"
  );

  if (
    adminHost &&
    requestHost === adminHost &&
    adminRedirectEnabled === true &&
    (url.pathname === "/" || url.pathname === "")
  ) {
    return Response.redirect(`${normalizedAdminPath}/`, 307);
  }
  const decision = evaluateHostPolicy({
    requestHost,
    pathname: url.pathname,
    adminBaseUrl: typeof adminBaseUrl === "string" ? adminBaseUrl : null,
    publicBaseUrl: typeof publicBaseUrl === "string" ? publicBaseUrl : null,
    adminPath: normalizedAdminPath,
  });

  if (decision.allow) return null;
  return new Response("Not Found", { status: 404 });
}
