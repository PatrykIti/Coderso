import { isDeepStrictEqual } from "node:util";

import {
  createWidgetTemplate,
  deleteWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
  type WidgetTemplateRecord,
} from "../widgets/widgetTemplateService";
import { listWidgetTemplateCategories } from "../widgets/widgetTemplateCategoryService";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "../widgets/widgetTemplateSettings";
import type { WidgetBlock } from "../../widgets/types";

export type TemplateInstallSeed = {
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: "draft" | "published";
  blocks?: WidgetBlock[];
  settings?: WidgetTemplateSettings | null;
};

export type TemplateInstallOperation = "create" | "update" | "noop";
export type TemplateInstallItemStatus = "success" | "failed" | "planned";

export type TemplateInstallSnapshot = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: "draft" | "published";
  blocks: WidgetBlock[];
  settings: WidgetTemplateSettings;
};

export type TemplateInstallItem = {
  key: string;
  templateId: string | null;
  operation: TemplateInstallOperation;
  status: TemplateInstallItemStatus;
  beforeSnapshot: TemplateInstallSnapshot | null;
  afterSnapshot: TemplateInstallSnapshot | null;
  error: string | null;
};

export type TemplateInstallSummary = {
  total: number;
  success: number;
  failed: number;
  planned: number;
  operations: Record<TemplateInstallOperation, number>;
};

export type TemplateInstallRollbackAction = {
  key: string;
  operation: "create" | "update";
  templateId: string;
  beforeSnapshot: TemplateInstallSnapshot | null;
};

export type TemplateInstallResult = {
  items: TemplateInstallItem[];
  summary: TemplateInstallSummary;
  rollbackPlan: TemplateInstallRollbackAction[];
};

export type ApplyTemplateInstallInput = {
  kitId: string;
  actorId?: string | null;
  seeds: TemplateInstallSeed[];
  dryRun?: boolean;
  continueOnError?: boolean;
};

export type RollbackTemplateInstallInput = {
  rollbackPlan: TemplateInstallRollbackAction[];
  continueOnError?: boolean;
};

const markerPrefix = "[nextless-kit-template:";

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSeedKey = (value: unknown) => {
  const normalized = normalizeString(value);
  if (!normalized) throw new Error("solution_kit_template_key_invalid");
  return normalized;
};

const slugToTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const markerFor = (kitId: string, key: string) => `${markerPrefix}${kitId}:${key}]`;

const withMarker = (description: string | null, marker: string) => {
  if (!description) return marker;
  if (description.includes(marker)) return description;
  return `${description}\n\n${marker}`;
};

const hasMarker = (description: string | null | undefined, marker: string) =>
  Boolean(description && description.includes(marker));

const snapshotTemplate = (template: WidgetTemplateRecord): TemplateInstallSnapshot => ({
  id: template.id,
  name: template.name,
  description: template.description ?? null,
  category: template.category,
  status: template.status === "published" ? "published" : "draft",
  blocks: template.blocks,
  settings: normalizeWidgetTemplateSettings(template.settings),
});

const normalizeSeed = (
  seed: TemplateInstallSeed,
  options: { fallbackCategory: string; marker: string }
) => {
  const key = normalizeSeedKey(seed.key);
  const baseName =
    normalizeString(seed.name) ?? (slugToTitle(key) || `Template ${key.toUpperCase()}`);
  const category = normalizeString(seed.category) ?? options.fallbackCategory;
  const status: "draft" | "published" =
    seed.status === "published" ? "published" : "draft";
  const description = withMarker(normalizeString(seed.description), options.marker);

  return {
    key,
    name: baseName,
    category,
    status,
    description,
    blocks: Array.isArray(seed.blocks) ? seed.blocks : [],
    settings: normalizeWidgetTemplateSettings(seed.settings),
  };
};

const compareTemplatePayload = (
  template: WidgetTemplateRecord,
  desired: {
    name: string;
    description: string;
    category: string;
    status: "draft" | "published";
    blocks: WidgetBlock[];
    settings: WidgetTemplateSettings;
  }
) => {
  return (
    template.name === desired.name &&
    (template.description ?? null) === (desired.description ?? null) &&
    template.category === desired.category &&
    template.status === desired.status &&
    isDeepStrictEqual(template.blocks, desired.blocks) &&
    isDeepStrictEqual(normalizeWidgetTemplateSettings(template.settings), desired.settings)
  );
};

const nextName = (base: string, items: WidgetTemplateRecord[]) => {
  const used = new Set(items.map((item) => item.name.toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let suffix = 2; suffix <= 200; suffix += 1) {
    const candidate = `${base} (${suffix})`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  throw new Error("solution_kit_template_name_space_exhausted");
};

const fallbackCategory = async () => {
  const categories = await listWidgetTemplateCategories();
  const first = categories[0]?.name;
  if (first) return first;
  return "Layout";
};

const summarize = (items: TemplateInstallItem[]): TemplateInstallSummary => {
  const summary: TemplateInstallSummary = {
    total: items.length,
    success: 0,
    failed: 0,
    planned: 0,
    operations: {
      create: 0,
      update: 0,
      noop: 0,
    },
  };

  for (const item of items) {
    summary.operations[item.operation] += 1;
    if (item.status === "success") summary.success += 1;
    if (item.status === "failed") summary.failed += 1;
    if (item.status === "planned") summary.planned += 1;
  }

  return summary;
};

export const applyTemplateInstall = async (
  input: ApplyTemplateInstallInput
): Promise<TemplateInstallResult> => {
  const dryRun = input.dryRun ?? false;
  const continueOnError = input.continueOnError ?? true;
  const fallback = await fallbackCategory();

  let templates = await listWidgetTemplates();
  const items: TemplateInstallItem[] = [];
  const rollbackPlan: TemplateInstallRollbackAction[] = [];

  for (const rawSeed of input.seeds) {
    const key = normalizeSeedKey(rawSeed.key);
    const marker = markerFor(input.kitId, key);
    const seed = normalizeSeed(rawSeed, { fallbackCategory: fallback, marker });

    try {
      const managed = templates.find((item) => hasMarker(item.description, marker));
      const baseDesired = {
        name: seed.name,
        description: seed.description,
        category: seed.category,
        status: seed.status,
        blocks: seed.blocks,
        settings: seed.settings,
      };

      if (managed) {
        const desired = {
          ...baseDesired,
          name: managed.name,
        };

        if (compareTemplatePayload(managed, desired)) {
          items.push({
            key,
            templateId: managed.id,
            operation: "noop",
            status: dryRun ? "planned" : "success",
            beforeSnapshot: snapshotTemplate(managed),
            afterSnapshot: snapshotTemplate(managed),
            error: null,
          });
          continue;
        }

        if (dryRun) {
          items.push({
            key,
            templateId: managed.id,
            operation: "update",
            status: "planned",
            beforeSnapshot: snapshotTemplate(managed),
            afterSnapshot: {
              ...snapshotTemplate(managed),
              description: desired.description,
              category: desired.category,
              status: desired.status,
              blocks: desired.blocks,
              settings: desired.settings,
            },
            error: null,
          });
          rollbackPlan.push({
            key,
            operation: "update",
            templateId: managed.id,
            beforeSnapshot: snapshotTemplate(managed),
          });
          continue;
        }

        const updated = await updateWidgetTemplate(
          managed.id,
          {
            description: desired.description,
            category: desired.category,
            status: desired.status,
            blocks: desired.blocks,
            settings: desired.settings,
          },
          input.actorId
        );
        if (!updated) throw new Error("solution_kit_template_update_failed");

        items.push({
          key,
          templateId: updated.id,
          operation: "update",
          status: "success",
          beforeSnapshot: snapshotTemplate(managed),
          afterSnapshot: snapshotTemplate(updated),
          error: null,
        });
        rollbackPlan.push({
          key,
          operation: "update",
          templateId: managed.id,
          beforeSnapshot: snapshotTemplate(managed),
        });

        templates = templates.map((item) => (item.id === updated.id ? updated : item));
        continue;
      }

      const name = nextName(seed.name, templates);
      if (dryRun) {
        items.push({
          key,
          templateId: null,
          operation: "create",
          status: "planned",
          beforeSnapshot: null,
          afterSnapshot: {
            id: `predicted:${name.toLowerCase().replace(/\s+/g, "-")}`,
            name,
            description: seed.description,
            category: seed.category,
            status: seed.status,
            blocks: seed.blocks,
            settings: seed.settings,
          },
          error: null,
        });
        continue;
      }

      const created = await createWidgetTemplate(
        {
          name,
          description: seed.description,
          category: seed.category,
          status: seed.status,
          blocks: seed.blocks,
          settings: seed.settings,
        },
        input.actorId
      );

      items.push({
        key,
        templateId: created.id,
        operation: "create",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: snapshotTemplate(created),
        error: null,
      });
      rollbackPlan.push({
        key,
        operation: "create",
        templateId: created.id,
        beforeSnapshot: null,
      });

      templates = [created, ...templates];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "solution_kit_template_install_failed";
      items.push({
        key,
        templateId: null,
        operation: "noop",
        status: "failed",
        beforeSnapshot: null,
        afterSnapshot: null,
        error: message,
      });
      if (!continueOnError) break;
    }
  }

  return {
    items,
    summary: summarize(items),
    rollbackPlan,
  };
};

export const rollbackTemplateInstall = async (
  input: RollbackTemplateInstallInput
): Promise<TemplateInstallResult> => {
  const continueOnError = input.continueOnError ?? true;
  let templates = await listWidgetTemplates();
  const items: TemplateInstallItem[] = [];

  const ordered = [...input.rollbackPlan].reverse();

  for (const rollbackItem of ordered) {
    try {
      if (rollbackItem.operation === "create") {
        const existing = templates.find((item) => item.id === rollbackItem.templateId);
        if (!existing) {
          items.push({
            key: rollbackItem.key,
            templateId: rollbackItem.templateId,
            operation: "noop",
            status: "success",
            beforeSnapshot: null,
            afterSnapshot: null,
            error: null,
          });
          continue;
        }

        await deleteWidgetTemplate(existing.id);
        items.push({
          key: rollbackItem.key,
          templateId: existing.id,
          operation: "update",
          status: "success",
          beforeSnapshot: snapshotTemplate(existing),
          afterSnapshot: null,
          error: null,
        });
        templates = templates.filter((item) => item.id !== existing.id);
        continue;
      }

      if (rollbackItem.operation === "update") {
        const before = rollbackItem.beforeSnapshot;
        if (!before) {
          throw new Error("solution_kit_template_rollback_snapshot_missing");
        }

        const existing = templates.find((item) => item.id === rollbackItem.templateId);
        if (existing) {
          const updated = await updateWidgetTemplate(rollbackItem.templateId, {
            name: before.name,
            description: before.description,
            category: before.category,
            status: before.status,
            blocks: before.blocks,
            settings: before.settings,
          });
          if (!updated) throw new Error("solution_kit_template_rollback_update_failed");

          items.push({
            key: rollbackItem.key,
            templateId: updated.id,
            operation: "update",
            status: "success",
            beforeSnapshot: snapshotTemplate(existing),
            afterSnapshot: snapshotTemplate(updated),
            error: null,
          });
          templates = templates.map((item) => (item.id === updated.id ? updated : item));
          continue;
        }

        const created = await createWidgetTemplate({
          name: before.name,
          description: before.description,
          category: before.category,
          status: before.status,
          blocks: before.blocks,
          settings: before.settings,
        });

        items.push({
          key: rollbackItem.key,
          templateId: created.id,
          operation: "create",
          status: "success",
          beforeSnapshot: null,
          afterSnapshot: snapshotTemplate(created),
          error: null,
        });
        templates = [created, ...templates];
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "solution_kit_template_rollback_failed";
      items.push({
        key: rollbackItem.key,
        templateId: rollbackItem.templateId,
        operation: "noop",
        status: "failed",
        beforeSnapshot: null,
        afterSnapshot: null,
        error: message,
      });
      if (!continueOnError) break;
    }
  }

  return {
    items,
    summary: summarize(items),
    rollbackPlan: [],
  };
};
