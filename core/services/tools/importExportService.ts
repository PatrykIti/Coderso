import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import {
  adminThemeProfiles,
  adminThemeTemplates,
  menus,
  pages,
  themeProfiles,
  themeRoutes,
} from "../../db/schema";
import { listAdminThemeProfiles } from "../adminThemes/adminThemeProfileService";
import { listAdminThemeTemplates } from "../adminThemes/adminThemeTemplateService";
import { assertAdminThemeTokens } from "../adminThemes/tokenValidation";
import { listMenuItems, listMenus, replaceMenuItems } from "../menus/menuService";
import { listSettings, setSettings } from "../settings/settingsService";
import { listThemeProfiles } from "../themes/themeProfileService";
import { assertTokenOverrides } from "../theme/tokenValidation";
import { listThemes } from "../themes/themeService";
import type {
  ExportAdminThemeProfile,
  ExportAdminThemeTemplate,
  ExportBundle,
  ExportMenu,
  ExportMenuItem,
  ExportRedirect,
  ExportThemeProfile,
  ImportResult,
  ImportSummary,
} from "./importExportTypes";

const BUNDLE_VERSION = 1;

const buildSummary = (bundle: ExportBundle, warnings: string[] = []): ImportSummary => {
  const menusCount = bundle.menus.length;
  const menuItemsCount = bundle.menus.reduce(
    (total, menu) => total + menu.items.length,
    0
  );
  const themeProfilesCount = bundle.themeProfiles.length;
  const themeRoutesCount = bundle.themeProfiles.reduce(
    (total, profile) => total + profile.routes.length,
    0
  );
  const adminTemplatesCount = bundle.adminThemes.templates.length;
  const adminProfilesCount = bundle.adminThemes.profiles.length;
  return {
    settings: Object.keys(bundle.settings ?? {}).length,
    menus: menusCount,
    menuItems: menuItemsCount,
    themeProfiles: themeProfilesCount,
    themeRoutes: themeRoutesCount,
    adminThemeTemplates: adminTemplatesCount,
    adminThemeProfiles: adminProfilesCount,
    redirects: bundle.redirects.length,
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
    orderIndex: Number.isFinite(item.orderIndex)
      ? Number(item.orderIndex)
      : index,
  };
};

const validateBundle = async (bundle: ExportBundle) => {
  if (bundle.version !== BUNDLE_VERSION) {
    throw new Error("import_bundle_version_invalid");
  }

  for (const profile of bundle.themeProfiles) {
    if (!profile.name.trim() || !profile.themeName.trim()) {
      throw new Error("theme_profile_invalid");
    }
    assertTokenOverrides(profile.tokens ?? {});
  }

  for (const template of bundle.adminThemes.templates) {
    if (!template.name.trim()) {
      throw new Error("admin_theme_template_invalid");
    }
    assertAdminThemeTokens(template.tokens);
  }

  for (const profile of bundle.adminThemes.profiles) {
    if (!profile.name.trim()) {
      throw new Error("admin_theme_profile_invalid");
    }
  }
};

export async function exportConfig(): Promise<ExportBundle> {
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

  return {
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    menus: menuBundles,
    themeProfiles: themeBundles,
    adminThemes: {
      templates: adminTemplateBundles,
      profiles: adminProfileBundles,
    },
    redirects: [] as ExportRedirect[],
  };
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

export async function importConfig(bundle: ExportBundle): Promise<ImportResult> {
  await validateBundle(bundle);

  const warnings: string[] = [];
  const pageRows = await db.select({ id: pages.id }).from(pages);
  const pageIds = new Set(pageRows.map((row) => row.id));

  await setSettings(bundle.settings);

  const bundleMenuNames = new Set(
    bundle.menus.map((menu) => menu.name.trim())
  );
  const existingMenus = await db.select().from(menus);
  for (const menu of existingMenus) {
    if (!bundleMenuNames.has(menu.name)) {
      await db.delete(menus).where(eq(menus.id, menu.id));
    }
  }

  for (const menu of bundle.menus) {
    const name = menu.name.trim();
    if (!name) throw new Error("menu_invalid");
    const [existing] = await db
      .select()
      .from(menus)
      .where(eq(menus.name, name));
    let menuId = existing?.id ?? null;

    if (existing) {
      await db
        .update(menus)
        .set({ location: menu.location ?? null })
        .where(eq(menus.id, existing.id));
    } else {
      menuId = menu.id ?? randomUUID();
      const [created] = await db
        .insert(menus)
        .values({
          id: menuId,
          name,
          location: menu.location ?? null,
        })
        .returning();
      menuId = created?.id ?? menuId;
    }

    const normalizedItems = menu.items.map((item, index) =>
      normalizeMenuItem(item, pageIds, index)
    );

    await replaceMenuItems(menuId ?? randomUUID(), normalizedItems);
  }

  const templateIdMap = new Map<string, string>();

  for (const template of bundle.adminThemes.templates) {
    const name = template.name.trim();
    const [existing] = await db
      .select()
      .from(adminThemeTemplates)
      .where(eq(adminThemeTemplates.name, name));

    if (existing) {
      await db
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

    const [created] = await db
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

  for (const profile of bundle.adminThemes.profiles) {
    const mappedTemplateId = templateIdMap.get(profile.templateId) ?? profile.templateId;
    if (!mappedTemplateId) {
      throw new Error("admin_theme_template_not_found");
    }

    await db
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
    await db.update(adminThemeProfiles).set({ isActive: false });
    await db
      .update(adminThemeProfiles)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(adminThemeProfiles.id, activeAdminProfile.id));
  }

  const themeRegistry = await listThemes();
  const knownThemeNames = new Set(themeRegistry.map((theme) => theme.name));

  const profileIdMap = new Map<string, string>();
  for (const profile of bundle.themeProfiles) {
    if (!knownThemeNames.has(profile.themeName)) {
      warnings.push(`Theme '${profile.themeName}' is not installed.`);
    }

    const profileId = profile.id ?? randomUUID();
    await db
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

    const routes = profile.routes.map((route) => ({
      id: route.id ?? randomUUID(),
      path: normalizePath(route.path),
      pageId: route.pageId && pageIds.has(route.pageId) ? route.pageId : null,
    }));

    const uniquePaths = new Set<string>();
    for (const route of routes) {
      if (uniquePaths.has(route.path)) {
        throw new Error("theme_routes_duplicate");
      }
      uniquePaths.add(route.path);
    }

    await db.delete(themeRoutes).where(eq(themeRoutes.profileId, profileId));
    if (routes.length > 0) {
      await db
        .insert(themeRoutes)
        .values(
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
    await db.update(themeProfiles).set({ isActive: false });
    await db
      .update(themeProfiles)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(themeProfiles.id, mappedId));
  }

  return { summary: buildSummary(bundle, warnings) };
}
