import type { AssistantActionContext, AssistantAdminContext } from "../actionPlanTypes";
import type {
  CmsOperation,
  CmsOperationDraft,
  CmsOperationFilter,
  CmsOperationTargetQuery,
  CmsResourceKind,
} from "../cmsOperationDraftSchema";
import type { CmsResolvedTargetCandidate } from "../cmsTargetResolver";
import { assistantOperationPolicy } from "./assistantOperationPolicy";
import type {
  AssistantOperationPolicy,
  AssistantPolicyFilter,
  AssistantResourcePolicy,
} from "./policyTypes";

const operationAliases: Record<CmsOperation, string[]> = {
  inspect: [
    "czy widzisz",
    "widzisz",
    "jakie",
    "ktore",
    "które",
    "which",
    "find",
    "show",
    "list",
    "pokaż",
    "pokaz",
    "znajdz",
    "znajdź",
    "czy jest",
    "czy istnieje",
    "istnieje",
    "exists",
  ],
  find: ["find", "search", "szukaj", "znajdz", "znajdź"],
  create: ["stworz", "stwórz", "utworz", "utwórz", "create", "build", "set up"],
  update: [
    "zmien",
    "zmień",
    "update",
    "rename",
    "ustaw",
    "set",
    "ukryj",
    "hide",
    "show",
    "pokaz",
    "pokaż",
  ],
  delete: ["usun", "usuń", "usuw", "skasuj", "kasuj", "delete", "remove"],
  archive: ["archive", "archiwizuj", "zarchiwizuj"],
  publish: ["publish", "opublikuj"],
  configure: ["configure", "konfiguruj", "ustaw"],
  refine: ["refine", "doprecyzuj", "popraw"],
};

const prefixAliases = ["prefix", "prefixem", "prefiks", "prefiksem", "starts with", "zaczyna"];

const surfaceStopWords = new Set([
  "admin",
  "ui",
  "section",
  "sekcja",
  "sekcji",
  "surface",
  "widzisz",
  "jakie",
  "ktore",
  "które",
  "w",
  "we",
  "in",
  "the",
  "all",
  "wszystkie",
]);

export const normalizeResolverText = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const includesAny = (value: string, candidates: string[]) =>
  candidates.some((candidate) => value.includes(normalizeResolverText(candidate)));

const wordLikeContains = (normalizedPrompt: string, alias: string) => {
  const normalizedAlias = normalizeResolverText(alias);
  if (!normalizedAlias) return false;
  return new RegExp(
    `(^|[^a-z0-9ąćęłńóśźż])${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9ąćęłńóśźż])`,
    "u"
  ).test(normalizedPrompt);
};

export const inferOperationWithPolicy = (
  normalizedPrompt: string,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): CmsOperation | null => {
  const operations = new Set(
    Object.values(policy.resources).flatMap((resource) => resource.operations)
  );
  const ordered: CmsOperation[] = [
    "delete",
    "archive",
    "publish",
    "update",
    "create",
    "inspect",
    "find",
    "configure",
    "refine",
  ];
  for (const operation of ordered) {
    if (!operations.has(operation)) continue;
    if (includesAny(normalizedPrompt, operationAliases[operation])) return operation;
  }
  return null;
};

export const includesPrefixIntentWithPolicy = (normalizedPrompt: string) =>
  includesAny(normalizedPrompt, prefixAliases);

const policyResourceEntries = (policy: AssistantOperationPolicy) =>
  Object.entries(policy.resources).filter(([, resource]) => resource.coverage.state !== "not-applicable");

export const getResolverResourcePolicyByKey = (
  key: string | null | undefined,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantResourcePolicy | null => {
  if (!key) return null;
  const resource = policy.resources[key];
  return resource && resource.coverage.state !== "not-applicable" ? resource : null;
};

export const getResolverResourcePolicy = (
  kind: CmsResourceKind,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantResourcePolicy | null => {
  const exact = policy.resources[kind];
  if (exact?.kind === kind && exact.coverage.state !== "not-applicable") return exact;
  return (
    policyResourceEntries(policy).find(([, resource]) => resource.kind === kind)?.[1] ?? null
  );
};

export const getResolverResourcePolicyForDraft = (
  draft: Pick<CmsOperationDraft, "resourceKind" | "resourceKey">,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): AssistantResourcePolicy | null =>
  getResolverResourcePolicyByKey(draft.resourceKey, policy) ??
  getResolverResourcePolicy(draft.resourceKind, policy);

export const resolveResourcePolicyEntryFromPromptWithPolicy = (
  prompt: string,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): { key: string; resource: AssistantResourcePolicy } | null => {
  const normalizedPrompt = normalizeResolverText(prompt.replace(/['"“”][^'"“”]+['"“”]/g, " "));
  const matches = policyResourceEntries(policy)
    .map(([key, resource]) => ({
      key,
      resource,
      score: resource.aliases.reduce(
        (result, alias) =>
          result + (wordLikeContains(normalizedPrompt, alias) ? normalizeResolverText(alias).length : 0),
        0
      ),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);
  const match = matches[0];
  return match && isCmsResourceKind(match.resource.kind)
    ? { key: match.key, resource: match.resource }
    : null;
};

export const resolveResourceKindFromPromptWithPolicy = (
  prompt: string,
  policy: AssistantOperationPolicy = assistantOperationPolicy
): CmsResourceKind | null =>
  (resolveResourcePolicyEntryFromPromptWithPolicy(prompt, policy)?.resource.kind as CmsResourceKind | undefined) ??
  null;

const isCmsResourceKind = (value: unknown): value is CmsResourceKind =>
  typeof value === "string" &&
  [
    "page",
    "entry",
    "content-type",
    "custom-screen",
    "widget-template",
    "listing-query",
    "listing-template",
    "form",
    "menu-item",
    "seo-document",
    "media",
    "settings-surface",
    "solution-kit",
  ].includes(value);

export const inferRequestedCountWithPolicy = (
  normalizedPrompt: string,
  policy: AssistantOperationPolicy = assistantOperationPolicy
) => {
  const digitMatch = normalizedPrompt.match(/\b(\d{1,2})\b/);
  if (digitMatch?.[1]) return Number(digitMatch[1]);
  for (const [word, count] of Object.entries(policy.followUp.countWords)) {
    if (new RegExp(`(^|\\s)${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "u").test(normalizedPrompt)) {
      return count;
    }
  }
  return undefined;
};

export const inferFiltersFromPromptWithPolicy = (
  normalizedPrompt: string,
  resourcePolicy: AssistantResourcePolicy | null
): CmsOperationFilter[] => {
  if (!resourcePolicy) return [];
  const filters: CmsOperationFilter[] = [];
  for (const filter of Object.values(resourcePolicy.filters)) {
    for (const [canonical, aliases] of Object.entries(filter.values ?? {})) {
      if (
        aliases.some((alias) => wordLikeContains(normalizedPrompt, alias)) ||
        wordLikeContains(normalizedPrompt, canonical)
      ) {
        filters.push({
          field: filter.field as CmsOperationFilter["field"],
          operator: filter.operators[0] ?? "eq",
          value: canonicalValue(canonical),
        });
        break;
      }
    }
  }
  return dedupeFilters(filters);
};

const dedupeFilters = (filters: CmsOperationFilter[]) => {
  const seen = new Set<string>();
  return filters.filter((filter) => {
    const key = `${filter.field}:${filter.operator}:${JSON.stringify(filter.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const canonicalValue = (value: string): string | boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const normalizeValue = (value: string | number | boolean | null | undefined) =>
  value === null || value === undefined ? "" : normalizeResolverText(String(value));

const canonicalizeFilterValue = (
  value: string | boolean | string[],
  filterPolicy: AssistantPolicyFilter
): string | boolean | Array<string | boolean> => {
  const normalizeOne = (item: string | boolean) => {
    if (typeof item === "boolean") return item;
    const normalized = normalizeResolverText(item);
    for (const [canonical, aliases] of Object.entries(filterPolicy.values ?? {})) {
      if (
        normalizeResolverText(canonical) === normalized ||
        aliases.some((alias) => normalizeResolverText(alias) === normalized)
      ) {
        return canonicalValue(canonical);
      }
    }
    return item;
  };
  return Array.isArray(value) ? value.map(normalizeOne) : normalizeOne(value);
};

const getCandidateFieldValue = (
  candidate: CmsResolvedTargetCandidate,
  field: string
): string | number | boolean | null | undefined => {
  if (field === "status") return candidate.status;
  if (field === "slug") return candidate.slug;
  if (field === "label" || field === "name" || field === "title") return candidate.label;
  if (field === "visibility" || field === "submissionAccess") {
    return candidate.details?.submissionAccess;
  }
  return candidate.details?.[field];
};

export const matchesFiltersWithPolicy = (
  candidate: CmsResolvedTargetCandidate,
  filters: CmsOperationDraft["filters"],
  resourcePolicy: AssistantResourcePolicy | null
) => {
  if (!filters || filters.length === 0) return true;
  if (!resourcePolicy) return false;
  for (const filter of filters) {
    const filterPolicy = Object.values(resourcePolicy.filters).find(
      (item) => item.field === filter.field
    );
    if (!filterPolicy || !filterPolicy.operators.includes(filter.operator)) return false;
    const expected = canonicalizeFilterValue(filter.value, filterPolicy);
    const actual = normalizeValue(getCandidateFieldValue(candidate, filterPolicy.field));
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    const matched = expectedValues.some((value) => normalizeValue(value) === actual);
    if (!matched) return false;
  }
  return true;
};

const splitTextQueryTerms = (value: string) => {
  const normalized = normalizeResolverText(value);
  if (!/\s(?:or|lub|albo)\s|\|/.test(normalized)) return [normalized];
  return normalized
    .split(/\s+(?:or|lub|albo)\s+|\|/u)
    .map((item) => item.trim())
    .filter(Boolean);
};

const candidateSearchValues = (candidate: CmsResolvedTargetCandidate) =>
  [candidate.id, candidate.label, candidate.slug ?? ""].map(normalizeValue);

export const matchesCandidateWithPolicy = (
  candidate: CmsResolvedTargetCandidate,
  query: CmsOperationTargetQuery,
  _resourcePolicy: AssistantResourcePolicy | null
) => {
  const candidates = candidateSearchValues(candidate);
  if (query.slug) return normalizeValue(candidate.slug) === normalizeResolverText(query.slug);
  if (query.exactName) {
    const target = normalizeResolverText(query.exactName);
    return candidates.includes(target);
  }
  if (query.prefix) {
    const target = normalizeResolverText(query.prefix);
    return candidates.some((value) => value.startsWith(target));
  }
  if (query.text) {
    const targets = splitTextQueryTerms(query.text);
    return targets.some((target) => candidates.some((value) => value.includes(target)));
  }
  return true;
};

const surfaceTokensForPolicy = (resourcePolicy: AssistantResourcePolicy | null) => {
  const tokens = new Set(surfaceStopWords);
  if (!resourcePolicy) return tokens;
  const add = (value: string) => {
    for (const token of normalizeResolverText(value).split(/[^a-z0-9ąćęłńóśźż]+/u)) {
      if (token) tokens.add(token);
    }
  };
  add(resourcePolicy.label);
  for (const route of resourcePolicy.routes) add(route);
  for (const alias of resourcePolicy.aliases) add(alias);
  for (const filter of Object.values(resourcePolicy.filters)) {
    add(filter.field);
    for (const alias of filter.aliases) add(alias);
    for (const [canonical, aliases] of Object.entries(filter.values ?? {})) {
      add(canonical);
      for (const alias of aliases) add(alias);
    }
  }
  for (const operation of resourcePolicy.operations) {
    add(operation);
    for (const alias of operationAliases[operation] ?? []) add(alias);
  }
  return tokens;
};

export const isSurfaceOnlyReadQueryWithPolicy = (
  draft: CmsOperationDraft,
  query: NonNullable<CmsOperationDraft["targetQuery"]>,
  resourcePolicy: AssistantResourcePolicy | null
) => {
  if (draft.operation !== "inspect" && draft.operation !== "find") return false;
  if (!query.text || query.exactName || query.prefix || query.slug || query.active) return false;
  const text = normalizeResolverText(query.text);
  if (/\s(?:or|lub|albo)\s|\|/.test(text)) return false;
  const surfaceText = normalizeResolverText(draft.surfaceHint ?? "");
  const surfaceTokens = surfaceTokensForPolicy(resourcePolicy);
  const tokens = text.split(/[^a-z0-9ąćęłńóśźż]+/u).filter(Boolean);
  const isOnlySurfaceWords = tokens.every(
    (token) => surfaceTokens.has(token) || token.length <= 2
  );
  return (
    Boolean(surfaceText && (text === surfaceText || (text.includes(surfaceText) && isOnlySurfaceWords))) ||
    isOnlySurfaceWords
  );
};

export const inferActiveResourceKindWithPolicy = (
  context?: AssistantActionContext | AssistantAdminContext
): CmsResourceKind | null => {
  const activeSurface = context?.activeSurface ?? null;
  if (activeSurface?.kind === "page") return "page";
  if (activeSurface?.kind === "custom-screen") return "custom-screen";
  if (activeSurface?.kind === "widget-template") return "widget-template";
  const selected = context?.runtimeSnapshot?.selectedResource;
  if (selected?.kind === "entry" || selected?.kind === "custom-screen-entry") return "entry";
  return isCmsResourceKind(selected?.kind) ? selected.kind : null;
};

export const resolveFieldIntentWithPolicy = (
  normalizedPrompt: string,
  resourcePolicy: AssistantResourcePolicy | null,
  fallback = "title"
) => {
  if (!resourcePolicy) return fallback;
  const matched = Object.values(resourcePolicy.fields).find((field) =>
    [field.field, ...field.aliases].some((alias) => wordLikeContains(normalizedPrompt, alias))
  );
  return matched?.field ?? fallback;
};

export const findFieldPolicyByAliases = (
  resourcePolicy: AssistantResourcePolicy | null,
  labels: string[]
) => {
  if (!resourcePolicy) return labels;
  const aliases = new Set(labels);
  for (const field of Object.values(resourcePolicy.fields)) {
    for (const alias of [field.field, ...field.aliases]) aliases.add(alias);
  }
  return [...aliases];
};

export { splitTextQueryTerms as splitResolverTextQueryTerms };
