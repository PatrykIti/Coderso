import type { WidgetBlock } from "../../widgets/types";
import type { WidgetTemplateSettings } from "../widgets/widgetTemplateSettings";
import type {
  SolutionKitDefinition,
  SolutionKitPageBlueprint,
  SolutionKitTemplateBlueprint,
} from "./solutionKitTypes";
import type { TemplateInstallSeed } from "../templates/templateInstaller";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const slugToTitle = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const blocksFromPage = (page: SolutionKitPageBlueprint): WidgetBlock[] => {
  if (!isRecord(page.data)) return [];
  const blocks = page.data.blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((item) => isRecord(item)) as WidgetBlock[];
};

const templateSeedFromPage = (page: SolutionKitPageBlueprint): TemplateInstallSeed | null => {
  const key = typeof page.template === "string" ? page.template.trim() : "";
  if (!key) return null;

  return {
    key,
    name: slugToTitle(key),
    description: `Starter kit template generated from page: ${page.title}.`,
    category: "Layout",
    status: page.status,
    blocks: blocksFromPage(page),
  };
};

const templateSeedFromBlueprint = (template: SolutionKitTemplateBlueprint): TemplateInstallSeed => ({
  key: template.key,
  name: template.name ?? slugToTitle(template.key),
  description: template.description ?? null,
  category: template.category ?? "Layout",
  status: template.status ?? "draft",
  blocks: Array.isArray(template.blocks) ? (template.blocks as WidgetBlock[]) : [],
  settings: isRecord(template.settings)
    ? (template.settings as WidgetTemplateSettings)
    : undefined,
});

export const buildTemplateSeedsForKit = (definition: SolutionKitDefinition) => {
  const byKey = new Map<string, TemplateInstallSeed>();

  for (const page of definition.resourceBlueprint.pages) {
    const seed = templateSeedFromPage(page);
    if (!seed) continue;
    const key = seed.key.trim().toLowerCase();
    if (!key || byKey.has(key)) continue;
    byKey.set(key, seed);
  }

  for (const template of definition.resourceBlueprint.templates ?? []) {
    const seed = templateSeedFromBlueprint(template);
    const key = seed.key.trim().toLowerCase();
    if (!key) continue;
    byKey.set(key, seed);
  }

  return [...byKey.values()];
};
