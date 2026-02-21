export function resolveCacheRefreshBackground(input: {
  explicitBackground?: boolean;
  hasHydrated: boolean;
}) {
  if (typeof input.explicitBackground === "boolean") {
    return input.explicitBackground;
  }
  return input.hasHydrated;
}

