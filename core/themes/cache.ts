export type TemplateCache = Map<string, string | null>;

export const createTemplateCache = (): TemplateCache => new Map();

export const buildTemplateCacheKey = (
  themeName: string,
  type: string,
  key?: string
) => `${themeName}:${type}:${key ?? ""}`;
