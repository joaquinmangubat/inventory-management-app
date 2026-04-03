"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  createTransactionSchema,
  BUSINESS_ENTITIES,
  type CreateTransactionInput,
} from "@/lib/validations/transactions";
import type { ItemWithCategory } from "@/types/items";

interface TransactionFormProps {
  onSubmitPreview: (data: CreateTransactionInput, item: ItemWithCategory) => void;
}

const LAST_USED_BRAND_KEY = "lastUsedBrand";

export function TransactionForm({ onSubmitPreview }: TransactionFormProps) {
  const [itemOpen, setItemOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemWithCategory | null>(null);
  const [lastUsedBrand, setLastUsedBrand] = useState<string | null>(null);

  const { data: items = [] } = useItems({ showInactive: false });

  useEffect(() => {
    setLastUsedBrand(localStorage.getItem(LAST_USED_BRAND_KEY));
  }, []);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema) as Resolver<CreateTransactionInput>,
    defaultValues: {
      itemId: "",
      businessEntity: undefined,
      transactionType: "consume",
      quantity: undefined,
      expirationDate: null,
      notes: "",
    },
  });

  const transactionType = watch("transactionType");
  const quantity = watch("quantity");
  const showExpiry =
    selectedItem?.tracksExpiration && transactionType === "add";

  function handleSelectItem(item: ItemWithCategory) {
    setSelectedItem(item);
    setValue("itemId", item.id);
    // Reset expiry date when item changes
    setValue("expirationDate", null);
    setItemOpen(false);
  }

  function adjustQuantity(delta: number) {
    const current = Number(quantity) || 0;
    const step = selectedItem?.allowsDecimal ? 0.01 : 1;
    const next = Math.max(0, parseFloat((current + delta * step).toFixed(2)));
    if (next > 0) setValue("quantity", next);
  }

  function onValid(data: CreateTransactionInput) {
    if (!selectedItem) return;
    localStorage.setItem(LAST_USED_BRAND_KEY, data.businessEntity);
    onSubmitPreview(data, selectedItem);
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {/* Item search */}
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
                {/* Group by category */}
                {Array.from(
                  items.reduce((map, item) => {
                    const cat = item.category.name;
                    if (!map.has(cat)) map.set(cat, []);
                    map.get(cat)!.push(item);
                    return map;
                  }, new Map<string, ItemWithCategory[]>())
                ).map(([category, catItems]) => (
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
                          {item.quantityInStock} {item.unitOfMeasure}
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

      {/* Quantity stepper */}
      <div className="space-y-2">
        <Label>Quantity *</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustQuantity(-1)}
            disabled={!selectedItem}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                min={0}
                step={selectedItem?.allowsDecimal ? 0.01 : 1}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                className="h-10 w-28 rounded-md border border-input bg-card px-3 py-2 text-center text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="0"
                disabled={!selectedItem}
              />
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => adjustQuantity(1)}
            disabled={!selectedItem}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {selectedItem && (
            <span className="text-sm text-muted-foreground">{selectedItem.unitOfMeasure}</span>
          )}
        </div>
        {errors.quantity && (
          <p className="text-sm text-destructive">{errors.quantity.message}</p>
        )}
      </div>

      {/* Business brand radio */}
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

      {/* Transaction type radio */}
      <div className="space-y-2">
        <Label>Type *</Label>
        <Controller
          name="transactionType"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="add" id="add" />
                <span>Add Stock</span>
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="consume" id="consume" />
                <span>Consume</span>
              </Label>
            </RadioGroup>
          )}
        />
      </div>

      {/* Expiration date — conditional */}
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
          <p className="text-xs text-muted-foreground">Required for this item</p>
          {errors.expirationDate && (
            <p className="text-sm text-destructive">{errors.expirationDate.message}</p>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="notes"
              value={field.value ?? ""}
              placeholder="Add any relevant notes..."
              rows={3}
            />
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedItem}>
          Preview Transaction
        </Button>
      </div>
    </form>
  );
}
