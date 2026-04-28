export type UserStatus = "active" | "inactive" | "pending";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
  status: UserStatus;
  lastActive: string;
  mfaEnabled?: boolean;
};

export type UserDraft = {
  name: string;
  email: string;
  roleIds: string[];
  status: UserStatus;
};
