"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConsumptionReport } from "@/types/reports";

const ARCYS_COLOR = "#DC2626";
const BALE_COLOR = "#16A34A";

const PIE_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#6366F1",
  "#EF4444",
  "#14B8A6",
  "#F97316",
  "#84CC16",
];

const fmt = (v: number | undefined) =>
  v !== undefined
    ? `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : "";

interface ConsumptionChartProps {
  report: ConsumptionReport;
}

export function ConsumptionChart({ report }: ConsumptionChartProps) {
  const businessData = report.byBusiness.map((b) => ({
    name: b.businessEntity === "Arcy's Kitchen" ? "Arcy's" : "Bale",
    cost: parseFloat(b.totalCost.toFixed(2)),
    fill: b.businessEntity === "Arcy's Kitchen" ? ARCYS_COLOR : BALE_COLOR,
  }));

  const categoryData = report.byCategory.slice(0, 10).map((c) => ({
    name: c.categoryName,
    value: parseFloat(c.totalCost.toFixed(2)),
  }));

  const lineData = report.byDate.map((d) => ({
    date: d.date.slice(5), // MM-DD
    "Arcy's": parseFloat(d.arcysCost.toFixed(2)),
    Bale: parseFloat(d.baleCost.toFixed(2)),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Bar chart: cost by brand */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cost by Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={businessData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip formatter={fmt} />
              <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                {businessData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie chart: cost by category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cost by Category</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="45%"
                outerRadius={75}
                dataKey="value"
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={fmt} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) =>
                  value.length > 16 ? `${value.slice(0, 16)}…` : value
                }
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Line chart: cost trend over time */}
      {lineData.length > 1 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={50}
                />
                <Tooltip formatter={fmt} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Arcy's"
                  stroke={ARCYS_COLOR}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Bale"
                  stroke={BALE_COLOR}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
