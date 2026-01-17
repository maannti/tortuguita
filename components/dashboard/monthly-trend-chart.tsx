"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyTrendChartProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? `$${value.toFixed(2)}` : value
          }
        />
        <Bar dataKey="amount" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
