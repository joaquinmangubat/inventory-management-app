import { db } from "@/lib/db";
import type { SessionUser } from "@/types/auth";

export type SessionValidationResult =
  | { valid: true; session: SessionUser }
  | { valid: false };

export async function validateSessionFromDb(
  decoded: SessionUser
): Promise<SessionValidationResult> {
  const user = await db.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      authType: true,
      isActive: true,
      mustChangePassword: true,
      sessionVersion: true,
    },
  });

  if (!user || !user.isActive) return { valid: false };

  // Tokens issued before sessionVersion existed will have undefined here —
  // treat as a mismatch to force a clean re-login after the migration deploys.
  if (decoded.sessionVersion !== user.sessionVersion) return { valid: false };

  return {
    valid: true,
    session: {
      userId: user.id,
      email: user.email,
      role: user.role as SessionUser["role"],
      fullName: user.fullName,
      authType: user.authType as SessionUser["authType"],
      mustChangePassword: user.mustChangePassword,
      sessionVersion: user.sessionVersion,
    },
  };
}
