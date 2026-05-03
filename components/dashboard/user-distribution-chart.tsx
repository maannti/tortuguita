"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

interface UserDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function UserDistributionChart({ data }: UserDistributionChartProps) {
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
    },
    series: [
      {
        name: "User",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "45%"],
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

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
