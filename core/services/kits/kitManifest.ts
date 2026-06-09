import type { SolutionKitResourceBlueprint } from "./solutionKitTypes";

export type SolutionKitManifestIncludes = {
  contentTypes: string[];
  entries: string[];
  widgets: string[];
  templates: string[];
  forms: string[];
  menus: string[];
};

export type SolutionKitManifest = {
  id: string;
  title: string;
  vertical: string;
  includes: SolutionKitManifestIncludes;
  requiredModules: string[];
  optionalModules?: string[];
  postInstallTasks?: string[];
};

type SolutionKitManifestSource = {
  id: string;
  title: string;
  businessTypes: string[];
  recommendedModules: string[];
  resourceBlueprint: SolutionKitResourceBlueprint;
  manifest?: Partial<SolutionKitManifest> & {
    includes?: Partial<SolutionKitManifestIncludes>;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeList = (values: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized.sort((left, right) => left.localeCompare(right));
};

const toVertical = (source: SolutionKitManifestSource) => {
  const first = source.businessTypes[0] ?? source.id;
  return first.replace(/_/g, "-");
};

const asPageSurfaceParts = (data: unknown) => {
  if (!isRecord(data)) return [] as Array<Record<string, unknown>>;
  const sections = data.sections;
  if (Array.isArray(sections)) {
    return sections.flatMap((section) => {
      if (!isRecord(section)) return [];
      const blocks = Array.isArray(section.blocks) ? section.blocks.filter(isRecord) : [];
      return [section, ...blocks];
    });
  }
  const blocks = data.blocks;
  if (Array.isArray(blocks))
    return blocks.filter((item): item is Record<string, unknown> => isRecord(item));
  return [];
};

const collectWidgetIncludes = (blueprint: SolutionKitResourceBlueprint) =>
  normalizeList(
    blueprint.pages.flatMap((page) =>
      asPageSurfaceParts(page.data).map((part) =>
        typeof part.type === "string" ? part.type : null
      )
    )
  );

const collectTemplateIncludes = (blueprint: SolutionKitResourceBlueprint) => {
  const fromPage = blueprint.pages.map((page) => page.template ?? null);
  const fromSettings = blueprint.pages.map((page) => {
    if (!isRecord(page.data)) return null;
    const settings = page.data.settings;
    if (!isRecord(settings)) return null;
    return typeof settings.template === "string" ? settings.template : null;
  });
  return normalizeList([...fromPage, ...fromSettings]);
};

const inferPostInstallTasks = (
  source: SolutionKitManifestSource,
  includes: SolutionKitManifestIncludes
) => {
  const tasks: string[] = [];
  if (source.resourceBlueprint.pages.length > 0) {
    tasks.push("Review page copy and publish final page content.");
  }
  if (includes.forms.length > 0) {
    tasks.push("Configure form notifications and success actions.");
  }
  if (includes.contentTypes.length > 0) {
    tasks.push("Add starter entries for installed content types.");
  }
  if (includes.templates.length > 0) {
    tasks.push("Adjust installed templates to match your brand.");
  }
  if (includes.menus.length > 0) {
    tasks.push("Verify menu links and navigation hierarchy.");
  }
  if (source.resourceBlueprint.pages.some((page) => (page.slug ?? "").trim() === "")) {
    tasks.push("Set homepage metadata and review global SEO settings.");
  }
  return normalizeList(tasks);
};

const emptyIncludes = (): SolutionKitManifestIncludes => ({
  contentTypes: [],
  entries: [],
  widgets: [],
  templates: [],
  forms: [],
  menus: [],
});

const normalizeIncludes = (input: Partial<SolutionKitManifestIncludes> | null | undefined) => ({
  contentTypes: normalizeList(input?.contentTypes ?? []),
  entries: normalizeList(input?.entries ?? []),
  widgets: normalizeList(input?.widgets ?? []),
  templates: normalizeList(input?.templates ?? []),
  forms: normalizeList(input?.forms ?? []),
  menus: normalizeList(input?.menus ?? []),
});

export const normalizeSolutionKitManifest = (input: SolutionKitManifest): SolutionKitManifest => {
  const manifest: SolutionKitManifest = {
    id: typeof input.id === "string" ? input.id.trim() : "",
    title: typeof input.title === "string" ? input.title.trim() : "",
    vertical: typeof input.vertical === "string" ? input.vertical.trim() : "",
    includes: normalizeIncludes(input.includes),
    requiredModules: normalizeList(input.requiredModules ?? []),
    optionalModules: normalizeList(input.optionalModules ?? []),
    postInstallTasks: normalizeList(input.postInstallTasks ?? []),
  };

  if (!manifest.id || !manifest.title || !manifest.vertical) {
    throw new Error("solution_kit_manifest_invalid");
  }

  return {
    ...manifest,
    optionalModules:
      manifest.optionalModules && manifest.optionalModules.length > 0
        ? manifest.optionalModules
        : [],
    postInstallTasks:
      manifest.postInstallTasks && manifest.postInstallTasks.length > 0
        ? manifest.postInstallTasks
        : [],
  };
};

export const buildSolutionKitManifest = (
  source: SolutionKitManifestSource
): SolutionKitManifest => {
  const generatedIncludes: SolutionKitManifestIncludes = {
    contentTypes: normalizeList(source.resourceBlueprint.contentTypes.map((item) => item.slug)),
    entries: [],
    widgets: collectWidgetIncludes(source.resourceBlueprint),
    templates: collectTemplateIncludes(source.resourceBlueprint),
    forms: normalizeList(source.resourceBlueprint.forms.map((item) => item.slug)),
    menus: normalizeList(source.resourceBlueprint.menus.map((item) => item.location ?? item.name)),
  };

  const manifestOverrides = isRecord(source.manifest) ? source.manifest : {};
  const overrideIncludes = isRecord(manifestOverrides.includes)
    ? (manifestOverrides.includes as Partial<SolutionKitManifestIncludes>)
    : emptyIncludes();

  const mergedIncludes: SolutionKitManifestIncludes = {
    contentTypes: normalizeList([
      ...generatedIncludes.contentTypes,
      ...(overrideIncludes.contentTypes ?? []),
    ]),
    entries: normalizeList([...generatedIncludes.entries, ...(overrideIncludes.entries ?? [])]),
    widgets: normalizeList([...generatedIncludes.widgets, ...(overrideIncludes.widgets ?? [])]),
    templates: normalizeList([
      ...generatedIncludes.templates,
      ...(overrideIncludes.templates ?? []),
    ]),
    forms: normalizeList([...generatedIncludes.forms, ...(overrideIncludes.forms ?? [])]),
    menus: normalizeList([...generatedIncludes.menus, ...(overrideIncludes.menus ?? [])]),
  };

  const manifest: SolutionKitManifest = {
    id: source.id,
    title: source.title,
    vertical:
      typeof manifestOverrides.vertical === "string" && manifestOverrides.vertical.trim().length > 0
        ? manifestOverrides.vertical.trim()
        : toVertical(source),
    includes: mergedIncludes,
    requiredModules: normalizeList([
      ...source.recommendedModules,
      ...((manifestOverrides.requiredModules as string[] | undefined) ?? []),
    ]),
    optionalModules: normalizeList(
      (manifestOverrides.optionalModules as string[] | undefined) ?? []
    ),
    postInstallTasks: normalizeList([
      ...inferPostInstallTasks(source, mergedIncludes),
      ...((manifestOverrides.postInstallTasks as string[] | undefined) ?? []),
    ]),
  };

  return normalizeSolutionKitManifest(manifest);
};
