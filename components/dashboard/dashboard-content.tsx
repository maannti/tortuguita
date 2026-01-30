"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon, WalletIcon, EyeOffIcon, ChevronDownIcon, EyeIcon } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { UserDistributionChart } from "./user-distribution-chart";
import { BalanceComparisonChart } from "./balance-comparison-chart";
import { MonthFilter } from "@/components/month-filter";
import { useTranslations } from "@/components/providers/language-provider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type DashboardItemKey = "personalBalance" | "balanceComparison" | "categoryBreakdown" | "userDistribution" | "kpiCards" | "recentBills";

const HIDDEN_ITEMS_KEY = "dashboard-hidden-items";

// Format large numbers compactly (e.g., 2.36M, 558K)
function formatCompact(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toFixed(2);
}

interface DashboardContentProps {
  currentTotal: number;
  lastTotal: number;
  percentageChange: number;
  averageMonthly: number;
  categoryCount: number;
  categoryData: { name: string; value: number; color: string }[];
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
  currentUserBalance: {
    name: string;
    income: number;
    expenses: number;
    balance: number;
  };
  balanceComparisonData: {
    name: string;
    income: number;
    expenses: number;
    balance: number;
    color: string;
  }[];
}

export function DashboardContent({
  currentTotal,
  lastTotal,
  percentageChange,
  averageMonthly,
  categoryCount,
  categoryData,
  userDistributionData,
  recentBills,
  currentMonthLabel,
  availableMonths,
  currentUserBalance,
  balanceComparisonData,
}: DashboardContentProps) {
  const t = useTranslations();
  const [hiddenItems, setHiddenItems] = useState<DashboardItemKey[]>([]);
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(HIDDEN_ITEMS_KEY);
    if (stored) {
      try {
        setHiddenItems(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const toggleHideItem = (key: DashboardItemKey) => {
    setHiddenItems((prev) => {
      const newHidden = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      localStorage.setItem(HIDDEN_ITEMS_KEY, JSON.stringify(newHidden));
      return newHidden;
    });
  };

  const isHidden = (key: DashboardItemKey) => hiddenItems.includes(key);

  const itemLabels: Record<DashboardItemKey, string> = {
    personalBalance: t.dashboard.personalBalance,
    balanceComparison: t.dashboard.balanceComparison,
    categoryBreakdown: t.dashboard.spendingByCategory,
    userDistribution: t.dashboard.userDistribution,
    kpiCards: t.dashboard.kpiCards,
    recentBills: t.dashboard.recentBills,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <MonthFilter availableMonths={availableMonths} />
        </div>
      </div>

      {/* Personal Balance Card - Prominent */}
      {!isHidden("personalBalance") && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative group">
          <button
            onClick={() => toggleHideItem("personalBalance")}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
            title={t.dashboard.hideItem}
          >
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.dashboard.yourBalance}</p>
                  <p className={`text-2xl md:text-3xl font-bold ${currentUserBalance.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {currentUserBalance.balance >= 0 ? "+" : "-"}${Math.abs(currentUserBalance.balance).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex gap-6 md:gap-8">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t.dashboard.yourIncome}</p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      ${currentUserBalance.income.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t.dashboard.yourExpenses}</p>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      ${currentUserBalance.expenses.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Comparison Chart */}
      {!isHidden("balanceComparison") && (
        <Card className="relative group">
          <button
            onClick={() => toggleHideItem("balanceComparison")}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
            title={t.dashboard.hideItem}
          >
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          <CardHeader>
            <CardTitle>{t.dashboard.balanceComparison}</CardTitle>
          </CardHeader>
          <CardContent>
            {balanceComparisonData.length > 0 ? (
              <BalanceComparisonChart data={balanceComparisonData} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.dashboard.noBalanceData}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pie Charts */}
      {(!isHidden("categoryBreakdown") || !isHidden("userDistribution")) && (
        <div className="grid gap-4 md:grid-cols-2">
          {!isHidden("categoryBreakdown") && (
            <Card className="relative group">
              <button
                onClick={() => toggleHideItem("categoryBreakdown")}
                className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
                title={t.dashboard.hideItem}
              >
                <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
              </button>
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
          )}

          {!isHidden("userDistribution") && (
            <Card className="relative group">
              <button
                onClick={() => toggleHideItem("userDistribution")}
                className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
                title={t.dashboard.hideItem}
              >
                <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
              </button>
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
          )}
        </div>
      )}

      {/* KPI Cards */}
      {!isHidden("kpiCards") && (
        <div className="relative group">
          <button
            onClick={() => toggleHideItem("kpiCards")}
            className="absolute -top-1 right-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
            title={t.dashboard.hideItem}
          >
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <Card className="aspect-square md:aspect-auto">
              <CardContent className="h-full flex flex-col justify-center items-center text-center p-4 md:p-6">
                <div className="text-xl md:text-2xl font-bold">${formatCompact(currentTotal)}</div>
                <p className="text-sm md:text-sm font-medium text-muted-foreground mt-2">{t.dashboard.totalThisMonth}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 hidden md:block">{currentMonthLabel}</p>
              </CardContent>
            </Card>

            <Card className="aspect-square md:aspect-auto">
              <CardContent className="h-full flex flex-col justify-center items-center text-center p-4 md:p-6">
                <div className="flex items-center gap-1">
                  {percentageChange > 0 ? (
                    <>
                      <ArrowUpIcon className="h-5 w-5 text-red-500" />
                      <div className="text-xl md:text-2xl font-bold text-red-500">+{percentageChange.toFixed(1)}%</div>
                    </>
                  ) : percentageChange < 0 ? (
                    <>
                      <ArrowDownIcon className="h-5 w-5 text-green-500" />
                      <div className="text-xl md:text-2xl font-bold text-green-500">{percentageChange.toFixed(1)}%</div>
                    </>
                  ) : (
                    <div className="text-xl md:text-2xl font-bold">0%</div>
                  )}
                </div>
                <p className="text-sm md:text-sm font-medium text-muted-foreground mt-2">{t.dashboard.vsLastMonth}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 hidden md:block">${formatCompact(lastTotal)}</p>
              </CardContent>
            </Card>

            <Card className="aspect-square md:aspect-auto">
              <CardContent className="h-full flex flex-col justify-center items-center text-center p-4 md:p-6">
                <div className="text-xl md:text-2xl font-bold">${formatCompact(averageMonthly)}</div>
                <p className="text-sm md:text-sm font-medium text-muted-foreground mt-2">{t.dashboard.sixMonthAverage}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 hidden md:block">{t.dashboard.monthlyAverage}</p>
              </CardContent>
            </Card>

            <Card className="aspect-square md:aspect-auto">
              <CardContent className="h-full flex flex-col justify-center items-center text-center p-4 md:p-6">
                <div className="text-xl md:text-2xl font-bold">{categoryCount}</div>
                <p className="text-sm md:text-sm font-medium text-muted-foreground mt-2">{t.dashboard.totalCategories}</p>
                <p className="text-xs text-muted-foreground/70 mt-1 hidden md:block">{t.dashboard.activeThisMonth}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Bills */}
      {!isHidden("recentBills") && (
        <Card className="relative group">
          <button
            onClick={() => toggleHideItem("recentBills")}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity z-10"
            title={t.dashboard.hideItem}
          >
            <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
          </button>
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
      )}

      {/* Hidden Items Dropdown */}
      {hiddenItems.length > 0 && (
        <Collapsible open={isHiddenOpen} onOpenChange={setIsHiddenOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <EyeOffIcon className="h-4 w-4" />
                {t.dashboard.hiddenItems} ({hiddenItems.length})
              </span>
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${isHiddenOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="flex flex-wrap gap-2">
              {hiddenItems.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleHideItem(key)}
                  className="gap-2"
                >
                  <EyeIcon className="h-3 w-3" />
                  {itemLabels[key]}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
