const HIGH_RISK_PERMISSIONS = new Set([
  "*",
  "roles:write",
  "users:write",
  "settings:write",
  "plugins:manage",
  "backups:write",
  "themes:write",
  "solution-kits:write",
  "audit:read",
]);

export function isHighRiskPermission(permission: string) {
  const normalized = permission.trim();
  return normalized === "*" || normalized.endsWith(":*") || HIGH_RISK_PERMISSIONS.has(normalized);
}

export function hasHighRiskPermissions(permissions: string[]) {
  return permissions.some(isHighRiskPermission);
}
