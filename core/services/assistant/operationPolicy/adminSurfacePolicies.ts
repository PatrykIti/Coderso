import type {
  AssistantPolicyAction,
  AssistantPolicyCoverageState,
  AssistantPolicyField,
  AssistantPolicySecrets,
  AssistantResourcePolicy,
} from "./policyTypes";

const exactDestructivePolicy = {
  requireReview: true,
  allowAllWhenFiltered: false,
  allowAllUnfiltered: false,
  requireExpectedCountForPartialMatch: true,
};

const readOnlyAction = (operation: AssistantPolicyAction["operation"]): AssistantPolicyAction => ({
  operation,
  type: "none",
  target: "none",
  mode: "read-only",
});

const gatedAction = (operation: AssistantPolicyAction["operation"]): AssistantPolicyAction => ({
  operation,
  type: "none",
  target: "none",
  mode: "gated",
});

const field = (
  fieldName: string,
  aliases: string[],
  valueType: AssistantPolicyField["valueType"],
  enumValues?: string[]
): AssistantPolicyField => ({
  field: fieldName,
  aliases,
  valueType,
  ...(enumValues ? { enumValues } : {}),
});

const redactedSecrets = (secretFields: string[]): AssistantPolicySecrets => ({
  redacted: true,
  secretFields,
  providerAllowed: false,
});

type SurfacePolicyInput = {
  kind: string;
  label: string;
  aliases: string[];
  routes: string[];
  operations: AssistantResourcePolicy["operations"];
  readPermissions: string[];
  executePermissions?: string[];
  actions: Record<string, AssistantPolicyAction>;
  coverageState: AssistantPolicyCoverageState;
  task: string;
  notes: string;
  fields?: Record<string, AssistantPolicyField>;
  secrets?: AssistantPolicySecrets;
  destructive?: AssistantResourcePolicy["destructive"];
};

const surfacePolicy = (input: SurfacePolicyInput): AssistantResourcePolicy => ({
  kind: input.kind,
  label: input.label,
  aliases: input.aliases,
  routes: input.routes,
  operations: input.operations,
  readPermissions: input.readPermissions,
  executePermissions: input.executePermissions ?? [],
  filters: {},
  fields: input.fields ?? {},
  actions: input.actions,
  ...(input.destructive ? { destructive: input.destructive } : {}),
  ...(input.secrets ? { secrets: input.secrets } : {}),
  coverage: {
    state: input.coverageState,
    task: input.task,
    routes: input.routes,
    notes: input.notes,
  },
});

const inspectFindActions = {
  inspect: readOnlyAction("inspect"),
  find: readOnlyAction("find"),
};

const gatedMutationActions = {
  inspect: readOnlyAction("inspect"),
  find: readOnlyAction("find"),
  configure: gatedAction("configure"),
  update: gatedAction("update"),
};

const settingsOperations: AssistantResourcePolicy["operations"] = [
  "inspect",
  "find",
  "configure",
  "update",
];

const settingsActions = {
  inspect: readOnlyAction("inspect"),
  find: readOnlyAction("find"),
  configure: gatedAction("configure"),
  update: gatedAction("update"),
};

const globalSettingsSecrets = redactedSecrets([
  "assistant.llm.apiKey",
  "openai.apiKey",
  "openrouter.apiKey",
  "smtp.password",
  "storage.s3.accessKey",
  "storage.s3.secretKey",
  "storage.azure.key",
  "storage.azure.connectionString",
  "webhooks.secret",
  "apiKeys.secret",
  "security.botProtection.secretKey",
  "session.secret",
]);

const settingsSurfacePolicy = (input: {
  label: string;
  aliases: string[];
  route: string;
  fields?: Record<string, AssistantPolicyField>;
  secrets?: AssistantPolicySecrets;
  notes: string;
}): AssistantResourcePolicy =>
  surfacePolicy({
    kind: "settings-surface",
    label: input.label,
    aliases: input.aliases,
    routes: [input.route],
    operations: settingsOperations,
    readPermissions: ["settings:read"],
    executePermissions: ["settings:write"],
    actions: settingsActions,
    coverageState: "live-gated",
    task: "TASK-184-15",
    notes: input.notes,
    fields: input.fields,
    secrets: input.secrets ?? globalSettingsSecrets,
  });

export const dashboardPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "dashboard",
  label: "Dashboard",
  aliases: ["dashboard", "admin dashboard", "kokpit", "panel"],
  routes: ["/admin"],
  operations: ["inspect", "find", "configure"],
  readPermissions: ["content:read"],
  actions: {
    ...inspectFindActions,
    configure: gatedAction("configure"),
  },
  coverageState: "live-gated",
  task: "TASK-184-12",
  notes: "Dashboard prompts stay non-executable/read-only.",
});

export const menuPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "menu",
  label: "Menus",
  aliases: ["menu", "menus", "navigation", "nawigacja"],
  routes: ["/admin/menus"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["menus:read"],
  executePermissions: ["menus:write"],
  fields: {
    name: field("name", ["name", "nazwa"], "string"),
    location: field("location", ["location", "lokalizacja"], "string"),
    itemCount: field("itemCount", ["items", "pozycje"], "number"),
  },
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    create: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
  },
  destructive: exactDestructivePolicy,
  coverageState: "live-execute",
  task: "TASK-184-08",
  notes: "Menu summaries are read-only; menu item inspect/update/delete live matrix covers executable item actions.",
});

export const menuItemPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "menu-item",
  label: "Menu Items",
  aliases: [
    "menu",
    "menus",
    "menu item",
    "menu items",
    "navigation",
    "nawigacja",
    "pozycje menu",
    "pozycje w menu",
    "pozycje z menu",
    "element menu",
    "elementy menu",
    "pozycja menu",
    "link menu",
    "link z menu",
  ],
  routes: ["/admin/menus"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["menus:read"],
  executePermissions: ["menus:write"],
  fields: {
    label: {
      ...field("label", ["label", "etykieta", "nazwa"], "string"),
      action: { type: "menu.item.update", patchPath: ["label"] },
    },
    href: {
      ...field("href", ["href", "url", "link"], "string"),
      action: { type: "menu.item.update", patchPath: ["href"] },
    },
    parentId: {
      ...field("parentId", ["parent", "rodzic", "submenu"], "string"),
      action: { type: "menu.item.update", patchPath: ["parentId"] },
    },
    orderIndex: {
      ...field("orderIndex", ["order", "position", "kolejność", "pozycja"], "number"),
      action: { type: "menu.item.update", patchPath: ["orderIndex"] },
    },
    settings: {
      ...field("settings", ["settings", "ustawienia"], "record"),
      action: { type: "menu.item.update", patchPath: ["settings"] },
    },
  },
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    upsert: { operation: "create", type: "menu.item.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "menu.item.update", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "menu.item.delete", target: "single", mode: "executable" },
  },
  destructive: exactDestructivePolicy,
  coverageState: "live-execute",
  task: "TASK-184-08",
  notes: "Menu item inspect/update/delete live matrix.",
});

export const adminSearchPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "admin-search",
  label: "Search",
  aliases: ["search", "admin search", "global search", "wyszukiwarka", "szukaj"],
  routes: ["/admin/search"],
  operations: ["inspect", "find"],
  readPermissions: ["content:read"],
  actions: inspectFindActions,
  coverageState: "live-read-only",
  task: "TASK-184-10",
  notes: "Admin Search service smoke covers media; posts are not indexed by current global search.",
});

export const seoDocumentPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "seo-document",
  label: "SEO Documents",
  aliases: ["seo", "seo manager", "seo document", "seo documents", "meta", "meta title", "meta description"],
  routes: ["/admin/seo"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  fields: {
    title: {
      ...field("seo.title", ["title", "meta title", "tytuł"], "string"),
      action: { type: "seo.document.update", patchPath: ["seo", "title"] },
    },
    description: {
      ...field("seo.description", ["description", "meta description", "opis"], "string"),
      action: { type: "seo.document.update", patchPath: ["seo", "description"] },
    },
    canonicalUrl: {
      ...field("seo.canonicalUrl", ["canonical", "canonical url"], "string"),
      action: { type: "seo.document.update", patchPath: ["seo", "canonicalUrl"] },
    },
    robots: {
      ...field("seo.robots", ["robots", "index", "noindex"], "string"),
      action: { type: "seo.document.update", patchPath: ["seo", "robots"] },
    },
    slug: {
      ...field("seo.slug", ["slug", "url"], "string"),
      action: { type: "seo.document.update", patchPath: ["seo", "slug"] },
    },
  },
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    upsert: { operation: "create", type: "seo.document.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "seo.document.update", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "seo.document.delete", target: "single", mode: "executable" },
  },
  destructive: exactDestructivePolicy,
  coverageState: "live-execute",
  task: "TASK-184-08",
  notes: "SEO document update/delete live matrix; target resources remain intact.",
});

export const analyticsPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "analytics",
  label: "Analytics",
  aliases: ["analytics", "stats", "statistics", "analityka", "statystyki"],
  routes: ["/admin/analytics"],
  operations: ["inspect", "find"],
  readPermissions: ["content:read"],
  actions: inspectFindActions,
  coverageState: "live-read-only",
  task: "TASK-184-12",
  notes: "Analytics prompts stay non-executable/read-only.",
});

export const backupPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "backup",
  label: "Backups",
  aliases: ["backup", "backups", "restore", "kopie zapasowe", "przywracanie"],
  routes: ["/admin/backups"],
  operations: ["inspect", "find", "create", "update", "configure"],
  readPermissions: ["backups:read"],
  executePermissions: ["backups:write"],
  actions: {
    ...gatedMutationActions,
    create: gatedAction("create"),
    restore: gatedAction("update"),
  },
  secrets: redactedSecrets(["backup.archiveUrl", "backup.storageSecret", "database.url"]),
  destructive: exactDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-13",
  notes: "Backup restore prompts stay non-executable without typed contracts.",
});

export const importExportPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "import-export",
  label: "Import / Export",
  aliases: ["import", "export", "import export", "import/export", "eksport", "importuj"],
  routes: ["/admin/tools/import-export"],
  operations: ["inspect", "find", "create", "update", "configure"],
  readPermissions: ["settings:read"],
  executePermissions: ["settings:write"],
  actions: {
    export: readOnlyAction("find"),
    previewImport: readOnlyAction("inspect"),
    importApply: gatedAction("create"),
    configure: gatedAction("configure"),
  },
  secrets: redactedSecrets(["bundle.secrets", "bundle.apiKeys", "bundle.tokens", "bundle.passwords"]),
  destructive: exactDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-13",
  notes: "Import arbitrary payload prompts stay non-executable.",
});

export const redirectPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "redirect",
  label: "Redirects",
  aliases: ["redirect", "redirects", "przekierowanie", "przekierowania"],
  routes: ["/admin/redirects"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["settings:read"],
  executePermissions: ["settings:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    create: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
  },
  destructive: exactDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-13",
  notes: "Unsafe redirect prompts stay non-executable without typed contracts.",
});

export const userPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "user",
  label: "Users",
  aliases: ["user", "users", "admin user", "użytkownik", "użytkownicy"],
  routes: ["/admin/users"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["users:read"],
  executePermissions: ["users:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    invite: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
  },
  fields: {
    name: field("name", ["name", "nazwa"], "string"),
    email: field("email", ["email", "mail"], "string"),
    roles: field("roles", ["roles", "role", "uprawnienia"], "record"),
  },
  secrets: redactedSecrets(["emailEncrypted", "emailHash", "passwordHash", "resetToken", "sessionToken"]),
  destructive: exactDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-14",
  notes: "User destructive prompts stay non-executable.",
});

export const rolePolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "role",
  label: "Roles Matrix",
  aliases: ["role", "roles", "permissions", "roles matrix", "uprawnienia", "macierz ról"],
  routes: ["/admin/roles"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["roles:read"],
  executePermissions: ["roles:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    create: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
  },
  fields: {
    permissions: field("permissions", ["permissions", "scopes", "uprawnienia"], "record"),
    name: field("name", ["name", "nazwa"], "string"),
  },
  destructive: exactDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-14",
  notes: "Privilege escalation prompts stay non-executable.",
});

export const auditLogPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "audit-log",
  label: "Audit Logs",
  aliases: ["audit", "audit logs", "audit log", "dziennik audytu", "logi audytu"],
  routes: ["/admin/audit"],
  operations: ["inspect", "find"],
  readPermissions: ["audit:read"],
  actions: inspectFindActions,
  secrets: redactedSecrets(["actorEmail", "ipAddress", "metadata.secret", "metadata.token", "metadata.apiKey"]),
  coverageState: "live-read-only",
  task: "TASK-184-14",
  notes: "Audit log prompts stay read-only/redacted.",
});

export const accessLogPolicy: AssistantResourcePolicy = surfacePolicy({
  kind: "access-log",
  label: "Access Logs",
  aliases: ["access logs", "access log", "logins", "login logs", "logi dostępu"],
  routes: ["/admin/access-logs"],
  operations: ["inspect", "find"],
  readPermissions: ["audit:read"],
  actions: inspectFindActions,
  secrets: redactedSecrets(["userEmail", "ipAddress", "userAgent", "sessionId", "token"]),
  coverageState: "live-read-only",
  task: "TASK-184-14",
  notes: "Access log prompts stay read-only/redacted.",
});

export const settingsRootPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Settings",
  aliases: ["settings", "ustawienia", "configuration", "konfiguracja"],
  route: "/admin/settings",
  notes: "Settings root prompts stay non-executable/redacted.",
});

export const settingsGeneralPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "General Settings",
  aliases: ["general settings", "site name", "locale", "ustawienia ogólne"],
  route: "/admin/settings/general",
  fields: {
    siteName: field("site.name", ["site name", "name", "nazwa strony"], "string"),
    siteLocale: field("site.locale", ["locale", "język", "jezyk"], "string"),
    publicBaseUrl: field("site.publicBaseUrl", ["public base url", "base url", "url"], "string"),
    sessionTtl: field("auth.sessionTtlDays", ["session ttl", "ttl sesji"], "number"),
    resetTtl: field("auth.resetTtlMinutes", ["reset ttl", "ttl resetu"], "number"),
  },
  notes: "Settings prompts stay non-executable/redacted.",
});

export const settingsAssistantPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Assistant Settings",
  aliases: ["assistant settings", "llm settings", "provider settings", "ustawienia asystenta"],
  route: "/admin/settings/assistant",
  fields: {
    enabled: field("assistant.enabled", ["enabled", "włączony", "wlaczony"], "boolean"),
    defaultMode: field("assistant.defaultMode", ["default mode", "mode", "tryb"], "enum", ["docs-only", "llm-guide"]),
    provider: field("assistant.llm.provider", ["provider", "openai", "openrouter"], "enum", ["openai", "openrouter", "none"]),
    model: field("assistant.llm.model", ["model", "llm model"], "string"),
    quotas: field("assistant.quotas", ["quotas", "limity"], "record"),
  },
  secrets: redactedSecrets(["assistant.llm.apiKey", "openai.apiKey", "openrouter.apiKey", "integration.openrouter.apiKey"]),
  notes: "Provider key prompts stay redacted and non-executable.",
});

export const settingsSitePolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Site Settings",
  aliases: ["site settings", "site routes", "homepage", "ustawienia strony"],
  route: "/admin/settings/site",
  fields: {
    publicBaseUrl: field("site.publicBaseUrl", ["public base url", "base url"], "string"),
    adminBaseUrl: field("site.adminBaseUrl", ["admin base url", "admin url"], "string"),
    adminPath: field("site.adminPath", ["admin path", "admin route"], "string"),
    homepageId: field("site.homepageId", ["homepage", "home page", "strona główna"], "string"),
    contentRoutes: field("site.contentRoutes", ["content routes", "routes", "routing"], "record"),
  },
  notes: "Site setting mutations stay gated without typed contracts.",
});

export const settingsSecurityPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Security Settings",
  aliases: ["security settings", "security", "csrf", "cors", "rate limit", "ustawienia bezpieczeństwa"],
  route: "/admin/settings/security",
  fields: {
    csrf: field("csrf", ["csrf", "csrf token"], "record"),
    cors: field("cors", ["cors", "allowed origins"], "record"),
    rateLimit: field("rateLimit", ["rate limit", "limity"], "record"),
    headers: field("headers", ["headers", "security headers"], "record"),
    session: field("session", ["session", "sessions"], "record"),
    botProtection: field("botProtection", ["captcha", "recaptcha", "bot protection"], "record"),
    validation: field("validation.rejectUnknownFields", ["reject unknown", "strict validation"], "boolean"),
  },
  secrets: redactedSecrets([
    "botProtection.secretKey",
    "passwordPepper",
    "csrf.secret",
    "session.secret",
    "captcha.secret",
  ]),
  notes: "Broad security-disable prompts stay non-executable.",
});

export const settingsApiKeysPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "API Keys",
  aliases: ["api keys", "api key", "tokens", "klucze api"],
  route: "/admin/settings/api-keys",
  fields: {
    name: field("name", ["name", "nazwa"], "string"),
    scopes: field("scopes", ["scopes", "permissions", "uprawnienia"], "record"),
    secret: field("secret", ["secret", "token", "key"], "string"),
  },
  secrets: redactedSecrets(["apiKeys.secret", "apiKeys.token", "apiKeys.prefix", "apiKeys.hash"]),
  notes: "API key value prompts stay redacted and non-executable.",
});

export const settingsWebhooksPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Webhooks",
  aliases: ["webhooks", "webhook", "signing secret", "webhook secret"],
  route: "/admin/settings/webhooks",
  fields: {
    url: field("url", ["url", "endpoint"], "string"),
    events: field("events", ["events", "zdarzenia"], "record"),
    enabled: field("enabled", ["enabled", "active"], "boolean"),
    secret: field("secret", ["secret", "signing secret"], "string"),
  },
  secrets: redactedSecrets(["webhooks.secret", "webhooks.signingSecret", "delivery.headers.authorization"]),
  notes: "Webhook secret prompts stay redacted and non-executable.",
});

export const settingsEmailPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Email Settings",
  aliases: ["email settings", "smtp", "mail settings", "ustawienia email"],
  route: "/admin/settings/email",
  fields: {
    provider: field("provider", ["provider", "smtp"], "enum", ["smtp"]),
    host: field("smtp.host", ["host", "smtp host"], "string"),
    port: field("smtp.port", ["port", "smtp port"], "number"),
    from: field("from", ["from", "sender", "nadawca"], "record"),
    password: field("smtp.password", ["password", "hasło", "haslo"], "string"),
  },
  secrets: redactedSecrets(["smtp.password", "smtp.user", "email.delivery.error"]),
  notes: "SMTP credential prompts stay redacted and non-executable.",
});

export const settingsStoragePolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Storage Settings",
  aliases: ["storage settings", "storage", "s3", "azure storage", "media storage"],
  route: "/admin/settings/storage",
  fields: {
    driver: field("driver", ["driver", "storage driver"], "enum", ["local", "s3", "azure"]),
    local: field("local", ["local", "local storage"], "record"),
    s3: field("s3", ["s3", "bucket"], "record"),
    azure: field("azure", ["azure", "container"], "record"),
    delivery: field("delivery.accessMode", ["delivery", "access mode"], "enum", ["public", "internal"]),
  },
  secrets: redactedSecrets([
    "s3.accessKey",
    "s3.secretKey",
    "azure.key",
    "azure.connectionString",
    "storage.secret",
  ]),
  notes: "Storage secret prompts stay redacted and non-executable.",
});

export const settingsIntegrationsPolicy: AssistantResourcePolicy = settingsSurfacePolicy({
  label: "Integrations",
  aliases: ["integrations", "integration", "openrouter", "providers", "integracje"],
  route: "/admin/settings/integrations",
  fields: {
    provider: field("provider", ["provider", "integration"], "string"),
    status: field("status", ["status", "health"], "string"),
    scopes: field("scopes", ["scopes", "permissions"], "record"),
    credentials: field("credentials", ["credentials", "api key", "secret"], "record"),
  },
  secrets: redactedSecrets(["openrouter.apiKey", "integration.secret", "oauth.clientSecret", "accessToken", "refreshToken"]),
  notes: "Integration credential prompts stay redacted and non-executable.",
});

export const adminSurfacePolicies = {
  dashboard: dashboardPolicy,
  menu: menuPolicy,
  "menu-item": menuItemPolicy,
  "admin-search": adminSearchPolicy,
  "seo-document": seoDocumentPolicy,
  analytics: analyticsPolicy,
  backup: backupPolicy,
  "import-export": importExportPolicy,
  redirect: redirectPolicy,
  user: userPolicy,
  role: rolePolicy,
  "audit-log": auditLogPolicy,
  "access-log": accessLogPolicy,
  "settings-root": settingsRootPolicy,
  "settings-general": settingsGeneralPolicy,
  "settings-assistant": settingsAssistantPolicy,
  "settings-site": settingsSitePolicy,
  "settings-security": settingsSecurityPolicy,
  "settings-api-keys": settingsApiKeysPolicy,
  "settings-webhooks": settingsWebhooksPolicy,
  "settings-email": settingsEmailPolicy,
  "settings-storage": settingsStoragePolicy,
  "settings-integrations": settingsIntegrationsPolicy,
};
