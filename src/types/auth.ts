export type UserRole = "owner" | "staff";
export type AuthType = "password" | "pin";

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  mustChangePassword: boolean;
  authType: AuthType;
  sessionVersion: number;
}
