"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useActivateItem } from "@/hooks/use-items";
import { toast } from "sonner";
import type { ItemWithCategory } from "@/types/items";

interface InactiveItemsSectionProps {
  items: ItemWithCategory[];
  isOwner: boolean;
}

export function InactiveItemsSection({
  items,
  isOwner,
}: InactiveItemsSectionProps) {
  const [open, setOpen] = useState(false);
  const activate = useActivateItem();

  if (items.length === 0) return null;

  async function handleReactivate(item: ItemWithCategory) {
    try {
      await activate.mutateAsync(item.id);
      toast.success(`"${item.itemDescription}" reactivated`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reactivate item"
      );
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Inactive Items</span>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <ul className="divide-y">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.itemDescription}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.category.name}
                    </p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivate(item)}
                      disabled={activate.isPending}
                    >
                      Reactivate
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
