import type { SecuritySettings } from "../../services/settings/securitySettings";

export function applySecurityHeaders(
  headers: Headers,
  config: SecuritySettings["headers"]
) {
  if (!config.enabled) return;

  headers.set("X-Frame-Options", config.frameOptions);
  if (config.contentTypeOptions) {
    headers.set("X-Content-Type-Options", "nosniff");
  }
  if (config.referrerPolicy) {
    headers.set("Referrer-Policy", config.referrerPolicy);
  }
  if (config.permissionsPolicy) {
    headers.set("Permissions-Policy", config.permissionsPolicy);
  }
  if (config.csp) {
    headers.set("Content-Security-Policy", config.csp);
  }
  if (config.hsts) {
    headers.set("Strict-Transport-Security", config.hsts);
  }
}
