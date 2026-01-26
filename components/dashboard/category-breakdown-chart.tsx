"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

interface CategoryBreakdownChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const option = {
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        return `${params.name}: $${params.value.toFixed(2)} (${params.percent}%)`;
      },
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      borderColor: isDark ? "#374151" : "#e5e7eb",
      textStyle: {
        color: isDark ? "#f3f4f6" : "#1f2937",
      },
    },
    legend: {
      bottom: "0%",
      left: "center",
      textStyle: {
        color: isDark ? "#9ca3af" : "#6b7280",
      },
      itemGap: 12,
    },
    series: [
      {
        name: "Category",
        type: "pie",
        radius: ["35%", "60%"],
        center: ["50%", "38%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: isDark ? "#1f2937" : "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "bold",
            formatter: (params: any) => `$${params.value.toFixed(0)}`,
            color: isDark ? "#f3f4f6" : "#1f2937",
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((item) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
          },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} />;
}
