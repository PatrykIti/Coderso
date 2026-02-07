import type { PreviewTargetType } from "../../services/pages/previewService";
import { resolvePublicBaseUrl } from "./baseUrl";

type BuildPreviewPathInput = {
  targetType: PreviewTargetType;
  token: string;
  path?: string;
  contentType?: string;
  slug?: string;
};

export function buildPreviewPath(input: BuildPreviewPathInput) {
  const params = new URLSearchParams();
  params.set("type", input.targetType);
  params.set("token", input.token);
  if (input.targetType === "page" && input.path) {
    params.set("path", input.path);
  }
  if (input.targetType === "content") {
    if (input.contentType) params.set("contentType", input.contentType);
    if (input.slug) params.set("slug", input.slug);
  }
  return `/preview?${params.toString()}`;
}

export async function resolvePreviewUrl(input: BuildPreviewPathInput) {
  const previewPath = buildPreviewPath(input);
  const baseUrl = await resolvePublicBaseUrl();
  if (!baseUrl) return previewPath;
  return new URL(previewPath, baseUrl).toString();
}
