"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTransaction, useEditTransaction } from "@/hooks/use-transactions";
import {
  editTransactionSchema,
  BUSINESS_ENTITIES,
  type EditTransactionInput,
} from "@/lib/validations/transactions";
import { useState } from "react";

const EDIT_WINDOW_SECONDS = 5 * 60;

export default function EditTransactionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { data, isLoading, error } = useTransaction(id);
  const editTransaction = useEditTransaction(id);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const transaction = data?.transaction;
  const secondsLeft = transaction
    ? Math.max(0, EDIT_WINDOW_SECONDS - Math.floor((Date.now() - new Date(transaction.timestamp).getTime()) / 1000))
    : 0;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditTransactionInput>({
    resolver: zodResolver(editTransactionSchema) as Resolver<EditTransactionInput>,
    defaultValues: {
      businessEntity: undefined,
      quantity: undefined,
      expirationDate: null,
      notes: "",
    },
  });

  // Populate form once transaction loads
  useEffect(() => {
    if (!transaction) return;
    reset({
      businessEntity: transaction.businessEntity,
      quantity: Math.abs(Number(transaction.quantityChange)),
      expirationDate: transaction.expirationDate
        ? transaction.expirationDate.slice(0, 10)
        : null,
      notes: transaction.notes ?? "",
    });
  }, [transaction, reset]);

  const showExpiry =
    transaction?.item.tracksExpiration &&
    transaction?.transactionType === "add";

  const currentBusinessEntity = watch("businessEntity");
  const originalBusiness = transaction?.originalBusinessEntity ?? transaction?.businessEntity;
  const businessChanged = currentBusinessEntity !== originalBusiness;

  async function onValid(data: EditTransactionInput) {
    try {
      await editTransaction.mutateAsync(data);
      toast.success("Transaction updated");
      router.push("/transactions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update transaction");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="text-destructive">Transaction not found or no longer editable.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (secondsLeft <= 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <PageHeader title="Edit Transaction" />
        <div className="mt-6 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          The 5-minute edit window for this transaction has expired.
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <PageHeader
        title="Edit Transaction"
        description={`${transaction.item.itemDescription} — ${transaction.transactionType === "add" ? "Add Stock" : "Consume"}`}
      />

      {/* Countdown banner */}
      <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
        Edit window closes in{" "}
        <span className="font-semibold tabular-nums">
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      {/* Read-only fields */}
      <div className="mt-6 rounded-md border bg-muted/40 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Item</span>
          <span className="font-medium">{transaction.item.itemDescription}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span className="font-medium capitalize">{transaction.transactionType}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onValid)} className="mt-6 space-y-6">
        {/* Business entity */}
        <div className="space-y-2">
          <Label>Business Brand *</Label>
          {businessChanged && originalBusiness && (
            <p className="text-xs text-muted-foreground">
              Originally: <span className="font-medium">{originalBusiness}</span>
            </p>
          )}
          <Controller
            name="businessEntity"
            control={control}
            render={({ field }) => (
              <RadioGroup
                value={field.value ?? ""}
                onValueChange={field.onChange}
                className="flex flex-col gap-2"
              >
                {BUSINESS_ENTITIES.map((brand) => (
                  <Label
                    key={brand}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors",
                      field.value === brand
                        ? brand === "Business A"
                          ? "border-red-600 bg-red-50"
                          : "border-green-600 bg-green-50"
                        : "border-input hover:border-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value={brand} id={`edit-${brand}`} />
                    <span
                      className={cn(
                        "font-medium",
                        field.value === brand
                          ? brand === "Business A"
                            ? "text-red-700"
                            : "text-green-700"
                          : ""
                      )}
                    >
                      {brand}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            )}
          />
          {errors.businessEntity && (
            <p className="text-sm text-destructive">{errors.businessEntity.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label>Quantity *</Label>
          <div className="flex items-center gap-2">
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min={0}
                  step={transaction.item.allowsDecimal ? 0.01 : 1}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                  }
                  className="h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            />
            <span className="text-sm text-muted-foreground">
              {transaction.item.unitOfMeasure}
            </span>
          </div>
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        {/* Expiration date (if applicable) */}
        {showExpiry && (
          <div className="space-y-2">
            <Label>Expiration Date *</Label>
            <Controller
              name="expirationDate"
              control={control}
              render={({ field }) => (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(new Date(field.value), "PPP")
                        : "Select expiration date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => {
                        field.onChange(date ? format(date, "yyyy-MM-dd") : null);
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.expirationDate && (
              <p className="text-sm text-destructive">{errors.expirationDate.message}</p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes (optional)</Label>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="edit-notes"
                value={field.value ?? ""}
                placeholder="Add any relevant notes..."
                rows={3}
              />
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={editTransaction.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={editTransaction.isPending || !isDirty}
          >
            {editTransaction.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
