"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

interface ExportButtonProps {
  label?: string;
  filename: string;
  rows: Row[];
  headers: { key: string; label: string }[];
}

function rowsToCSV(headers: { key: string; label: string }[], rows: Row[]): string {
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headerRow = headers.map((h) => escape(h.label)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escape(row[h.key])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

export function ExportButton({
  label = "Export CSV",
  filename,
  rows,
  headers,
}: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    if (!rows.length) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const csv = rowsToCSV(headers, rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting || !rows.length}
      className="gap-1.5"
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
