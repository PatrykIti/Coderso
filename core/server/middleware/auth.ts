import {
  SESSION_COOKIE_NAME,
  getSessionByToken,
} from "../../services/auth/sessionService";
import { getUserById } from "../../services/auth/userService";

export type AuthContext = {
  cookies?: Record<string, string | undefined>;
  headers?: Record<string, string | undefined>;
  user?: { id: string; email: string; name?: string | null };
  sessionId?: string;
};

export async function attachUserFromSession(
  ctx: AuthContext,
  cookieName: string = SESSION_COOKIE_NAME
) {
  const token = ctx.cookies?.[cookieName];
  if (!token) return;

  const session = await getSessionByToken(token);
  if (!session) return;

  const user = await getUserById(session.userId);
  if (!user || user.status !== "active") return;

  ctx.user = { id: user.id, email: user.email, name: user.name };
  ctx.sessionId = session.id;
}

export function requireAuth() {
  return async (ctx: AuthContext) => {
    if (!ctx.user) {
      throw new Error("auth_required");
    }
  };
}
