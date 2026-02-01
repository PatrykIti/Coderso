import fs from "node:fs";
import path from "node:path";

import type { WidgetBlock } from "../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../widgets/runtime";
import { renderPublicPageHtml } from "../site/renderPublicPage";
import { getPageBySlug, getPage } from "../services/pages/pageService";
import { validatePreviewToken } from "../services/pages/previewService";
import { normalizePath } from "./router";

export type PublicPageData = {
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

const resolveManifestCss = () => {
  const manifestPath = path.resolve(process.cwd(), "dist/client/manifest.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<
    string,
    { css?: string[]; isEntry?: boolean }
  >;
  const entry =
    manifest["admin/main.tsx"] ??
    manifest["admin/index.html"] ??
    Object.values(manifest).find((item) => item.isEntry && item.css?.length);
  const css = entry?.css?.[0];
  return css ? `/admin/${css}` : null;
};

const toBlocks = (data?: Record<string, unknown> | null): WidgetBlock[] => {
  if (!data || typeof data !== "object") return [];
  const blocks = (data as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks as WidgetBlock[];
};

export async function renderPublicPage(
  page: PublicPageData,
  options?: { preview?: boolean }
) {
  ensureRuntimeWidgetsRegistered();

  const blocks = toBlocks(
    options?.preview ? page.currentData : page.publishedData
  );
  const html = renderPublicPageHtml({
    title: page.title ?? "Page",
    blocks,
    cssHref: resolveManifestCss(),
    isPreview: options?.preview ?? false,
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function handlePublicRequest(req: Request) {
  const url = new URL(req.url);
  if (url.pathname === "/preview") {
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");
    if (!token || !type) return new Response("Not Found", { status: 404 });

    const preview = await validatePreviewToken(
      token,
      type === "page" ? "page" : "content"
    );
    if (!preview) return new Response("Preview expired", { status: 410 });

    if (preview.targetType === "page") {
      const page = await getPage(preview.targetId);
      if (!page) return new Response("Not Found", { status: 404 });
      return renderPublicPage(page as PublicPageData, { preview: true });
    }
  }

  const slugPath = normalizePath(url.pathname);
  const page = await getPageBySlug(slugPath);
  if (!page) return new Response("Not Found", { status: 404 });
  if (page.status !== "published" || !page.publishedData) {
    return new Response("Not Found", { status: 404 });
  }
  return renderPublicPage(page as PublicPageData);
}
