import { eq } from "drizzle-orm";

import { db } from "../../db/client";
import { detailPageDocuments } from "../../db/schema";
import type { ContentRouteSetting } from "../settings/settingsService";
import {
  resolveDetailPageBlocks,
  type DetailPageBindingResolverContentType,
  type DetailPageBindingResolverEntry,
} from "./detailPageBindingResolver";
import { normalizeDetailPageDocument } from "./detailPageSchema";

export async function resolvePublishedDetailPageRuntime(input: {
  detailPageId: string;
  entry: DetailPageBindingResolverEntry;
  contentType: DetailPageBindingResolverContentType;
  contentRoutes: ContentRouteSetting[];
}) {
  const [record] = await db
    .select({
      id: detailPageDocuments.id,
      contentTypeId: detailPageDocuments.contentTypeId,
      status: detailPageDocuments.status,
      currentDocument: detailPageDocuments.currentDocument,
      publishedDocument: detailPageDocuments.publishedDocument,
    })
    .from(detailPageDocuments)
    .where(eq(detailPageDocuments.id, input.detailPageId))
    .limit(1);

  if (!record || record.status !== "published") return null;
  if (record.contentTypeId !== input.contentType.id) return null;

  const sourceDocument = record.publishedDocument ?? record.currentDocument;
  if (!sourceDocument) return null;

  try {
    const document = normalizeDetailPageDocument(sourceDocument);
    if (document.contentTypeId !== input.contentType.id) return null;

    const blocks = await resolveDetailPageBlocks({
      document,
      entry: input.entry,
      contentType: input.contentType,
      preview: false,
      contentRoutes: input.contentRoutes,
    });

    return {
      document,
      blocks,
    };
  } catch {
    return null;
  }
}
