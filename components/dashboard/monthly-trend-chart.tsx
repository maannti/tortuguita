"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

interface MonthlyTrendChartProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>$${item.value.toFixed(2)}`;
      },
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      borderColor: isDark ? "#374151" : "#e5e7eb",
      textStyle: {
        color: isDark ? "#f3f4f6" : "#1f2937",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: data.map((item) => item.month),
      axisLine: {
        lineStyle: {
          color: isDark ? "#374151" : "#e5e7eb",
        },
      },
      axisLabel: {
        color: isDark ? "#9ca3af" : "#6b7280",
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: isDark ? "#374151" : "#e5e7eb",
          type: "dashed",
        },
      },
      axisLabel: {
        color: isDark ? "#9ca3af" : "#6b7280",
        formatter: (value: number) => `$${value}`,
      },
    },
    series: [
      {
        data: data.map((item) => item.amount),
        type: "bar",
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#7a8b6b" },
              { offset: 1, color: "#5a6b4b" },
            ],
          },
          borderRadius: [6, 6, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#8a9b7b" },
                { offset: 1, color: "#6a7b5b" },
              ],
            },
          },
        },
        barWidth: "60%",
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
