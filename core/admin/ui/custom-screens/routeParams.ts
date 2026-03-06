export const resolveCustomScreenId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "custom-screens");
  if (index === -1) return null;
  return parts[index + 1] ?? null;
};

export const resolveCustomScreenEntryParams = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "custom-screens");
  if (index === -1) {
    return { screenId: null, entryId: null };
  }

  return {
    screenId: parts[index + 1] ?? null,
    entryId:
      parts[index + 2] === "entries"
        ? (parts[index + 3] ?? null)
        : null,
  };
};
