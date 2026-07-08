/**
 * Loads _docs/_DEMO/projekty-domow.page.json into the live CMS page and
 * publishes it (sets currentData + publishedData in one tx). Run AFTER the
 * builder:
 *   bun scripts/demo-projekty-domow.tsx
 *   set -a; [ -f .env ] && . ./.env; set +a; bun scripts/load-projekty-domow.tsx [--dry]
 */
import { readFileSync } from "node:fs";
import { db } from "../core/db/client";
import { users } from "../core/db/schema";
import { getPage, publishPage } from "../core/services/pages/pageService";

const PAGE_ID = "c1cda017-d95f-4035-b88b-2aca6694fd33";
const DRY = process.argv.includes("--dry");

const page = await getPage(PAGE_ID);
if (!page) throw new Error(`page ${PAGE_ID} not found`);
console.log("PAGE", { id: page.id, slug: page.slug, title: page.title, status: page.status });

let userId = (page as { author?: { id?: string } }).author?.id ?? null;
if (!userId) {
  const [u] = await db.select({ id: users.id }).from(users).limit(1);
  userId = u?.id ?? null;
}
if (!userId) throw new Error("no user id available to attribute the publish");
console.log("USER", userId);

const jsonPath = `${import.meta.dir}/../_docs/_DEMO/projekty-domow.page.json`;
const doc = JSON.parse(readFileSync(jsonPath, "utf8"));
console.log("DOC sections:", Array.isArray(doc.sections) ? doc.sections.length : "?");

if (DRY) {
  console.log("DRY RUN — not publishing.");
  process.exit(0);
}

const updated = await publishPage(PAGE_ID, userId, doc);
console.log("PUBLISHED", {
  id: updated?.id,
  status: updated?.status,
  publishedAt: updated?.publishedAt,
});
process.exit(0);
