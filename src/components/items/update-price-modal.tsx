"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useUpdateItemPrice } from "@/hooks/use-items";
import { updatePriceSchema } from "@/lib/validations/items";
import type { ItemWithCategory } from "@/types/items";
import { toast } from "sonner";

interface UpdatePriceModalProps {
  item: ItemWithCategory | null;
  open: boolean;
  onClose: () => void;
}

export function UpdatePriceModal({ item, open, onClose }: UpdatePriceModalProps) {
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState("");
  const updatePrice = useUpdateItemPrice(item?.id ?? "");

  function handleClose() {
    setNewPrice("");
    setError("");
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = updatePriceSchema.safeParse({ currentUnitCostPhp: newPrice });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid price");
      return;
    }

    try {
      await updatePrice.mutateAsync(parsed.data);
      toast.success(`Price updated to ₱${parsed.data.currentUnitCostPhp.toFixed(2)}`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price");
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Price</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">{item.itemDescription}</div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Existing transactions keep their recorded prices. Only new transactions
            will use the updated price.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Current Price</Label>
            <div className="text-sm font-medium">
              ₱{Number(item.currentUnitCostPhp).toFixed(2)} / {item.unitOfMeasure}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-price">New Price (PHP) *</Label>
            <Input
              id="new-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updatePrice.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatePrice.isPending}>
              {updatePrice.isPending ? "Updating..." : "Update Price"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
