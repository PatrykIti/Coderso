import type {
  AssistantActionInputContract,
  AssistantActionContractFamily,
  AssistantActionContractStatus,
  AssistantActionFamilyContract,
  AssistantExecutableActionType,
} from "./actionPlanTypes";
import { assistantActionTypes, isAssistantActionType } from "./actionRegistry";

export const assistantContractOnlyActionTypes = [
  "entry.sample.create",
  "entry.bulk-draft.create",
  "entry.field.patch",
  "menu.structure.patch",
  "form.automation.upsert",
  "page.widget.patch",
] as const;

export type AssistantContractOnlyActionType =
  (typeof assistantContractOnlyActionTypes)[number];
export type AssistantKnownActionContractType =
  | AssistantExecutableActionType
  | AssistantContractOnlyActionType;

const contractOnlyActionTypeSet = new Set<string>(assistantContractOnlyActionTypes);
const executableActionTypeSet = new Set<string>(assistantActionTypes);

export const isAssistantContractOnlyActionType = (
  value: unknown
): value is AssistantContractOnlyActionType =>
  typeof value === "string" && contractOnlyActionTypeSet.has(value);

export const isAssistantKnownActionContractType = (
  value: unknown
): value is AssistantKnownActionContractType =>
  isAssistantActionType(value) || isAssistantContractOnlyActionType(value);

const baseReadPermissions = ["settings:read", "content:read"] as const;
const baseExecutePermissions = [
  "settings:write",
  "content:write",
  "content:publish",
] as const;

const baseAntiAbuse = [
  "internal-admin-endpoint-only",
  "csrf-required",
  "assistant-rate-limit-bucket",
  "execute-requires-persistent-idempotency",
] as const;

const baseSecretHandling = [
  "no-provider-keys",
  "no-session-cookie-csrf-data",
  "no-raw-form-submissions",
  "no-secret-like-settings",
] as const;

const contract = <TType extends AssistantKnownActionContractType>(
  value: AssistantActionFamilyContract<TType>
) => value;

const executableContract = <TType extends AssistantExecutableActionType>(
  type: TType,
  family: AssistantActionContractFamily,
  schemaOwner: string,
  required: readonly string[],
  options: {
    executionBoundary?: "existing-domain-service" | "existing-site-kit-adapter";
    permissions?: {
      plan: readonly string[];
      dryRun: readonly string[];
      execute: readonly string[];
    };
    notes?: readonly string[];
  } = {}
) =>
  contract({
    type,
    family,
    status: "executable",
    schemaOwner,
    executionBoundary: options.executionBoundary ?? "existing-domain-service",
    permissions: options.permissions ?? {
      plan: baseReadPermissions,
      dryRun: baseReadPermissions,
      execute: baseExecutePermissions,
    },
    strictInput: {
      required,
      rejectsUnknown: true,
      notes: options.notes ?? ["Owned by the current strict assistant action plan schema."],
    },
    publicWrite: false,
    antiAbuse: baseAntiAbuse,
    secretHandling: baseSecretHandling,
  });

const plannedContract = <TType extends AssistantContractOnlyActionType>(
  type: TType,
  family: AssistantActionContractFamily,
  schemaOwner: string,
  required: readonly string[],
  permissions: {
    plan: readonly string[];
    dryRun: readonly string[];
    execute: readonly string[];
  },
  options: {
    publicWrite?: false | "uses-existing-public-form-hardening";
    notes?: readonly string[];
    antiAbuse?: readonly string[];
    secretHandling?: readonly string[];
  } = {}
) =>
  contract({
    type,
    family,
    status: "contract-only",
    schemaOwner,
    executionBoundary: "existing-domain-service",
    permissions,
    strictInput: {
      required,
      rejectsUnknown: true,
      notes: options.notes ?? [
        "Contract is documented and typed but not executable until its adapter task lands.",
      ],
    },
    publicWrite: options.publicWrite ?? false,
    antiAbuse: options.antiAbuse ?? baseAntiAbuse,
    secretHandling: options.secretHandling ?? baseSecretHandling,
  });

const siteKitPermissions = {
  plan: [...baseReadPermissions, "solution-kits:read"],
  dryRun: [...baseReadPermissions, "solution-kits:read"],
  execute: [...baseExecutePermissions, "solution-kits:write"],
} as const;

export const assistantActionFamilyContracts = [
  executableContract(
    "setting.content-route.upsert",
    "settings",
    "core/services/settings/settingsService.ts",
    ["typeSlug", "listPath", "detailPath", "enabled"]
  ),
  executableContract(
    "content-type.upsert",
    "content",
    "core/services/content/typeService.ts",
    ["slug", "name", "schema"]
  ),
  executableContract(
    "custom-screen.upsert",
    "custom-screen",
    "core/services/customScreens/customScreenService.ts",
    ["name", "contentTypeSlug", "status", "showInSidebar", "blocks", "bindings"]
  ),
  executableContract(
    "listing-query.upsert",
    "listing",
    "core/services/content/listingQueriesService.ts",
    ["name", "contentTypeSlug", "fields", "includeDrafts", "limit", "sort"]
  ),
  executableContract(
    "listing-template.upsert",
    "listing",
    "core/services/content/listingTemplatesService.ts",
    ["name", "slug", "layout", "config"]
  ),
  executableContract(
    "form.upsert",
    "form",
    "core/services/forms/formsService.ts",
    ["name", "slug", "status", "submissionAccess", "fields"]
  ),
  executableContract(
    "entry.upsert-draft",
    "entry",
    "core/services/content/entryService.ts",
    ["contentTypeSlug", "title", "slug", "values"],
    {
      permissions: {
        plan: ["content:read"],
        dryRun: ["content:read"],
        execute: ["content:write"],
      },
      notes: ["Draft-only entry upsert; publishing requires a separate explicit action."],
    }
  ),
  executableContract(
    "menu.item.upsert",
    "menu",
    "core/services/menus/menuService.ts",
    ["menuId", "label", "href"],
    {
      permissions: {
        plan: ["menus:read"],
        dryRun: ["menus:read"],
        execute: ["menus:write"],
      },
      notes: ["Href must be a safe admin/public relative URL."],
    }
  ),
  executableContract(
    "seo.document.upsert",
    "seo",
    "core/services/seo/seoService.ts",
    ["targetType", "targetId", "seo"],
    {
      permissions: {
        plan: ["content:read"],
        dryRun: ["content:read"],
        execute: ["content:write"],
      },
      notes: ["SEO target must resolve to an existing schema-owned page or entry."],
    }
  ),
  executableContract(
    "media.reference.attach",
    "media",
    "core/services/media/mediaService.ts",
    ["mediaId", "targetType", "targetId", "field"],
    {
      permissions: {
        plan: ["media:read", "content:read"],
        dryRun: ["media:read", "content:read"],
        execute: ["media:read", "content:write"],
      },
      notes: ["References existing media on entry targets only; raw upload bytes are never accepted."],
    }
  ),
  executableContract(
    "listing-query.filters.patch",
    "listing",
    "core/services/content/listingQueriesService.ts",
    ["listingQueryName", "filters"],
    {
      permissions: {
        plan: ["content:read"],
        dryRun: ["content:read"],
        execute: ["content:write"],
      },
      notes: ["Filters must be array records and preserve unrelated listing query config."],
    }
  ),
  executableContract(
    "listing-template.card.patch",
    "listing",
    "core/services/content/listingTemplatesService.ts",
    ["listingTemplateSlug", "card"],
    {
      permissions: {
        plan: ["content:read"],
        dryRun: ["content:read"],
        execute: ["content:write"],
      },
      notes: ["Card config patch must preserve unrelated listing template config."],
    }
  ),
  executableContract(
    "page.upsert",
    "page",
    "core/services/pages/pageService.ts",
    ["title", "slug", "status", "listingQueryName", "listingTemplateSlug"]
  ),
  executableContract(
    "site-kit.recommend",
    "site-kit",
    "core/services/assistant/siteBuilderPlanAdapter.ts",
    ["businessType", "goals", "locale", "preview"],
    {
      executionBoundary: "existing-site-kit-adapter",
      permissions: siteKitPermissions,
    }
  ),
  executableContract(
    "site-kit.install",
    "site-kit",
    "core/services/assistant/siteBuilderExecutor.ts",
    ["businessType", "goals", "locale", "preview"],
    {
      executionBoundary: "existing-site-kit-adapter",
      permissions: siteKitPermissions,
    }
  ),
  executableContract(
    "site-kit.validate",
    "site-kit",
    "core/services/assistant/siteBuilderExecutor.ts",
    ["runId"],
    {
      executionBoundary: "existing-site-kit-adapter",
      permissions: siteKitPermissions,
    }
  ),
  plannedContract(
    "entry.sample.create",
    "entry",
    "core/services/content/entryService.ts",
    ["contentTypeSlug", "samples"],
    {
      plan: ["content:read"],
      dryRun: ["content:read"],
      execute: ["content:write"],
    },
    {
      notes: ["Bounded sample draft creation for schema-known fields only."],
    }
  ),
  plannedContract(
    "entry.bulk-draft.create",
    "entry",
    "core/services/content/entryService.ts",
    ["contentTypeSlug", "entries"],
    {
      plan: ["content:read"],
      dryRun: ["content:read"],
      execute: ["content:write"],
    },
    {
      notes: ["Non-destructive bounded draft bulk creation; no publish side effect."],
    }
  ),
  plannedContract(
    "entry.field.patch",
    "entry",
    "core/services/content/entryService.ts",
    ["contentTypeSlug", "entryId", "values"],
    {
      plan: ["content:read"],
      dryRun: ["content:read"],
      execute: ["content:write"],
    },
    {
      notes: ["Patch values must be limited to fields in the owning content type schema."],
    }
  ),
  plannedContract(
    "menu.structure.patch",
    "menu",
    "core/services/menus/menuService.ts",
    ["menuId", "items"],
    {
      plan: ["menus:read"],
      dryRun: ["menus:read"],
      execute: ["menus:write"],
    },
    {
      notes: ["Patch must be deterministic and avoid duplicate menu items."],
    }
  ),
  plannedContract(
    "form.automation.upsert",
    "form",
    "core/services/forms/formActionsService.ts",
    ["formId", "action"],
    {
      plan: ["forms:read"],
      dryRun: ["forms:read"],
      execute: ["forms:write"],
    },
    {
      notes: ["Automation payload must not include integration secrets in browser-visible data."],
      publicWrite: "uses-existing-public-form-hardening",
      secretHandling: [
        ...baseSecretHandling,
        "no-integration-provider-secrets",
        "no-webhook-secret-material",
      ],
    }
  ),
  plannedContract(
    "page.widget.patch",
    "page",
    "core/services/pages/pageService.ts",
    ["pageSlug", "patch"],
    {
      plan: ["content:read"],
      dryRun: ["content:read"],
      execute: ["content:write", "content:publish"],
    },
    {
      notes: ["Widget patch must preserve unknown legacy blocks and reject unsupported widget types."],
    }
  ),
] as const satisfies readonly AssistantActionFamilyContract<AssistantKnownActionContractType>[];

const actionFamilyContractMap = new Map<AssistantKnownActionContractType, AssistantActionFamilyContract>(
  assistantActionFamilyContracts.map((item) => [item.type, item])
);

export const getAssistantActionFamilyContract = (
  type: AssistantKnownActionContractType
): AssistantActionFamilyContract => {
  const contractValue = actionFamilyContractMap.get(type);
  if (!contractValue) {
    throw new Error("assistant_action_contract_missing");
  }
  return contractValue;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const fail = (): never => {
  throw new Error("assistant_action_contract_invalid");
};

const assertRecord = (value: unknown): JsonRecord =>
  isRecord(value) ? value : fail();

const readText = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) fail();
    return trimmed;
  }
  return fail();
};

const readTextArray = (value: unknown) =>
  Array.isArray(value) ? value.map(readText) : fail();

const assertKeys = (value: JsonRecord, allowed: Set<string>) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail();
  }
};

const readFamily = (value: unknown): AssistantActionContractFamily => {
  const family = readText(value);
  const knownFamilies = new Set<AssistantActionContractFamily>([
    "settings",
    "content",
    "custom-screen",
    "listing",
    "form",
    "page",
    "site-kit",
    "entry",
    "menu",
    "seo",
    "media",
  ]);
  if (!knownFamilies.has(family as AssistantActionContractFamily)) fail();
  return family as AssistantActionContractFamily;
};

const readStatus = (value: unknown): AssistantActionContractStatus => {
  const status = readText(value);
  if (status === "executable") return "executable";
  if (status === "contract-only") return "contract-only";
  return fail();
};

const readExecutionBoundary = (
  value: unknown
): AssistantActionFamilyContract["executionBoundary"] => {
  const boundary = readText(value);
  if (boundary === "existing-domain-service") return "existing-domain-service";
  if (boundary === "existing-site-kit-adapter") return "existing-site-kit-adapter";
  return fail();
};

const readPermissions = (value: unknown) => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["plan", "dryRun", "execute"]));
  return {
    plan: readTextArray(input.plan),
    dryRun: readTextArray(input.dryRun),
    execute: readTextArray(input.execute),
  };
};

const readStrictInput = (value: unknown): AssistantActionInputContract => {
  const input = assertRecord(value);
  assertKeys(input, new Set(["required", "rejectsUnknown", "notes"]));
  const rejectsUnknown = input.rejectsUnknown;
  if (typeof rejectsUnknown === "boolean") {
    return {
      required: readTextArray(input.required),
      rejectsUnknown,
      notes: readTextArray(input.notes),
    };
  }
  return fail();
};

const readPublicWrite = (value: unknown): AssistantActionFamilyContract["publicWrite"] => {
  if (value === false || value === "uses-existing-public-form-hardening") return value;
  return fail();
};

const readKnownActionContractType = (
  value: unknown
): AssistantKnownActionContractType => {
  const type = readText(value);
  if (isAssistantKnownActionContractType(type)) return type;
  return fail();
};

export const normalizeAssistantActionFamilyContract = (
  value: unknown
): AssistantActionFamilyContract<AssistantKnownActionContractType> => {
  const input = assertRecord(value);
  assertKeys(
    input,
    new Set([
      "type",
      "family",
      "status",
      "schemaOwner",
      "executionBoundary",
      "permissions",
      "strictInput",
      "publicWrite",
      "antiAbuse",
      "secretHandling",
    ])
  );
  const type = readKnownActionContractType(input.type);
  const status = readStatus(input.status);
  if (status === "executable" && !executableActionTypeSet.has(type)) fail();
  if (status === "contract-only" && !contractOnlyActionTypeSet.has(type)) fail();
  return {
    type,
    family: readFamily(input.family),
    status,
    schemaOwner: readText(input.schemaOwner),
    executionBoundary: readExecutionBoundary(input.executionBoundary),
    permissions: readPermissions(input.permissions),
    strictInput: readStrictInput(input.strictInput),
    publicWrite: readPublicWrite(input.publicWrite),
    antiAbuse: readTextArray(input.antiAbuse),
    secretHandling: readTextArray(input.secretHandling),
  };
};
