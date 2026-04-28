import { ApiError } from "../errorHandler";
import {
  isIpAllowed,
  listAllowlist,
  type IpAllowlistEntry,
} from "../../services/security/ipAllowlistService";

export async function enforceIpAllowlist(
  ip?: string | null,
  entries?: IpAllowlistEntry[]
) {
  const allowlist = entries ?? (await listAllowlist());
  if (allowlist.length === 0) return;
  const allowed = await isIpAllowed(ip, allowlist);
  if (!allowed) {
    throw new ApiError("ip_not_allowed", "Forbidden", 403);
  }
}
