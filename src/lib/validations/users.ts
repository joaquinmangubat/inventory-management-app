import { z } from "zod";

export const createUserSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required").max(255),
    email: z.string().email("Invalid email address"),
    role: z.enum(["owner", "staff"]),
    credential: z.string().min(1, "Credential is required"),
  })
  .superRefine((data, ctx) => {
    if (data.role === "staff") {
      if (!/^\d{4,6}$/.test(data.credential)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PIN must be 4–6 digits",
          path: ["credential"],
        });
      }
    } else {
      if (data.credential.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters",
          path: ["credential"],
        });
      }
    }
  });

export const updateUserSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(255).optional(),
  email: z.string().email("Invalid email address").optional(),
  isActive: z.boolean().optional(),
});

export const resetCredentialSchema = z.object({
  newCredential: z.string().min(1, "Credential is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetCredentialInput = z.infer<typeof resetCredentialSchema>;
