import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "../../db/client";
import { redirects } from "../../db/schema";

export type RedirectRecord = typeof redirects.$inferSelect;

export type RedirectCreateInput = {
  fromPath: string;
  toPath: string;
  statusCode: number;
  enabled?: boolean;
};

export type RedirectUpdateInput = {
  fromPath?: string;
  toPath?: string;
  statusCode?: number;
  enabled?: boolean;
};

export type RedirectStatusCode = 301 | 302 | 307 | 308;

const VALID_STATUS_CODES = new Set<RedirectStatusCode>([301, 302, 307, 308]);
const MAX_REDIRECT_HOPS = 5;

const isRedirectStatusCode = (value: number): value is RedirectStatusCode =>
  VALID_STATUS_CODES.has(value as RedirectStatusCode);

export const normalizeRedirectPath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("redirect_invalid");
  if (trimmed.includes("://") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    throw new Error("redirect_invalid");
  }
  if (trimmed === "/") return "/";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

export const normalizeRedirectTarget = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("redirect_invalid");
  if (trimmed.includes("://") || trimmed.startsWith("//")) {
    throw new Error("redirect_target_external");
  }
  if (!trimmed.startsWith("/")) {
    throw new Error("redirect_invalid");
  }
  return normalizeRedirectPath(trimmed);
};

export const normalizeRedirectStatusCode = (value: unknown) => {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && isRedirectStatusCode(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "number" && Number.isFinite(value) && isRedirectStatusCode(value)) {
    return value;
  }
  throw new Error("redirect_invalid");
};

export async function listRedirects(): Promise<RedirectRecord[]> {
  return db.select().from(redirects).orderBy(desc(redirects.createdAt));
}

export async function getRedirect(id: string) {
  const [row] = await db.select().from(redirects).where(eq(redirects.id, id));
  return row ?? null;
}

export async function createRedirect(input: RedirectCreateInput) {
  const fromPath = normalizeRedirectPath(input.fromPath);
  const toPath = normalizeRedirectTarget(input.toPath);
  const statusCode = normalizeRedirectStatusCode(input.statusCode);
  const enabled = input.enabled ?? true;
  if (fromPath === toPath) {
    throw new Error("redirect_loop");
  }

  const existing = await db
    .select({ id: redirects.id })
    .from(redirects)
    .where(eq(redirects.fromPath, fromPath));
  if (existing.length > 0) {
    throw new Error("redirect_exists");
  }

  const now = new Date();
  const [row] = await db
    .insert(redirects)
    .values({
      fromPath,
      toPath,
      statusCode,
      enabled,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row ?? null;
}

export async function updateRedirect(id: string, input: RedirectUpdateInput) {
  const update: Partial<typeof redirects.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.fromPath !== undefined) {
    const fromPath = normalizeRedirectPath(input.fromPath);
    const existing = await db
      .select({ id: redirects.id })
      .from(redirects)
      .where(and(eq(redirects.fromPath, fromPath), ne(redirects.id, id)));
    if (existing.length > 0) {
      throw new Error("redirect_exists");
    }
    update.fromPath = fromPath;
  }

  if (input.toPath !== undefined) {
    update.toPath = normalizeRedirectTarget(input.toPath);
  }

  if (input.statusCode !== undefined) {
    update.statusCode = normalizeRedirectStatusCode(input.statusCode);
  }

  if (input.enabled !== undefined) {
    update.enabled = input.enabled;
  }

  if (update.fromPath || update.toPath) {
    const current = await getRedirect(id);
    if (!current) return null;
    const nextFromPath = update.fromPath ?? current.fromPath;
    const nextToPath = update.toPath ?? current.toPath;
    if (nextFromPath === nextToPath) {
      throw new Error("redirect_loop");
    }
  }

  const [row] = await db.update(redirects).set(update).where(eq(redirects.id, id)).returning();

  return row ?? null;
}

export async function deleteRedirect(id: string) {
  const [row] = await db.delete(redirects).where(eq(redirects.id, id)).returning();

  return row ?? null;
}

export type PublicRedirectResult = {
  location: string;
  statusCode: RedirectStatusCode;
};

const findEnabledRedirectByFromPath = async (fromPath: string) => {
  const [row] = await db
    .select()
    .from(redirects)
    .where(and(eq(redirects.fromPath, fromPath), eq(redirects.enabled, true)));
  return row ?? null;
};

export async function resolvePublicRedirect(
  pathname: string
): Promise<PublicRedirectResult | null> {
  let current = normalizeRedirectPath(pathname);
  const visited = new Set<string>();
  let firstStatusCode: PublicRedirectResult["statusCode"] | null = null;

  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop += 1) {
    if (visited.has(current)) {
      throw new Error("redirect_loop");
    }
    visited.add(current);

    const row = await findEnabledRedirectByFromPath(current);
    if (!row) {
      if (!firstStatusCode) return null;
      return { location: current, statusCode: firstStatusCode };
    }

    const statusCode = normalizeRedirectStatusCode(
      row.statusCode
    ) as PublicRedirectResult["statusCode"];
    firstStatusCode ??= statusCode;
    const target = normalizeRedirectTarget(row.toPath);
    if (target === current || visited.has(target)) {
      throw new Error("redirect_loop");
    }
    current = target;
  }

  throw new Error("redirect_loop");
}
