"use client";

import { useForm, type Resolver } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/use-categories";
import {
  updateItemSchema,
  type UpdateItemInput,
} from "@/lib/validations/items";
import type { ItemWithCategory } from "@/types/items";

interface ItemFormProps {
  item?: ItemWithCategory;
  onSubmit: (data: UpdateItemInput) => Promise<void>;
  isSubmitting: boolean;
}

export function ItemForm({ item, onSubmit, isSubmitting }: ItemFormProps) {
  const router = useRouter();
  const isEdit = !!item;
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const form = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema) as Resolver<UpdateItemInput>,
    defaultValues: {
      itemDescription: item?.itemDescription ?? "",
      categoryId: item?.categoryId ?? "",
      unitOfMeasure: item?.unitOfMeasure ?? "",
      allowsDecimal: item?.allowsDecimal ?? false,
      tracksExpiration: item?.tracksExpiration ?? false,
      currentUnitCostPhp: item?.currentUnitCostPhp ?? ("" as unknown as number),
      reorderLevel: item?.reorderLevel ?? 0,
      orderCode: item?.orderCode ?? "",
      primaryBusiness: item?.primaryBusiness ?? undefined,
      primarySupplier: item?.primarySupplier ?? "",
      alternativeSuppliers: item?.alternativeSuppliers ?? "",
      notes: item?.notes ?? "",
      isActive: item?.isActive ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Item Description */}
        <FormField
          control={form.control}
          name="itemDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Description *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Chicken Breast" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={categoriesLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit of Measure */}
        <FormField
          control={form.control}
          name="unitOfMeasure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit of Measure *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit of measure" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="kg">kg — Kilogram</SelectItem>
                  <SelectItem value="g">g — Gram</SelectItem>
                  <SelectItem value="lbs">lbs — Pound</SelectItem>
                  <SelectItem value="oz">oz — Ounce</SelectItem>
                  <SelectItem value="L">L — Liter</SelectItem>
                  <SelectItem value="mL">mL — Milliliter</SelectItem>
                  <SelectItem value="gal">gal — Gallon</SelectItem>
                  <SelectItem value="pcs">pcs — Pieces</SelectItem>
                  <SelectItem value="pack">pack — Pack</SelectItem>
                  <SelectItem value="box">box — Box</SelectItem>
                  <SelectItem value="bag">bag — Bag</SelectItem>
                  <SelectItem value="can">can — Can</SelectItem>
                  <SelectItem value="bottle">bottle — Bottle</SelectItem>
                  <SelectItem value="sachet">sachet — Sachet</SelectItem>
                  <SelectItem value="tray">tray — Tray</SelectItem>
                  <SelectItem value="bundle">bundle — Bundle</SelectItem>
                  <SelectItem value="portion">portion — Portion</SelectItem>
                  <SelectItem value="tbsp">tbsp — Tablespoon</SelectItem>
                  <SelectItem value="tsp">tsp — Teaspoon</SelectItem>
                  <SelectItem value="cup">cup — Cup</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggles row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="allowsDecimal"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel>Allows Decimal Quantities</FormLabel>
                  <FormDescription>
                    e.g. 1.5 kg instead of whole numbers only
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tracksExpiration"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>Tracks Expiration</FormLabel>
                    <FormDescription>
                      Requires expiration date when adding stock. Shows expiry
                      alerts on dashboard.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
                {field.value && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    When logging stock for this item, you&apos;ll be prompted to enter an expiration date for each batch received.
                  </p>
                )}
              </div>
            )}
          />
        </div>

        {/* Cost and Reorder Level */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="currentUnitCostPhp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Cost (PHP) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reorderLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Level</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Alert when stock falls below this level
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Order Code */}
        <FormField
          control={form.control}
          name="orderCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Order Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. CHIX-001"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>Optional internal reference code</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Primary Business */}
        <FormField
          control={form.control}
          name="primaryBusiness"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Business</FormLabel>
              <Select
                onValueChange={(val) =>
                  field.onChange(val === "none" ? null : val)
                }
                defaultValue={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None (Shared)</SelectItem>
                  <SelectItem value="arcys">Arcy&apos;s Kitchen</SelectItem>
                  <SelectItem value="bale">Bale Kapampangan</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Which brand primarily uses this item
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Suppliers */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="primarySupplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Supplier</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Supplier name"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alternativeSuppliers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternative Suppliers</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List other suppliers..."
                    className="resize-none"
                    rows={2}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Is Active — edit only */}
        {isEdit && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive items are hidden from transaction entry
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/items")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
