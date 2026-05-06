import { isDeepStrictEqual } from "node:util";

import type {
  AssistantActionPlan,
  AssistantIntentFamily,
  AssistantPageUpsertAction,
  AssistantPlanQuestion,
  AssistantPlannedAction,
  AssistantPromptKind,
} from "../actionPlanTypes";
import { normalizeAssistantActionPlan } from "../actionPlanSchema";
import {
  normalizeBlueprintConflict,
  type BlueprintCompositionGraph,
  type BlueprintConflict,
} from "./blueprintCapabilityTypes";

const unique = <T>(items: T[]) => Array.from(new Set(items));

const actionOrder: Record<AssistantPlannedAction["type"], number> = {
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
  "setting.content-route.upsert": 80,
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
): BlueprintConflict =>
  normalizeBlueprintConflict({
    code: code as BlueprintConflict["code"],
    severity: "error",
    message,
    resourceKey: buildBlueprintActionMergeKey(action),
    actionType: action.type,
  });

const compareConflictPriority = (left: BlueprintConflict, right: BlueprintConflict) => {
  const leftPriority = left.code === "resource_key_duplicate" ? 0 : 1;
  const rightPriority = right.code === "resource_key_duplicate" ? 0 : 1;
  return rightPriority - leftPriority;
};

const buildConflictTargetKey = (conflict: BlueprintConflict) => {
  if (!conflict.actionType) {
    return `${conflict.code}:${conflict.capabilityId ?? ""}:${conflict.resourceKey ?? conflict.message}`;
  }

  const resourceKey = conflict.resourceKey ?? conflict.message;

  switch (conflict.actionType) {
    case "setting.content-route.upsert":
      return resourceKey.startsWith("content-route:")
        ? `${conflict.actionType}:${resourceKey.slice("content-route:".length)}`
        : resourceKey;
    case "content-type.upsert":
      return resourceKey.startsWith("content-type:")
        ? `${conflict.actionType}:${resourceKey.slice("content-type:".length).split(":field:")[0]}`
        : resourceKey;
    case "custom-screen.upsert":
      return resourceKey.startsWith("custom-screen:")
        ? `${conflict.actionType}:${resourceKey.slice("custom-screen:".length)}`
        : resourceKey;
    case "listing-query.upsert":
      return resourceKey.startsWith("listing-query:")
        ? `${conflict.actionType}:${resourceKey.slice("listing-query:".length)}`
        : resourceKey;
    case "listing-template.upsert":
      return resourceKey.startsWith("listing-template:")
        ? `${conflict.actionType}:${resourceKey.slice("listing-template:".length)}`
        : resourceKey;
    case "form.upsert":
      return resourceKey.startsWith("form:")
        ? `${conflict.actionType}:${resourceKey.slice("form:".length)}`
        : resourceKey;
    case "page.upsert":
      return resourceKey.startsWith("page:")
        ? `${conflict.actionType}:${resourceKey.slice("page:".length)}`
        : resourceKey;
    default:
      return `${conflict.actionType}:${resourceKey}`;
  }
};

const dedupeConflicts = (conflicts: BlueprintConflict[]) => {
  const byKey = new Map<string, BlueprintConflict>();
  for (const conflict of conflicts) {
    const key = buildConflictTargetKey(conflict);
    const previous = byKey.get(key);
    if (!previous || compareConflictPriority(previous, conflict) > 0) {
      byKey.set(key, conflict);
      continue;
    }
  }
  return [...byKey.values()];
};

const assertNever = (value: never): never => {
  throw new Error(`assistant_blueprint_conflict_code_unhandled:${String(value)}`);
};

const buildConflictQuestionId = (baseId: string, conflict: BlueprintConflict) =>
  [
    baseId,
    conflict.actionType ?? "global",
    conflict.resourceKey ?? conflict.capabilityId ?? "general",
  ]
    .join(":")
    .replace(/[^a-z0-9:_-]+/gi, "-");

const buildConflictQuestion = (conflict: BlueprintConflict): AssistantPlanQuestion => {
  switch (conflict.code) {
    case "route_conflict":
      return {
        id: buildConflictQuestionId("blueprint-route-conflict", conflict),
        label: "Which route configuration should the composed plan keep?",
        description:
          "Choose the intended page or public content route path before executable actions are assembled.",
        required: true,
      };
    case "field_type_conflict":
      return {
        id: buildConflictQuestionId("blueprint-field-type-conflict", conflict),
        label: "Which field schema should win?",
        description:
          "Choose the intended field type for the conflicting content model field before the composed plan can execute safely.",
        required: true,
      };
    case "gated_domain":
      return {
        id: buildConflictQuestionId("blueprint-gated-domain", conflict),
        label: "Should this gated module stay deferred or get a dedicated adapter first?",
        description:
          "Booking, checkout, and other gated modules remain non-executable until their typed adapter task lands.",
        required: true,
      };
    case "media_asset_missing":
      return {
        id: buildConflictQuestionId("blueprint-media-asset-missing", conflict),
        label: "Which existing media asset should be used?",
        description:
          "Provide a trusted existing media library asset before the composed plan can attach media safely.",
        required: true,
      };
    case "media_asset_ambiguous":
      return {
        id: buildConflictQuestionId("blueprint-media-asset-ambiguous", conflict),
        label: "Which media asset match is correct?",
        description: "Choose one exact media asset so the composer does not attach the wrong file.",
        required: true,
      };
    case "media_upload_gated":
      return {
        id: buildConflictQuestionId("blueprint-media-upload-gated", conflict),
        label: "Should media import be handled before composition?",
        description:
          "Raw uploads stay gated until they become trusted media library assets through the media owner flow.",
        required: true,
      };
    case "media_delete_gated":
      return {
        id: buildConflictQuestionId("blueprint-media-delete-gated", conflict),
        label: "Should media deletion stay outside the composed plan?",
        description:
          "Removing a reference is supported only through the owning resource action; deleting the asset itself remains gated.",
        required: true,
      };
    case "permission_gap":
      return {
        id: buildConflictQuestionId("blueprint-permission-gap", conflict),
        label: "Which permission boundary should this plan rely on?",
        description:
          "Confirm the required permission boundary before the composed plan can execute privileged actions.",
        required: true,
      };
    case "facet_field_missing":
      return {
        id: buildConflictQuestionId("blueprint-facet-field-missing", conflict),
        label: "Which field should back this listing facet?",
        description:
          "Choose or add a supported field before the composed plan can wire the facet safely.",
        required: true,
      };
    case "widget_capability_missing":
      return {
        id: buildConflictQuestionId("blueprint-widget-capability-missing", conflict),
        label: "Which widget capability should be used here?",
        description:
          "Pick a supported widget capability before the composed plan can assemble this surface.",
        required: true,
      };
    case "resource_slug_conflict":
    case "resource_key_duplicate":
      return {
        id: buildConflictQuestionId("blueprint-resource-conflict", conflict),
        label: "Which duplicate resource should the composed plan keep?",
        description:
          "Choose the intended slug, name, or owner seam before duplicate resource setup can proceed.",
        required: true,
      };
  }

  return assertNever(conflict.code);
};

const buildBlueprintConflictNeedsInputPlan = (input: {
  promptKind: AssistantPromptKind;
  intentFamily: AssistantIntentFamily;
  graph: BlueprintCompositionGraph;
  conflicts: BlueprintConflict[];
}): AssistantActionPlan => {
  const selectedLabels = [
    input.graph.primary?.capability.label ?? "Blueprint composition",
    ...input.graph.adjuncts.map((node) => node.capability.label),
  ];
  const gatedLabels = input.graph.gated.map((node) => node.capability.label);
  const capabilityLabels = [...selectedLabels, ...gatedLabels];
  const questions = unique(
    input.conflicts.map((conflict) => JSON.stringify(buildConflictQuestion(conflict)))
  ).map((value) => JSON.parse(value) as AssistantPlanQuestion);
  const onlyGatedConflicts = input.conflicts.every((conflict) => conflict.code === "gated_domain");

  return normalizeAssistantActionPlan({
    id: `plan-blueprint-composed-${input.graph.selectedCapabilityIds.join("~")}-needs-input`,
    status: "needs_input",
    responseKind: onlyGatedConflicts ? "gated" : "needs_input",
    intentId: `blueprint-composed-${input.graph.primary?.capability.id ?? "unknown"}-needs-input`,
    promptKind: input.promptKind,
    intentFamily: input.intentFamily,
    title: onlyGatedConflicts
      ? "Blueprint composition needs a supported adapter first"
      : "Blueprint composition needs conflict resolution first",
    answer: [
      onlyGatedConflicts
        ? "I recognized the requested blueprint mix, but at least one module is still gated and cannot become executable typed actions yet."
        : "I recognized the requested blueprint mix, but the composed plan still has blocking conflicts that need an explicit decision first.",
      "",
      ...input.conflicts.map((conflict) => `- ${conflict.message}`),
    ].join("\n"),
    summary: onlyGatedConflicts
      ? `The requested composition includes gated modules (${(gatedLabels.length > 0 ? gatedLabels : selectedLabels).join(", ")}) that still need dedicated adapters.`
      : `The requested composition includes unresolved route/resource/schema conflicts across ${selectedLabels.join(", ")}.`,
    confidence: onlyGatedConflicts ? 0.58 : 0.42,
    assumptions: [
      ...input.graph.fragments.flatMap((fragment) => fragment.assumptions),
      `Selected capabilities: ${capabilityLabels.join(", ")}.`,
      "No executable composed action plan is returned until the blocking conflict is resolved explicitly.",
    ],
    questions,
    actions: [],
  });
};

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
      return `${action.type}:${action.input.contentTypeSlug}:${action.input.name}`;
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
            "resource_key_duplicate",
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
    conflicts: dedupeConflicts(conflicts),
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
  if (fatalConflicts.length > 0) {
    return buildBlueprintConflictNeedsInputPlan({
      promptKind: input.promptKind,
      intentFamily: input.intentFamily,
      graph: input.graph,
      conflicts: fatalConflicts,
    });
  }

  const selectedLabels = [
    input.graph.primary.capability.label,
    ...input.graph.adjuncts.map((node) => node.capability.label),
  ];
  const assumptions = unique([
    ...input.graph.fragments.flatMap((fragment) => fragment.assumptions),
    `Selected capabilities: ${selectedLabels.join(", ")}.`,
  ]);

  return normalizeAssistantActionPlan({
    id: `plan-blueprint-composed-${input.graph.selectedCapabilityIds.join("~")}`,
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
