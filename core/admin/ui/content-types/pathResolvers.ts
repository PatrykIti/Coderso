const decodePathSegment = (value: string | undefined) => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const resolveContentTypeIdFromPath = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const legacyIndex = parts.findIndex((segment) => segment === "content-types");
  if (legacyIndex !== -1) return decodePathSegment(parts[legacyIndex + 1]);

  const advancedIndex = parts.findIndex(
    (segment) => segment === "advanced" || segment === "coderso"
  );
  if (advancedIndex === -1) return null;
  if (parts[advancedIndex + 1] !== "engine") return null;
  return decodePathSegment(parts[advancedIndex + 2]);
};
