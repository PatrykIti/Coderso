import { desc, eq } from "drizzle-orm";

import { db } from "../../db/client";
import { ipAllowlist } from "../../db/schema";

export type IpAllowlistEntry = {
  id: string;
  cidr: string;
  label: string | null;
  description: string | null;
  createdAt: Date;
};

type ParsedCidr = {
  ip: number;
  mask: number;
};

const parseIpv4 = (value: string) => {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return (
    ((octets[0] << 24) >>> 0) +
    (octets[1] << 16) +
    (octets[2] << 8) +
    octets[3]
  ) >>> 0;
};

export const parseCidr = (value: string): ParsedCidr | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [rawIpPart, rawMaskPart] = trimmed.split("/");
  const ipPart = rawIpPart?.trim();
  const maskPart = rawMaskPart?.trim();
  if (!ipPart) return null;
  const ip = parseIpv4(ipPart);
  if (ip === null) return null;
  const mask = maskPart === undefined ? 32 : Number(maskPart);
  if (!Number.isInteger(mask) || mask < 0 || mask > 32) return null;
  return { ip, mask };
};

export const normalizeCidr = (value: string) => {
  const parsed = parseCidr(value);
  if (!parsed) return null;
  const ipPart = value.trim().split("/")[0]?.trim();
  if (!ipPart) return null;
  return parsed.mask === 32 ? `${ipPart}/32` : `${ipPart}/${parsed.mask}`;
};

export const matchesCidr = (ip: string, cidr: string) => {
  const ipValue = parseIpv4(ip);
  const parsed = parseCidr(cidr);
  if (ipValue === null || !parsed) return false;
  if (parsed.mask === 0) return true;
  const maskBits = (0xffffffff << (32 - parsed.mask)) >>> 0;
  return (ipValue & maskBits) === (parsed.ip & maskBits);
};

export async function listAllowlist() {
  return db
    .select()
    .from(ipAllowlist)
    .orderBy(desc(ipAllowlist.createdAt)) as Promise<IpAllowlistEntry[]>;
}

export async function addAllowlistEntry(
  cidr: string,
  label?: string,
  description?: string
) {
  const normalized = normalizeCidr(cidr);
  if (!normalized) return null;

  const [row] = await db
    .insert(ipAllowlist)
    .values({
      cidr: normalized,
      label: label?.trim() || null,
      description: description?.trim() || null,
    })
    .returning();

  return row ?? null;
}

export async function removeAllowlistEntry(id: string) {
  const [row] = await db
    .delete(ipAllowlist)
    .where(eq(ipAllowlist.id, id))
    .returning();
  return row ?? null;
}

export async function isIpAllowed(
  ip: string | undefined | null,
  entries?: IpAllowlistEntry[]
) {
  const allowlist = entries ?? (await listAllowlist());
  if (allowlist.length === 0) return true;
  if (!ip) return false;
  return allowlist.some((entry) => matchesCidr(ip, entry.cidr));
}
