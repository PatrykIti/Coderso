export const resolveContentTypeIdFromPath = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const legacyIndex = parts.findIndex((segment) => segment === "content-types");
  if (legacyIndex !== -1) return parts[legacyIndex + 1] ?? null;

  const codersoIndex = parts.findIndex((segment) => segment === "coderso");
  if (codersoIndex === -1) return null;
  if (parts[codersoIndex + 1] !== "engine") return null;
  return parts[codersoIndex + 2] ?? null;
};
