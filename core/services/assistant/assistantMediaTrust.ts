const rawMediaValuePattern = /^(?:data:|blob:|file:|https?:\/\/)/i;
const mediaLikeKeyPattern = /(src|image|images|media|asset|video|gallery|url)$/i;

export const assertTrustedAssistantMediaReferences = (
  value: unknown,
  keyPath: string[] = []
): void => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertTrustedAssistantMediaReferences(entry, [...keyPath, String(index)])
    );
    return;
  }

  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      rawMediaValuePattern.test(value) &&
      keyPath.some((segment) => mediaLikeKeyPattern.test(segment))
    ) {
      throw new Error("assistant_media_reference_untrusted");
    }
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    assertTrustedAssistantMediaReferences(nested, [...keyPath, key]);
  }
};
