export const templateSectionTemplateIdPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

const templateSectionTemplateIdRegex = new RegExp(templateSectionTemplateIdPattern);

export function normalizeTemplateSectionTemplateId(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return templateSectionTemplateIdRegex.test(trimmed) ? trimmed : "";
}

export function hasTemplateSectionTemplateId(value: unknown): boolean {
  return normalizeTemplateSectionTemplateId(value).length > 0;
}
