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

type ResolveDetailPageRuntimeInput = {
  detailPageId: string;
  entry: DetailPageBindingResolverEntry;
  contentType: DetailPageBindingResolverContentType;
  contentRoutes: ContentRouteSetting[];
  preview: boolean;
  documentSource: "current" | "published";
};

async function resolveDetailPageRuntime(input: ResolveDetailPageRuntimeInput) {
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

  if (!record) return null;
  if (input.documentSource === "published" && record.status !== "published") return null;
  if (record.contentTypeId !== input.contentType.id) return null;

  const sourceDocument =
    input.documentSource === "current"
      ? record.currentDocument
      : (record.publishedDocument ?? record.currentDocument);
  if (!sourceDocument) return null;

  try {
    const document = normalizeDetailPageDocument(sourceDocument);
    if (document.contentTypeId !== input.contentType.id) return null;

    const blocks = await resolveDetailPageBlocks({
      document,
      entry: input.entry,
      contentType: input.contentType,
      preview: input.preview,
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

export async function resolvePublishedDetailPageRuntime(input: {
  detailPageId: string;
  entry: DetailPageBindingResolverEntry;
  contentType: DetailPageBindingResolverContentType;
  contentRoutes: ContentRouteSetting[];
}) {
  return resolveDetailPageRuntime({
    ...input,
    preview: false,
    documentSource: "published",
  });
}

export async function resolvePreviewDetailPageRuntime(input: {
  detailPageId: string;
  entry: DetailPageBindingResolverEntry;
  contentType: DetailPageBindingResolverContentType;
  contentRoutes: ContentRouteSetting[];
  documentSource: "current" | "published";
}) {
  return resolveDetailPageRuntime({
    ...input,
    preview: true,
  });
}
