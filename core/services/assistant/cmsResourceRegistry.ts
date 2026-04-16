import type { CmsOperation, CmsResourceKind } from "./cmsOperationDraftSchema";

export type CmsResourceRegistryEntry = {
  kind: CmsResourceKind;
  label: string;
  aliases: string[];
  supportedOperations: CmsOperation[];
  readPermissions: string[];
};

export const cmsResourceRegistry: CmsResourceRegistryEntry[] = [
  {
    kind: "page",
    label: "Pages",
    aliases: ["page", "pages", "strona", "strone", "stronę", "strony", "pages"],
    supportedOperations: ["inspect", "find", "create", "update", "delete", "publish"],
    readPermissions: ["content:read"],
  },
  {
    kind: "entry",
    label: "Entries",
    aliases: ["entry", "entries", "record", "records", "wpis", "wpisy", "rekord", "rekordy"],
    supportedOperations: ["inspect", "find", "create", "update", "delete", "publish"],
    readPermissions: ["content:read"],
  },
  {
    kind: "content-type",
    label: "Content Types",
    aliases: ["content type", "content types", "model", "typ tresci", "typ treści", "engine"],
    supportedOperations: ["inspect", "find", "create", "update", "delete"],
    readPermissions: ["content:read"],
  },
  {
    kind: "custom-screen",
    label: "Custom Screens",
    aliases: [
      "custom screen",
      "custom screens",
      "screen",
      "screens",
      "ekran",
      "ekrany",
      "ekranow",
      "ekranów",
    ],
    supportedOperations: ["inspect", "find", "create", "update", "delete"],
    readPermissions: ["content:read"],
  },
  {
    kind: "widget-template",
    label: "Widget Templates",
    aliases: [
      "widget template",
      "widget templates",
      "template widget",
      "template",
      "templates",
      "szablon widgetu",
      "szablony widgetow",
      "szablony widgetów",
    ],
    supportedOperations: ["inspect", "find", "create", "update", "delete"],
    readPermissions: ["widgets:read"],
  },
  {
    kind: "listing-query",
    label: "Listing Queries",
    aliases: ["listing query", "listing queries", "query listingu", "zapytanie listingu"],
    supportedOperations: ["inspect", "find", "create", "update", "delete", "refine"],
    readPermissions: ["content:read"],
  },
  {
    kind: "listing-template",
    label: "Listing Templates",
    aliases: ["listing template", "listing templates", "szablon listingu", "template listingu"],
    supportedOperations: ["inspect", "find", "create", "update", "delete", "refine"],
    readPermissions: ["content:read"],
  },
  {
    kind: "form",
    label: "Forms",
    aliases: ["form", "forms", "formularz", "formularze", "formularza"],
    supportedOperations: ["inspect", "find", "create", "update", "delete", "archive"],
    readPermissions: ["forms:read"],
  },
  {
    kind: "menu-item",
    label: "Menu Items",
    aliases: ["menu item", "menu items", "pozycja menu", "pozycje menu", "link menu"],
    supportedOperations: ["inspect", "find", "create", "update", "delete"],
    readPermissions: ["menus:read"],
  },
  {
    kind: "seo-document",
    label: "SEO Documents",
    aliases: ["seo", "seo document", "seo documents", "meta", "meta title", "meta description"],
    supportedOperations: ["inspect", "find", "create", "update", "delete"],
    readPermissions: ["content:read"],
  },
  {
    kind: "media",
    label: "Media",
    aliases: ["media", "asset", "assets", "image", "obraz", "obrazy", "plik", "pliki"],
    supportedOperations: ["inspect", "find", "update"],
    readPermissions: ["media:read"],
  },
  {
    kind: "settings-surface",
    label: "Settings",
    aliases: ["settings", "ustawienia", "konfiguracja", "configure"],
    supportedOperations: ["inspect", "find", "configure", "update"],
    readPermissions: ["settings:read"],
  },
  {
    kind: "solution-kit",
    label: "Solution Kits",
    aliases: ["solution kit", "solution kits", "kit", "kity", "starter"],
    supportedOperations: ["inspect", "find", "create", "configure", "refine"],
    readPermissions: ["solution-kits:read"],
  },
];

const normalizeText = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const containsAlias = (normalizedPrompt: string, alias: string) => {
  const normalizedAlias = normalizeText(alias);
  return new RegExp(
    `(^|[^a-z0-9ąćęłńóśźż])${normalizedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9ąćęłńóśźż])`,
    "u"
  ).test(normalizedPrompt);
};

export const resolveCmsResourceKindFromPrompt = (prompt: string): CmsResourceKind | null => {
  const normalizedPrompt = normalizeText(prompt);
  const matches = cmsResourceRegistry
    .map((entry) => ({
      entry,
      score: entry.aliases.reduce(
        (result, alias) => result + (containsAlias(normalizedPrompt, alias) ? alias.length : 0),
        0
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return matches[0]?.entry.kind ?? null;
};

export const getCmsResourceRegistryEntry = (kind: CmsResourceKind) =>
  cmsResourceRegistry.find((entry) => entry.kind === kind) ?? null;
