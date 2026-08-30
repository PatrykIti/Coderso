import { constants } from "node:fs";
import { lstat, open, realpath, stat, type FileHandle } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { assertLocalOrigin, SmokeError } from "../contracts";

const MAXIMUM_CREDENTIAL_BYTES = 8 * 1024;
const MAXIMUM_COOKIE_BYTES = 16 * 1024;
const MAXIMUM_STORAGE_STATE_BYTES = 1024 * 1024;

export interface AdminAuthStorageStateResult {
  readonly attempted: true;
  readonly authenticated: boolean;
  readonly sessionValue?: string;
  readonly error?: string;
}

function boundedCredential(value: string | undefined): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value) > MAXIMUM_CREDENTIAL_BYTES ||
    value.includes("\0")
  ) {
    return null;
  }
  return value;
}

function setCookie(headers: Headers, cookieName: string): string | null {
  const headerApi = headers as Headers & { getSetCookie?: () => string[] };
  const candidates = headerApi.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""];
  const cookie = candidates.find((value) => value.startsWith(`${cookieName}=`)) ?? null;
  return cookie !== null && Buffer.byteLength(cookie) <= MAXIMUM_COOKIE_BYTES ? cookie : null;
}

function cookieValue(cookie: string, name: string): string | null {
  const match = cookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`, "iu"));
  if (!match?.[1]) return null;
  try {
    const value = decodeURIComponent(match[1]);
    return value.length > 0 &&
      Buffer.byteLength(value) <= MAXIMUM_COOKIE_BYTES &&
      !value.includes("\0")
      ? value
      : null;
  } catch {
    return null;
  }
}

function cookieMaxAge(cookie: string): number | null {
  const match = cookie.match(/;\s*Max-Age=(\d+)/iu);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

async function writePrivateStorageState(
  workspaceInput: string,
  path: string,
  value: string
): Promise<void> {
  if (
    !isAbsolute(workspaceInput) ||
    !isAbsolute(path) ||
    Buffer.byteLength(value) > MAXIMUM_STORAGE_STATE_BYTES
  ) {
    throw new SmokeError("smoke_argument_invalid", "Admin storage-state path or size is invalid");
  }
  const [workspace, parent] = await Promise.all([
    realpath(workspaceInput),
    realpath(dirname(path)),
  ]).catch((error: unknown) => {
    throw new SmokeError("smoke_argument_invalid", "Admin storage-state workspace is invalid", {
      cause: error,
    });
  });
  const workspaceMetadata = await stat(workspace);
  const candidate = resolve(parent, path.slice(dirname(path).length + 1));
  if (
    workspace !== workspaceInput ||
    !workspaceMetadata.isDirectory() ||
    !isWithin(workspace, parent) ||
    !isWithin(workspace, candidate) ||
    candidate !== path
  ) {
    throw new SmokeError("smoke_argument_invalid", "Admin storage-state path escapes workspace");
  }
  let handle: FileHandle | undefined;
  try {
    handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600
    );
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 || (opened.mode & 0o777) !== 0o600) {
      throw new SmokeError("smoke_output_invalid", "Admin storage-state ownership is invalid");
    }
    await handle.writeFile(value, "utf8");
    await handle.sync();
    const written = await handle.stat();
    const metadata = await lstat(path);
    if (
      metadata.isSymbolicLink() ||
      !metadata.isFile() ||
      metadata.nlink !== 1 ||
      (metadata.mode & 0o777) !== 0o600 ||
      metadata.size <= 0 ||
      metadata.size > MAXIMUM_STORAGE_STATE_BYTES ||
      written.dev !== opened.dev ||
      written.ino !== opened.ino ||
      metadata.dev !== written.dev ||
      metadata.ino !== written.ino
    ) {
      throw new SmokeError("smoke_output_invalid", "Admin storage-state ownership is invalid");
    }
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    throw new SmokeError("smoke_process_failed", "Admin storage state could not be written", {
      cause: error,
    });
  } finally {
    await handle?.close();
  }
}

/**
 * Environment-free, dynamic-base storage-state primitive (TASK-105 L04).
 *
 * Writes one exclusive, no-follow, 0600 browser storage-state file for an
 * already-created session value. Accepts only a validated local dynamic admin
 * base (not necessarily `/admin`); never reads ambient credential variables.
 */
export async function writeAdminSessionStorageState(input: {
  readonly adminUrl: string;
  readonly expectedAdminPath: string;
  readonly workspace: string;
  readonly storageStatePath: string;
  readonly sessionValue: string;
}): Promise<void> {
  const url = new URL(input.adminUrl);
  assertLocalOrigin(url.origin);
  if (
    !input.expectedAdminPath.startsWith("/") ||
    input.expectedAdminPath.endsWith("/") ||
    input.expectedAdminPath.includes("//") ||
    input.expectedAdminPath.split("/").some((segment) => segment === "." || segment === "..") ||
    url.pathname !== input.expectedAdminPath ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new SmokeError(
      "smoke_argument_invalid",
      "Admin storage-state URL does not match the expected dynamic base"
    );
  }
  const sessionValue = boundedCredential(input.sessionValue);
  if (sessionValue === null) {
    throw new SmokeError("smoke_argument_invalid", "Admin session value is invalid");
  }
  const storageState = `${JSON.stringify(
    {
      cookies: [
        {
          name: "session",
          value: sessionValue,
          domain: url.hostname,
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "Strict",
        },
      ],
      origins: [],
    },
    null,
    2
  )}\n`;
  await writePrivateStorageState(input.workspace, input.storageStatePath, storageState);
}

export async function createAdminAuthStorageState(input: {
  readonly adminUrl: string;
  readonly workspace: string;
  readonly storageStatePath: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly fetch?: typeof globalThis.fetch;
}): Promise<AdminAuthStorageStateResult> {
  const url = new URL(input.adminUrl);
  assertLocalOrigin(url.origin);
  if (url.pathname !== "/admin" || url.search || url.hash || url.username || url.password) {
    throw new SmokeError("smoke_argument_invalid", "Admin authentication URL is invalid");
  }
  const email = boundedCredential(
    input.environment.CODERSO_PLAYWRIGHT_EMAIL ??
      input.environment.PLAYWRIGHT_ADMIN_EMAIL ??
      input.environment.ADMIN_EMAIL
  );
  const password = boundedCredential(
    input.environment.CODERSO_PLAYWRIGHT_PASSWORD ??
      input.environment.PLAYWRIGHT_ADMIN_PASSWORD ??
      input.environment.ADMIN_PASSWORD
  );
  if (email === null || password === null) {
    return Object.freeze({ attempted: true, authenticated: false, error: "credentials_missing" });
  }
  let response: Response;
  try {
    response = await (input.fetch ?? globalThis.fetch)(`${url.href}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return Object.freeze({
      attempted: true,
      authenticated: false,
      error: "login_network_failed",
    });
  }
  if (!response.ok) {
    await response.body?.cancel();
    return Object.freeze({
      attempted: true,
      authenticated: false,
      error: `login_failed:${response.status}`,
    });
  }
  const sessionCookie = setCookie(response.headers, "session");
  await response.body?.cancel();
  if (sessionCookie === null) {
    return Object.freeze({
      attempted: true,
      authenticated: false,
      error: "session_cookie_missing",
    });
  }
  const sessionValue = cookieValue(sessionCookie, "session");
  if (sessionValue === null) {
    return Object.freeze({
      attempted: true,
      authenticated: false,
      error: "session_cookie_invalid",
    });
  }
  const maxAge = cookieMaxAge(sessionCookie);
  const expires = maxAge === null ? -1 : Math.floor(Date.now() / 1000) + maxAge;
  const storageState = `${JSON.stringify(
    {
      cookies: [
        {
          name: "session",
          value: sessionValue,
          domain: url.hostname,
          path: "/",
          expires,
          httpOnly: true,
          secure: url.protocol === "https:",
          sameSite: "Strict",
        },
      ],
      origins: [],
    },
    null,
    2
  )}\n`;
  await writePrivateStorageState(input.workspace, input.storageStatePath, storageState);
  return Object.freeze({ attempted: true, authenticated: true, sessionValue });
}
