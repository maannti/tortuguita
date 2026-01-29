"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

interface BalanceComparisonChartProps {
  data: Array<{
    name: string;
    income: number;
    expenses: number;
    balance: number;
    color: string;
  }>;
}

export function BalanceComparisonChart({ data }: BalanceComparisonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      borderColor: isDark ? "#374151" : "#e5e7eb",
      textStyle: {
        color: isDark ? "#f3f4f6" : "#1f2937",
      },
      formatter: (params: any) => {
        const name = params[0]?.axisValue || "";
        let html = `<div style="font-weight: bold; margin-bottom: 4px;">${name}</div>`;
        params.forEach((param: any) => {
          const value = param.value || 0;
          const sign = param.seriesName === "Balance" ? (value >= 0 ? "+" : "") : "";
          html += `<div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${param.color};"></span>
            <span>${param.seriesName}: ${sign}$${Math.abs(value).toFixed(2)}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      bottom: "0%",
      left: "center",
      textStyle: {
        color: isDark ? "#9ca3af" : "#6b7280",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "15%",
      top: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      min: 0,
      axisLabel: {
        color: isDark ? "#9ca3af" : "#6b7280",
        formatter: (value: number) => `$${value.toFixed(0)}`,
      },
      splitLine: {
        lineStyle: {
          color: isDark ? "#374151" : "#e5e7eb",
        },
      },
    },
    yAxis: {
      type: "category",
      data: data.map((item) => item.name),
      axisLabel: {
        color: isDark ? "#9ca3af" : "#6b7280",
      },
      axisLine: {
        lineStyle: {
          color: isDark ? "#374151" : "#e5e7eb",
        },
      },
    },
    series: [
      {
        name: "Income",
        type: "bar",
        label: {
          show: false,
        },
        itemStyle: {
          color: "#10b981",
          borderRadius: [0, 4, 4, 0],
        },
        data: data.map((item) => item.income),
      },
      {
        name: "Expenses",
        type: "bar",
        label: {
          show: false,
        },
        itemStyle: {
          color: "#ef4444",
          borderRadius: [0, 4, 4, 0],
        },
        data: data.map((item) => item.expenses),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "250px", width: "100%" }} />;
}
