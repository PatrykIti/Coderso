import fs from "node:fs";
import path from "node:path";

import { getResolvedTokens } from "../services/theme/tokenService";
import { toCssVariables } from "../ui/theme/tokenCss";
import { resolveDevAssetUrl, resolveSiteDevServerUrl } from "./utils/styleUrl";

const resolveManifestCss = (manifestPath: string, basePath: string, entryHints: string[]) => {
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
  resolveManifestCss(path.resolve(process.cwd(), "dist/site/manifest.json"), "/site", [
    "main.ts",
    "main.tsx",
    "site/main.ts",
    "site/main.tsx",
  ]);

const resolveAdminCss = () =>
  resolveManifestCss(path.resolve(process.cwd(), "dist/client/manifest.json"), "/admin", [
    "admin/main.tsx",
    "admin/index.html",
  ]);

export const isSiteAsset = (pathname: string) =>
  pathname.startsWith("/site/assets/") || pathname === "/site/favicon.ico";

const resolveSiteFile = (pathname: string) => {
  const distDir = path.resolve(process.cwd(), "dist/site");
  const relative = pathname.replace("/site", "") || "/index.html";
  const filePath = path.resolve(distDir, `.${relative}`);
  if (!filePath.startsWith(distDir)) return null;
  return filePath;
};

export const serveSiteAsset = async (pathname: string) => {
  const filePath = resolveSiteFile(pathname);
  if (!filePath) return new Response("Forbidden", { status: 403 });
  const file = Bun.file(filePath);
  if (!(await file.exists())) return new Response("Not Found", { status: 404 });
  return new Response(file, { headers: { "Content-Type": file.type } });
};

export const resolvePublicStyles = async () => {
  const tokens = await getResolvedTokens();
  const inlineCss = toCssVariables(tokens);
  const adminDevBaseUrl =
    process.env.VITE_DEV_SERVER_URL ?? process.env.CODERSO_PUBLIC_VITE_DEV_URL;
  const siteDevBaseUrl = resolveSiteDevServerUrl(
    process.env.VITE_SITE_DEV_SERVER_URL,
    adminDevBaseUrl
  );

  const siteCssHref = resolveSiteCss();
  if (siteCssHref) return { inlineCss, cssHref: siteCssHref, devModuleScripts: [] };

  const siteDevClient = resolveDevAssetUrl(siteDevBaseUrl ?? undefined, "/site/@vite/client");
  const siteDevEntry = resolveDevAssetUrl(siteDevBaseUrl ?? undefined, "/site/main.ts");
  if (siteDevClient && siteDevEntry) {
    return {
      inlineCss,
      cssHref: null,
      devModuleScripts: [siteDevClient, siteDevEntry],
    };
  }

  const adminCssHref = resolveAdminCss();
  if (adminCssHref) return { inlineCss, cssHref: adminCssHref, devModuleScripts: [] };

  const adminDevClient = resolveDevAssetUrl(adminDevBaseUrl ?? undefined, "/admin/@vite/client");
  const adminDevEntry = resolveDevAssetUrl(adminDevBaseUrl ?? undefined, "/admin/main.tsx");
  if (adminDevClient && adminDevEntry) {
    return {
      inlineCss,
      cssHref: null,
      devModuleScripts: [adminDevClient, adminDevEntry],
    };
  }

  return { inlineCss, cssHref: null, devModuleScripts: [] };
};
