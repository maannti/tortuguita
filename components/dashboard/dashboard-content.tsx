"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { MonthlyTrendChart } from "./monthly-trend-chart";
import { UserDistributionChart } from "./user-distribution-chart";
import { MonthFilter } from "@/components/month-filter";
import { useTranslations } from "@/components/providers/language-provider";

interface DashboardContentProps {
  currentTotal: number;
  lastTotal: number;
  percentageChange: number;
  averageMonthly: number;
  categoryCount: number;
  categoryData: { name: string; value: number; color: string }[];
  monthlyData: { month: string; amount: number }[];
  userDistributionData: { name: string; value: number; color: string }[];
  recentBills: {
    id: string;
    label: string;
    amount: number;
    paymentDate: string;
    billType: { name: string; color: string | null; icon: string | null };
    user: { name: string | null };
  }[];
  currentMonthLabel: string;
  availableMonths: string[];
}

export function DashboardContent({
  currentTotal,
  lastTotal,
  percentageChange,
  averageMonthly,
  categoryCount,
  categoryData,
  monthlyData,
  userDistributionData,
  recentBills,
  currentMonthLabel,
  availableMonths,
}: DashboardContentProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <MonthFilter availableMonths={availableMonths} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalThisMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{currentMonthLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.vsLastMonth}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {percentageChange > 0 ? (
                <>
                  <ArrowUpIcon className="h-4 w-4 text-red-500" />
                  <div className="text-2xl font-bold text-red-500">+{percentageChange.toFixed(1)}%</div>
                </>
              ) : percentageChange < 0 ? (
                <>
                  <ArrowDownIcon className="h-4 w-4 text-green-500" />
                  <div className="text-2xl font-bold text-green-500">{percentageChange.toFixed(1)}%</div>
                </>
              ) : (
                <div className="text-2xl font-bold">0%</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">${lastTotal.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.sixMonthAverage}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageMonthly.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.dashboard.monthlyAverage}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.totalCategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{t.dashboard.activeThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.spendingByCategory}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <CategoryBreakdownChart data={categoryData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.dashboard.noExpensesThisMonth}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.monthlyTrend}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.userDistribution}</CardTitle>
          </CardHeader>
          <CardContent>
            {userDistributionData.length > 0 ? (
              <UserDistributionChart data={userDistributionData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.dashboard.noAssignedBills}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.dashboard.recentBills}</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/bills">{t.bills.title}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentBills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t.bills.noBillsYet}</p>
          ) : (
            <div className="space-y-4">
              {recentBills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {bill.billType.icon && <span className="text-2xl">{bill.billType.icon}</span>}
                    {!bill.billType.icon && bill.billType.color && (
                      <div className="h-8 w-8 rounded-full" style={{ backgroundColor: bill.billType.color }} />
                    )}
                    <div>
                      <p className="font-medium">{bill.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {bill.paymentDate} • {bill.billType.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${bill.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{bill.user.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
