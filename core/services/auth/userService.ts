import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";

export async function getUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function getUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
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
