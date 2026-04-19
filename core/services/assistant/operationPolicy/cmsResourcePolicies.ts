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

export const pagesFormsListingsPolicies = {
  page: pagePolicy,
  form: formPolicy,
  "listing-query": listingQueryPolicy,
  "listing-template": listingTemplatePolicy,
};
