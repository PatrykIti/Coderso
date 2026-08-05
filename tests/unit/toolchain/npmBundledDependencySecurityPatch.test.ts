import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { spawnSync } from "node:child_process";

type PackageTreeContract = {
  files: number;
  packageRoot: string;
  sha256: string;
  version: string;
};

type BraceExpansionModule = {
  EXPANSION_MAX_LENGTH: number;
  expand(input: string, options?: { max?: number; maxLength?: number }): string[];
};

type FastUriModule = {
  parse(input: string): { error?: string };
  resolve(base: string, relative: string): string;
};

type UndiciCookieModule = {
  setCookie(
    headers: Headers,
    cookie: {
      domain?: string;
      name: string;
      unparsed?: string[];
      value: string;
    }
  ): void;
};

type UndiciCacheModule = {
  parseCacheControlHeader(header: string): Record<string, boolean | number | string[]>;
};

const root = path.resolve(import.meta.dir, "../../..");
const npmBundleRoot = path.join(root, "node_modules/npm/node_modules");
const requireFromTest = createRequire(import.meta.url);

// These hashes cover every physical file Bun materializes from the verified registry
// tarballs. npm prunes documentation and declarations from bundled dependencies, so the
// nested hashes intentionally cover that complete published-file subset.
const PACKAGE_TREE_CONTRACTS: readonly PackageTreeContract[] = [
  {
    packageRoot: path.join(root, "node_modules/brace-expansion"),
    version: "5.0.9",
    files: 13,
    sha256: "43546d503c8424839924f7f27b0192d5ec782cfa04aee6e739dde27ea98ac078",
  },
  {
    packageRoot: path.join(npmBundleRoot, "brace-expansion"),
    version: "5.0.9",
    files: 6,
    sha256: "c8910cb73921ed6102708550ea11ee98939a46220cf9b43c6dcbb4517c014078",
  },
  {
    packageRoot: path.join(root, "node_modules/fast-uri"),
    version: "3.1.5",
    files: 34,
    sha256: "e131a9fbbf10f73db6d1a68362666a518ae8812ce48e195191496ca66e4323f2",
  },
  {
    packageRoot: path.join(root, "node_modules/undici"),
    version: "7.29.0",
    files: 210,
    sha256: "b2019d064ab0536559c8e77e026a58e250b7e7c3063ef700a4a26e39d194c34c",
  },
  {
    packageRoot: path.join(root, "node_modules/@actions/http-client/node_modules/undici"),
    version: "6.28.0",
    files: 176,
    sha256: "6272183fbea7a3d29d8d8bda342f18ae9faf5758a90c793bacdebf96ac25f6ac",
  },
  {
    packageRoot: path.join(npmBundleRoot, "undici"),
    version: "6.28.0",
    files: 134,
    sha256: "1c24ab980cc936274ba24e1267d7a5f0f8e3f9c37f3a0b00c7d49a763d209823",
  },
  {
    packageRoot: path.join(npmBundleRoot, "ip-address"),
    version: "10.3.1",
    files: 11,
    sha256: "cb969dd390cdd0ae2f0ef247e241f7cf570346f367903f2dd146fe430a1d85dc",
  },
];

const NPM_PATCH_PATHS = [
  "node_modules/brace-expansion/dist/commonjs/index.js",
  "node_modules/brace-expansion/dist/esm/index.js",
  "node_modules/brace-expansion/package.json",
  "node_modules/ip-address/dist/common.js",
  "node_modules/ip-address/dist/ipv4.js",
  "node_modules/ip-address/dist/ipv6.js",
  "node_modules/ip-address/dist/v4/constants.js",
  "node_modules/ip-address/dist/v6/constants.js",
  "node_modules/ip-address/package.json",
  "node_modules/undici/lib/core/request.js",
  "node_modules/undici/lib/dispatcher/client-h1.js",
  "node_modules/undici/lib/handler/retry-handler.js",
  "node_modules/undici/lib/web/cookies/util.js",
  "node_modules/undici/package.json",
];

function listPackageFiles(packageRoot: string, relativeDirectory = ""): string[] {
  const directory = path.join(packageRoot, relativeDirectory);
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...listPackageFiles(packageRoot, relativePath));
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(`Unsupported package-tree entry: ${relativePath}`);
    }

    files.push(relativePath);
  }

  return files.sort();
}

function digestPackageTree(packageRoot: string): { files: number; sha256: string } {
  const hash = createHash("sha256");
  const relativePaths = listPackageFiles(packageRoot);

  for (const relativePath of relativePaths) {
    const pathBytes = Buffer.from(relativePath);
    const fileBytes = readFileSync(path.join(packageRoot, relativePath));
    const lengths = Buffer.allocUnsafe(16);
    lengths.writeBigUInt64BE(BigInt(pathBytes.length), 0);
    lengths.writeBigUInt64BE(BigInt(fileBytes.length), 8);
    hash.update(lengths);
    hash.update(pathBytes);
    hash.update(fileBytes);
  }

  return { files: relativePaths.length, sha256: hash.digest("hex") };
}

function inventorySecurityPackages(nodeModulesRoot: string): string[] {
  const securityPackages = new Set(["brace-expansion", "fast-uri", "ip-address", "undici"]);
  const inventory: string[] = [];

  function inspectPackage(packageRoot: string): void {
    const manifestPath = path.join(packageRoot, "package.json");
    if (!existsSync(manifestPath)) {
      return;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: string;
      version?: string;
    };
    if (manifest.name && manifest.version && securityPackages.has(manifest.name)) {
      inventory.push(`${path.relative(root, packageRoot)}=${manifest.name}@${manifest.version}`);
    }

    const nestedNodeModules = path.join(packageRoot, "node_modules");
    if (existsSync(nestedNodeModules)) {
      inspectNodeModules(nestedNodeModules);
    }
  }

  function inspectNodeModules(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(directory, entry.name);
      if (entry.name.startsWith("@")) {
        for (const scopedEntry of readdirSync(entryPath, { withFileTypes: true })) {
          if (scopedEntry.isDirectory()) {
            inspectPackage(path.join(entryPath, scopedEntry.name));
          }
        }
        continue;
      }

      inspectPackage(entryPath);
    }
  }

  inspectNodeModules(nodeModulesRoot);
  return inventory.sort();
}

test("the resolved graph and npm bundle materialize the audited upstream package bytes", () => {
  const rootPackage = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    devDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const lockfile = readFileSync(path.join(root, "bun.lock"), "utf8");

  expect(rootPackage.devDependencies?.undici).toBe("7.29.0");
  expect(rootPackage.overrides).not.toHaveProperty("undici");
  expect(rootPackage.overrides).toMatchObject({
    "brace-expansion": "5.0.9",
    "fast-uri": "3.1.5",
    "ip-address": "10.3.1",
  });

  expect(lockfile).toContain(
    '"npm/undici": ["undici@6.28.0", "", {}, "sha512-LIY910g9TI13YS95lrMFrs8Rm/u/irgHeTWoKCoteeJ04CUJ92eEfj0rVn+7VKMPBpUPiUoBKfhNyLI23EE/KA=="]'
  );
  expect(lockfile).toContain(
    '"undici": ["undici@7.29.0", "", {}, "sha512-IDxfleLmmbSskfWSUATiN1nfn2rDuvnMOqb5CWR92iIfojA0Ud+ulOAAEQ57LPr9rWmsreUyf5lwyao+7GNNVw=="]'
  );

  for (const contract of PACKAGE_TREE_CONTRACTS) {
    const manifest = JSON.parse(
      readFileSync(path.join(contract.packageRoot, "package.json"), "utf8")
    ) as { version?: string };
    expect(manifest.version).toBe(contract.version);
    expect(digestPackageTree(contract.packageRoot)).toEqual({
      files: contract.files,
      sha256: contract.sha256,
    });
  }

  expect(inventorySecurityPackages(path.join(root, "node_modules"))).toEqual([
    "node_modules/@actions/http-client/node_modules/undici=undici@6.28.0",
    "node_modules/brace-expansion=brace-expansion@5.0.9",
    "node_modules/fast-uri=fast-uri@3.1.5",
    "node_modules/npm/node_modules/brace-expansion=brace-expansion@5.0.9",
    "node_modules/npm/node_modules/ip-address=ip-address@10.3.1",
    "node_modules/npm/node_modules/undici=undici@6.28.0",
    "node_modules/undici=undici@7.29.0",
  ]);

  const nestedFastUri = path.join(npmBundleRoot, "fast-uri");
  expect(existsSync(nestedFastUri)).toBe(false);
  const requireFromAjv = createRequire(path.join(root, "node_modules/ajv/package.json"));
  expect(requireFromAjv.resolve("fast-uri/package.json")).toBe(
    path.join(root, "node_modules/fast-uri/package.json")
  );

  const npmVersion = spawnSync(
    "node",
    [path.join(root, "node_modules/npm/bin/npm-cli.js"), "--version"],
    {
      encoding: "utf8",
    }
  );
  expect(npmVersion.status).toBe(0);
  expect(npmVersion.stderr).toBe("");
  expect(npmVersion.stdout.trim()).toBe("11.18.0");
});

test("the npm patch is portable and changes only the audited bundled runtime paths", () => {
  const patch = readFileSync(path.join(root, "patches/npm@11.18.0.patch"), "utf8");
  const patchedPaths = [...patch.matchAll(/^diff --git a\/(\S+) b\/\1$/gm)].map(
    (match) => match[1]
  );

  expect(patchedPaths).toEqual(NPM_PATCH_PATHS);
  expect(patch).not.toContain("/home/coder");
  expect(patch).not.toContain("node_modules/.cache");
  expect(patch).not.toContain(".bun-tag");
  expect(patch).not.toMatch(/^new file mode /m);
  expect(patch).not.toMatch(/^deleted file mode /m);
  expect(patch).not.toMatch(/^rename (?:from|to) /m);
});

test("bundled brace expansion enforces the upstream output-length budget", () => {
  const braceExpansion = requireFromTest(
    path.join(npmBundleRoot, "brace-expansion")
  ) as BraceExpansionModule;

  expect(braceExpansion.EXPANSION_MAX_LENGTH).toBe(4_000_000);
  expect(braceExpansion.expand("{aa,bb}{cc,dd}", { max: 100, maxLength: 5 })).toEqual(["aacc"]);

  const minimatch = requireFromTest(path.join(root, "node_modules/minimatch")) as (
    input: string,
    pattern: string
  ) => boolean;
  expect(minimatch("file-a.js", "file-{a,b}.js")).toBe(true);
});

test("Ajv's fast-uri rejects backslash authority confusion", () => {
  const fastUri = requireFromTest(path.join(root, "node_modules/fast-uri")) as FastUriModule;
  const maliciousReference = "\\\\evil.example/path";

  expect(fastUri.parse(maliciousReference).error).toBe(
    "URI authority must not contain a literal backslash."
  );
  expect(() => fastUri.resolve("https://allowed.example/", maliciousReference)).toThrow(
    "URI authority must not contain a literal backslash."
  );
});

test("root and bundled undici runtimes enforce their published security fixes", () => {
  const bundledUndici = requireFromTest(path.join(npmBundleRoot, "undici")) as UndiciCookieModule;

  expect(() =>
    bundledUndici.setCookie(new Headers(), {
      domain: "example.com; SameSite=None",
      name: "session",
      value: "value",
    })
  ).toThrow("Invalid cookie domain");
  expect(() =>
    bundledUndici.setCookie(new Headers(), {
      name: "session",
      unparsed: ["X-Custom=value; HttpOnly"],
      value: "value",
    })
  ).toThrow("Invalid cookie value");

  const rootUndiciCache = requireFromTest(
    path.join(root, "node_modules/undici/lib/util/cache.js")
  ) as UndiciCacheModule;
  expect(
    rootUndiciCache.parseCacheControlHeader('public, max-age=60, private, private="authorization"')
      .private
  ).toBe(true);
  expect(rootUndiciCache.parseCacheControlHeader('public, max-age=60, private=""').private).toBe(
    true
  );
});
