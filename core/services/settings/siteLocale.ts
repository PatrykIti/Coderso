export const DEFAULT_SITE_LOCALE = "en";
export const MAX_SITE_LOCALE_LENGTH = 255;

const PUBLIC_SITE_LOCALE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;

const invalidStoredLocale = (): never => {
  throw new Error("settings_value_invalid");
};

export const normalizeStoredSiteLocaleForWrite = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > MAX_SITE_LOCALE_LENGTH
  ) {
    return invalidStoredLocale();
  }
  return value;
};

export const normalizePublicSiteLocale = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_SITE_LOCALE_LENGTH ||
    !PUBLIC_SITE_LOCALE_PATTERN.test(trimmed)
  ) {
    return null;
  }
  const [primary, ...subtags] = trimmed.split("-");
  const canonical = [primary!.toLowerCase()];
  let index = 0;
  if (/^[A-Za-z]{4}$/.test(subtags[index] ?? "")) {
    const script = subtags[index++]!;
    canonical.push(`${script[0]!.toUpperCase()}${script.slice(1).toLowerCase()}`);
  }
  if (/^(?:[A-Za-z]{2}|[0-9]{3})$/.test(subtags[index] ?? "")) {
    canonical.push(subtags[index++]!.toUpperCase());
  }
  canonical.push(...subtags.slice(index).map((subtag) => subtag.toLowerCase()));
  return canonical.join("-");
};

export const resolvePublicDocumentLanguage = (value: unknown): string =>
  normalizePublicSiteLocale(value) ?? DEFAULT_SITE_LOCALE;

export const resolvePrimarySiteLanguage = (value: unknown): string =>
  resolvePublicDocumentLanguage(value).split("-")[0]!;
