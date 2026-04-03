"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Check, ChevronsUpDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useItems } from "@/hooks/use-items";
import {
  ADJUSTMENT_REASONS,
  type CreateAdjustmentInput,
  type AdjustmentReason,
} from "@/lib/validations/adjustments";
import { BUSINESS_ENTITIES } from "@/lib/validations/transactions";
import type { ItemWithCategory } from "@/types/items";

type Direction = "remove" | "add";

interface FormValues {
  itemId: string;
  businessEntity: string;
  adjustmentReason: string;
  adjustmentNotes: string;
}

interface AdjustmentFormProps {
  initialItemId?: string;
  initialReason?: AdjustmentReason;
  isSubmitting: boolean;
  onSubmit: (data: CreateAdjustmentInput) => void;
}

const LAST_USED_BRAND_KEY = "lastUsedBrand";

export function AdjustmentForm({
  initialItemId,
  initialReason,
  isSubmitting,
  onSubmit,
}: AdjustmentFormProps) {
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  const [direction, setDirection] = useState<Direction>("remove");
  const [absQuantity, setAbsQuantity] = useState<number | undefined>(undefined);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [lastUsedBrand, setLastUsedBrand] = useState<string | null>(null);

  const { data: items = [] } = useItems({ showInactive: false });

  useEffect(() => {
    setLastUsedBrand(localStorage.getItem(LAST_USED_BRAND_KEY));
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      itemId: "",
      businessEntity: undefined,
      adjustmentReason: initialReason ?? "",
      adjustmentNotes: "",
    },
  });

  // Pre-populate item from query param once items load
  useEffect(() => {
    if (initialItemId && items.length > 0) {
      const found = items.find((i) => i.id === initialItemId);
      if (found) {
        setSelectedItem(found);
        setValue("itemId", found.id);
      }
    }
  }, [initialItemId, items, setValue]);

  function handleSelectItem(item: ItemWithCategory) {
    setSelectedItem(item);
    setValue("itemId", item.id);
    setItemOpen(false);
    setAbsQuantity(undefined);
    setQuantityError(null);
  }

  function adjustAbsQuantity(delta: number) {
    const step = selectedItem?.allowsDecimal ? 0.01 : 1;
    const current = absQuantity ?? 0;
    const next = Math.max(step, parseFloat((current + delta * step).toFixed(2)));
    setAbsQuantity(next);
    setQuantityError(null);
  }

  function onValid(data: FormValues) {
    if (!absQuantity || absQuantity <= 0) {
      setQuantityError("Quantity must be greater than 0");
      return;
    }
    if (!selectedItem?.allowsDecimal && !Number.isInteger(absQuantity)) {
      setQuantityError("This item does not allow decimal quantities");
      return;
    }
    setQuantityError(null);

    const quantityChange = direction === "remove" ? -absQuantity : absQuantity;
    localStorage.setItem(LAST_USED_BRAND_KEY, data.businessEntity);

    onSubmit({
      itemId: data.itemId,
      businessEntity: data.businessEntity as "Brand A" | "Brand B",
      quantityChange,
      adjustmentReason: data.adjustmentReason as AdjustmentReason,
      adjustmentNotes: data.adjustmentNotes,
    });
  }

  const currentStock = selectedItem ? Number(selectedItem.quantityInStock) : 0;
  const projectedStock =
    absQuantity !== undefined
      ? currentStock + (direction === "remove" ? -absQuantity : absQuantity)
      : null;

  // Group items by category for the combobox
  const groupedItems = Array.from(
    items.reduce((map, item) => {
      const cat = item.category.name;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
      return map;
    }, new Map<string, ItemWithCategory[]>())
  );

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {/* Item selector */}
      <div className="space-y-2">
        <Label>Item *</Label>
        <Popover open={itemOpen} onOpenChange={setItemOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={itemOpen}
              className="w-full justify-between font-normal"
            >
              {selectedItem ? selectedItem.itemDescription : "Search items..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search items..." />
              <CommandList>
                <CommandEmpty>No items found.</CommandEmpty>
                {groupedItems.map(([category, catItems]) => (
                  <CommandGroup key={category} heading={category}>
                    {catItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.itemDescription} ${item.category.name}`}
                        onSelect={() => handleSelectItem(item)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedItem?.id === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span>{item.itemDescription}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {Number(item.quantityInStock)} {item.unitOfMeasure}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedItem && (
          <p className="text-xs text-muted-foreground">
            Current stock: {Number(selectedItem.quantityInStock)} {selectedItem.unitOfMeasure}
          </p>
        )}
        {errors.itemId && (
          <p className="text-sm text-destructive">{errors.itemId.message}</p>
        )}
      </div>

      {/* Correction direction + quantity */}
      <div className="space-y-2">
        <Label>Correction *</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDirection("remove")}
            className={cn(
              "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors",
              direction === "remove"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-input bg-card text-muted-foreground hover:border-muted-foreground"
            )}
          >
            Remove Stock
          </button>
          <button
            type="button"
            onClick={() => setDirection("add")}
            className={cn(
              "flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors",
              direction === "add"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-input bg-card text-muted-foreground hover:border-muted-foreground"
            )}
          >
            Add Stock
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustAbsQuantity(-1)}
            disabled={!selectedItem}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <input
            type="number"
            min={0}
            step={selectedItem?.allowsDecimal ? 0.01 : 1}
            value={absQuantity ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Math.abs(e.target.valueAsNumber);
              setAbsQuantity(v && isNaN(v) ? undefined : v);
              setQuantityError(null);
            }}
            className="h-10 w-28 rounded-md border border-input bg-card px-3 py-2 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="0"
            disabled={!selectedItem}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustAbsQuantity(1)}
            disabled={!selectedItem}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {selectedItem && (
            <span className="text-sm text-muted-foreground">{selectedItem.unitOfMeasure}</span>
          )}
        </div>

        {selectedItem && projectedStock !== null && (
          <p
            className={cn(
              "text-xs",
              projectedStock < 0 ? "font-medium text-destructive" : "text-muted-foreground"
            )}
          >
            Stock after adjustment: {currentStock} → {projectedStock} {selectedItem.unitOfMeasure}
            {projectedStock < 0 && " (negative — will trigger alert)"}
          </p>
        )}
        {quantityError && <p className="text-sm text-destructive">{quantityError}</p>}
      </div>

      {/* Business brand */}
      <div className="space-y-2">
        <Label>Business Brand *</Label>
        {lastUsedBrand && (
          <p className="text-xs text-muted-foreground">
            Last used: <span className="font-medium">{lastUsedBrand}</span>
          </p>
        )}
        <Controller
          name="businessEntity"
          control={control}
          rules={{ required: "Select a business brand" }}
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
                    "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors",
                    field.value === brand
                      ? brand === "Brand A"
                        ? "border-red-600 bg-red-50"
                        : "border-green-600 bg-green-50"
                      : "border-input bg-card hover:border-muted-foreground"
                  )}
                >
                  <RadioGroupItem value={brand} id={brand} />
                  <span
                    className={cn(
                      "font-medium",
                      field.value === brand
                        ? brand === "Brand A"
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

      {/* Adjustment reason */}
      <div className="space-y-2">
        <Label>Reason *</Label>
        <Controller
          name="adjustmentReason"
          control={control}
          rules={{ required: "Select a reason" }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.adjustmentReason && (
          <p className="text-sm text-destructive">{errors.adjustmentReason.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="adjustmentNotes">Notes *</Label>
        <Controller
          name="adjustmentNotes"
          control={control}
          rules={{
            required: "Notes are required for adjustments",
            maxLength: { value: 500, message: "Notes must be 500 characters or less" },
          }}
          render={({ field }) => (
            <Textarea
              {...field}
              id="adjustmentNotes"
              placeholder="Describe the issue in detail (e.g., 5 cans found mouldy, discarded)..."
              rows={3}
            />
          )}
        />
        {errors.adjustmentNotes && (
          <p className="text-sm text-destructive">{errors.adjustmentNotes.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedItem || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit for Review"}
        </Button>
      </div>
    </form>
  );
}
