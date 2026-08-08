import { asc, eq, inArray } from "drizzle-orm";

import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { pages, themeProfiles, themeRoutes } from "../../db/schema";
import type { DesignTokenOverrides } from "../theme/tokenTypes";
import { assertTokenOverrides } from "../theme/tokenValidation";
import { clearSiteCache } from "../../site/cache/siteCache";

export type ThemeProfile = typeof themeProfiles.$inferSelect & {
  routes: ThemeRoute[];
};

export type ThemeRoute = {
  id: string;
  path: string;
  pageId: string | null;
};

export type ThemeRouteInput = {
  path: string;
  pageId: string | null;
};

export type ThemeProfileCreateInput = {
  name: string;
  description?: string | null;
  themeName: string;
  tokens?: DesignTokenOverrides;
  isActive?: boolean;
};

export type ThemeProfileUpdateInput = {
  name?: string;
  description?: string | null;
  tokens?: DesignTokenOverrides;
};

type ThemeProfileTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("theme_route_invalid");
  if (trimmed === "/") return "/";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const normalizeRoutes = (routes: ThemeRouteInput[]) => {
  const seen = new Set<string>();
  return routes.map((route) => {
    const path = normalizePath(route.path);
    if (seen.has(path)) {
      throw new Error("theme_routes_duplicate");
    }
    seen.add(path);
    return { path, pageId: route.pageId ?? null };
  });
};

const lockReferencedPages = async (
  tx: ThemeProfileTransaction,
  routes: readonly Readonly<{ pageId: string | null }>[]
): Promise<void> => {
  const pageIds = [...new Set(routes.flatMap(({ pageId }) => (pageId ? [pageId] : [])))].sort();
  if (pageIds.length === 0) return;
  const rows = await tx
    .select({ id: pages.id })
    .from(pages)
    .where(inArray(pages.id, pageIds))
    .orderBy(asc(pages.id))
    .for("key share");
  if (rows.length !== pageIds.length || rows.some((row, index) => row.id !== pageIds[index])) {
    throw new Error("theme_route_invalid");
  }
};

export async function listThemeProfiles(): Promise<ThemeProfile[]> {
  const profiles = await db.select().from(themeProfiles).orderBy(themeProfiles.createdAt);
  if (!profiles.length) return [];

  const routes = await db
    .select()
    .from(themeRoutes)
    .where(
      inArray(
        themeRoutes.profileId,
        profiles.map((p) => p.id)
      )
    );

  const routesByProfile = new Map<string, ThemeRoute[]>();
  for (const route of routes) {
    const list = routesByProfile.get(route.profileId) ?? [];
    list.push({ id: route.id, path: route.path, pageId: route.pageId });
    routesByProfile.set(route.profileId, list);
  }

  return profiles.map((profile) => ({
    ...profile,
    routes: routesByProfile.get(profile.id) ?? [],
  }));
}

export async function getThemeProfile(id: string) {
  const [profile] = await db.select().from(themeProfiles).where(eq(themeProfiles.id, id));
  if (!profile) return null;

  const routes = await db.select().from(themeRoutes).where(eq(themeRoutes.profileId, id));

  return {
    ...profile,
    routes: routes.map((route) => ({ id: route.id, path: route.path, pageId: route.pageId })),
  } as ThemeProfile;
}

export async function createThemeProfile(input: ThemeProfileCreateInput) {
  const created = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      if (!input.name.trim() || !input.themeName.trim()) {
        throw new Error("theme_profile_invalid");
      }
      if (input.tokens) assertTokenOverrides(input.tokens);
      const now = new Date();
      if (input.isActive) {
        await tx.update(themeProfiles).set({ isActive: false, updatedAt: now });
      }
      const [row] = await tx
        .insert(themeProfiles)
        .values({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          themeName: input.themeName.trim(),
          tokens: input.tokens ?? {},
          isActive: input.isActive ?? false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return row;
    },
    { isolationLevel: "read committed" }
  );
  if (created?.isActive) {
    clearSiteCache();
  }
  return created;
}

export async function updateThemeProfile(id: string, input: ThemeProfileUpdateInput) {
  const row = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      if (input.tokens) assertTokenOverrides(input.tokens);
      const update: Partial<typeof themeProfiles.$inferInsert> = { updatedAt: new Date() };
      if (input.name !== undefined) update.name = input.name.trim();
      if (input.description !== undefined) update.description = input.description?.trim() || null;
      if (input.tokens !== undefined) update.tokens = input.tokens;
      const [updated] = await tx
        .update(themeProfiles)
        .set(update)
        .where(eq(themeProfiles.id, id))
        .returning();
      return updated ?? null;
    },
    { isolationLevel: "read committed" }
  );

  if (row) {
    clearSiteCache();
  }

  return row;
}

export async function activateThemeProfile(profileId: string) {
  const now = new Date();
  await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [profile] = await tx
        .select({ id: themeProfiles.id })
        .from(themeProfiles)
        .where(eq(themeProfiles.id, profileId))
        .for("update");
      if (!profile) throw new Error("theme_profile_not_found");
      await tx.update(themeProfiles).set({ isActive: false, updatedAt: now });
      await tx
        .update(themeProfiles)
        .set({ isActive: true, updatedAt: now })
        .where(eq(themeProfiles.id, profileId));
    },
    { isolationLevel: "read committed" }
  );

  clearSiteCache();
  return { ok: true };
}

export async function setThemeRoutes(profileId: string, routes: ThemeRouteInput[]) {
  await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const normalized = normalizeRoutes(routes);
      const [profile] = await tx
        .select({ id: themeProfiles.id })
        .from(themeProfiles)
        .where(eq(themeProfiles.id, profileId))
        .for("update");
      if (!profile) throw new Error("theme_profile_not_found");
      await lockReferencedPages(tx, normalized);
      const now = new Date();
      await tx.delete(themeRoutes).where(eq(themeRoutes.profileId, profileId));
      if (normalized.length > 0) {
        await tx.insert(themeRoutes).values(
          normalized.map((route) => ({
            profileId,
            path: route.path,
            pageId: route.pageId,
            createdAt: now,
          }))
        );
      }
      await tx.update(themeProfiles).set({ updatedAt: now }).where(eq(themeProfiles.id, profileId));
    },
    { isolationLevel: "read committed" }
  );

  clearSiteCache();
  return getThemeProfile(profileId);
}

export async function getActiveThemeProfile() {
  const [profile] = await db.select().from(themeProfiles).where(eq(themeProfiles.isActive, true));
  if (!profile) return null;
  return getThemeProfile(profile.id);
}
