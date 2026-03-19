import { z } from "zod";

export const emailLookupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  credential: z.string().min(1, "Credential is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePinSchema = z
  .object({
    currentPin: z.string().min(1, "Current PIN is required"),
    newPin: z
      .string()
      .regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
    confirmPin: z.string().min(1, "Please confirm your new PIN"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export type EmailLookupInput = z.infer<typeof emailLookupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePinInput = z.infer<typeof changePinSchema>;
