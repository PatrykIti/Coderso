import type { DocsAnswerSource, DocsSearchHit } from "./docsTypes";
import type {
  AssistantActionContext,
  AssistantAdminRuntimeSnapshot,
} from "./actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";
import { buildAssistantAdminContext } from "./adminContextService";
import { redactAssistantMetadata, redactAssistantText } from "./assistantRedaction";
import { cmsResourceRegistry } from "./cmsResourceRegistry";

export type AssistantProviderPlanningEvidence =
  | DocsSearchHit
  | DocsAnswerSource
  | {
      path?: unknown;
      title?: unknown;
      heading?: unknown;
      content?: unknown;
      snippet?: unknown;
      score?: unknown;
    };

export type AssistantProviderPlanningPromptInput = {
  prompt: string;
  context?: AssistantActionContext;
  evidence?: AssistantProviderPlanningEvidence[];
  maxDocs?: number;
  maxCharsPerDoc?: number;
  maxResourceItemsPerGroup?: number;
};

export type AssistantProviderPlanningPromptPackage = {
  schemaVersion: 1;
  prompt: string;
  locale: string | null;
  route: string | null;
  runtime: {
    route: string | null;
    activeHref: string | null;
    area: string;
    codersoModule: string | null;
    selectedResource: { kind: string; id: string } | null;
    visibleActions: Array<{
      id: string;
      kind: string;
      href: string | null;
      requiredPermission: string | null;
    }>;
  } | null;
  docs: Array<{
    path: string;
    heading: string;
    content: string;
    score: number | null;
  }>;
  resources: {
    schemaVersion: 1;
    budget: AssistantResourceCatalogSnapshot["budget"];
    pages: NonNullable<AssistantResourceCatalogSnapshot["pages"]>;
    contentTypes: AssistantResourceCatalogSnapshot["contentTypes"];
    customScreens: AssistantResourceCatalogSnapshot["customScreens"];
    listings: AssistantResourceCatalogSnapshot["listings"];
    forms: AssistantResourceCatalogSnapshot["forms"];
    menus: AssistantResourceCatalogSnapshot["menus"];
    seoDocuments: AssistantResourceCatalogSnapshot["seoDocuments"];
    widgets: AssistantResourceCatalogSnapshot["widgets"];
    warnings: string[];
  } | null;
  registry: Array<{
    kind: string;
    aliases: string[];
    supportedOperations: string[];
    readPermissions: string[];
  }>;
  operationDraftGuidance: {
    notes: string[];
    examples: Array<{
      prompt: string;
      draft: Record<string, unknown>;
    }>;
  };
  activeSurface: AssistantActionContext["activeSurface"];
  warnings: string[];
};

const DEFAULT_MAX_DOCS = 5;
const DEFAULT_MAX_CHARS_PER_DOC = 1_200;
const DEFAULT_MAX_RESOURCE_ITEMS_PER_GROUP = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clampPositiveInteger = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : fallback;

const readEvidence = (value: AssistantProviderPlanningEvidence) => {
  if ("chunk" in value && isRecord(value.chunk)) {
    return {
      path: readString(value.chunk.docPath) ?? "unknown",
      heading: readString(value.chunk.heading) ?? readString(value.chunk.docTitle) ?? "Untitled",
      content: readString(value.chunk.content) ?? readString(value.snippet) ?? "",
      score: readNumber(value.score),
    };
  }

  const record = value as Record<string, unknown>;
  return {
    path: readString(record.path) ?? "unknown",
    heading: readString(record.heading) ?? readString(record.title) ?? "Untitled",
    content: readString(record.content) ?? readString(record.snippet) ?? "",
    score: readNumber(record.score),
  };
};

const buildDocs = (
  evidence: AssistantProviderPlanningEvidence[] | undefined,
  maxDocs: number,
  maxCharsPerDoc: number,
  warnings: string[]
): AssistantProviderPlanningPromptPackage["docs"] => {
  const source = Array.isArray(evidence) ? evidence : [];
  if (source.length > maxDocs) warnings.push("docs_truncated");

  return source.slice(0, maxDocs).map((entry) => {
    const item = readEvidence(entry);
    const content = redactAssistantText(item.content, maxCharsPerDoc);
    if (item.content.length > maxCharsPerDoc) warnings.push("doc_content_truncated");
    return {
      path: redactAssistantText(item.path, 240),
      heading: redactAssistantText(item.heading, 240),
      content,
      score: item.score,
    };
  });
};

const clampItems = <T>(
  items: T[],
  max: number,
  warning: string,
  warnings: string[]
) => {
  if (items.length > max) warnings.push(warning);
  return items.slice(0, max);
};

const buildResources = (
  catalog: AssistantResourceCatalogSnapshot | null,
  maxItemsPerGroup: number,
  warnings: string[]
): AssistantProviderPlanningPromptPackage["resources"] => {
  if (!catalog) return null;
  return {
    schemaVersion: 1,
    budget: catalog.budget,
    pages: clampItems(catalog.pages ?? [], maxItemsPerGroup, "pages_truncated", warnings),
    contentTypes: clampItems(catalog.contentTypes, maxItemsPerGroup, "content_types_truncated", warnings),
    customScreens: clampItems(catalog.customScreens, maxItemsPerGroup, "custom_screens_truncated", warnings),
    listings: {
      queries: clampItems(catalog.listings.queries, maxItemsPerGroup, "listing_queries_truncated", warnings),
      templates: clampItems(catalog.listings.templates, maxItemsPerGroup, "listing_templates_truncated", warnings),
    },
    forms: clampItems(catalog.forms, maxItemsPerGroup, "forms_truncated", warnings),
    menus: clampItems(catalog.menus, maxItemsPerGroup, "menus_truncated", warnings),
    seoDocuments: clampItems(catalog.seoDocuments, maxItemsPerGroup, "seo_documents_truncated", warnings),
    widgets: clampItems(catalog.widgets, maxItemsPerGroup, "widgets_truncated", warnings),
    warnings: [...catalog.warnings],
  };
};

const buildRuntime = (snapshot: AssistantAdminRuntimeSnapshot | null) => {
  if (!snapshot) return null;
  return {
    route: snapshot.route,
    activeHref: snapshot.activeHref,
    area: snapshot.area,
    codersoModule: snapshot.codersoModule,
    selectedResource: snapshot.selectedResource,
    visibleActions: snapshot.visibleActions.map((action) => ({
      id: redactAssistantText(action.id, 120),
      kind: action.kind,
      href: action.href,
      requiredPermission: action.requiredPermission,
    })),
  };
};

const buildRegistryCapabilities = () =>
  cmsResourceRegistry.map((entry) => ({
    kind: entry.kind,
    aliases: entry.aliases.slice(0, 12),
    supportedOperations: [...entry.supportedOperations],
    readPermissions: [...entry.readPermissions],
  }));

const buildOperationDraftGuidance = (): AssistantProviderPlanningPromptPackage["operationDraftGuidance"] => ({
  notes: [
    "Use surfaceHint for UI locations such as Screens, Pages, Engine, Admin UI, menu, or sidebar.",
    "Use targetQuery only for real resource names, slugs, prefixes, routes, or active/current references.",
    "Do not put UI section names like Screens into targetQuery.text.",
    "Use filters for active/published/visible/show-in-sidebar language.",
    "For custom-screen published/opublikowane means status active. Visible/widoczne usually means showInSidebar true.",
    "For pages, published/opublikowana maps to status published. Navigation/menu visibility is not the same as page publish status.",
    "For Engine/content-type prompts, resourceKind is content-type and Engine is surfaceHint.",
    "For Entries/custom content prompts, resourceKind is entry and the content type name is targetQuery or surfaceHint depending on wording.",
    "For Forms, public/internal/published/archived words should become allowlisted filters or update mutation values.",
    "For Listings, distinguish listing-query from listing-template. Query/template names are targets; Listings is surfaceHint.",
    "For Menus and SEO, menu/SEO sections are surface hints; item labels, hrefs, page titles, and slugs are targets.",
    "For Widgets/Templates, Widgets is surfaceHint and template names are targets. Block-level edits require active selected block context.",
    "For relation-oriented prompts, prefer inspect or needs_input unless a safe relation action contract is explicitly available.",
  ],
  examples: [
    {
      prompt: "jakie ekrany customowe istnieja w admin ui",
      draft: {
        operation: "inspect",
        resourceKind: "custom-screen",
        surfaceHint: "admin ui",
        targetQuery: null,
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "no a jakies sa opublikowane w sekcji Screens?",
      draft: {
        operation: "inspect",
        resourceKind: "custom-screen",
        surfaceHint: "Screens",
        targetQuery: null,
        filters: [{ field: "status", operator: "eq", value: "active" }],
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "czy jest strona Pysiek Mysiek?",
      draft: {
        operation: "inspect",
        resourceKind: "page",
        surfaceHint: "Pages",
        targetQuery: { exactName: "Pysiek Mysiek" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "jakie typy tresci sa w Engine?",
      draft: {
        operation: "inspect",
        resourceKind: "content-type",
        surfaceHint: "Engine",
        targetQuery: null,
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "pokaz wpisy dla Products",
      draft: {
        operation: "inspect",
        resourceKind: "entry",
        surfaceHint: "Entries",
        targetQuery: { text: "Products" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "czy formularz Lead Form jest publiczny?",
      draft: {
        operation: "inspect",
        resourceKind: "form",
        surfaceHint: "Forms",
        targetQuery: { exactName: "Lead Form" },
        filters: [{ field: "visibility", operator: "eq", value: "public" }],
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "jakie listing query sa dla produktow?",
      draft: {
        operation: "inspect",
        resourceKind: "listing-query",
        surfaceHint: "Listings",
        targetQuery: { text: "products" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "czy menu ma link Products?",
      draft: {
        operation: "inspect",
        resourceKind: "menu-item",
        surfaceHint: "Menus",
        targetQuery: { exactName: "Products" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "sprawdz SEO dla strony Products",
      draft: {
        operation: "inspect",
        resourceKind: "seo-document",
        surfaceHint: "SEO",
        targetQuery: { text: "Products" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "jakie szablony widgetow sa dostepne?",
      draft: {
        operation: "inspect",
        resourceKind: "widget-template",
        surfaceHint: "Widgets",
        targetQuery: null,
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
    {
      prompt: "czy wpis Product ma relacje do kategorii?",
      draft: {
        operation: "inspect",
        resourceKind: "entry",
        surfaceHint: "Entries",
        targetQuery: { text: "Product" },
        filters: null,
        mutation: null,
        constraints: null,
      },
    },
  ],
});

export const buildProviderPlanningPromptPackage = (
  input: AssistantProviderPlanningPromptInput
): AssistantProviderPlanningPromptPackage => {
  const warnings: string[] = [];
  const context = buildAssistantAdminContext(input.context);
  const maxDocs = clampPositiveInteger(input.maxDocs, DEFAULT_MAX_DOCS);
  const maxCharsPerDoc = clampPositiveInteger(
    input.maxCharsPerDoc,
    DEFAULT_MAX_CHARS_PER_DOC
  );
  const maxResourceItemsPerGroup = clampPositiveInteger(
    input.maxResourceItemsPerGroup,
    DEFAULT_MAX_RESOURCE_ITEMS_PER_GROUP
  );

  const promptPackage: AssistantProviderPlanningPromptPackage = {
    schemaVersion: 1,
    prompt: redactAssistantText(input.prompt, 2_000),
    locale: context.locale,
    route: context.route,
    runtime: buildRuntime(context.runtimeSnapshot),
    docs: buildDocs(input.evidence, maxDocs, maxCharsPerDoc, warnings),
    resources: buildResources(context.resourceCatalog, maxResourceItemsPerGroup, warnings),
    registry: buildRegistryCapabilities(),
    operationDraftGuidance: buildOperationDraftGuidance(),
    activeSurface: context.activeSurface,
    warnings,
  };

  return redactAssistantMetadata(promptPackage) as AssistantProviderPlanningPromptPackage;
};
