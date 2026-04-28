import { sql } from "drizzle-orm";

import { db } from "../../core/db/client";

export async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function hasTable(tableName: string) {
  try {
    const result = await db.execute(
      sql`select to_regclass(${`public.${tableName}`}) as name`
    );
    const rows = Array.isArray(result)
      ? result
      : (result as { rows?: Array<{ name?: unknown }> }).rows ?? [];
    const row = rows[0];
    return typeof row?.name === "string" && row.name.length > 0;
  } catch {
    return false;
  }
}

export async function hasWidgetTemplateRevisionsTable() {
  return hasTable("widget_template_revisions");
}
