"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/lib/validations/users";
import type { User } from "@/types/users";

// ─── Create form ──────────────────────────────────────────

interface CreateUserFormProps {
  onSubmit: (data: CreateUserInput) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateUserForm({ onSubmit, isSubmitting }: CreateUserFormProps) {
  const router = useRouter();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "staff",
      credential: "",
    },
  });

  const role = form.watch("role");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Maria Santos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="e.g. maria@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("credential", "");
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="credential"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {role === "staff" ? "Initial PIN" : "Initial Password"}
              </FormLabel>
              <FormControl>
                <Input
                  type={role === "staff" ? "text" : "password"}
                  inputMode={role === "staff" ? "numeric" : undefined}
                  maxLength={role === "staff" ? 6 : undefined}
                  placeholder={
                    role === "staff" ? "4–6 digits" : "Min. 8 characters"
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The user will be prompted to change this on first login.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Edit form ────────────────────────────────────────────

interface EditUserFormProps {
  user: User;
  isSelf: boolean;
  onSubmit: (data: UpdateUserInput) => Promise<void>;
  isSubmitting: boolean;
}

export function EditUserForm({
  user,
  isSelf,
  onSubmit,
  isSubmitting,
}: EditUserFormProps) {
  const router = useRouter();

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Role is read-only after creation */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Role</label>
          <Input
            value={user.role === "owner" ? "Owner" : "Staff"}
            disabled
            className="capitalize"
          />
          <p className="text-sm text-muted-foreground">Role cannot be changed after creation.</p>
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <FormDescription>
                  {isSelf
                    ? "You cannot deactivate your own account."
                    : "Inactive users cannot log in."}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSelf}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
