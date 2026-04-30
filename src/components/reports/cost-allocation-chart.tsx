"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostAllocationByCategory } from "@/types/reports";

const BRAND_A_COLOR = "#DC2626";
const BRAND_B_COLOR = "#16A34A";

const fmt = (v: number | undefined) =>
  v !== undefined
    ? `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : "";

interface CostAllocationChartProps {
  byCategory: CostAllocationByCategory[];
}

function AngledTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={8}
        textAnchor="end"
        fill="#666"
        fontSize={11}
        transform="rotate(-45)"
      >
        {payload?.value}
      </text>
    </g>
  );
}

export function CostAllocationChart({ byCategory }: CostAllocationChartProps) {
  const data = byCategory.map((c) => ({
    name: c.categoryName,
    "Business A": parseFloat(c.arcysCost.toFixed(2)),
    "Business B": parseFloat(c.baleCost.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Cost by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              tick={<AngledTick />}
              interval={0}
              height={60}
            />
            <YAxis
              tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
              width={50}
            />
            <Tooltip formatter={fmt} />
            <Legend />
            <Bar dataKey="Business A" fill={BRAND_A_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Business B" fill={BRAND_B_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
