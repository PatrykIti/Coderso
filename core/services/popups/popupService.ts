import { and, desc, eq, ilike } from "drizzle-orm";

import { db } from "../../db/client";
import { popups } from "../../db/schema";
import type { Popup, PopupStatus } from "./popupTypes";
import {
  normalizePopupContent,
  normalizePopupFrequency,
  normalizePopupName,
  normalizePopupSettings,
  normalizePopupSlug,
  normalizePopupStatus,
  normalizePopupTargeting,
  normalizePopupTrigger,
} from "./popupValidation";

type PopupRow = typeof popups.$inferSelect;

export type PopupCreateInput = {
  name: unknown;
  slug?: unknown;
  status?: unknown;
  trigger: unknown;
  targeting: unknown;
  frequency: unknown;
  content: unknown;
  settings: unknown;
};

export type PopupUpdateInput = Partial<PopupCreateInput>;

export type ListPopupsInput = {
  status?: PopupStatus;
  search?: string | null;
  limit?: number;
  offset?: number;
};

const toIso = (value: Date | null) => (value ? value.toISOString() : null);

const mapPopup = (row: PopupRow): Popup => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  status: normalizePopupStatus(row.status),
  trigger: normalizePopupTrigger(row.trigger),
  targeting: normalizePopupTargeting(row.targeting),
  frequency: normalizePopupFrequency(row.frequency),
  content: normalizePopupContent(row.content),
  settings: normalizePopupSettings(row.settings),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  publishedAt: toIso(row.publishedAt),
});

const parseLimit = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 100;
  const normalized = Math.floor(value as number);
  if (normalized < 1) return 1;
  if (normalized > 200) return 200;
  return normalized;
};

const parseOffset = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.floor(value as number);
  return normalized < 0 ? 0 : normalized;
};

export async function listPopups(input: ListPopupsInput = {}) {
  const conditions = [];
  if (input.status) {
    conditions.push(eq(popups.status, input.status));
  }
  const search = typeof input.search === "string" ? input.search.trim() : "";
  if (search) {
    conditions.push(ilike(popups.name, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db
    .select()
    .from(popups)
    .where(where)
    .orderBy(desc(popups.updatedAt))
    .limit(parseLimit(input.limit))
    .offset(parseOffset(input.offset));

  return rows.map(mapPopup);
}

export async function getPopup(popupId: string) {
  const [row] = await db.select().from(popups).where(eq(popups.id, popupId));
  return row ? mapPopup(row) : null;
}

export async function createPopup(input: PopupCreateInput) {
  const name = normalizePopupName(input.name);
  const slug = normalizePopupSlug(input.slug, name);
  const status = normalizePopupStatus(input.status, "draft");
  const trigger = normalizePopupTrigger(input.trigger);
  const targeting = normalizePopupTargeting(input.targeting);
  const frequency = normalizePopupFrequency(input.frequency);
  const content = normalizePopupContent(input.content);
  const settings = normalizePopupSettings(input.settings);
  const now = new Date();

  const [row] = await db
    .insert(popups)
    .values({
      name,
      slug,
      status,
      trigger,
      targeting,
      frequency,
      content,
      settings,
      publishedAt: status === "published" ? now : null,
      updatedAt: now,
    })
    .returning();

  return row ? mapPopup(row) : null;
}

export async function updatePopup(popupId: string, input: PopupUpdateInput) {
  const [existing] = await db.select().from(popups).where(eq(popups.id, popupId));
  if (!existing) return null;

  const nextName =
    input.name === undefined ? existing.name : normalizePopupName(input.name);
  const nextSlug =
    input.slug === undefined
      ? existing.slug
      : normalizePopupSlug(input.slug, nextName);
  const nextStatus =
    input.status === undefined
      ? normalizePopupStatus(existing.status, "draft")
      : normalizePopupStatus(input.status, "draft");
  const trigger =
    input.trigger === undefined
      ? normalizePopupTrigger(existing.trigger)
      : normalizePopupTrigger(input.trigger);
  const targeting =
    input.targeting === undefined
      ? normalizePopupTargeting(existing.targeting)
      : normalizePopupTargeting(input.targeting);
  const frequency =
    input.frequency === undefined
      ? normalizePopupFrequency(existing.frequency)
      : normalizePopupFrequency(input.frequency);
  const content =
    input.content === undefined
      ? normalizePopupContent(existing.content)
      : normalizePopupContent(input.content);
  const settings =
    input.settings === undefined
      ? normalizePopupSettings(existing.settings)
      : normalizePopupSettings(input.settings);

  const now = new Date();
  const publishedAt =
    nextStatus === "published"
      ? existing.publishedAt ?? now
      : null;

  const [row] = await db
    .update(popups)
    .set({
      name: nextName,
      slug: nextSlug,
      status: nextStatus,
      trigger,
      targeting,
      frequency,
      content,
      settings,
      updatedAt: now,
      publishedAt,
    })
    .where(eq(popups.id, popupId))
    .returning();

  return row ? mapPopup(row) : null;
}

export async function setPopupStatus(popupId: string, status: PopupStatus) {
  const normalizedStatus = normalizePopupStatus(status, "draft");
  const now = new Date();
  const [row] = await db
    .update(popups)
    .set({
      status: normalizedStatus,
      updatedAt: now,
      publishedAt: normalizedStatus === "published" ? now : null,
    })
    .where(eq(popups.id, popupId))
    .returning();

  return row ? mapPopup(row) : null;
}

export async function deletePopup(popupId: string) {
  const [row] = await db.delete(popups).where(eq(popups.id, popupId)).returning();
  return row ? mapPopup(row) : null;
}

import {
  matchPopupRequest,
  toPublicPopup,
  type PublicPopup,
} from "./popupPublicContract";

export type PublicPopupRequest = {
  path: string;
  isLoggedIn: boolean;
};

export async function resolvePublicPopups(
  req: PublicPopupRequest,
): Promise<PublicPopup[]> {
  const path = typeof req.path === "string" ? req.path : "/";
  const isLoggedIn = Boolean(req.isLoggedIn);

  const rows = await db
    .select()
    .from(popups)
    .where(eq(popups.status, "published")) // uses popups_status_idx
    .orderBy(desc(popups.updatedAt))
    .limit(200); // hard cap, mirrors listPopups

  return rows
    .map(mapPopup) // existing normalizer
    .filter((p) => matchPopupRequest(p, { path, isLoggedIn }))
    .map(toPublicPopup);
}
