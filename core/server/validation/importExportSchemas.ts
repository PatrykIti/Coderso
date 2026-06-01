const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

const optionalUuidSchema = {
  type: "string",
  pattern: uuidPattern,
  minLength: 36,
  maxLength: 36,
};

const nullableUuidSchema = {
  type: ["string", "null"],
  pattern: uuidPattern,
  minLength: 36,
  maxLength: 36,
};

const exportTargetValues = ["full", "settings", "menus", "themes", "redirects"];
const exportIncludeValues = [
  "settings",
  "menus",
  "menu-items",
  "theme-profiles",
  "theme-routes",
  "admin-theme-templates",
  "admin-theme-profiles",
  "redirects",
];

const exportScopeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["target", "include"],
  properties: {
    target: { type: "string", enum: exportTargetValues },
    include: {
      type: "array",
      minItems: 1,
      maxItems: exportIncludeValues.length,
      uniqueItems: true,
      items: { type: "string", enum: exportIncludeValues },
    },
  },
};

export const exportRequestSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    target: { type: "string", enum: exportTargetValues },
    include: {
      type: "array",
      minItems: 1,
      maxItems: exportIncludeValues.length,
      uniqueItems: true,
      items: { type: "string", enum: exportIncludeValues },
    },
  },
};

const menuItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label"],
  properties: {
    id: optionalUuidSchema,
    label: { type: "string", minLength: 1, maxLength: 160 },
    href: { type: ["string", "null"], maxLength: 2048 },
    pageId: nullableUuidSchema,
    parentId: nullableUuidSchema,
    orderIndex: { type: "integer" },
  },
};

const menuSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "items"],
  properties: {
    id: optionalUuidSchema,
    name: { type: "string", minLength: 1, maxLength: 160 },
    location: { type: ["string", "null"], maxLength: 120 },
    items: { type: "array", maxItems: 2000, items: menuItemSchema },
  },
};

const themeRouteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["path"],
  properties: {
    id: optionalUuidSchema,
    path: { type: "string", minLength: 1, maxLength: 512 },
    pageId: nullableUuidSchema,
  },
};

const themeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "themeName", "tokens", "routes"],
  properties: {
    id: optionalUuidSchema,
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 1000 },
    themeName: { type: "string", minLength: 1, maxLength: 160 },
    tokens: { type: "object", additionalProperties: true },
    isActive: { type: "boolean" },
    routes: { type: "array", maxItems: 500, items: themeRouteSchema },
  },
};

const adminThemeTemplateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "tokens"],
  properties: {
    id: optionalUuidSchema,
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 1000 },
    tokens: { type: "object", additionalProperties: true },
  },
};

const adminThemeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "templateId"],
  properties: {
    id: optionalUuidSchema,
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: ["string", "null"], maxLength: 1000 },
    templateId: optionalUuidSchema,
    isActive: { type: "boolean" },
  },
};

const adminThemesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["templates", "profiles"],
  properties: {
    templates: { type: "array", maxItems: 200, items: adminThemeTemplateSchema },
    profiles: { type: "array", maxItems: 200, items: adminThemeProfileSchema },
  },
};

const redirectSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fromPath", "toPath", "statusCode", "enabled"],
  properties: {
    id: optionalUuidSchema,
    fromPath: { type: "string", minLength: 1, maxLength: 512 },
    toPath: { type: "string", minLength: 1, maxLength: 2048 },
    statusCode: { type: "integer", enum: [301, 302, 307, 308] },
    enabled: { type: "boolean" },
  },
};

export const importBundleSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "version",
    "exportedAt",
    "settings",
    "menus",
    "themeProfiles",
    "adminThemes",
    "redirects",
  ],
  properties: {
    version: { type: "integer", const: 1 },
    exportedAt: { type: "string", format: "date-time" },
    scope: exportScopeSchema,
    settings: { type: "object", additionalProperties: true },
    menus: { type: "array", maxItems: 200, items: menuSchema },
    themeProfiles: { type: "array", maxItems: 200, items: themeProfileSchema },
    adminThemes: adminThemesSchema,
    redirects: { type: "array", maxItems: 1000, items: redirectSchema },
  },
};

export const importPreviewSchema = importBundleSchema;
