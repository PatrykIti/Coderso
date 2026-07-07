import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import {
  adminThemeProfiles,
  adminThemeTemplates,
  menus,
  pages,
  redirects,
  themeProfiles,
  themeRoutes,
} from "../../db/schema";
import { listAdminThemeProfiles } from "../adminThemes/adminThemeProfileService";
import { listAdminThemeTemplates } from "../adminThemes/adminThemeTemplateService";
import { assertAdminThemeTokens } from "../adminThemes/tokenValidation";
import { listMenuItems, listMenus, replaceMenuItemsTx } from "../menus/menuService";
import { listSettings, setSettingsTx } from "../settings/settingsService";
import {
  normalizeRedirectPath,
  normalizeRedirectStatusCode,
  normalizeRedirectTarget,
} from "../redirects/redirectService";
import { listThemeProfiles } from "../themes/themeProfileService";
import { assertTokenOverrides } from "../theme/tokenValidation";
import { listThemes } from "../themes/themeService";
import {
  exportIncludeOptions,
  exportTargets,
  type ExportAdminThemeProfile,
  type ExportAdminThemeTemplate,
  type ExportBundle,
  type ExportIncludeOption,
  type ExportMenu,
  type ExportMenuItem,
  type ExportRedirect,
  type ExportRequest,
  type ExportScope,
  type ExportTarget,
  type ExportThemeProfile,
  type ImportResult,
  type ImportSummary,
} from "./importExportTypes";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const BUNDLE_VERSION = 1;
const uuidPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const targetIncludeOptions: Record<ExportTarget, ExportIncludeOption[]> = {
  full: [...exportIncludeOptions],
  settings: ["settings"],
  menus: ["menus", "menu-items"],
  themes: ["theme-profiles", "theme-routes", "admin-theme-templates", "admin-theme-profiles"],
  redirects: ["redirects"],
};

const isExportTarget = (value: unknown): value is ExportTarget =>
  typeof value === "string" && (exportTargets as readonly string[]).includes(value);

const isExportIncludeOption = (value: unknown): value is ExportIncludeOption =>
  typeof value === "string" && (exportIncludeOptions as readonly string[]).includes(value);

export function normalizeExportRequest(input: ExportRequest = {}): ExportScope {
  const target = input.target ?? "full";
  if (!isExportTarget(target)) {
    throw new Error("export_target_invalid");
  }

  if (input.include !== undefined && !Array.isArray(input.include)) {
    throw new Error("export_include_invalid");
  }

  const allowed = targetIncludeOptions[target];
  const include = input.include === undefined ? allowed : Array.from(new Set(input.include));
  if (include.length === 0) {
    throw new Error("export_include_required");
  }

  for (const option of include) {
    if (!isExportIncludeOption(option) || !allowed.includes(option)) {
      throw new Error("export_include_invalid");
    }
  }

  return { target, include };
}

const resolveImportScope = (bundle: ExportBundle): ExportScope => {
  if (!bundle.scope) {
    return normalizeExportRequest({ target: "full" });
  }
  return normalizeExportRequest(bundle.scope);
};

const includesOption = (scope: ExportScope, option: ExportIncludeOption) =>
  scope.include.includes(option);

const assertOptionalUuid = (value: unknown, code: string) => {
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(code);
  }
};

const assertRequiredUuid = (value: unknown, code: string) => {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(code);
  }
};

const buildSummary = (bundle: ExportBundle, warnings: string[] = []): ImportSummary => {
  const scope = resolveImportScope(bundle);
  const menusCount = includesOption(scope, "menus") ? bundle.menus.length : 0;
  const menuItemsCount =
    includesOption(scope, "menus") && includesOption(scope, "menu-items")
      ? bundle.menus.reduce((total, menu) => total + menu.items.length, 0)
      : 0;
  const themeProfilesCount = includesOption(scope, "theme-profiles")
    ? bundle.themeProfiles.length
    : 0;
  const themeRoutesCount =
    includesOption(scope, "theme-profiles") && includesOption(scope, "theme-routes")
      ? bundle.themeProfiles.reduce((total, profile) => total + profile.routes.length, 0)
      : 0;
  const adminTemplatesCount = includesOption(scope, "admin-theme-templates")
    ? bundle.adminThemes.templates.length
    : 0;
  const adminProfilesCount = includesOption(scope, "admin-theme-profiles")
    ? bundle.adminThemes.profiles.length
    : 0;
  return {
    settings: includesOption(scope, "settings") ? Object.keys(bundle.settings ?? {}).length : 0,
    menus: menusCount,
    menuItems: menuItemsCount,
    themeProfiles: themeProfilesCount,
    themeRoutes: themeRoutesCount,
    adminThemeTemplates: adminTemplatesCount,
    adminThemeProfiles: adminProfilesCount,
    redirects: includesOption(scope, "redirects") ? bundle.redirects.length : 0,
    warnings,
  };
};

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("theme_route_invalid");
  if (trimmed === "/") return "/";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

export const filterExportBundleForScope = (
  bundle: ExportBundle,
  scope: ExportScope
): ExportBundle => ({
  version: bundle.version,
  exportedAt: bundle.exportedAt,
  scope,
  settings: includesOption(scope, "settings") ? bundle.settings : {},
  menus: includesOption(scope, "menus")
    ? bundle.menus.map((menu) => ({
        ...menu,
        items: includesOption(scope, "menu-items") ? menu.items : [],
      }))
    : [],
  themeProfiles: includesOption(scope, "theme-profiles")
    ? bundle.themeProfiles.map((profile) => ({
        ...profile,
        routes: includesOption(scope, "theme-routes") ? profile.routes : [],
      }))
    : [],
  adminThemes: {
    templates: includesOption(scope, "admin-theme-templates") ? bundle.adminThemes.templates : [],
    profiles: includesOption(scope, "admin-theme-profiles") ? bundle.adminThemes.profiles : [],
  },
  redirects: includesOption(scope, "redirects") ? bundle.redirects : [],
});

const normalizeMenuItem = (item: ExportMenuItem, pageIds: Set<string>, index: number) => {
  const label = item.label?.trim();
  if (!label) throw new Error("menu_item_label_required");

  const href = item.href ? item.href.trim() : null;
  const pageId = item.pageId && pageIds.has(item.pageId) ? item.pageId : null;
  if ((href && pageId) || (!href && !pageId)) {
    throw new Error("menu_item_link_invalid");
  }

  return {
    id: item.id ?? randomUUID(),
    label,
    href,
    pageId,
    parentId: item.parentId ?? null,
    orderIndex: Number.isFinite(item.orderIndex) ? Number(item.orderIndex) : index,
  };
};

const validateBundle = async (bundle: ExportBundle) => {
  if (bundle.version !== BUNDLE_VERSION) {
    throw new Error("import_bundle_version_invalid");
  }
  if (!Number.isFinite(Date.parse(bundle.exportedAt))) {
    throw new Error("import_bundle_exported_at_invalid");
  }

  resolveImportScope(bundle);

  for (const menu of bundle.menus) {
    assertOptionalUuid(menu.id, "import_menu_id_invalid");
    for (const item of menu.items) {
      assertOptionalUuid(item.id, "import_menu_item_id_invalid");
      assertOptionalUuid(item.pageId, "import_menu_item_page_id_invalid");
      assertOptionalUuid(item.parentId, "import_menu_item_parent_id_invalid");
    }
  }

  for (const profile of bundle.themeProfiles) {
    assertOptionalUuid(profile.id, "import_theme_profile_id_invalid");
    if (!profile.name.trim() || !profile.themeName.trim()) {
      throw new Error("theme_profile_invalid");
    }
    assertTokenOverrides(profile.tokens ?? {});

    const routePaths = new Set<string>();
    for (const route of profile.routes) {
      assertOptionalUuid(route.id, "import_theme_route_id_invalid");
      assertOptionalUuid(route.pageId, "import_theme_route_page_id_invalid");
      const path = normalizePath(route.path);
      if (routePaths.has(path)) {
        throw new Error("theme_routes_duplicate");
      }
      routePaths.add(path);
    }
  }

  const bundleTemplateIds = new Set<string>();
  for (const template of bundle.adminThemes.templates) {
    assertOptionalUuid(template.id, "import_admin_theme_template_id_invalid");
    if (!template.name.trim()) {
      throw new Error("admin_theme_template_invalid");
    }
    assertAdminThemeTokens(template.tokens);
    if (template.id) bundleTemplateIds.add(template.id);
  }

  const externalTemplateIds = new Set<string>();
  for (const profile of bundle.adminThemes.profiles) {
    assertOptionalUuid(profile.id, "import_admin_theme_profile_id_invalid");
    assertRequiredUuid(profile.templateId, "import_admin_theme_template_ref_invalid");
    if (!profile.name.trim()) {
      throw new Error("admin_theme_profile_invalid");
    }
    if (!bundleTemplateIds.has(profile.templateId)) {
      externalTemplateIds.add(profile.templateId);
    }
  }

  if (externalTemplateIds.size > 0) {
    const existing = await db
      .select({ id: adminThemeTemplates.id })
      .from(adminThemeTemplates)
      .where(inArray(adminThemeTemplates.id, Array.from(externalTemplateIds)));
    const existingIds = new Set(existing.map((row) => row.id));
    for (const templateId of externalTemplateIds) {
      if (!existingIds.has(templateId)) {
        throw new Error("admin_theme_template_not_found");
      }
    }
  }

  const redirectPaths = new Set<string>();
  for (const redirect of bundle.redirects) {
    assertOptionalUuid(redirect.id, "import_redirect_id_invalid");
    const fromPath = normalizeRedirectPath(redirect.fromPath);
    normalizeRedirectTarget(redirect.toPath);
    normalizeRedirectStatusCode(redirect.statusCode);
    if (redirectPaths.has(fromPath)) {
      throw new Error("redirects_duplicate");
    }
    redirectPaths.add(fromPath);
  }
};

export async function exportConfig(input: ExportRequest = {}): Promise<ExportBundle> {
  const scope = normalizeExportRequest(input);
  const settings = await listSettings();
  const menusList = await listMenus();
  const menuBundles: ExportMenu[] = [];

  for (const menu of menusList) {
    const items = await listMenuItems(menu.id);
    const flatItems: ExportMenuItem[] = [];

    const walk = (nodes: typeof items) => {
      for (const node of nodes) {
        flatItems.push({
          id: node.id,
          label: node.label,
          href: node.href ?? null,
          pageId: node.pageId ?? null,
          parentId: node.parentId ?? null,
          orderIndex: node.orderIndex,
        });
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };

    walk(items);

    menuBundles.push({
      id: menu.id,
      name: menu.name,
      location: menu.location ?? null,
      items: flatItems,
    });
  }

  const themeProfilesList = await listThemeProfiles();
  const themeBundles: ExportThemeProfile[] = themeProfilesList.map((profile) => ({
    id: profile.id,
    name: profile.name,
    description: profile.description ?? null,
    themeName: profile.themeName,
    tokens: profile.tokens ?? {},
    isActive: profile.isActive,
    routes: profile.routes.map((route) => ({
      id: route.id,
      path: route.path,
      pageId: route.pageId ?? null,
    })),
  }));

  const adminTemplates = await listAdminThemeTemplates();
  const adminProfiles = await listAdminThemeProfiles();

  const adminTemplateBundles: ExportAdminThemeTemplate[] = adminTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    tokens: template.tokens,
  }));

  const adminProfileBundles: ExportAdminThemeProfile[] = adminProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    description: profile.description ?? null,
    templateId: profile.templateId,
    isActive: profile.isActive,
  }));

  const redirectRows = await db.select().from(redirects);
  const redirectBundles: ExportRedirect[] = redirectRows.map((redirect) => ({
    id: redirect.id,
    fromPath: redirect.fromPath,
    toPath: redirect.toPath,
    statusCode: normalizeRedirectStatusCode(redirect.statusCode),
    enabled: redirect.enabled,
  }));

  return filterExportBundleForScope(
    {
      version: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      menus: menuBundles,
      themeProfiles: themeBundles,
      adminThemes: {
        templates: adminTemplateBundles,
        profiles: adminProfileBundles,
      },
      redirects: redirectBundles,
    },
    scope
  );
}

export async function previewImport(bundle: ExportBundle): Promise<ImportResult> {
  await validateBundle(bundle);
  const warnings: string[] = [];

  const themeRegistry = await listThemes();
  const knownThemeNames = new Set(themeRegistry.map((theme) => theme.name));
  for (const profile of bundle.themeProfiles) {
    if (!knownThemeNames.has(profile.themeName)) {
      warnings.push(`Theme '${profile.themeName}' is not installed.`);
    }
  }

  return { summary: buildSummary(bundle, warnings) };
}

// Transaction-aware body of `importConfig`. Kept separately so a restore (or any
// other multi-step write) can share ONE outer `tx` instead of opening its own —
// this is what lets `restoreBackup` be genuinely all-or-nothing. `importConfig`
// below is now a thin `db.transaction` wrapper around this, so existing callers
// are unchanged.
export async function importConfigTx(
  tx: DbTransaction,
  bundle: ExportBundle
): Promise<ImportResult> {
  await validateBundle(bundle);
  const scope = resolveImportScope(bundle);
  const themeRegistry = await listThemes();
  const knownThemeNames = new Set(themeRegistry.map((theme) => theme.name));

  const warnings: string[] = [];
  const pageRows = await tx.select({ id: pages.id }).from(pages);
  const pageIds = new Set(pageRows.map((row) => row.id));

  if (includesOption(scope, "settings")) {
    await setSettingsTx(tx, bundle.settings);
  }

  if (includesOption(scope, "menus")) {
    const bundleMenuNames = new Set(bundle.menus.map((menu) => menu.name.trim()));
    const existingMenus = await tx.select().from(menus);
    for (const menu of existingMenus) {
      if (!bundleMenuNames.has(menu.name)) {
        await tx.delete(menus).where(eq(menus.id, menu.id));
      }
    }

    for (const menu of bundle.menus) {
      const name = menu.name.trim();
      if (!name) throw new Error("menu_invalid");
      const [existing] = await tx.select().from(menus).where(eq(menus.name, name));
      let menuId = existing?.id ?? null;

      if (existing) {
        await tx
          .update(menus)
          .set({ location: menu.location ?? null })
          .where(eq(menus.id, existing.id));
      } else {
        menuId = menu.id ?? randomUUID();
        const [created] = await tx
          .insert(menus)
          .values({
            id: menuId,
            name,
            location: menu.location ?? null,
          })
          .returning();
        menuId = created?.id ?? menuId;
      }

      const normalizedItems = includesOption(scope, "menu-items")
        ? menu.items.map((item, index) => normalizeMenuItem(item, pageIds, index))
        : [];

      await replaceMenuItemsTx(tx, menuId ?? randomUUID(), normalizedItems);
    }
  }

  const templateIdMap = new Map<string, string>();

  if (includesOption(scope, "admin-theme-templates")) {
    for (const template of bundle.adminThemes.templates) {
      const name = template.name.trim();
      const [existing] = await tx
        .select()
        .from(adminThemeTemplates)
        .where(eq(adminThemeTemplates.name, name));

      if (existing) {
        await tx
          .update(adminThemeTemplates)
          .set({
            description: template.description ?? null,
            tokens: template.tokens,
            updatedAt: new Date(),
          })
          .where(eq(adminThemeTemplates.id, existing.id));
        templateIdMap.set(template.id ?? existing.id, existing.id);
        continue;
      }

      const [created] = await tx
        .insert(adminThemeTemplates)
        .values({
          id: template.id ?? randomUUID(),
          name,
          description: template.description ?? null,
          tokens: template.tokens,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (created) {
        templateIdMap.set(template.id ?? created.id, created.id);
      }
    }
  }

  if (includesOption(scope, "admin-theme-profiles")) {
    for (const profile of bundle.adminThemes.profiles) {
      const mappedTemplateId = templateIdMap.get(profile.templateId) ?? profile.templateId;
      if (!mappedTemplateId) {
        throw new Error("admin_theme_template_not_found");
      }

      await tx
        .insert(adminThemeProfiles)
        .values({
          id: profile.id ?? randomUUID(),
          name: profile.name.trim(),
          description: profile.description ?? null,
          templateId: mappedTemplateId,
          isActive: profile.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: adminThemeProfiles.id,
          set: {
            name: profile.name.trim(),
            description: profile.description ?? null,
            templateId: mappedTemplateId,
            isActive: profile.isActive,
            updatedAt: new Date(),
          },
        });
    }

    const activeAdminProfile = bundle.adminThemes.profiles.find((profile) => profile.isActive);
    if (activeAdminProfile?.id) {
      await tx.update(adminThemeProfiles).set({ isActive: false });
      await tx
        .update(adminThemeProfiles)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(adminThemeProfiles.id, activeAdminProfile.id));
    }
  }

  const profileIdMap = new Map<string, string>();
  if (includesOption(scope, "theme-profiles")) {
    for (const profile of bundle.themeProfiles) {
      if (!knownThemeNames.has(profile.themeName)) {
        warnings.push(`Theme '${profile.themeName}' is not installed.`);
      }

      const profileId = profile.id ?? randomUUID();
      await tx
        .insert(themeProfiles)
        .values({
          id: profileId,
          name: profile.name.trim(),
          description: profile.description ?? null,
          themeName: profile.themeName.trim(),
          tokens: profile.tokens ?? {},
          isActive: profile.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: themeProfiles.id,
          set: {
            name: profile.name.trim(),
            description: profile.description ?? null,
            themeName: profile.themeName.trim(),
            tokens: profile.tokens ?? {},
            isActive: profile.isActive,
            updatedAt: new Date(),
          },
        });
      profileIdMap.set(profile.id ?? profileId, profileId);

      const routes = includesOption(scope, "theme-routes")
        ? profile.routes.map((route) => ({
            id: route.id ?? randomUUID(),
            path: normalizePath(route.path),
            pageId: route.pageId && pageIds.has(route.pageId) ? route.pageId : null,
          }))
        : [];

      const uniquePaths = new Set<string>();
      for (const route of routes) {
        if (uniquePaths.has(route.path)) {
          throw new Error("theme_routes_duplicate");
        }
        uniquePaths.add(route.path);
      }

      await tx.delete(themeRoutes).where(eq(themeRoutes.profileId, profileId));
      if (routes.length > 0) {
        await tx.insert(themeRoutes).values(
          routes.map((route) => ({
            id: route.id,
            profileId,
            path: route.path,
            pageId: route.pageId ?? null,
            createdAt: new Date(),
          }))
        );
      }
    }

    const activeThemeProfile = bundle.themeProfiles.find((profile) => profile.isActive);
    if (activeThemeProfile?.id) {
      const mappedId = profileIdMap.get(activeThemeProfile.id) ?? activeThemeProfile.id;
      await tx.update(themeProfiles).set({ isActive: false });
      await tx
        .update(themeProfiles)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(themeProfiles.id, mappedId));
    }
  }

  if (includesOption(scope, "redirects")) {
    const bundleRedirectPaths = new Set(
      bundle.redirects.map((redirect) => normalizeRedirectPath(redirect.fromPath))
    );
    const existingRedirects = await tx.select().from(redirects);
    for (const redirect of existingRedirects) {
      if (!bundleRedirectPaths.has(redirect.fromPath)) {
        await tx.delete(redirects).where(eq(redirects.id, redirect.id));
      }
    }

    for (const redirect of bundle.redirects) {
      const fromPath = normalizeRedirectPath(redirect.fromPath);
      const toPath = normalizeRedirectTarget(redirect.toPath);
      const statusCode = normalizeRedirectStatusCode(redirect.statusCode);
      const [existing] = await tx.select().from(redirects).where(eq(redirects.fromPath, fromPath));

      if (existing) {
        await tx
          .update(redirects)
          .set({
            toPath,
            statusCode,
            enabled: redirect.enabled,
            updatedAt: new Date(),
          })
          .where(eq(redirects.id, existing.id));
      } else {
        await tx.insert(redirects).values({
          id: redirect.id ?? randomUUID(),
          fromPath,
          toPath,
          statusCode,
          enabled: redirect.enabled,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  return { summary: buildSummary(bundle, warnings) };
}

export async function importConfig(bundle: ExportBundle): Promise<ImportResult> {
  return db.transaction((tx) => importConfigTx(tx, bundle));
}
