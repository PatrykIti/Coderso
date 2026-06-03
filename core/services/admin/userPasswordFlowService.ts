import { createResetToken, invalidateResetTokensForUser } from "../auth/passwordResetService";
import {
  assertSetPasswordEmailConfigured,
  sendSetPasswordEmail,
} from "../auth/setPasswordEmailService";
import {
  createUser,
  deleteUser,
  getUser,
  type UserCreateInput,
  type UserSummary,
} from "./usersService";

export type SetPasswordDelivery = {
  delivery: "email";
  status: "sent";
  expiresAt: Date;
};

export type UserInviteWithSetPasswordInput = Omit<UserCreateInput, "password" | "status"> & {
  sendSetPasswordInvite: true;
  status?: "pending";
};

export type UserInviteWithSetPasswordResult = {
  user: UserSummary;
  setPassword: SetPasswordDelivery;
};

export async function inviteUserWithSetPassword(
  input: UserInviteWithSetPasswordInput
): Promise<UserInviteWithSetPasswordResult> {
  await assertSetPasswordEmailConfigured();

  const user = await createUser({
    name: input.name,
    email: input.email,
    roleIds: input.roleIds,
    status: "pending",
  });
  if (!user) throw new Error("user_invalid");

  try {
    const reset = await createResetToken(user.id);
    await sendSetPasswordEmail({
      user,
      token: reset.token,
      expiresAt: reset.expiresAt,
      reason: "invite",
    });

    return {
      user,
      setPassword: {
        delivery: "email",
        status: "sent",
        expiresAt: reset.expiresAt,
      },
    };
  } catch (error) {
    await invalidateResetTokensForUser(user.id).catch(() => undefined);
    await deleteUser(user.id).catch(() => undefined);
    throw error;
  }
}

export async function requestAdminPasswordReset(
  userId: string
): Promise<SetPasswordDelivery | null> {
  const user = await getUser(userId);
  if (!user) return null;

  await assertSetPasswordEmailConfigured();

  const reset = await createResetToken(user.id);
  try {
    await sendSetPasswordEmail({
      user,
      token: reset.token,
      expiresAt: reset.expiresAt,
      reason: "reset",
    });
  } catch (error) {
    await invalidateResetTokensForUser(user.id).catch(() => undefined);
    throw error;
  }

  return {
    delivery: "email",
    status: "sent",
    expiresAt: reset.expiresAt,
  };
}
