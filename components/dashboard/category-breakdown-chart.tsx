"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface CategoryBreakdownChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            percent ? `${name} ${(percent * 100).toFixed(0)}%` : null
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? `$${value.toFixed(2)}` : value
          }
        />{" "}
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
