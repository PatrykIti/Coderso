import { isCuratedMediaUrl } from "../media/curatedMediaProfiles";

const rawMediaValuePattern = /^(?:data:|blob:|file:|https?:\/\/)/i;
const mediaLikeKeyPattern =
  /(^src$|^(?:(?:cover|hero|background|featured)?image|images|media|asset|video|gallery|cover|thumbnail)(?:id|ids|url|urls)?$)/i;
const curatedMediaTextUrlKeys = new Set([
  "backgroundImageUrl",
  "coverImageUrl",
  "featuredImageUrl",
  "heroImageUrl",
  "imageUrl",
  "thumbnailUrl",
]);

type AssistantMediaTrustOptions = {
  allowCuratedBlockSrc?: boolean;
  allowCuratedTextUrlFields?: boolean;
};

const isAllowedCuratedMediaReference = (
  value: string,
  keyPath: string[],
  options: AssistantMediaTrustOptions
) => {
  if (!isCuratedMediaUrl(value)) return false;
  const key = keyPath.at(-1) ?? "";
  if (options.allowCuratedBlockSrc && key === "src") return true;
  return options.allowCuratedTextUrlFields === true && curatedMediaTextUrlKeys.has(key);
};

export const assertTrustedAssistantMediaReferences = (
  value: unknown,
  keyPath: string[] = [],
  options: AssistantMediaTrustOptions = {}
): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertTrustedAssistantMediaReferences(entry, [...keyPath, String(index)], options)
    );
    return;
  }

  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      rawMediaValuePattern.test(value) &&
      keyPath.some((segment) => mediaLikeKeyPattern.test(segment)) &&
      !isAllowedCuratedMediaReference(value, keyPath, options)
    ) {
      throw new Error("assistant_media_reference_untrusted");
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    assertTrustedAssistantMediaReferences(nested, [...keyPath, key], options);
  }
};
