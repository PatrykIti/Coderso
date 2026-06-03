import {
  cmsOperationFilterFieldValues,
  cmsOperationValues,
  cmsResourceKindValues,
  type CmsOperation,
  type CmsOperationFilterField,
  type CmsResourceKind,
} from "../cmsOperationDraftSchema";
import type {
  AssistantOperationPolicy,
  AssistantPolicyAction,
  AssistantPolicyCoverageState,
  AssistantPolicyField,
  AssistantPolicyFilter,
  AssistantResourcePolicy,
} from "./policyTypes";

export type AssistantProviderPolicyResourceGuidance = {
  key: string;
  kind: string;
  label: string;
  aliases: string[];
  routes: string[];
  coverageState: AssistantPolicyCoverageState;
  operations: string[];
  readPermissions: string[];
  executePermissions: string[];
  fields: Array<{
    field: string;
    aliases: string[];
    valueType: AssistantPolicyField["valueType"];
    enumValues?: string[];
    actionType?: string;
  }>;
  filters: Array<{
    field: string;
    aliases: string[];
    operators: string[];
    values?: Record<string, string[]>;
  }>;
  actions: Array<{
    operation: string;
    type: string;
    target: AssistantPolicyAction["target"];
    mode: AssistantPolicyAction["mode"];
  }>;
  destructive?: AssistantResourcePolicy["destructive"];
  secrets?: {
    redacted: boolean;
    secretFields: string[];
    providerAllowed: boolean;
  };
};

export type AssistantProviderPolicyGuidance = {
  schemaVersion: 1;
  resources: AssistantProviderPolicyResourceGuidance[];
  draft: {
    resourceKinds: CmsResourceKind[];
    operations: CmsOperation[];
    filterFields: CmsOperationFilterField[];
  };
  createContracts: Array<{
    key: string;
    kind: string;
    actionTypes: string[];
    fields: string[];
  }>;
  safety: {
    destructiveDefault: AssistantOperationPolicy["safetyDefaults"]["destructive"];
    notes: string[];
  };
};

const draftResourceKindSet = new Set<string>(cmsResourceKindValues);
const operationSet = new Set<string>(cmsOperationValues);
const filterFieldSet = new Set<string>(cmsOperationFilterFieldValues);

const unique = <T>(items: T[]): T[] => [...new Set(items)];
const providerRegistryAliasLimit = 48;

const sortText = <T extends string>(items: T[], order: readonly T[]): T[] => {
  const rank = new Map(order.map((item, index) => [item, index]));
  return [...items].sort((left, right) => (rank.get(left) ?? 999) - (rank.get(right) ?? 999));
};

const supportedResources = (policy: AssistantOperationPolicy) =>
  Object.entries(policy.resources)
    .filter(([, resource]) => resource.coverage.state !== "not-applicable")
    .sort(([left], [right]) => left.localeCompare(right));

const providerField = (field: AssistantPolicyField) => ({
  field: field.field,
  aliases: field.aliases,
  valueType: field.valueType,
  ...(field.enumValues ? { enumValues: field.enumValues } : {}),
  ...(field.action ? { actionType: field.action.type } : {}),
});

const providerFilter = (filter: AssistantPolicyFilter) => ({
  field: filter.field,
  aliases: filter.aliases,
  operators: filter.operators,
  ...(filter.values ? { values: filter.values } : {}),
});

const providerAction = (action: AssistantPolicyAction) => ({
  operation: action.operation,
  type: action.type,
  target: action.target,
  mode: action.mode,
});

const toProviderResourceGuidance = (
  key: string,
  resource: AssistantResourcePolicy
): AssistantProviderPolicyResourceGuidance => ({
  key,
  kind: resource.kind,
  label: resource.label,
  aliases: resource.aliases,
  routes: resource.routes,
  coverageState: resource.coverage.state,
  operations: resource.operations,
  readPermissions: resource.readPermissions,
  executePermissions: resource.executePermissions,
  fields: Object.values(resource.fields).map(providerField),
  filters: Object.values(resource.filters).map(providerFilter),
  actions: Object.values(resource.actions).map(providerAction),
  ...(resource.destructive ? { destructive: resource.destructive } : {}),
  ...(resource.secrets
    ? {
        secrets: {
          redacted: resource.secrets.redacted,
          secretFields: resource.secrets.secretFields,
          providerAllowed: resource.secrets.providerAllowed,
        },
      }
    : {}),
});

export const buildProviderPolicyRegistry = (policy: AssistantOperationPolicy) => {
  const grouped = new Map<
    string,
    {
      aliases: string[];
      supportedOperations: string[];
      readPermissions: string[];
    }
  >();

  for (const [, resource] of supportedResources(policy)) {
    if (!draftResourceKindSet.has(resource.kind)) continue;
    const current = grouped.get(resource.kind) ?? {
      aliases: [],
      supportedOperations: [],
      readPermissions: [],
    };
    current.aliases = unique([...current.aliases, ...resource.aliases]).slice(
      0,
      providerRegistryAliasLimit
    );
    current.supportedOperations = sortText(
      unique([...current.supportedOperations, ...resource.operations]).filter(
        (item): item is CmsOperation => operationSet.has(item)
      ),
      cmsOperationValues
    );
    current.readPermissions = unique([...current.readPermissions, ...resource.readPermissions]);
    grouped.set(resource.kind, current);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, entry]) => ({
      kind,
      aliases: entry.aliases,
      supportedOperations: entry.supportedOperations,
      readPermissions: entry.readPermissions,
    }));
};

export const buildProviderPolicyGuidance = (
  policy: AssistantOperationPolicy
): AssistantProviderPolicyGuidance => {
  const resources = supportedResources(policy).map(([key, resource]) =>
    toProviderResourceGuidance(key, resource)
  );
  const draftResourceKinds = sortText(
    unique(
      resources
        .map((resource) => resource.kind)
        .filter((kind): kind is CmsResourceKind => draftResourceKindSet.has(kind))
    ),
    cmsResourceKindValues
  );
  const operations = sortText(
    unique(
      resources.flatMap((resource) =>
        resource.operations.filter((operation): operation is CmsOperation =>
          operationSet.has(operation)
        )
      )
    ),
    cmsOperationValues
  );
  const filterFields = sortText(
    unique(
      resources.flatMap((resource) =>
        resource.filters
          .map((filter) => filter.field)
          .filter((filter): filter is CmsOperationFilterField => filterFieldSet.has(filter))
      )
    ),
    cmsOperationFilterFieldValues
  );

  return {
    schemaVersion: 1,
    resources,
    draft: {
      resourceKinds: draftResourceKinds,
      operations,
      filterFields,
    },
    createContracts: resources
      .map((resource) => ({
        key: resource.key,
        kind: resource.kind,
        actionTypes: unique(
          resource.actions
            .filter((item) => item.operation === "create" && item.type !== "none")
            .map((item) => item.type)
        ),
        fields: resource.fields.map((item) => item.field),
      }))
      .filter((contract) => contract.actionTypes.length > 0),
    safety: {
      destructiveDefault: policy.safetyDefaults.destructive,
      notes: [
        "Provider output is a draft only; the local server validates schema, resolves targets, and maps actions.",
        "Use executable policy actions only as draft intent hints, never as returned action arrays.",
        "Gated resources require needs_input or no-op planning until a typed local contract allows execution.",
        "Secret-bearing resources are redacted; never include values for secretFields or providerAllowed=false surfaces.",
        "Broad destructive drafts require exact targets, expected counts, and local review.",
      ],
    },
  };
};

const nullDraftFields = {
  targetQuery: null,
  filters: null,
  mutation: null,
  constraints: null,
};

type ProviderDraftExample = {
  prompt: string;
  draft: Record<string, unknown>;
};

const exampleFor = (
  resources: AssistantProviderPolicyResourceGuidance[],
  key: string,
  prompt: string,
  draft: Record<string, unknown> = {}
): ProviderDraftExample | null => {
  const resource = resources.find((item) => item.key === key);
  if (!resource || !draftResourceKindSet.has(resource.kind)) return null;
  return {
    prompt,
    draft: {
      operation: "inspect",
      resourceKind: resource.kind,
      resourceKey: resource.key,
      surfaceHint: resource.label,
      ...nullDraftFields,
      ...draft,
    },
  };
};

export const buildProviderOperationDraftGuidance = (policy: AssistantOperationPolicy) => {
  const guidance = buildProviderPolicyGuidance(policy);
  const filterSummary = guidance.resources
    .flatMap((resource) =>
      resource.filters.map(
        (filter) => `${resource.kind}.${filter.field}:${filter.operators.join("/")}`
      )
    )
    .slice(0, 24);
  const examples = [
    exampleFor(guidance.resources, "custom-screen", "show active screens", {
      filters: [{ field: "status", operator: "eq", value: "active" }],
    }),
    exampleFor(guidance.resources, "page", "is the Products page published?", {
      targetQuery: { exactName: "Products" },
      filters: [{ field: "status", operator: "eq", value: "published" }],
    }),
    exampleFor(guidance.resources, "content-type", "what content types exist in Engine?"),
    exampleFor(guidance.resources, "form", "is Lead Form public?", {
      targetQuery: { exactName: "Lead Form" },
      filters: [{ field: "visibility", operator: "eq", value: "public" }],
    }),
    exampleFor(guidance.resources, "detail-page", "which detail page is linked to Products?", {
      targetQuery: { exactName: "ct-products" },
    }),
    exampleFor(guidance.resources, "listing-query", "which listing queries are for products?", {
      targetQuery: { text: "products" },
    }),
    exampleFor(guidance.resources, "menu-item", "does the menu have Products?", {
      targetQuery: { exactName: "Products" },
    }),
    exampleFor(guidance.resources, "seo-document", "check SEO for Products", {
      targetQuery: { text: "Products" },
    }),
  ].filter((item): item is ProviderDraftExample => Boolean(item));

  return {
    notes: [
      `Allowed draft resourceKinds from policy: ${guidance.draft.resourceKinds.join(", ")}.`,
      `Allowed draft operations from policy: ${guidance.draft.operations.join(", ")}.`,
      filterSummary.length > 0
        ? `Policy filters available: ${filterSummary.join(", ")}.`
        : "No policy filters are available.",
      "Use resourceKey from policy guidance when selecting a resource; it disambiguates shared resourceKind values such as settings-surface.",
      "Use routes and aliases from policy resources for surfaceHint; targetQuery is only for actual names, slugs, prefixes, routes, or active/current references.",
      "Use fields/actions from policy resources for mutation intent; unknown fields must stay omitted.",
      ...guidance.safety.notes,
    ],
    examples,
  };
};

export const buildProviderPlannerSystemPrompt = (policy: AssistantOperationPolicy) =>
  [
    "You draft Coderso LLM Guide CMS operation drafts.",
    "Return only JSON.",
    "Return a single object with operation, resourceKind, resourceKey, optional surfaceHint, optional targetQuery, optional filters, optional mutation, and optional constraints.",
    "Use the policy guidance JSON as the source of truth for resource kinds, aliases, filters, fields, action modes, gated surfaces, and secret redaction.",
    JSON.stringify(buildProviderPolicyGuidance(policy)),
    "Do not return executable actions.",
    "Do not invent arbitrary commands, SQL, filesystem paths, tools, resource ids, or secret values.",
    "The local server will validate your draft, resolve targets from trusted context, and map to a strict plan before any dry-run or execution.",
  ].join(" ");
