const menuItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label"],
  properties: {
    id: { type: "string" },
    label: { type: "string" },
    href: { type: ["string", "null"] },
    pageId: { type: ["string", "null"] },
    parentId: { type: ["string", "null"] },
    orderIndex: { type: "integer" },
  },
};

const menuSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "items"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    location: { type: ["string", "null"] },
    items: { type: "array", items: menuItemSchema },
  },
};

const themeRouteSchema = {
  type: "object",
  additionalProperties: false,
  required: ["path"],
  properties: {
    id: { type: "string" },
    path: { type: "string" },
    pageId: { type: ["string", "null"] },
  },
};

const themeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "themeName", "tokens", "routes"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    themeName: { type: "string" },
    tokens: { type: "object", additionalProperties: true },
    isActive: { type: "boolean" },
    routes: { type: "array", items: themeRouteSchema },
  },
};

const adminThemeTemplateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "tokens"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    tokens: { type: "object", additionalProperties: true },
  },
};

const adminThemeProfileSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "templateId"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    templateId: { type: "string" },
    isActive: { type: "boolean" },
  },
};

const adminThemesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["templates", "profiles"],
  properties: {
    templates: { type: "array", items: adminThemeTemplateSchema },
    profiles: { type: "array", items: adminThemeProfileSchema },
  },
};

const redirectSchema = {
  type: "object",
  additionalProperties: false,
  required: ["from", "to", "status"],
  properties: {
    id: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    status: { type: "integer" },
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
    exportedAt: { type: "string" },
    settings: { type: "object", additionalProperties: true },
    menus: { type: "array", items: menuSchema },
    themeProfiles: { type: "array", items: themeProfileSchema },
    adminThemes: adminThemesSchema,
    redirects: { type: "array", items: redirectSchema },
  },
};

export const importPreviewSchema = importBundleSchema;
