import { logAccess, type AccessLogInput } from "../../services/access/accessLogService";

export async function recordAccessLog(entry: AccessLogInput) {
  try {
    await logAccess(entry);
  } catch (error) {
    console.warn("Access log failed:", error);
  }
}
