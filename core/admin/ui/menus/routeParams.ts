export const resolveMenuId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "menus");
  if (index === -1) return null;
  const next = parts[index + 1] ?? null;
  if (!next) return null;
  return next;
};
