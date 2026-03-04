import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { customScreens } from "../../db/schema";
import type { WidgetBlock } from "../../widgets/types";
import {
  normalizeCustomScreenDefinition,
  type CustomScreenBinding,
  type CustomScreenDefinitionVersion,
  type CustomScreenStatus,
} from "./customScreenSchemas";

export type CustomScreenRecord = {
  id: string;
  name: string;
  contentTypeId: string;
  status: CustomScreenStatus;
  schemaVersion: CustomScreenDefinitionVersion;
  blocks: WidgetBlock[];
  bindings: CustomScreenBinding[];
  createdAt: Date;
  updatedAt: Date;
};

export type CustomScreenCreateInput = {
  name: string;
  contentTypeId: string;
  status?: CustomScreenStatus;
  schemaVersion?: number;
  blocks?: WidgetBlock[] | null;
  bindings?: CustomScreenBinding[] | null;
};

export type CustomScreenUpdateInput = {
  name?: string;
  contentTypeId?: string;
  status?: CustomScreenStatus;
  schemaVersion?: number;
  blocks?: WidgetBlock[] | null;
  bindings?: CustomScreenBinding[] | null;
};

const allowedStatuses = new Set<CustomScreenStatus>(["draft", "active"]);

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeName = (value: unknown) => {
  const name = normalizeText(value);
  if (!name) throw new Error("custom_screen_invalid");
  return name;
};

const normalizeContentTypeId = (value: unknown) => {
  const id = normalizeText(value);
  if (!id) throw new Error("custom_screen_invalid");
  return id;
};

const normalizeStatus = (value: unknown): CustomScreenStatus => {
  const status = normalizeText(value) ?? "draft";
  if (!allowedStatuses.has(status as CustomScreenStatus)) {
    throw new Error("custom_screen_status_invalid");
  }
  return status as CustomScreenStatus;
};

const mapRow = (row: typeof customScreens.$inferSelect): CustomScreenRecord => {
  const definition = normalizeCustomScreenDefinition({
    schemaVersion: row.schemaVersion,
    blocks: row.blocks,
    bindings: row.bindings,
  });

  return {
    id: row.id,
    name: row.name,
    contentTypeId: row.contentTypeId,
    status: normalizeStatus(row.status),
    schemaVersion: definition.schemaVersion,
    blocks: definition.blocks,
    bindings: definition.bindings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export async function listCustomScreens(): Promise<CustomScreenRecord[]> {
  const rows = await db
    .select()
    .from(customScreens)
    .orderBy(desc(customScreens.updatedAt));
  return rows.map(mapRow);
}

export async function getCustomScreen(id: string) {
  const [row] = await db
    .select()
    .from(customScreens)
    .where(eq(customScreens.id, id));
  if (!row) return null;
  return mapRow(row);
}

export async function createCustomScreen(input: CustomScreenCreateInput) {
  const name = normalizeName(input.name);
  const contentTypeId = normalizeContentTypeId(input.contentTypeId);
  const definition = normalizeCustomScreenDefinition({
    schemaVersion: input.schemaVersion,
    blocks: input.blocks,
    bindings: input.bindings,
  });

  const now = new Date();
  const [row] = await db
    .insert(customScreens)
    .values({
      name,
      contentTypeId,
      status: normalizeStatus(input.status),
      schemaVersion: definition.schemaVersion,
      blocks: definition.blocks,
      bindings: definition.bindings,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) throw new Error("custom_screen_invalid");
  return mapRow(row);
}

export async function updateCustomScreen(
  id: string,
  input: CustomScreenUpdateInput
) {
  const [existing] = await db
    .select()
    .from(customScreens)
    .where(eq(customScreens.id, id));
  if (!existing) return null;

  const definition = normalizeCustomScreenDefinition({
    schemaVersion: input.schemaVersion ?? existing.schemaVersion,
    blocks: input.blocks !== undefined ? input.blocks : existing.blocks,
    bindings: input.bindings !== undefined ? input.bindings : existing.bindings,
  });

  const [row] = await db
    .update(customScreens)
    .set({
      name: input.name !== undefined ? normalizeName(input.name) : existing.name,
      contentTypeId:
        input.contentTypeId !== undefined
          ? normalizeContentTypeId(input.contentTypeId)
          : existing.contentTypeId,
      status:
        input.status !== undefined
          ? normalizeStatus(input.status)
          : normalizeStatus(existing.status),
      schemaVersion: definition.schemaVersion,
      blocks: definition.blocks,
      bindings: definition.bindings,
      updatedAt: new Date(),
    })
    .where(eq(customScreens.id, id))
    .returning();

  if (!row) return null;
  return mapRow(row);
}

export async function deleteCustomScreen(id: string) {
  const [row] = await db
    .delete(customScreens)
    .where(eq(customScreens.id, id))
    .returning();
  if (!row) return null;
  return mapRow(row);
}
