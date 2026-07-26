export const DEFAULT_SITE_LOCALE = "en";

const SITE_LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/;

export const normalizeSiteLocale = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!SITE_LOCALE_PATTERN.test(trimmed)) return null;
  const [language, region] = trimmed.split("-");
  return region ? `${language!.toLowerCase()}-${region.toUpperCase()}` : language!.toLowerCase();
};

export const resolvePublicDocumentLanguage = (value: unknown): string =>
  normalizeSiteLocale(value) ?? DEFAULT_SITE_LOCALE;
