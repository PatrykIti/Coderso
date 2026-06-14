import { getMenuWithItems, type MenuWithItems } from "../menus/menuService";
import { getSetting } from "../settings/settingsService";
import type { PageDocumentV2 } from "./pageDocumentV2";
import { isPageTemplateError } from "./pageTemplateLibrarySchema";
import { getPageTemplate } from "./pageTemplateLibraryService";

/**
 * Public site-shell contract (TASK-455).
 *
 * The shell is a SITE concern resolved from settings, not a per-page
 * section: `site.navigationMenuId` designates the published menu rendered
 * as the global header navigation and `site.footerTemplateId` designates
 * the published page template rendered as the global footer through the
 * existing Page v2 pipeline.
 *
 * Render path is fail closed: missing, draft, deleted, malformed-id, or
 * unreadable references resolve to `null` (the shell part renders nothing)
 * and never produce an error page. The admin write path validates the
 * references up front through the `assertSiteShell*` helpers and surfaces
 * machine-readable `site_shell_*` errors at the route boundary.
 */

export const SITE_NAVIGATION_MENU_SETTING_KEY = "site.navigationMenuId";
export const SITE_FOOTER_TEMPLATE_SETTING_KEY = "site.footerTemplateId";

export const SITE_SHELL_MENU_NOT_FOUND = "site_shell_menu_not_found";
export const SITE_SHELL_TEMPLATE_NOT_FOUND = "site_shell_template_not_found";

export type SiteShellErrorCode =
  | typeof SITE_SHELL_MENU_NOT_FOUND
  | typeof SITE_SHELL_TEMPLATE_NOT_FOUND;

export type PublicSiteShell = {
  navigation: MenuWithItems | null;
  footerDocument: PageDocumentV2 | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeReferenceId = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * `menus.id` is a Postgres `uuid` column; querying it with a malformed id
 * throws a cast error instead of returning no rows, so the render path
 * guards the format up front to stay fail closed.
 */
const resolveShellNavigation = async (): Promise<MenuWithItems | null> => {
  const menuId = normalizeReferenceId(await getSetting(SITE_NAVIGATION_MENU_SETTING_KEY));
  if (!menuId || !UUID_PATTERN.test(menuId)) return null;
  const menu = await getMenuWithItems(menuId);
  if (!menu || menu.menu.status !== "published") return null;
  return menu;
};

/**
 * `getPageTemplate` already guards the id format and returns the stored
 * document normalized through `normalizeStoredPageTemplateDocument`; an
 * unreadable stored document throws `PageTemplateError`, which the render
 * path converts to a fail-closed `null`.
 */
const resolveShellFooterDocument = async (): Promise<PageDocumentV2 | null> => {
  const templateId = normalizeReferenceId(await getSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY));
  if (!templateId) return null;
  try {
    const template = await getPageTemplate(templateId);
    if (!template || template.status !== "published") return null;
    return template.document;
  } catch (error) {
    if (isPageTemplateError(error)) return null;
    throw error;
  }
};

/**
 * Resolves the global site shell for a public Page v2 render. Only
 * `published` menus and `published` page templates resolve; every other
 * reference state degrades to `null` without throwing.
 */
export async function resolvePublicSiteShell(): Promise<PublicSiteShell> {
  const [navigation, footerDocument] = await Promise.all([
    resolveShellNavigation(),
    resolveShellFooterDocument(),
  ]);
  return { navigation, footerDocument };
}

/**
 * Admin write-path validation: a non-null `site.navigationMenuId` must
 * reference an existing menu. Draft menus are accepted on write; publish
 * status is enforced at render time only.
 */
export async function assertSiteShellMenuExists(menuId: string | null): Promise<void> {
  const normalized = normalizeReferenceId(menuId);
  if (normalized === null) return;
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(SITE_SHELL_MENU_NOT_FOUND);
  }
  const menu = await getMenuWithItems(normalized);
  if (!menu) {
    throw new Error(SITE_SHELL_MENU_NOT_FOUND);
  }
}

/**
 * Admin write-path validation: a non-null `site.footerTemplateId` must
 * reference an existing page template. Draft templates are accepted on
 * write; publish status is enforced at render time only.
 */
export async function assertSiteShellTemplateExists(templateId: string | null): Promise<void> {
  const normalized = normalizeReferenceId(templateId);
  if (normalized === null) return;
  let exists = false;
  try {
    exists = (await getPageTemplate(normalized)) !== null;
  } catch (error) {
    if (!isPageTemplateError(error)) throw error;
    // An unreadable stored document still proves the record exists.
    exists = true;
  }
  if (!exists) {
    throw new Error(SITE_SHELL_TEMPLATE_NOT_FOUND);
  }
}
