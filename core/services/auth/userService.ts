import { eq, or } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";
import { buildEmailFields, hashEmail, isLikelyEmail, normalizeEmail } from "../security/piiEmail";

export async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function getUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const emailHash = hashEmail(normalized);
  const [row] = await db
    .select()
    .from(users)
    .where(or(eq(users.emailHash, emailHash), eq(users.email, normalized)));

  if (row && (!row.emailHash || !row.emailEncrypted) && isLikelyEmail(row.email)) {
    const fields = buildEmailFields(row.email);
    const [updated] = await db
      .update(users)
      .set({
        email: fields.email,
        emailHash: fields.emailHash,
        emailEncrypted: fields.emailEncrypted,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.id))
      .returning();
    return updated ?? row;
  }

  return row ?? null;
}

export async function updateLastLogin(userId: string) {
  const [row] = await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return row ?? null;
}

export async function updatePassword(userId: string, passwordHash: string) {
  const [row] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return row ?? null;
}
