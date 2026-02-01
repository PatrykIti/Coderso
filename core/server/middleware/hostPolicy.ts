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

const isAdminPath = (pathname: string) => pathname.startsWith("/admin");
const isMediaPath = (pathname: string) => pathname.startsWith("/media");

export const evaluateHostPolicy = (input: {
  requestHost: string | null;
  pathname: string;
  adminBaseUrl: string | null;
  publicBaseUrl: string | null;
}): HostPolicyDecision => {
  const adminHost = hostFromBaseUrl(input.adminBaseUrl);
  const publicHost = hostFromBaseUrl(input.publicBaseUrl);

  if (!adminHost && !publicHost) return { allow: true };
  if (adminHost && !publicHost) return { allow: true };
  if (!adminHost && publicHost) return { allow: true };
  if (adminHost && publicHost && adminHost === publicHost) return { allow: true };

  const requestHost = input.requestHost;
  if (!requestHost) return { allow: true };

  if (requestHost === adminHost) {
    if (isAdminPath(input.pathname) || isMediaPath(input.pathname)) {
      return { allow: true };
    }
    return { allow: false, reason: "public_host_required" };
  }

  if (requestHost === publicHost) {
    if (isAdminPath(input.pathname)) {
      return { allow: false, reason: "admin_host_required" };
    }
    return { allow: true };
  }

  return { allow: false, reason: "host_mismatch" };
};

export async function enforceHostPolicy(req: Request) {
  const [adminBaseUrl, publicBaseUrl] = await Promise.all([
    getSetting("site.adminBaseUrl"),
    getSetting("site.publicBaseUrl"),
  ]);
  const url = new URL(req.url);
  const decision = evaluateHostPolicy({
    requestHost: extractHost(req),
    pathname: url.pathname,
    adminBaseUrl: typeof adminBaseUrl === "string" ? adminBaseUrl : null,
    publicBaseUrl: typeof publicBaseUrl === "string" ? publicBaseUrl : null,
  });

  if (decision.allow) return null;
  return new Response("Not Found", { status: 404 });
}
