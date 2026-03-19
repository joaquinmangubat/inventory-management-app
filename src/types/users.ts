export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "owner" | "staff";
  authType: "password" | "pin";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
