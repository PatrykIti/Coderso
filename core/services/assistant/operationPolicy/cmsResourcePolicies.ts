import type { AssistantResourcePolicy } from "./policyTypes";

const filteredDestructivePolicy = {
  requireReview: true,
  allowAllWhenFiltered: true,
  allowAllUnfiltered: false,
  requireExpectedCountForPartialMatch: true,
};

export const pagePolicy: AssistantResourcePolicy = {
  kind: "page",
  label: "Pages",
  aliases: ["page", "pages", "strona", "strone", "stronę", "strony"],
  routes: ["/admin/pages"],
  operations: ["inspect", "find", "create", "update", "delete", "publish"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write", "content:publish"],
  filters: {
    status: {
      field: "status",
      aliases: ["status", "published", "opublikowane", "opublikowana", "draft", "szkic"],
      operators: ["eq", "in"],
      values: {
        published: ["published", "opublikowane", "opublikowana", "opublikowany"],
        draft: ["draft", "szkic"],
      },
    },
  },
  fields: {
    title: {
      field: "title",
      aliases: ["title", "tytul", "tytuł", "nazwa", "nazwe", "nazwę"],
      valueType: "string",
      action: { type: "page.update", patchPath: ["title"] },
    },
    slug: {
      field: "slug",
      aliases: ["slug", "url", "sciezka", "ścieżka"],
      valueType: "string",
      action: { type: "page.update", patchPath: ["slug"] },
    },
    status: {
      field: "status",
      aliases: ["status", "published", "draft", "opublikuj", "szkic"],
      valueType: "enum",
      enumValues: ["draft", "published"],
      action: { type: "page.update", patchPath: ["status"] },
    },
    showInNav: {
      field: "settings.showInNav",
      aliases: ["navigation", "nav", "menu", "show in nav", "pokaz w menu", "pokaż w menu"],
      valueType: "boolean",
      action: { type: "page.update", patchPath: ["settings", "showInNav"] },
    },
  },
  actions: {
    create: { operation: "create", type: "page.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "page.update", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "page.delete", target: "multiple", mode: "executable" },
    patchWidget: { operation: "update", type: "page.widget.patch", target: "active", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  coverage: {
    state: "live-execute",
    task: "TASK-184-02",
    routes: ["/admin/pages"],
    notes: "Page create/search/update/delete/safety live matrix.",
  },
};

export const formPolicy: AssistantResourcePolicy = {
  kind: "form",
  label: "Forms",
  aliases: ["form", "forms", "formularz", "formularze", "formularza"],
  routes: ["/admin/coderso/forms"],
  operations: ["inspect", "find", "create", "update", "delete", "archive"],
  readPermissions: ["forms:read"],
  executePermissions: ["forms:write"],
  filters: {
    status: {
      field: "status",
      aliases: ["status", "published", "opublikowany", "draft", "archived", "zarchiwizowany"],
      operators: ["eq", "in"],
      values: {
        published: ["published", "opublikowany", "opublikowane"],
        draft: ["draft", "szkic"],
        archived: ["archived", "zarchiwizowany"],
      },
    },
    visibility: {
      field: "visibility",
      aliases: ["visibility", "public", "publiczny", "publiczne", "internal", "wewnetrzne", "wewnętrzne"],
      operators: ["eq", "in"],
      values: {
        public: ["public", "publiczny", "publiczne"],
        internal: ["internal", "wewnetrzne", "wewnętrzne"],
      },
    },
  },
  fields: {
    name: {
      field: "name",
      aliases: ["name", "nazwa", "nazwe", "nazwę"],
      valueType: "string",
      action: { type: "form.update", patchPath: ["name"] },
    },
    slug: {
      field: "slug",
      aliases: ["slug", "url"],
      valueType: "string",
      action: { type: "form.update", patchPath: ["slug"] },
    },
    status: {
      field: "status",
      aliases: ["status", "opublikowany", "archived", "zarchiwizowany", "draft"],
      valueType: "enum",
      enumValues: ["draft", "published", "archived"],
      action: { type: "form.update", patchPath: ["status"] },
    },
    submissionAccess: {
      field: "submissionAccess",
      aliases: ["submissionAccess", "submission access", "access", "dostep", "dostęp", "publiczny", "internal"],
      valueType: "enum",
      enumValues: ["public", "internal"],
      action: { type: "form.update", patchPath: ["submissionAccess"] },
    },
  },
  actions: {
    create: { operation: "create", type: "form.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "form.update", target: "single", mode: "executable" },
    archive: { operation: "archive", type: "form.archive", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "form.delete", target: "multiple", mode: "executable" },
    automation: { operation: "update", type: "form.automation.upsert", target: "single", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  secrets: {
    redacted: true,
    secretFields: ["submissions", "webhook.secret", "captcha.secret"],
    providerAllowed: false,
  },
  coverage: {
    state: "live-execute",
    task: "TASK-184-05",
    routes: ["/admin/coderso/forms"],
    notes: "Form create/search/update/archive/delete/safety live matrix.",
  },
};

export const listingQueryPolicy: AssistantResourcePolicy = {
  kind: "listing-query",
  label: "Listing Queries",
  aliases: ["listing query", "listing queries", "query listingu", "zapytanie listingu"],
  routes: ["/admin/coderso/listings"],
  operations: ["inspect", "find", "create", "update", "delete", "refine"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  filters: {},
  fields: {
    name: {
      field: "name",
      aliases: ["name", "nazwa"],
      valueType: "string",
      action: { type: "listing-query.update", patchPath: ["name"] },
    },
    limit: {
      field: "limit",
      aliases: ["limit", "liczba", "ilosc", "ilość"],
      valueType: "number",
      action: { type: "listing-query.update", patchPath: ["limit"] },
    },
    includeDrafts: {
      field: "includeDrafts",
      aliases: ["include drafts", "drafts", "szkice"],
      valueType: "boolean",
      action: { type: "listing-query.update", patchPath: ["includeDrafts"] },
    },
    filters: {
      field: "filters",
      aliases: ["filters", "filtry", "filtrowanie"],
      valueType: "record",
      action: { type: "listing-query.filters.patch", patchPath: ["filters"] },
    },
  },
  actions: {
    create: { operation: "create", type: "listing-query.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "listing-query.update", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "listing-query.delete", target: "single", mode: "executable" },
    patchFilters: { operation: "update", type: "listing-query.filters.patch", target: "single", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  coverage: {
    state: "live-execute",
    task: "TASK-184-06",
    routes: ["/admin/coderso/listings", "/admin/coderso/filters", "/admin/coderso/search"],
    notes: "Listing query inspect/update/delete and filter patch policy.",
  },
};

export const listingTemplatePolicy: AssistantResourcePolicy = {
  kind: "listing-template",
  label: "Listing Templates",
  aliases: ["listing template", "listing templates", "szablon listingu", "template listingu"],
  routes: ["/admin/coderso/listings"],
  operations: ["inspect", "find", "create", "update", "delete", "refine"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  filters: {},
  fields: {
    name: {
      field: "name",
      aliases: ["name", "nazwa"],
      valueType: "string",
      action: { type: "listing-template.update", patchPath: ["name"] },
    },
    slug: {
      field: "slug",
      aliases: ["slug", "url"],
      valueType: "string",
      action: { type: "listing-template.update", patchPath: ["slug"] },
    },
    layout: {
      field: "layout",
      aliases: ["layout", "uklad", "układ"],
      valueType: "enum",
      enumValues: ["grid", "list", "table", "calendar", "map"],
      action: { type: "listing-template.update", patchPath: ["layout"] },
    },
    card: {
      field: "card",
      aliases: ["card", "karta", "listing card"],
      valueType: "record",
      action: { type: "listing-template.card.patch", patchPath: ["card"] },
    },
  },
  actions: {
    create: { operation: "create", type: "listing-template.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "listing-template.update", target: "single", mode: "executable" },
    delete: { operation: "delete", type: "listing-template.delete", target: "single", mode: "executable" },
    patchCard: { operation: "update", type: "listing-template.card.patch", target: "single", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  coverage: {
    state: "live-execute",
    task: "TASK-184-06",
    routes: ["/admin/coderso/listings"],
    notes: "Listing template inspect/update/delete and card patch policy.",
  },
};

export const contentTypePolicy: AssistantResourcePolicy = {
  kind: "content-type",
  label: "Content Types",
  aliases: ["content type", "content types", "model", "engine", "typ tresci", "typ treści"],
  routes: ["/admin/coderso/engine"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  filters: {},
  fields: {
    name: {
      field: "name",
      aliases: ["name", "nazwa"],
      valueType: "string",
      action: { type: "content-type.upsert", patchPath: ["name"] },
    },
    slug: {
      field: "slug",
      aliases: ["slug"],
      valueType: "string",
      action: { type: "content-type.upsert", patchPath: ["slug"] },
    },
    schema: {
      field: "schema",
      aliases: ["schema", "fields", "pola"],
      valueType: "record",
      action: { type: "content-type.upsert", patchPath: ["schema"] },
    },
  },
  actions: {
    upsert: { operation: "create", type: "content-type.upsert", target: "explicit", mode: "executable" },
    delete: { operation: "delete", type: "content-type.delete", target: "single", mode: "executable" },
  },
  destructive: {
    ...filteredDestructivePolicy,
    allowAllWhenFiltered: false,
  },
  coverage: {
    state: "live-execute",
    task: "TASK-184-03",
    routes: ["/admin/coderso/engine"],
    notes: "Content type inspect and zero-entry delete live matrix.",
  },
};

export const entryPolicy: AssistantResourcePolicy = {
  kind: "entry",
  label: "Entries",
  aliases: ["entry", "entries", "record", "records", "wpis", "wpisy", "rekord", "rekordy"],
  routes: ["/admin/coderso/entries"],
  operations: ["inspect", "find", "create", "update", "delete", "publish"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write", "content:publish"],
  filters: {
    status: {
      field: "status",
      aliases: ["status", "published", "draft", "archived", "opublikowany", "szkic"],
      operators: ["eq", "in"],
      values: {
        published: ["published", "opublikowany", "opublikowane"],
        draft: ["draft", "szkic"],
        archived: ["archived", "zarchiwizowany"],
      },
    },
  },
  fields: {
    title: {
      field: "title",
      aliases: ["title", "tytul", "tytuł", "nazwa"],
      valueType: "string",
      action: { type: "entry.update", patchPath: ["title"] },
    },
    slug: {
      field: "slug",
      aliases: ["slug", "url"],
      valueType: "string",
      action: { type: "entry.update", patchPath: ["slug"] },
    },
    status: {
      field: "status",
      aliases: ["status", "published", "draft", "archived"],
      valueType: "enum",
      enumValues: ["draft", "published", "archived"],
      action: { type: "entry.update", patchPath: ["status"] },
    },
    values: {
      field: "values",
      aliases: ["values", "data", "fields", "pola"],
      valueType: "record",
      action: { type: "entry.update", patchPath: ["values"] },
    },
    seo: {
      field: "seo",
      aliases: ["seo", "meta title", "meta description"],
      valueType: "record",
      action: { type: "entry.update", patchPath: ["seo"] },
    },
    mediaReference: {
      field: "mediaReference",
      aliases: ["media", "image", "obraz"],
      valueType: "string",
      action: { type: "media.reference.attach", patchPath: ["field"] },
    },
  },
  actions: {
    createDraft: { operation: "create", type: "entry.upsert-draft", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "entry.update", target: "active", mode: "executable" },
    delete: { operation: "delete", type: "entry.delete", target: "active", mode: "executable" },
    attachMedia: { operation: "update", type: "media.reference.attach", target: "explicit", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  secrets: {
    redacted: true,
    secretFields: ["values.secret", "values.password", "submissions"],
    providerAllowed: false,
  },
  coverage: {
    state: "live-execute",
    task: "TASK-184-03",
    routes: ["/admin/coderso/entries"],
    notes: "Active entry update/delete and draft creation policy.",
  },
};

export const customScreenPolicy: AssistantResourcePolicy = {
  kind: "custom-screen",
  label: "Custom Screens",
  aliases: ["custom screen", "custom screens", "screen", "screens", "ekran", "ekrany", "ekranów"],
  routes: ["/admin/coderso/custom-screens"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  filters: {
    status: {
      field: "status",
      aliases: ["status", "active", "published", "opublikowane", "draft"],
      operators: ["eq", "in"],
      values: {
        active: ["active", "published", "opublikowane"],
        draft: ["draft", "szkic"],
      },
    },
    showInSidebar: {
      field: "showInSidebar",
      aliases: ["visible", "widoczne", "sidebar", "showInSidebar"],
      operators: ["eq"],
      values: {
        true: ["true", "visible", "widoczne"],
        false: ["false", "hidden", "ukryte"],
      },
    },
  },
  fields: {
    name: {
      field: "name",
      aliases: ["name", "nazwa"],
      valueType: "string",
      action: { type: "custom-screen.update", patchPath: ["name"] },
    },
    status: {
      field: "status",
      aliases: ["status", "active", "draft"],
      valueType: "enum",
      enumValues: ["draft", "active"],
      action: { type: "custom-screen.update", patchPath: ["status"] },
    },
    sidebarLabel: {
      field: "sidebarLabel",
      aliases: ["sidebar label", "etykieta sidebar", "label"],
      valueType: "string",
      action: { type: "custom-screen.update", patchPath: ["sidebarLabel"] },
    },
    blockData: {
      field: "blockData",
      aliases: ["widget", "block", "blok"],
      valueType: "record",
      action: { type: "custom-screen.widget.patch", patchPath: ["dataPath"] },
    },
  },
  actions: {
    upsert: { operation: "create", type: "custom-screen.upsert", target: "explicit", mode: "executable" },
    update: { operation: "update", type: "custom-screen.update", target: "active", mode: "executable" },
    delete: { operation: "delete", type: "custom-screen.delete", target: "multiple", mode: "executable" },
    patchWidget: { operation: "update", type: "custom-screen.widget.patch", target: "active", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  secrets: {
    redacted: true,
    secretFields: ["entry.values", "bindings.secret"],
    providerAllowed: false,
  },
  coverage: {
    state: "live-execute",
    task: "TASK-184-04",
    routes: ["/admin/coderso/custom-screens"],
  },
};

export const widgetTemplatePolicy: AssistantResourcePolicy = {
  kind: "widget-template",
  label: "Widget Templates",
  aliases: ["widget template", "widget templates", "template widget", "szablon widgetu", "szablon"],
  routes: ["/admin/coderso/widgets"],
  operations: ["inspect", "find", "create", "update", "delete"],
  readPermissions: ["widgets:read"],
  executePermissions: ["widgets:write"],
  filters: {
    status: {
      field: "status",
      aliases: ["status", "published", "draft"],
      operators: ["eq", "in"],
      values: {
        published: ["published", "opublikowany"],
        draft: ["draft", "szkic"],
      },
    },
  },
  fields: {
    name: { field: "name", aliases: ["name", "nazwa"], valueType: "string", action: { type: "widget-template.update", patchPath: ["name"] } },
    category: { field: "category", aliases: ["category", "kategoria"], valueType: "string", action: { type: "widget-template.update", patchPath: ["category"] } },
    status: { field: "status", aliases: ["status"], valueType: "enum", enumValues: ["draft", "published"], action: { type: "widget-template.update", patchPath: ["status"] } },
    blockData: { field: "blockData", aliases: ["block", "blok", "headline"], valueType: "record", action: { type: "widget-template.block.patch", patchPath: ["dataPath"] } },
  },
  actions: {
    update: { operation: "update", type: "widget-template.update", target: "active", mode: "executable" },
    delete: { operation: "delete", type: "widget-template.delete", target: "active", mode: "executable" },
    patchBlock: { operation: "update", type: "widget-template.block.patch", target: "active", mode: "executable" },
  },
  destructive: filteredDestructivePolicy,
  secrets: { redacted: true, secretFields: ["settings.secret"], providerAllowed: false },
  coverage: {
    state: "live-execute",
    task: "TASK-184-07",
    routes: ["/admin/coderso/widgets"],
  },
};

export const mediaPolicy: AssistantResourcePolicy = {
  kind: "media",
  label: "Media",
  aliases: ["media", "asset", "assets", "image", "obraz", "plik"],
  routes: ["/admin/media"],
  operations: ["inspect", "find", "update"],
  readPermissions: ["media:read"],
  executePermissions: ["media:read", "content:write"],
  filters: {},
  fields: {
    title: { field: "title", aliases: ["title", "tytul", "tytuł"], valueType: "string" },
    reference: { field: "reference", aliases: ["attach", "podłącz", "podlacz"], valueType: "string", action: { type: "media.reference.attach", patchPath: ["field"] } },
    upload: { field: "upload", aliases: ["upload", "wgraj", "prześlij"], valueType: "record" },
  },
  actions: {
    inspect: { operation: "inspect", type: "none", target: "none", mode: "read-only" },
    attachReference: { operation: "update", type: "media.reference.attach", target: "explicit", mode: "executable" },
    upload: { operation: "create", type: "none", target: "none", mode: "gated" },
  },
  secrets: {
    redacted: true,
    secretFields: ["signedUrl", "privateUrl", "storage.secret"],
    providerAllowed: false,
  },
  coverage: {
    state: "live-execute",
    task: "TASK-184-08",
    routes: ["/admin/media"],
    notes: "Existing media references execute; raw uploads stay gated.",
  },
};

export const pagesFormsListingsPolicies = {
  page: pagePolicy,
  form: formPolicy,
  "listing-query": listingQueryPolicy,
  "listing-template": listingTemplatePolicy,
};

export const contentScreensWidgetsMediaPolicies = {
  "content-type": contentTypePolicy,
  entry: entryPolicy,
  "custom-screen": customScreenPolicy,
  "widget-template": widgetTemplatePolicy,
  media: mediaPolicy,
};
