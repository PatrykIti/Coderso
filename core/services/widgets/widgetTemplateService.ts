import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { widgetTemplates } from "../../db/schema";
import type { LegacyWidgetBlock } from "../renderContracts/legacyWidgetBlock";
import { normalizeWidgetTemplateBlocksForRead } from "./widgetTemplateBlockContract";
import {
  normalizeWidgetTemplateSettings,
  type WidgetTemplateSettings,
} from "./widgetTemplateSettings";

export type WidgetTemplateRecord = typeof widgetTemplates.$inferSelect & {
  blocks: LegacyWidgetBlock[];
  settings: WidgetTemplateSettings;
};

const mapWidgetTemplateRow = (row: typeof widgetTemplates.$inferSelect) => ({
  ...row,
  blocks: normalizeWidgetTemplateBlocksForRead(row.blocks as LegacyWidgetBlock[]),
  settings: normalizeWidgetTemplateSettings(row.settings),
});

export async function getWidgetTemplate(id: string) {
  const [row] = await db.select().from(widgetTemplates).where(eq(widgetTemplates.id, id));

  if (!row) return null;
  return mapWidgetTemplateRow(row);
}
