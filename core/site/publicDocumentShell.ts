import { resolvePublicDocumentLanguage } from "../services/settings/siteLocale";

export const escapeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const buildPublicDocumentShell = (input: {
  language: unknown;
  headHtml: string;
  bodyHtml: string;
}): string => {
  const language = escapeHtmlAttribute(resolvePublicDocumentLanguage(input.language));
  return `<!doctype html><html lang="${language}"><head>${input.headHtml}</head><body>${input.bodyHtml}</body></html>`;
};
