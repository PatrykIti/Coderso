import { expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { db } from "../../../core/db/client";

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

type ColRow = { table_name: string; column_name: string };

function colNames(rows: ColRow[], table: string): string[] {
  return rows.filter((r) => r.table_name === table).map((r) => r.column_name);
}

testIfDb("migration creates analytics tables with expected columns", async () => {
  const result = await db.execute(sql`
    select table_name, column_name from information_schema.columns
    where table_name in ('analytics_pageviews','analytics_sessions')`);
  const rows = ((result as { rows?: ColRow[] }).rows ??
    (result as unknown as ColRow[])) as ColRow[];

  const sessionCols = colNames(rows, "analytics_sessions");
  expect(sessionCols).toContain("visitor_hash");
  expect(sessionCols).toContain("source_kind");
  expect(sessionCols).toContain("device_class");
  expect(sessionCols).toContain("entry_path");
  expect(sessionCols).toContain("exit_path");
  expect(sessionCols).toContain("pageview_count");
  expect(sessionCols).toContain("started_at");
  expect(sessionCols).toContain("last_seen_at");
  // No raw IP / UA — PII posture per SECURITY_SPEC.
  expect(sessionCols).not.toContain("ip");
  expect(sessionCols).not.toContain("user_agent");

  const pageviewCols = colNames(rows, "analytics_pageviews");
  expect(pageviewCols).toContain("session_id");
  expect(pageviewCols).toContain("path");
  expect(pageviewCols).toContain("referrer_host");
  expect(pageviewCols).toContain("created_at");
  expect(pageviewCols).not.toContain("ip");
  expect(pageviewCols).not.toContain("user_agent");
});

testIfDb("expected indexes exist on the analytics tables", async () => {
  const result = await db.execute(sql`
    select indexname from pg_indexes
    where tablename in ('analytics_pageviews','analytics_sessions')`);
  const rows = ((result as { rows?: { indexname: string }[] }).rows ??
    (result as unknown as { indexname: string }[])) as { indexname: string }[];
  const names = rows.map((r) => r.indexname);
  expect(names).toContain("analytics_sessions_started_at_idx");
  expect(names).toContain("analytics_sessions_visitor_idx");
  expect(names).toContain("analytics_pageviews_created_at_idx");
  expect(names).toContain("analytics_pageviews_path_idx");
  expect(names).toContain("analytics_pageviews_session_idx");
});
