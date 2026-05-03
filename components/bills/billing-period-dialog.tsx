"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type BillingPeriodFormData } from "@/lib/validations/bill-type";
import { useTranslations } from "@/components/providers/language-provider";

interface BillingPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billTypeId: string;
  billTypeName: string;
  mode: "current" | "next";
  existingPeriod?: {
    currentClosingDate: Date | null;
    currentDueDate: Date | null;
    nextClosingDate: Date | null;
    nextDueDate: Date | null;
  };
  onSave: (data: BillingPeriodFormData) => Promise<void>;
}

export function BillingPeriodDialog({
  open,
  onOpenChange,
  billTypeName,
  mode,
  existingPeriod,
  onSave,
}: BillingPeriodDialogProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return "";
    return format(new Date(date), "yyyy-MM-dd");
  };

  const [currentClosingDate, setCurrentClosingDate] = useState(
    formatDateForInput(existingPeriod?.currentClosingDate)
  );
  const [currentDueDate, setCurrentDueDate] = useState(
    formatDateForInput(existingPeriod?.currentDueDate)
  );
  const [nextClosingDate, setNextClosingDate] = useState(
    formatDateForInput(existingPeriod?.nextClosingDate)
  );
  const [nextDueDate, setNextDueDate] = useState(
    formatDateForInput(existingPeriod?.nextDueDate)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate
      if (mode === "current") {
        if (!currentClosingDate || !currentDueDate) {
          setError("Both closing and due dates are required");
          setIsLoading(false);
          return;
        }
        const closing = new Date(currentClosingDate + "T00:00:00");
        const due = new Date(currentDueDate + "T00:00:00");
        if (due <= closing) {
          setError("Due date must be after closing date");
          setIsLoading(false);
          return;
        }
      } else {
        if (!nextClosingDate || !nextDueDate) {
          setError("Both next closing and due dates are required");
          setIsLoading(false);
          return;
        }
        const closing = new Date(nextClosingDate + "T00:00:00");
        const due = new Date(nextDueDate + "T00:00:00");
        if (due <= closing) {
          setError("Next due date must be after next closing date");
          setIsLoading(false);
          return;
        }
      }

      const data: BillingPeriodFormData = {
        currentClosingDate: currentClosingDate
          ? new Date(currentClosingDate + "T00:00:00")
          : existingPeriod?.currentClosingDate || new Date(),
        currentDueDate: currentDueDate
          ? new Date(currentDueDate + "T00:00:00")
          : existingPeriod?.currentDueDate || new Date(),
        nextClosingDate: nextClosingDate
          ? new Date(nextClosingDate + "T00:00:00")
          : undefined,
        nextDueDate: nextDueDate
          ? new Date(nextDueDate + "T00:00:00")
          : undefined,
      };

      await onSave(data);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save billing period");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.billingPeriod.title}</DialogTitle>
          <DialogDescription>
            {billTypeName}: {mode === "current" ? t.billingPeriod.configureRequired : t.billingPeriod.configureNextRequired}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
              {error}
            </div>
          )}

          {mode === "current" && (
            <>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {t.billingPeriod.currentPeriod}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentClosingDate">{t.billingPeriod.closingDate}</Label>
                <Input
                  id="currentClosingDate"
                  type="date"
                  disabled={isLoading}
                  value={currentClosingDate}
                  onChange={(e) => setCurrentClosingDate(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {t.billingPeriod.closingDateDescription}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentDueDate">{t.billingPeriod.dueDate}</Label>
                <Input
                  id="currentDueDate"
                  type="date"
                  disabled={isLoading}
                  value={currentDueDate}
                  onChange={(e) => setCurrentDueDate(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {t.billingPeriod.dueDateDescription}
                </p>
              </div>
            </>
          )}

          {mode === "next" && (
            <>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300">
                {t.billingPeriod.expenseAfterClosing}
              </div>

              <div className="text-sm font-medium text-muted-foreground mb-2">
                {t.billingPeriod.nextPeriod}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextClosingDate">{t.billingPeriod.nextClosingDate}</Label>
                <Input
                  id="nextClosingDate"
                  type="date"
                  disabled={isLoading}
                  value={nextClosingDate}
                  onChange={(e) => setNextClosingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextDueDate">{t.billingPeriod.nextDueDate}</Label>
                <Input
                  id="nextDueDate"
                  type="date"
                  disabled={isLoading}
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t.billingPeriod.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t.common.saving : t.billingPeriod.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
