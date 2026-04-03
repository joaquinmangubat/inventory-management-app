"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import type { ExpiringItem } from "@/types/items";

interface ExpiringSoonSectionProps {
  items: ExpiringItem[];
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ExpiringSoonSection({ items }: ExpiringSoonSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Expiring Soon</span>
              {items.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  {items.length}
                </Badge>
              )}
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
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <p className="text-sm">No items expiring soon</p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((item) => {
                  const isExpired = item.expiryStatus === "expired";
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.itemDescription}
                        </p>
                        <p
                          className={`text-xs ${
                            isExpired
                              ? "text-destructive"
                              : "text-amber-600"
                          }`}
                        >
                          {isExpired ? "Expired" : "Expires"}:{" "}
                          {formatDate(item.earliestExpiry)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
