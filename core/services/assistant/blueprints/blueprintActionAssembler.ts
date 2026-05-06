import { isDeepStrictEqual } from "node:util";

import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPageUpsertAction,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import type { BlueprintCompositionGraph, BlueprintConflict } from "./blueprintCapabilityTypes";

const unique = <T>(items: T[]) => Array.from(new Set(items));

const actionOrder: Record<AssistantPlannedAction["type"], number> = {
  "setting.content-route.upsert": 10,
  "content-type.upsert": 20,
  "content-type.delete": 90,
  "custom-screen.upsert": 30,
  "custom-screen.delete": 90,
  "custom-screen.update": 90,
  "custom-screen.widget.patch": 90,
  "listing-query.upsert": 40,
  "listing-query.delete": 90,
  "listing-query.update": 90,
  "listing-template.upsert": 50,
  "listing-template.delete": 90,
  "listing-template.update": 90,
  "form.upsert": 60,
  "form.delete": 90,
  "form.archive": 90,
  "form.update": 90,
  "entry.upsert-draft": 90,
  "entry.delete": 90,
  "entry.update": 90,
  "menu.item.upsert": 90,
  "menu.item.delete": 90,
  "menu.item.update": 90,
  "seo.document.upsert": 90,
  "seo.document.delete": 90,
  "seo.document.update": 90,
  "media.reference.attach": 90,
  "listing-query.filters.patch": 90,
  "listing-template.card.patch": 90,
  "page.widget.patch": 90,
  "form.automation.upsert": 90,
  "page.upsert": 70,
  "page.update": 90,
  "page.delete": 90,
  "widget-template.delete": 90,
  "widget-template.update": 90,
  "widget-template.block.patch": 90,
  "site-kit.recommend": 90,
  "site-kit.install": 90,
  "site-kit.validate": 90,
};

const buildMergeConflict = (
  action: AssistantPlannedAction,
  code: string,
  message: string
): BlueprintConflict => ({
  code,
  severity: "error",
  message,
  resourceKey: buildBlueprintActionMergeKey(action),
  actionType: action.type,
});

const mergeBlocksById = (
  left: Array<Record<string, unknown>> | undefined,
  right: Array<Record<string, unknown>> | undefined
) => {
  if (!left?.length) return right ? [...right] : undefined;
  if (!right?.length) return [...left];
  const merged = new Map<string, Record<string, unknown>>();
  for (const block of [...left, ...right]) {
    const id = typeof block.id === "string" ? block.id : JSON.stringify(block);
    const previous = merged.get(id);
    if (!previous) {
      merged.set(id, block);
      continue;
    }
    if (!isDeepStrictEqual(previous, block)) return null;
  }
  return [...merged.values()];
};

const mergeFormFields = (
  left: Array<Record<string, unknown>>,
  right: Array<Record<string, unknown>>
) => {
  const merged = new Map<string, Record<string, unknown>>();
  for (const field of [...left, ...right]) {
    const key =
      typeof field.name === "string"
        ? field.name
        : typeof field.id === "string"
          ? field.id
          : JSON.stringify(field);
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, field);
      continue;
    }
    if (!isDeepStrictEqual(previous, field)) return null;
  }
  return [...merged.values()];
};

const mergeListingFields = (left: string[], right: string[]) => unique([...left, ...right]);

const mergePageUpsert = (left: AssistantPageUpsertAction, right: AssistantPageUpsertAction) => {
  if (left.input.slug !== right.input.slug) return null;
  if (
    left.input.listingQueryName &&
    right.input.listingQueryName &&
    left.input.listingQueryName !== right.input.listingQueryName
  ) {
    return null;
  }
  if (
    left.input.listingTemplateSlug &&
    right.input.listingTemplateSlug &&
    left.input.listingTemplateSlug !== right.input.listingTemplateSlug
  ) {
    return null;
  }
  if (
    left.input.formEmbed &&
    right.input.formEmbed &&
    !isDeepStrictEqual(left.input.formEmbed, right.input.formEmbed)
  ) {
    return null;
  }
  const blocks = mergeBlocksById(
    left.input.blocks as Array<Record<string, unknown>> | undefined,
    right.input.blocks as Array<Record<string, unknown>> | undefined
  );
  if (blocks === null) return null;
  return {
    ...left,
    input: {
      ...left.input,
      title: left.input.title,
      status:
        left.input.status === "published" || right.input.status === "published"
          ? "published"
          : left.input.status,
      listingQueryName: left.input.listingQueryName ?? right.input.listingQueryName,
      listingTemplateSlug: left.input.listingTemplateSlug ?? right.input.listingTemplateSlug,
      ctaLabel: left.input.ctaLabel ?? right.input.ctaLabel,
      blocks: blocks as typeof left.input.blocks,
      contentListStyle: left.input.contentListStyle ?? right.input.contentListStyle,
      listingFilters: left.input.listingFilters ?? right.input.listingFilters,
      formEmbed: left.input.formEmbed ?? right.input.formEmbed ?? null,
    },
  } satisfies AssistantPageUpsertAction;
};

export const buildBlueprintActionMergeKey = (action: AssistantPlannedAction) => {
  switch (action.type) {
    case "setting.content-route.upsert":
      return `${action.type}:${action.input.typeSlug}`;
    case "content-type.upsert":
      return `${action.type}:${action.input.slug}`;
    case "custom-screen.upsert":
      return `${action.type}:${action.input.name}`;
    case "listing-query.upsert":
      return `${action.type}:${action.input.name}`;
    case "listing-template.upsert":
      return `${action.type}:${action.input.slug}`;
    case "form.upsert":
      return `${action.type}:${action.input.slug}`;
    case "page.upsert":
      return `${action.type}:${action.input.slug}`;
    default:
      return `${action.type}:${action.id}`;
  }
};

export const mergeBlueprintActions = (
  left: AssistantPlannedAction,
  right: AssistantPlannedAction
) => {
  if (left.type !== right.type) return null;
  switch (left.type) {
    case "setting.content-route.upsert":
      return isDeepStrictEqual(left.input, right.input) ? left : null;
    case "content-type.upsert":
      return isDeepStrictEqual(left.input, right.input) ? left : null;
    case "custom-screen.upsert": {
      const other = right as typeof left;
      if (
        left.input.name !== other.input.name ||
        left.input.contentTypeSlug !== other.input.contentTypeSlug ||
        left.input.status !== other.input.status ||
        left.input.showInSidebar !== other.input.showInSidebar ||
        left.input.sidebarLabel !== other.input.sidebarLabel
      ) {
        return null;
      }
      const blocks = mergeBlocksById(left.input.blocks, other.input.blocks);
      const bindings = mergeBlocksById(left.input.bindings, other.input.bindings);
      if (blocks === null || bindings === null) return null;
      return {
        ...left,
        input: {
          ...left.input,
          blocks: blocks ?? [],
          bindings: bindings ?? [],
        },
      };
    }
    case "listing-query.upsert": {
      const other = right as typeof left;
      if (
        left.input.name !== other.input.name ||
        left.input.contentTypeSlug !== other.input.contentTypeSlug ||
        left.input.includeDrafts !== other.input.includeDrafts ||
        !isDeepStrictEqual(left.input.sort, other.input.sort)
      ) {
        return null;
      }
      return {
        ...left,
        input: {
          ...left.input,
          description: left.input.description ?? other.input.description,
          fields: mergeListingFields(left.input.fields, other.input.fields),
          limit: Math.max(left.input.limit, other.input.limit),
        },
      };
    }
    case "listing-template.upsert":
      return isDeepStrictEqual(left.input, right.input) ? left : null;
    case "form.upsert": {
      const other = right as typeof left;
      if (
        left.input.slug !== other.input.slug ||
        left.input.name !== other.input.name ||
        left.input.status !== other.input.status ||
        left.input.submissionAccess !== other.input.submissionAccess
      ) {
        return null;
      }
      const fields = mergeFormFields(left.input.fields, other.input.fields);
      if (fields === null) return null;
      return {
        ...left,
        input: {
          ...left.input,
          description: left.input.description ?? other.input.description,
          successMessage: left.input.successMessage,
          fields: fields as typeof left.input.fields,
        },
      };
    }
    case "page.upsert":
      return mergePageUpsert(left, right as typeof left);
    default:
      return isDeepStrictEqual(left, right) ? left : null;
  }
};

export const assembleBlueprintActions = (graph: BlueprintCompositionGraph) => {
  const mergedActions: AssistantPlannedAction[] = [];
  const conflicts: BlueprintConflict[] = [...graph.conflicts];

  for (const fragment of graph.fragments) {
    for (const action of fragment.actions) {
      const mergeKey = buildBlueprintActionMergeKey(action);
      const existingIndex = mergedActions.findIndex(
        (entry) => buildBlueprintActionMergeKey(entry) === mergeKey
      );
      if (existingIndex === -1) {
        mergedActions.push(action);
        continue;
      }
      const merged = mergeBlueprintActions(mergedActions[existingIndex]!, action);
      if (!merged) {
        conflicts.push(
          buildMergeConflict(
            action,
            "blueprint_action_merge_conflict",
            `Conflicting ${action.type} actions target the same resource (${mergeKey}).`
          )
        );
        continue;
      }
      mergedActions[existingIndex] = merged;
    }
  }

  return {
    actions: [...mergedActions].sort(
      (left, right) => actionOrder[left.type] - actionOrder[right.type]
    ),
    conflicts,
  };
};

export const assembleComposedBlueprintPlan = (input: {
  prompt: string;
  promptKind: AssistantPromptKind;
  intentFamily: AssistantIntentFamily;
  graph: BlueprintCompositionGraph;
}): AssistantActionPlan | null => {
  if (!input.graph.primary) return null;
  const assembled = assembleBlueprintActions(input.graph);
  const fatalConflicts = assembled.conflicts.filter((conflict) => conflict.severity === "error");
  if (fatalConflicts.length > 0) return null;

  const selectedLabels = [
    input.graph.primary.capability.label,
    ...input.graph.adjuncts.map((node) => node.capability.label),
  ];
  const gatedLabels = input.graph.gated.map((node) => node.capability.label);
  const assumptions = unique([
    ...input.graph.fragments.flatMap((fragment) => fragment.assumptions),
    `Selected capabilities: ${selectedLabels.join(", ")}.`,
    ...gatedLabels.map(
      (label) => `${label} remains gated and is excluded from the executable typed action plan.`
    ),
  ]);

  return normalizeAssistantActionPlan({
    id: `plan-blueprint-composed-${input.graph.selectedCapabilityIds.join("-")}`,
    status: "ready",
    intentId: `blueprint-composed-${input.graph.primary.capability.id}`,
    promptKind: input.promptKind,
    intentFamily: input.intentFamily,
    title:
      input.graph.adjuncts.length > 0
        ? `${input.graph.primary.capability.label} with ${input.graph.adjuncts
            .map((node) => node.capability.label)
            .join(", ")}`
        : input.graph.primary.capability.label,
    answer:
      input.graph.adjuncts.length > 0
        ? `I can compose ${input.graph.primary.capability.label} with ${input.graph.adjuncts
            .map((node) => node.capability.label)
            .join(", ")} through the current typed assistant action flow.`
        : `I can prepare ${input.graph.primary.capability.label} through the current typed assistant action flow.`,
    summary:
      input.graph.adjuncts.length > 0
        ? `Compose ${selectedLabels.join(", ")} without adding a parallel assistant execution path.`
        : `Plan ${input.graph.primary.capability.label} through current typed assistant actions.`,
    confidence: Math.min(
      0.94,
      0.62 + input.graph.adjuncts.length * 0.07 - input.graph.gated.length * 0.04
    ),
    assumptions,
    questions: [],
    actions: assembled.actions,
  });
};
