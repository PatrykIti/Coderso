import * as semver from "semver";

export type CompatibilityInput = {
  apiVersion: string;
  coreVersion: string;
};

export const API_VERSION = "1";
export const CORE_VERSION = process.env.CORE_VERSION ?? "1.9.0";

export function isCompatible(input: CompatibilityInput) {
  if (input.apiVersion !== API_VERSION) return false;
  const range = semver.validRange(input.coreVersion);
  if (!range) return false;
  return semver.satisfies(CORE_VERSION, range);
}

export function assertCompatible(input: CompatibilityInput) {
  if (input.apiVersion !== API_VERSION) {
    throw new Error("plugin_api_version_incompatible");
  }

  const range = semver.validRange(input.coreVersion);
  if (!range) {
    throw new Error("plugin_core_version_invalid");
  }

  if (!semver.satisfies(CORE_VERSION, range)) {
    throw new Error("plugin_core_version_incompatible");
  }
}
