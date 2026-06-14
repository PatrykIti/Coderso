import type {
  AssistantPolicyAction,
  AssistantPolicyCoverageState,
  AssistantPolicyField,
  AssistantPolicySecrets,
  AssistantResourcePolicy,
} from "./policyTypes";

const gatedDestructivePolicy = {
  requireReview: true,
  allowAllWhenFiltered: false,
  allowAllUnfiltered: false,
  requireExpectedCountForPartialMatch: true,
};

const action = (
  operation: AssistantPolicyAction["operation"],
  mode: AssistantPolicyAction["mode"],
  type: AssistantPolicyAction["type"] = "none"
): AssistantPolicyAction => ({
  operation,
  type,
  target: type === "none" ? "none" : "explicit",
  mode,
});

const readOnlyAction = (operation: AssistantPolicyAction["operation"] = "inspect") =>
  action(operation, "read-only");

const gatedAction = (operation: AssistantPolicyAction["operation"]) => action(operation, "gated");

const notApplicableAction = (operation: AssistantPolicyAction["operation"] = "inspect") =>
  action(operation, "not-applicable");

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

type ModulePolicyInput = {
  kind: string;
  label: string;
  aliases: string[];
  route: string;
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

const modulePolicy = (input: ModulePolicyInput): AssistantResourcePolicy => ({
  kind: input.kind,
  label: input.label,
  aliases: input.aliases,
  routes: [input.route],
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
    routes: [input.route],
    notes: input.notes,
  },
});

const previewGatedActions = {
  inspect: readOnlyAction("inspect"),
  find: readOnlyAction("find"),
  configure: gatedAction("configure"),
  create: gatedAction("create"),
  update: gatedAction("update"),
  delete: gatedAction("delete"),
};

const plannedActions = {
  inspect: notApplicableAction("inspect"),
};

export const postPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "post",
  label: "Posts",
  aliases: ["post", "posts", "blog post", "article", "wpis blogowy", "posty"],
  route: "/admin/posts",
  operations: ["inspect", "find", "create", "update", "delete", "publish"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write", "content:publish"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    create: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
    publish: gatedAction("publish"),
  },
  fields: {
    title: field("title", ["title", "tytuł", "tytul"], "string"),
    slug: field("slug", ["slug", "url"], "string"),
    status: field("status", ["status", "published", "draft"], "enum", ["draft", "published"]),
    content: field("content", ["content", "body", "treść"], "record"),
  },
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-10",
  notes: "Direct post mutations stay gated until typed post actions exist.",
});

export const filtersPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "advanced-filters",
  label: "Filters",
  aliases: ["filters", "facets", "listing filters", "filtry", "filtrowanie"],
  route: "/admin/advanced/filters",
  operations: ["inspect", "find", "refine", "update", "configure"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    refine: gatedAction("refine"),
    update: gatedAction("update"),
    configure: gatedAction("configure"),
  },
  fields: {
    facets: field("facets", ["facets", "filters", "filtry"], "record"),
    autoApply: field("autoApply", ["auto apply", "autoApply"], "boolean"),
    search: field("showSearch", ["search", "show search"], "boolean"),
  },
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes:
    "Filter/search module prompts stay non-executable unless covered by listing typed actions.",
});

export const advancedSearchPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "advanced-search",
  label: "Advanced Search",
  aliases: ["advanced search", "search module", "listing search", "wyszukiwarka advanced"],
  route: "/admin/advanced/search",
  operations: ["inspect", "find", "refine", "configure"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    refine: gatedAction("refine"),
    configure: gatedAction("configure"),
  },
  fields: {
    query: field("query", ["query", "search query", "zapytanie"], "string"),
    ranking: field("ranking", ["ranking", "score"], "record"),
    sources: field("sources", ["sources", "źródła", "zrodla"], "record"),
  },
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Search module prompts stay non-executable without dedicated typed actions.",
});

export const bookingPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "booking",
  label: "Booking",
  aliases: ["booking", "bookings", "reservation", "appointments", "rezerwacje", "terminy"],
  route: "/admin/advanced/booking",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["booking:read"],
  executePermissions: ["booking:write"],
  actions: previewGatedActions,
  fields: {
    resources: field("resources", ["resources", "staff", "rooms"], "record"),
    services: field("services", ["services", "usługi", "uslugi"], "record"),
    schedule: field("schedule", ["schedule", "calendar", "kalendarz"], "record"),
    access: field("submissionAccess", ["access", "public", "internal"], "enum", [
      "public",
      "internal",
    ]),
  },
  secrets: redactedSecrets([
    "customer.email",
    "customer.phone",
    "reservation.notes",
    "payment.intent",
  ]),
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Booking setup remains gated until booking action adapters exist.",
});

export const appointmentsPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "appointments",
  label: "Appointments",
  aliases: ["appointments", "appointment", "time slots", "wizyty"],
  route: "/admin/advanced/appointments",
  operations: ["inspect"],
  readPermissions: ["booking:read"],
  actions: plannedActions,
  secrets: redactedSecrets(["customer.email", "customer.phone", "appointment.notes"]),
  coverageState: "not-applicable",
  task: "TASK-184-16",
  notes: "Planned/disabled module; no runtime route coverage claimed.",
});

export const reviewsPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "reviews",
  label: "Reviews",
  aliases: ["reviews", "review", "ratings", "moderation", "opinie", "recenzje"],
  route: "/admin/advanced/reviews",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["reviews:read"],
  executePermissions: ["reviews:write"],
  actions: previewGatedActions,
  fields: {
    status: field("status", ["status", "approved", "pending"], "enum", [
      "pending",
      "approved",
      "rejected",
    ]),
    rating: field("rating", ["rating", "ocena"], "number"),
    author: field("author", ["author", "customer", "klient"], "string"),
  },
  secrets: redactedSecrets(["author.email", "author.ipAddress", "moderation.notes"]),
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Destructive review prompts stay non-executable.",
});

export const commercePolicy: AssistantResourcePolicy = modulePolicy({
  kind: "commerce",
  label: "Commerce",
  aliases: ["commerce", "shop", "products", "checkout", "storefront", "sklep"],
  route: "/admin/advanced/commerce",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["commerce:read"],
  executePermissions: ["commerce:write"],
  actions: previewGatedActions,
  fields: {
    product: field("product", ["product", "produkt"], "record"),
    price: field("price", ["price", "cena"], "number"),
    checkout: field("checkout", ["checkout", "payment", "płatność", "platnosc"], "record"),
  },
  secrets: redactedSecrets([
    "payment.secret",
    "checkout.token",
    "customer.email",
    "customer.address",
  ]),
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Checkout/payment prompts stay gated.",
});

export const popupsPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "popup",
  label: "Popups",
  aliases: ["popup", "popups", "modal", "campaign", "kampania"],
  route: "/admin/advanced/popups",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["popups:read"],
  executePermissions: ["popups:write"],
  actions: previewGatedActions,
  fields: {
    title: field("title", ["title", "tytuł", "tytul"], "string"),
    status: field("status", ["status", "active", "draft"], "enum", ["draft", "active", "paused"]),
    targeting: field("targeting", ["targeting", "audience", "segment"], "record"),
  },
  secrets: redactedSecrets(["targeting.email", "targeting.segmentExport", "submission.email"]),
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Popup create prompts stay non-executable until typed actions exist.",
});

export const megaMenuPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "mega-menu",
  label: "Mega Menu",
  aliases: ["mega menu", "mega-menu", "advanced menu", "duże menu", "duze menu"],
  route: "/admin/advanced/mega-menu",
  operations: ["inspect"],
  readPermissions: ["menus:read"],
  executePermissions: ["menus:write"],
  actions: plannedActions,
  coverageState: "not-applicable",
  task: "TASK-184-16",
  notes: "Planned/disabled module; no runtime route coverage claimed.",
});

export const portalPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "portal",
  label: "Portal",
  aliases: ["portal", "membership portal", "client portal", "members", "członkowie"],
  route: "/admin/advanced/portal",
  operations: ["inspect"],
  readPermissions: ["content:read"],
  actions: plannedActions,
  secrets: redactedSecrets(["member.email", "member.profile", "accessRules", "subscription.id"]),
  coverageState: "not-applicable",
  task: "TASK-184-16",
  notes: "Planned/disabled module; no runtime route coverage claimed.",
});

export const i18nPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "i18n",
  label: "Multilingual",
  aliases: ["multilingual", "i18n", "translations", "locales", "tłumaczenia"],
  route: "/admin/advanced/i18n",
  operations: ["inspect"],
  readPermissions: ["content:read"],
  actions: plannedActions,
  coverageState: "not-applicable",
  task: "TASK-184-16",
  notes: "Planned/disabled module; no runtime route coverage claimed.",
});

export const solutionKitPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "solution-kit",
  label: "Solution Kits",
  aliases: ["solution kit", "solution kits", "kit", "kity", "starter", "site kit"],
  route: "/admin/advanced/solution-kits",
  operations: ["inspect", "find", "create", "configure", "refine"],
  readPermissions: ["solution-kits:read"],
  executePermissions: ["solution-kits:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    recommend: action("refine", "gated", "site-kit.recommend"),
    install: action("create", "gated", "site-kit.install"),
    validate: action("inspect", "gated", "site-kit.validate"),
  },
  fields: {
    businessType: field("businessType", ["business type", "industry", "branża"], "string"),
    selectedKitId: field("selectedKitId", ["selected kit", "kit id"], "string"),
    enabledStepIds: field("enabledStepIds", ["steps", "enabled steps"], "record"),
  },
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-11",
  notes: "Solution kit prompts without installed-kit context stay gated.",
});

export const pluginStorePolicy: AssistantResourcePolicy = modulePolicy({
  kind: "plugin-store",
  label: "Plugin Store",
  aliases: ["plugin store", "store", "plugins", "plugin", "marketplace"],
  route: "/admin/store",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["store:browse", "plugins:read"],
  executePermissions: ["plugins:manage"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    install: gatedAction("create"),
    update: gatedAction("update"),
    remove: gatedAction("delete"),
    configure: gatedAction("configure"),
  },
  secrets: redactedSecrets(["plugin.settings.secret", "plugin.token", "publisher.apiKey"]),
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-12",
  notes: "Plugin install/remove prompts stay non-executable without typed contracts.",
});

export const themePolicy: AssistantResourcePolicy = modulePolicy({
  kind: "theme",
  label: "Admin UI Theme",
  aliases: ["theme", "themes", "admin theme", "ui theme", "motyw"],
  route: "/admin/themes",
  operations: ["inspect", "find", "create", "update", "delete", "configure"],
  readPermissions: ["themes:read"],
  executePermissions: ["themes:write"],
  actions: {
    inspect: readOnlyAction("inspect"),
    find: readOnlyAction("find"),
    create: gatedAction("create"),
    update: gatedAction("update"),
    delete: gatedAction("delete"),
    configure: gatedAction("configure"),
  },
  destructive: gatedDestructivePolicy,
  coverageState: "live-gated",
  task: "TASK-184-12",
  notes: "Theme mutation prompts stay non-executable without typed contracts.",
});

export const pageTemplatesPolicy: AssistantResourcePolicy = modulePolicy({
  kind: "page-template",
  label: "Page Templates",
  aliases: ["page template", "page templates", "szablon strony", "szablony stron"],
  route: "/admin/advanced/page-templates",
  operations: ["inspect"],
  readPermissions: ["content:read"],
  executePermissions: ["content:write"],
  actions: previewGatedActions,
  coverageState: "live-gated",
  task: "TASK-420-03",
  notes:
    "Page Templates editor advertises no assistant active surface in v1; prompts stay manual-UI gated.",
});

export const advancedModulePolicies = {
  post: postPolicy,
  "page-template": pageTemplatesPolicy,
  filters: filtersPolicy,
  "advanced-search": advancedSearchPolicy,
  booking: bookingPolicy,
  appointments: appointmentsPolicy,
  reviews: reviewsPolicy,
  commerce: commercePolicy,
  popups: popupsPolicy,
  "mega-menu": megaMenuPolicy,
  portal: portalPolicy,
  i18n: i18nPolicy,
  "solution-kit": solutionKitPolicy,
  "plugin-store": pluginStorePolicy,
  theme: themePolicy,
};
