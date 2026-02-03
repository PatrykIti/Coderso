import fs from "node:fs";
import path from "node:path";

import type { WidgetBlock } from "../widgets/types";
import { ensureRuntimeWidgetsRegistered } from "../widgets/runtime";
import { renderPublicPageHtml } from "../site/renderPublicPage";
import { toCssVariables } from "../ui/theme/tokenCss";
import { getPageBySlug, getPage } from "../services/pages/pageService";
import { validatePreviewToken } from "../services/pages/previewService";
import { getResolvedTokens } from "../services/theme/tokenService";
import { normalizePath } from "./router";

export type PublicPageData = {
  title: string;
  slug: string;
  status: string;
  publishedData?: Record<string, unknown> | null;
  currentData?: Record<string, unknown> | null;
};

const resolveManifestCss = (
  manifestPath: string,
  basePath: string,
  entryHints: string[]
) => {
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<
    string,
    { css?: string[]; isEntry?: boolean }
  >;
  const entry =
    entryHints.map((key) => manifest[key]).find(Boolean) ??
    Object.values(manifest).find((item) => item.isEntry && item.css?.length);
  const css = entry?.css?.[0];
  const prefix = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return css ? `${prefix}/${css}` : null;
};

const resolveSiteCss = () =>
  resolveManifestCss(
    path.resolve(process.cwd(), "dist/site/manifest.json"),
    "/site",
    ["main.ts", "main.tsx", "site/main.ts", "site/main.tsx"]
  );

const resolveAdminCss = () =>
  resolveManifestCss(
    path.resolve(process.cwd(), "dist/client/manifest.json"),
    "/admin",
    ["admin/main.tsx", "admin/index.html"]
  );

const isSiteAsset = (pathname: string) =>
  pathname.startsWith("/site/assets/") || pathname === "/site/favicon.ico";

const resolveSiteFile = (pathname: string) => {
  const distDir = path.resolve(process.cwd(), "dist/site");
  const relative = pathname.replace("/site", "") || "/index.html";
  const filePath = path.resolve(distDir, `.${relative}`);
  if (!filePath.startsWith(distDir)) return null;
  return filePath;
};

const serveSiteAsset = async (pathname: string) => {
  const filePath = resolveSiteFile(pathname);
  if (!filePath) return new Response("Forbidden", { status: 403 });
  const file = Bun.file(filePath);
  if (!(await file.exists())) return new Response("Not Found", { status: 404 });
  return new Response(file, { headers: { "Content-Type": file.type } });
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

  const tokens = await getResolvedTokens();
  const inlineCss = toCssVariables(tokens);
  const blocks = toBlocks(
    options?.preview ? page.currentData : page.publishedData
  );
  const cssHref = resolveSiteCss() ?? resolveAdminCss();
  const html = renderPublicPageHtml({
    title: page.title ?? "Page",
    blocks,
    cssHref,
    inlineCss,
    isPreview: options?.preview ?? false,
  });
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function handlePublicRequest(req: Request) {
  const url = new URL(req.url);
  if (isSiteAsset(url.pathname)) {
    return serveSiteAsset(url.pathname);
  }
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
