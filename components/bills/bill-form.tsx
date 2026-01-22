"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { billSchema, type BillFormData } from "@/lib/validations/bill";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { X, Plus } from "lucide-react";
import { useTranslations } from "@/components/providers/language-provider";

interface BillFormProps {
  initialData?: BillFormData & { id: string };
  categories: Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  }>;
  members: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  currentUserId: string;
  mode: "create" | "edit";
}

const INSTALLMENT_OPTIONS = [2, 3, 4, 6, 9, 12, 18, 24];

export function BillForm({ initialData, categories, members, currentUserId, mode }: BillFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInstallments, setHasInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: initialData || {
      label: "",
      amount: 0,
      paymentDate: new Date(),
      dueDate: null,
      billTypeId: "",
      notes: "",
      assignments: mode === "create" ? [{ userId: currentUserId, percentage: 100 }] : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "assignments",
  });

  const assignments = form.watch("assignments");
  const totalPercentage = assignments?.reduce(
    (sum, assignment) => sum + (Number(assignment.percentage) || 0),
    0
  ) || 0;

  async function onSubmit(data: BillFormData) {
    setIsLoading(true);
    setError(null);

    try {
      // If installments enabled, add to notes
      const notesWithInstallments = hasInstallments
        ? `${data.notes ? data.notes + " - " : ""}Cuota 1 de ${installmentsCount}`
        : data.notes;

      const url =
        mode === "create" ? "/api/bills" : `/api/bills/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, notes: notesWithInstallments }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Something went wrong");
        return;
      }

      router.push("/bills");
      router.refresh();
    } catch (error) {
      setError("Failed to save bill");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? t.bills.newBill : t.bills.editBill}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.bills.labelPlaceholder}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.amount}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      value={field.value === 0 || field.value === undefined || field.value === null ? "" : Number(field.value)}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                        field.onChange(value);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.category}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.bills.selectCategory} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            {category.icon && <span>{category.icon}</span>}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.paymentDate}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isLoading}
                      value={
                        field.value instanceof Date
                          ? field.value.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value
                          ? new Date(e.target.value + "T00:00:00")
                          : new Date();
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t.bills.paymentDateDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.dueDate}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isLoading}
                      value={
                        field.value && (field.value instanceof Date || typeof field.value === 'string')
                          ? (field.value instanceof Date
                              ? field.value
                              : new Date(field.value)
                            ).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value
                          ? new Date(e.target.value + "T00:00:00")
                          : null;
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {t.bills.dueDateDescription}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Installments Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium">{t.bills.installments}</h3>
                  <p className="text-xs text-muted-foreground">{t.bills.installmentsDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setHasInstallments(!hasInstallments)}
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    hasInstallments ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      hasInstallments ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {hasInstallments && (
                <div className="pt-2">
                  <FormLabel>{t.bills.installmentsCount}</FormLabel>
                  <Select
                    value={installmentsCount.toString()}
                    onValueChange={(value) => setInstallmentsCount(Number(value))}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTALLMENT_OPTIONS.map((count) => (
                        <SelectItem key={count} value={count.toString()}>
                          {count} cuotas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.bills.notes}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.bills.notesPlaceholder}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-sm font-medium mb-2">
                  {t.bills.assignToMembers}
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t.bills.splitBillDescription}
                </p>

                {fields.map((field, index) => {
                  const assignedUserIds = assignments
                    ?.map((a, i) => (i !== index ? a.userId : null))
                    .filter(Boolean);
                  const availableMembers = members.filter(
                    (m) => !assignedUserIds?.includes(m.id)
                  );

                  return (
                    <div key={field.id} className="flex flex-col md:flex-row gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                      <FormField
                        control={form.control}
                        name={`assignments.${index}.userId`}
                        render={({ field }) => (
                          <FormItem className="w-full md:w-48">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t.bills.selectMember} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.id}>
                                    {member.name || member.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`assignments.${index}.percentage`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={0.01}
                                    value={[Number(field.value) || 0]}
                                    onValueChange={(values) => {
                                      field.onChange(values[0]);
                                    }}
                                    disabled={isLoading}
                                    className="w-full"
                                  />
                                </div>
                                <span className="text-sm font-medium w-14 text-right flex-shrink-0">
                                  {(Number(field.value) || 0).toFixed(1)}%
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  disabled={isLoading}
                                  className="flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}

                {fields.length < members.length && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const remaining = Math.max(0, 100 - totalPercentage);
                      append({ userId: "", percentage: remaining });
                    }}
                    disabled={isLoading}
                    className="mt-2 w-full md:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t.bills.addMember}
                  </Button>
                )}

                {fields.length > 0 && (
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t.bills.total}:</span>
                    <span
                      className={
                        Math.abs(totalPercentage - 100) < 0.01
                          ? "text-green-600 dark:text-green-400 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {totalPercentage.toFixed(2)}%
                    </span>
                  </div>
                )}

                {form.formState.errors.assignments?.message && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.assignments.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                {isLoading
                  ? t.bills.saving
                  : mode === "create"
                    ? t.bills.create
                    : t.bills.update}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/bills")}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
