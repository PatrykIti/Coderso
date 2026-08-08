import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { contentEntries, contentTermAssignments, seoDocuments } from "../../db/schema";
import {
  applyPreparedSeoMutationWithExecutor,
  prepareSeoMutationWithExecutor,
} from "../seo/seoService";
import { ensureEntrySlugAvailableWithExecutor } from "./entryReferenceValidation";
import { getEntry } from "./entryReadService";
import type { EntryData, EntryVisibility } from "./entryTypes";

const resolveDuplicateTitle = (sourceTitle: string, index: number) =>
  index === 0 ? `${sourceTitle} (Copy)` : `${sourceTitle} (Copy ${index + 1})`;

const resolveDuplicateSlug = (sourceSlug: string, index: number) =>
  index === 0 ? `${sourceSlug}-copy` : `${sourceSlug}-copy-${index + 1}`;

const normalizeSeoSlug = (slug: string) => (slug.startsWith("/") ? slug : `/${slug}`);

export async function duplicateEntry(entryId: string, actorId?: string | null) {
  const createdId = await db.transaction(
    async (tx) => {
      await acquireNativeCmsWriterFence(tx);
      const [source] = await tx
        .select({
          id: contentEntries.id,
          typeId: contentEntries.typeId,
          authorId: contentEntries.authorId,
          title: contentEntries.title,
          slug: contentEntries.slug,
          visibility: contentEntries.visibility,
          tags: contentEntries.tags,
          data: contentEntries.data,
        })
        .from(contentEntries)
        .where(eq(contentEntries.id, entryId))
        .for("update");
      if (!source) throw new Error("entry_not_found");

      const [sourceSeo] = await tx
        .select({
          title: seoDocuments.title,
          description: seoDocuments.description,
          canonicalUrl: seoDocuments.canonicalUrl,
          robots: seoDocuments.robots,
        })
        .from(seoDocuments)
        .where(and(eq(seoDocuments.targetType, "entry"), eq(seoDocuments.targetId, source.id)))
        .limit(1)
        .for("share");
      const sourceAssignments = await tx
        .select({ termId: contentTermAssignments.termId })
        .from(contentTermAssignments)
        .where(eq(contentTermAssignments.entryId, source.id))
        .orderBy(contentTermAssignments.termId);

      for (let index = 0; index < 100; index += 1) {
        const title = resolveDuplicateTitle(source.title, index);
        const slug = resolveDuplicateSlug(source.slug, index);
        try {
          await ensureEntrySlugAvailableWithExecutor(tx, source.typeId, slug);
          const [created] = await tx
            .insert(contentEntries)
            .values({
              typeId: source.typeId,
              authorId: actorId ?? source.authorId ?? null,
              title,
              slug,
              status: "draft",
              visibility:
                (source.visibility as EntryVisibility) === "password"
                  ? "private"
                  : source.visibility,
              tags: (source.tags ?? []) as string[],
              data: source.data as EntryData,
              publishedAt: null,
              scheduledAt: null,
            })
            .returning({ id: contentEntries.id });
          if (!created) throw new Error("entry_duplicate_failed");

          if (sourceAssignments.length > 0) {
            await tx.insert(contentTermAssignments).values(
              sourceAssignments.map((assignment) => ({
                entryId: created.id,
                termId: assignment.termId,
              }))
            );
          }
          if (sourceSeo) {
            const seoPlan = await prepareSeoMutationWithExecutor(tx, {
              targetType: "entry",
              targetId: created.id,
              slug: normalizeSeoSlug(slug),
              title: sourceSeo.title ?? title,
              description: sourceSeo.description ?? undefined,
              canonicalUrl: sourceSeo.canonicalUrl ?? undefined,
              robots: sourceSeo.robots ?? undefined,
            });
            await applyPreparedSeoMutationWithExecutor(tx, seoPlan);
          }
          return created.id;
        } catch (error) {
          if (error instanceof Error && error.message === "entry_slug_conflict") continue;
          throw error;
        }
      }
      throw new Error("entry_duplicate_failed");
    },
    { isolationLevel: "read committed" }
  );

  return getEntry(createdId);
}
