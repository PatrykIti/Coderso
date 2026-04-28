import { mkdir, mkdtemp, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { loadPluginByName } from "./pluginManager";
import { readPluginManifest } from "./loader";
import { getPluginByName, listPlugins, registerPlugin, setPluginEnabled } from "./registry";
import { assertManifestDependencies } from "./runtime/moduleRegistrar";
import { logAudit } from "../services/audit/auditService";
import {
  fetchMetadata,
  fetchMetadataSignature,
  fetchRevocations,
} from "../store/client";
import {
  assertChecksum,
  assertMetadataCompatibility,
  assertMetadataSignature,
} from "../store/verifier";
import { downloadBytes, unzipToDirectory } from "../store/downloader";
import { resolveUpdatePolicy, shouldAutoUpdate, type UpdatePolicy } from "../store/updater";
import { DEFAULT_PLUGINS_DIR } from "./loader";

export type InstallSource = "manual" | "auto-security" | "auto-all";

export type InstallOptions = {
  actorId?: string | null;
  source?: InstallSource;
  runtimeDir?: string;
};

function resolveStorePublicKey() {
  const key = process.env.STORE_PUBLIC_KEY;
  if (!key) {
    throw new Error("store_public_key_missing");
  }
  return key;
}

async function validatePluginFiles(
  pluginDir: string,
  entry: { server: string; client?: string; styles?: string }
) {
  const serverPath = path.join(pluginDir, entry.server);
  await stat(serverPath);

  if (entry.client) {
    await stat(path.join(pluginDir, entry.client));
  }
  if (entry.styles) {
    await stat(path.join(pluginDir, entry.styles));
  }
}

export async function installPluginFromStore(name: string, version: string, options?: InstallOptions) {
  const meta = await fetchMetadata(name, version);
  const signature = await fetchMetadataSignature(name, version);
  const publicKey = resolveStorePublicKey();

  await assertMetadataSignature(meta, signature, publicKey);
  assertMetadataCompatibility(meta);

  const zipBytes = await downloadBytes(meta.files.download);
  assertChecksum(zipBytes, meta.checksum.sha256);

  const tempRoot = await mkdtemp(path.join(tmpdir(), "coderso-plugin-"));
  const tempDir = path.join(tempRoot, meta.name, meta.version);

  await unzipToDirectory(zipBytes, tempDir);

  const manifest = await readPluginManifest(tempDir);
  if (manifest.name !== meta.name || manifest.version !== meta.version) {
    throw new Error("plugin_manifest_mismatch");
  }

  const installed = await listPlugins();
  const installedPluginIds = new Set(
    installed.filter((entry) => entry.enabled).map((entry) => entry.name)
  );
  assertManifestDependencies(manifest, installedPluginIds);

  await validatePluginFiles(tempDir, manifest.entry);

  const runtimeDir = options?.runtimeDir ?? DEFAULT_PLUGINS_DIR;
  const targetDir = path.join(runtimeDir, manifest.name, manifest.version);

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(path.dirname(targetDir), { recursive: true });
  await rename(tempDir, targetDir);

  const integrity: Record<string, string> = {
    sha256: meta.checksum.sha256,
  };
  if (meta.signature?.keyId) {
    integrity.keyId = meta.signature.keyId;
  }

  const record = await registerPlugin({
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    coreVersion: manifest.coreVersion,
    permissions: manifest.permissions,
    entry: manifest.entry,
    integrity,
    signature: signature,
  });

  const existing = await getPluginByName(manifest.name);
  const source = options?.source ?? "manual";
  await logAudit({
    actorId: options?.actorId ?? null,
    action: existing ? "plugins.update" : "plugins.install",
    targetType: "plugin",
    targetId: manifest.name,
    metadata: { version: manifest.version, source },
  });

  await loadPluginByName(manifest.name, { runtimeDir });

  return { plugin: record, manifest, metadata: meta };
}

export async function updatePluginFromStore(
  name: string,
  version: string,
  options?: { policy?: UpdatePolicy; actorId?: string | null; force?: boolean }
) {
  const policy = resolveUpdatePolicy(options?.policy ?? process.env.PLUGIN_UPDATE_MODE);
  const meta = await fetchMetadata(name, version);

  if (!options?.force) {
    const decision = shouldAutoUpdate(policy, meta.release);
    if (!decision.allowed) {
      return { skipped: true, reason: decision.reason ?? "policy_blocked" };
    }
  }

  await installPluginFromStore(name, version, {
    actorId: options?.actorId ?? null,
    source: options?.force ? "manual" : policy,
  });

  return { skipped: false };
}

export async function applyRevocations() {
  const list = await fetchRevocations();
  const revoked = list.revoked ?? [];

  const results: Array<{ name: string; version: string }> = [];

  for (const entry of revoked) {
    const plugin = await getPluginByName(entry.name);
    if (!plugin || plugin.version !== entry.version) continue;
    const updated = await setPluginEnabled(entry.name, false);
    if (updated) {
      results.push({ name: entry.name, version: entry.version });
      await logAudit({
        action: "plugins.disable",
        targetType: "plugin",
        targetId: entry.name,
        metadata: { version: entry.version, reason: entry.reason ?? "revoked" },
      });
    }
  }

  return results;
}
