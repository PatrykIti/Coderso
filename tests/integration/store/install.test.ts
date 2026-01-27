import { afterAll, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import * as ed from "@noble/ed25519";
import { zipSync } from "fflate";
import { db } from "../../../core/db/client";
import { plugins, pluginSettings } from "../../../core/db/schema";
import { installPluginFromStore } from "../../../core/plugins/installService";
import { canonicalizeMetadata } from "../../../core/store/verifier";
import type { StoreMetadata } from "../../../core/store/client";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const pluginName = `install-${randomUUID()}`;
const pluginVersion = "1.0.0";

let runtimeDir: string | null = null;
let server: ReturnType<typeof Bun.serve> | null = null;
let metadata: StoreMetadata | null = null;
let signatureBase64 = "";
let zipBytes = new Uint8Array();

async function cleanup() {
  if (runtimeDir) {
    await rm(runtimeDir, { recursive: true, force: true });
    runtimeDir = null;
  }
  await db.delete(pluginSettings).where(eq(pluginSettings.pluginName, pluginName));
  await db.delete(plugins).where(eq(plugins.name, pluginName));
  if (server) {
    server.stop();
    server = null;
  }
}

afterAll(async () => {
  if (!hasDb) return;
  await cleanup();
});

testIfDb("installs plugin from store zip", async () => {
  runtimeDir = await mkdtemp(path.join(tmpdir(), "nextless-runtime-"));

  const { secretKey, publicKey } = await ed.keygenAsync();
  const publicKeyBase64 = Buffer.from(publicKey).toString("base64");

  const manifest = {
    name: pluginName,
    version: pluginVersion,
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    entry: { server: "dist/server.mjs" },
    permissions: ["admin:ui"],
    integrity: { sha256: "manifest" },
  };

  zipBytes = zipSync({
    "plugin.json": new TextEncoder().encode(JSON.stringify(manifest)),
    "dist/server.mjs": new TextEncoder().encode(
      "export default async function register(){ return; }"
    ),
  });

  const checksum = createHash("sha256").update(zipBytes).digest("hex");

  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname.endsWith("/metadata")) {
        return Response.json(metadata);
      }
      if (url.pathname.endsWith("/metadata.sig")) {
        return new Response(signatureBase64);
      }
      if (url.pathname.endsWith("/download")) {
        return new Response(zipBytes, { headers: { "content-type": "application/zip" } });
      }
      return new Response("not found", { status: 404 });
    },
  });

  const baseUrl = `http://127.0.0.1:${server.port}`;

  metadata = {
    name: pluginName,
    version: pluginVersion,
    apiVersion: "1",
    coreVersion: ">=0.1.0",
    checksum: { sha256: checksum },
    files: {
      download: `${baseUrl}/plugins/${pluginName}/versions/${pluginVersion}/download`,
    },
    release: { type: "security", channel: "stable" },
    signature: { keyId: "test" },
  };

  const payload = canonicalizeMetadata(metadata);
  const signature = await ed.signAsync(payload, secretKey);
  signatureBase64 = Buffer.from(signature).toString("base64");

  const previousBase = process.env.STORE_BASE_URL;
  const previousKey = process.env.STORE_PUBLIC_KEY;
  const previousRuntime = process.env.PLUGINS_RUNTIME_DIR;

  process.env.STORE_BASE_URL = baseUrl;
  process.env.STORE_PUBLIC_KEY = publicKeyBase64;
  process.env.PLUGINS_RUNTIME_DIR = runtimeDir;

  try {
    const result = await installPluginFromStore(pluginName, pluginVersion, {
      runtimeDir,
    });

    expect(result.plugin?.name).toBe(pluginName);
    const installedPath = path.join(runtimeDir, pluginName, pluginVersion, "dist", "server.mjs");
    await stat(installedPath);
  } finally {
    if (previousBase === undefined) {
      delete process.env.STORE_BASE_URL;
    } else {
      process.env.STORE_BASE_URL = previousBase;
    }

    if (previousKey === undefined) {
      delete process.env.STORE_PUBLIC_KEY;
    } else {
      process.env.STORE_PUBLIC_KEY = previousKey;
    }

    if (previousRuntime === undefined) {
      delete process.env.PLUGINS_RUNTIME_DIR;
    } else {
      process.env.PLUGINS_RUNTIME_DIR = previousRuntime;
    }
  }
});
