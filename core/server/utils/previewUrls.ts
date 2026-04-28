import type { PreviewTargetType } from "../../services/pages/previewService";
import {
  buildAbsolutePublicUrl,
  resolvePublicBaseUrl,
  type PublicUrlContext,
} from "./baseUrl";

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

export function buildPreviewUrl(input: BuildPreviewPathInput, baseUrl: string | null) {
  return buildAbsolutePublicUrl(baseUrl, buildPreviewPath(input));
}

export function createPublicUrlContextFromHeaders(
  headers?: Record<string, string | undefined>
): PublicUrlContext | undefined {
  if (!headers) return undefined;
  return {
    host: headers.host ?? null,
    forwardedHost: headers["x-forwarded-host"] ?? null,
    forwardedProto: headers["x-forwarded-proto"] ?? null,
  };
}

export async function resolvePreviewUrl(
  input: BuildPreviewPathInput,
  context?: PublicUrlContext
) {
  const previewPath = buildPreviewPath(input);
  const baseUrl = await resolvePublicBaseUrl(context);
  return buildAbsolutePublicUrl(baseUrl, previewPath);
}
