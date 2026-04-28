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

const VALID_STATUS_CODES = new Set([301, 302, 307, 308]);

const normalizePath = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("redirect_invalid");
  if (trimmed.includes("://")) {
    throw new Error("redirect_invalid");
  }
  if (trimmed === "/") return "/";
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return normalized;
};

const normalizeTarget = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("redirect_invalid");
  return trimmed;
};

const normalizeStatusCode = (value: unknown) => {
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && VALID_STATUS_CODES.has(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "number" && Number.isFinite(value) && VALID_STATUS_CODES.has(value)) {
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
  const fromPath = normalizePath(input.fromPath);
  const toPath = normalizeTarget(input.toPath);
  const statusCode = normalizeStatusCode(input.statusCode);
  const enabled = input.enabled ?? true;

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
    const fromPath = normalizePath(input.fromPath);
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
    update.toPath = normalizeTarget(input.toPath);
  }

  if (input.statusCode !== undefined) {
    update.statusCode = normalizeStatusCode(input.statusCode);
  }

  if (input.enabled !== undefined) {
    update.enabled = input.enabled;
  }

  const [row] = await db
    .update(redirects)
    .set(update)
    .where(eq(redirects.id, id))
    .returning();

  return row ?? null;
}

export async function deleteRedirect(id: string) {
  const [row] = await db
    .delete(redirects)
    .where(eq(redirects.id, id))
    .returning();

  return row ?? null;
}
