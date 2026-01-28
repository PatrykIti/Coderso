import { createHash, randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../../db/client";
import { previewTokens } from "../../db/schema";

export type PreviewTargetType = "page" | "content";

export type CreatePreviewInput = {
  targetType: PreviewTargetType;
  targetId: string;
  ttlMinutes?: number;
};

export function hashPreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPreviewToken(input: CreatePreviewInput) {
  const token = randomUUID();
  const ttlMinutes = input.ttlMinutes ?? 60;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const tokenHash = hashPreviewToken(token);

  await db.insert(previewTokens).values({
    targetType: input.targetType,
    targetId: input.targetId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function validatePreviewToken(
  token: string,
  targetType?: PreviewTargetType
) {
  const tokenHash = hashPreviewToken(token);
  const [row] = await db
    .select()
    .from(previewTokens)
    .where(eq(previewTokens.tokenHash, tokenHash));

  if (!row) return null;
  if (row.expiresAt <= new Date()) return null;
  if (targetType && row.targetType !== targetType) return null;

  return row;
}

export async function purgeExpiredPreviewTokens(reference = new Date()) {
  await db
    .delete(previewTokens)
    .where(lt(previewTokens.expiresAt, reference));
}
