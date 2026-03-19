"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { useTransactions } from "@/hooks/use-transactions";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { BUSINESS_ENTITIES } from "@/lib/validations/transactions";

function DatePicker({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {value ? format(value, "MMM d, yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => { onChange(d); setOpen(false); }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function TransactionHistoryPage() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [businessEntity, setBusinessEntity] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const debouncedSearch = useDebounce(search, 300);

  const hasFilters =
    debouncedSearch || businessEntity !== "all" || transactionType !== "all" || fromDate || toDate;

  function clearFilters() {
    setSearch("");
    setBusinessEntity("all");
    setTransactionType("all");
    setFromDate(undefined);
    setToDate(undefined);
  }

  const { data, isLoading } = useTransactions({
    search: debouncedSearch || undefined,
    businessEntity: businessEntity !== "all" ? businessEntity : undefined,
    transactionType: transactionType !== "all" ? transactionType : undefined,
    from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
    to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
    limit: 100,
  });

  const transactions = data?.transactions ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader
        title="Transaction History"
        description="All stock movements across both brands"
      />

      {/* Filters */}
      <div className="mt-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by item name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {/* Business entity */}
          <div className="space-y-1">
            <Label className="text-xs">Brand</Label>
            <Select value={businessEntity} onValueChange={setBusinessEntity}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {BUSINESS_ENTITIES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transaction type */}
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="consume">Consume</SelectItem>
                <SelectItem value="adjust_pending">Adjustment · Pending</SelectItem>
                <SelectItem value="adjust_approved">Adjustment · Approved</SelectItem>
                <SelectItem value="adjust_rejected">Adjustment · Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <DatePicker
            label="From"
            value={fromDate}
            onChange={setFromDate}
            placeholder="Start date"
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={setToDate}
            placeholder="End date"
          />
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-muted-foreground h-7 text-xs"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {hasFilters
              ? "No transactions match your filters."
              : "No transactions logged yet."}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
              {transactions.length === 100 ? " (showing latest 100)" : ""}
            </p>
            {transactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                currentUserId={user?.userId ?? ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
