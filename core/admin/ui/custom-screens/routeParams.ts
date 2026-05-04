import { resolveAdminHref } from "@/utils/adminPaths";

export const resolveCustomScreenId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "custom-screens");
  if (index === -1) return null;
  const value = parts[index + 1] ?? null;
  return value ? decodeURIComponent(value) : null;
};

export const resolveCustomScreenEntryParams = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const index = parts.findIndex((segment) => segment === "custom-screens");
  if (index === -1) {
    return { screenId: null, entryId: null };
  }

  return {
    screenId: parts[index + 1] ? decodeURIComponent(parts[index + 1]) : null,
    entryId:
      parts[index + 2] === "entries"
        ? parts[index + 3]
          ? decodeURIComponent(parts[index + 3])
          : null
        : null,
  };
};

export function buildCustomScreenWorkspacePath(input: {
  screenId: string;
  entryId?: string | "new";
}) {
  const path = `/advanced/custom-screens/${encodeURIComponent(input.screenId)}/entries`;
  return input.entryId ? `${path}/${encodeURIComponent(input.entryId)}` : path;
}

export function buildCustomScreenWorkspaceHref(
  basePath: string,
  input: Parameters<typeof buildCustomScreenWorkspacePath>[0]
) {
  return resolveAdminHref(basePath, buildCustomScreenWorkspacePath(input));
}

const CUSTOM_SCREEN_WORKSPACE_PATTERN =
  /^\/advanced\/custom-screens\/([^/]+)\/entries(?:\/([^/]+))?\/?$/;

export function resolveCustomScreenWorkspacePrefetchTarget(path: string) {
  const pathname = path.split("?")[0] ?? path;
  const match = CUSTOM_SCREEN_WORKSPACE_PATTERN.exec(pathname);
  if (!match) return null;
  return {
    screenId: decodeURIComponent(match[1] ?? ""),
    entryId: match[2] ? decodeURIComponent(match[2]) : undefined,
  };
}
