import { desc, eq, max } from "drizzle-orm";

import { db } from "../../db/client";
import { users, widgetTemplateRevisions, widgetTemplates } from "../../db/schema";
import type { WidgetBlock } from "../../widgets/types";
import {
  normalizeWidgetTemplateBlocksForRead,
  normalizeWidgetTemplateBlocksForWrite,
} from "./widgetTemplateBlockContract";
import type { WidgetTemplateStatus } from "./widgetTemplateService";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "./widgetTemplateSettings";
import { resolveEmailValue } from "../security/piiEmail";

export type WidgetTemplateRevisionPayload = {
  name: string;
  description: string | null;
  category: string;
  status: WidgetTemplateStatus;
  blocks: WidgetBlock[];
  settings: WidgetTemplateSettings;
};

export type WidgetTemplateRevision = {
  id: string;
  templateId: string;
  version: number;
  name: string;
  description: string | null;
  category: string;
  status: WidgetTemplateStatus;
  blocks: WidgetBlock[];
  settings: WidgetTemplateSettings;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string } | null;
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | DbTransaction;

const normalizeBlocks = (blocks?: WidgetBlock[] | null) =>
  normalizeWidgetTemplateBlocksForRead(blocks);
const normalizeWriteBlocks = (blocks?: WidgetBlock[] | null) =>
  normalizeWidgetTemplateBlocksForWrite(blocks);
const normalizeSettings = (settings?: unknown) => normalizeWidgetTemplateSettings(settings);

export async function listWidgetTemplateRevisions(templateId: string) {
  const rows = await db
    .select({
      id: widgetTemplateRevisions.id,
      templateId: widgetTemplateRevisions.templateId,
      version: widgetTemplateRevisions.version,
      name: widgetTemplateRevisions.name,
      description: widgetTemplateRevisions.description,
      category: widgetTemplateRevisions.category,
      status: widgetTemplateRevisions.status,
      blocks: widgetTemplateRevisions.blocks,
      settings: widgetTemplateRevisions.settings,
      createdAt: widgetTemplateRevisions.createdAt,
      createdBy: widgetTemplateRevisions.createdBy,
      authorName: users.name,
      authorEmail: users.email,
      authorEmailEncrypted: users.emailEncrypted,
    })
    .from(widgetTemplateRevisions)
    .leftJoin(users, eq(widgetTemplateRevisions.createdBy, users.id))
    .where(eq(widgetTemplateRevisions.templateId, templateId))
    .orderBy(desc(widgetTemplateRevisions.version));

  return rows.map((row) => ({
    id: row.id,
    templateId: row.templateId,
    version: row.version,
    name: row.name,
    description: row.description ?? null,
    category: row.category,
    status: row.status as WidgetTemplateStatus,
    blocks: normalizeBlocks(row.blocks as WidgetBlock[]),
    settings: normalizeSettings(row.settings),
    createdAt: row.createdAt,
    createdBy: row.createdBy
      ? {
          id: row.createdBy,
          name: row.authorName ?? null,
          email:
            resolveEmailValue({
              emailEncrypted: row.authorEmailEncrypted,
              email: row.authorEmail,
            }) ?? "",
        }
      : null,
  }));
}

export async function createWidgetTemplateRevisionTx(
  tx: DbClient,
  templateId: string,
  payload: WidgetTemplateRevisionPayload,
  userId?: string | null
) {
  const [{ value }] = await tx
    .select({ value: max(widgetTemplateRevisions.version) })
    .from(widgetTemplateRevisions)
    .where(eq(widgetTemplateRevisions.templateId, templateId));

  const nextVersion = (value ?? 0) + 1;

  const [row] = await tx
    .insert(widgetTemplateRevisions)
    .values({
      templateId,
      version: nextVersion,
      name: payload.name,
      description: payload.description ?? null,
      category: payload.category,
      status: payload.status,
      blocks: normalizeWriteBlocks(payload.blocks),
      settings: normalizeSettings(payload.settings),
      createdBy: userId ?? null,
    })
    .returning();

  return row ?? null;
}

export async function restoreWidgetTemplateRevision(revisionId: string, userId?: string | null) {
  return db.transaction(async (tx) => {
    const [revision] = await tx
      .select()
      .from(widgetTemplateRevisions)
      .where(eq(widgetTemplateRevisions.id, revisionId));

    if (!revision) throw new Error("widget_template_revision_not_found");
    const normalizedBlocks = normalizeWriteBlocks(revision.blocks as WidgetBlock[]);

    const [template] = await tx
      .update(widgetTemplates)
      .set({
        name: revision.name,
        description: revision.description,
        category: revision.category,
        status: revision.status,
        blocks: normalizedBlocks,
        settings: normalizeSettings(revision.settings),
        updatedAt: new Date(),
      })
      .where(eq(widgetTemplates.id, revision.templateId))
      .returning();

    if (!template) throw new Error("widget_template_not_found");

    await createWidgetTemplateRevisionTx(
      tx,
      revision.templateId,
      {
        name: template.name,
        description: template.description ?? null,
        category: template.category,
        status: template.status as WidgetTemplateStatus,
        blocks: normalizeBlocks(template.blocks as WidgetBlock[]),
        settings: normalizeSettings(template.settings),
      },
      userId
    );

    return revision;
  });
}
