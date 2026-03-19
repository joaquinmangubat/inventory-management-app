"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DatePreset, DateRange } from "@/types/reports";

const PRESETS: { label: string; value: DatePreset }[] = [
  { label: "This Week", value: "this-week" },
  { label: "This Month", value: "this-month" },
  { label: "Last 30 Days", value: "last-30" },
  { label: "Custom", value: "custom" },
];

function getPresetRange(preset: Exclude<DatePreset, "custom">): DateRange {
  const today = new Date();
  const toDate = today.toISOString().split("T")[0];

  if (preset === "this-week") {
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return { from: monday.toISOString().split("T")[0], to: toDate };
  }

  if (preset === "this-month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: first.toISOString().split("T")[0], to: toDate };
  }

  // last-30
  const past = new Date(today);
  past.setDate(today.getDate() - 30);
  return { from: past.toISOString().split("T")[0], to: toDate };
}

export function getDefaultRange(): DateRange {
  return getPresetRange("last-30");
}

interface DateRangeSelectorProps {
  range: DateRange;
  preset: DatePreset;
  onRangeChange: (range: DateRange, preset: DatePreset) => void;
}

export function DateRangeSelector({ range, preset, onRangeChange }: DateRangeSelectorProps) {
  function handlePreset(p: DatePreset) {
    if (p === "custom") {
      onRangeChange(range, "custom");
    } else {
      onRangeChange(getPresetRange(p), p);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="flex gap-1 flex-wrap">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            variant={preset === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePreset(p.value)}
            className={cn("text-xs", preset === p.value && "font-semibold")}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={range.from}
              className="h-8 text-xs w-36"
              onChange={(e) => onRangeChange({ ...range, from: e.target.value }, "custom")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={range.to}
              className="h-8 text-xs w-36"
              onChange={(e) => onRangeChange({ ...range, to: e.target.value }, "custom")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
