"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { ConfirmationModal } from "@/components/transactions/confirmation-modal";
import { SuccessScreen } from "@/components/transactions/success-screen";
import { useCreateTransaction } from "@/hooks/use-transactions";
import type { CreateTransactionInput } from "@/lib/validations/transactions";
import type { ItemWithCategory } from "@/types/items";
import type { TransactionWithDetails } from "@/types/transactions";

type PageState = "form" | "confirming" | "success";

export default function NewTransactionPage() {
  const router = useRouter();
  const createTransaction = useCreateTransaction();

  const [state, setState] = useState<PageState>("form");
  const [pendingData, setPendingData] = useState<CreateTransactionInput | null>(null);
  const [pendingItem, setPendingItem] = useState<ItemWithCategory | null>(null);
  const [submittedTransaction, setSubmittedTransaction] = useState<TransactionWithDetails | null>(null);

  function handlePreview(data: CreateTransactionInput, item: ItemWithCategory) {
    setPendingData(data);
    setPendingItem(item);
    setState("confirming");
  }

  async function handleConfirm() {
    if (!pendingData) return;
    try {
      const result = await createTransaction.mutateAsync(pendingData);
      setSubmittedTransaction(result.transaction);
      setState("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log transaction");
      setState("form");
    }
  }

  function handleLogAnother() {
    setPendingData(null);
    setPendingItem(null);
    setSubmittedTransaction(null);
    setState("form");
  }

  if (state === "success" && submittedTransaction) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <SuccessScreen
          transaction={submittedTransaction}
          onLogAnother={handleLogAnother}
          onDashboard={() => router.push("/dashboard")}
          onEdit={(id) => router.push(`/transactions/${id}/edit`)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <PageHeader
        title="Log Stock Transaction"
        description="Record a stock addition or consumption"
      />

      <div className="mt-6">
        <TransactionForm onSubmitPreview={handlePreview} />
      </div>

      <ConfirmationModal
        open={state === "confirming"}
        data={pendingData}
        item={pendingItem}
        isSubmitting={createTransaction.isPending}
        onBack={() => setState("form")}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
