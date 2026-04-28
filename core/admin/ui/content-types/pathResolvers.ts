export const resolveContentTypeIdFromPath = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const legacyIndex = parts.findIndex((segment) => segment === "content-types");
  if (legacyIndex !== -1) return parts[legacyIndex + 1] ?? null;

  const advancedIndex = parts.findIndex(
    (segment) => segment === "advanced" || segment === "coderso"
  );
  if (advancedIndex === -1) return null;
  if (parts[advancedIndex + 1] !== "engine") return null;
  return parts[advancedIndex + 2] ?? null;
};
