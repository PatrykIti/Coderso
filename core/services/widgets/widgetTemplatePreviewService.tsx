import fs from "node:fs";
import path from "node:path";
import { renderToString } from "react-dom/server";

import { ensureRuntimeWidgetsRegistered } from "../../widgets/runtime";
import { WidgetRenderer } from "../../widgets/renderers/widgetRenderer";
import type { WidgetBlock } from "../../widgets/types";
import { getWidgetTemplate } from "./widgetTemplateService";

export type WidgetTemplatePreviewDevice = "desktop" | "tablet" | "mobile";

export type WidgetTemplatePreviewInput = {
  device?: WidgetTemplatePreviewDevice;
  viewport?: { width: number; height: number };
};

export type WidgetTemplatePreviewResult = {
  html: string;
  blocksCount: number;
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

const renderBlocks = (blocks: WidgetBlock[]) => {
  if (!blocks.length) {
    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center text-muted-foreground">
        This template has no blocks yet.
      </div>
    );
  }
  return (
    <main className="flex flex-col gap-0">
      {blocks.map((block) => (
        <WidgetRenderer key={block.id} block={block} />
      ))}
    </main>
  );
};

export async function renderWidgetTemplatePreview(
  templateId: string,
  _input?: WidgetTemplatePreviewInput
): Promise<WidgetTemplatePreviewResult> {
  const template = await getWidgetTemplate(templateId);
  if (!template) throw new Error("widget_template_not_found");

  ensureRuntimeWidgetsRegistered();

  const blocks = Array.isArray(template.blocks)
    ? (template.blocks as WidgetBlock[])
    : [];

  const body = renderToString(
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {renderBlocks(blocks)}
    </div>
  );

  const cssHref = resolveManifestCss();
  const headTags = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${template.name ?? "Template preview"}</title>`,
    cssHref ? `<link rel="stylesheet" href="${cssHref}" />` : null,
  ].filter(Boolean);

  const html = `<!doctype html><html lang="en"><head>${headTags.join(
    ""
  )}</head><body>${body}</body></html>`;

  return { html, blocksCount: blocks.length };
}
