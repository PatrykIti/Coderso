import {
  normalizePluginManifest,
  type CodersoPluginManifest,
  type CodersoPluginManifestInput,
} from "../../../packages/sdk/src/pluginManifest";
import { assertCompatible } from "../compat";
import {
  assertManifestDependencies,
  normalizeManifestContributions,
} from "./moduleRegistrar";

export type ValidatePluginManifestOptions = {
  installedPluginIds?: Iterable<string>;
  requireDependencies?: boolean;
};

export function validatePluginManifest(
  input: CodersoPluginManifestInput,
  options: ValidatePluginManifestOptions = {}
): CodersoPluginManifest {
  const manifest = normalizePluginManifest(input);

  if (manifest.id !== manifest.name) {
    throw new Error("plugin_manifest_id_mismatch");
  }

  assertCompatible({
    apiVersion: manifest.targetApiVersion,
    coreVersion: manifest.targetCoreVersion,
  });

  const normalizedContributions = normalizeManifestContributions(manifest);

  if (options.requireDependencies && options.installedPluginIds) {
    assertManifestDependencies(manifest, options.installedPluginIds);
  }

  return {
    ...manifest,
    provides: {
      ...manifest.provides,
      modules: normalizedContributions.modules,
      widgets: normalizedContributions.widgets,
      presets: normalizedContributions.presets,
      templates: normalizedContributions.templates,
      routes: normalizedContributions.routes,
    },
  };
}

export function toLegacyManifestShape(manifest: CodersoPluginManifest) {
  return {
    ...manifest,
    apiVersion: manifest.targetApiVersion,
    coreVersion: manifest.targetCoreVersion,
  };
}
