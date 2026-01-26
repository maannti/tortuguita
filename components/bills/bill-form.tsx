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
    isCreditCard: boolean;
  }>;
  members: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  currentUserId: string;
  mode: "create" | "edit";
}

export function BillForm({ initialData, categories, members, currentUserId, mode }: BillFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cuotas, setCuotas] = useState("0");
  const [customCuotas, setCustomCuotas] = useState("");
  const [amountDisplay, setAmountDisplay] = useState(() => {
    if (initialData?.amount && Number(initialData.amount) > 0) {
      return String(initialData.amount).replace(".", ",");
    }
    return "";
  });

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

  // Auto-distribute percentages equally when adding a new member
  const distributeEqually = () => {
    if (!assignments || assignments.length === 0) return;
    const equalShare = Math.floor(100 / assignments.length);
    const remainder = 100 - (equalShare * assignments.length);

    assignments.forEach((_, index) => {
      // Give the remainder to the first person
      const share = index === 0 ? equalShare + remainder : equalShare;
      form.setValue(`assignments.${index}.percentage`, share);
    });
  };

  // Auto-adjust other members when one is changed
  const adjustOtherPercentages = (changedIndex: number, newValue: number) => {
    if (!assignments || assignments.length <= 1) return;

    const otherIndices = assignments
      .map((_, i) => i)
      .filter(i => i !== changedIndex);

    const remaining = 100 - newValue;

    if (otherIndices.length === 1) {
      // Only one other person - they get the remainder
      form.setValue(`assignments.${otherIndices[0]}.percentage`, Math.max(0, remaining));
    } else {
      // Multiple others - distribute remaining equally
      const currentOtherTotal = otherIndices.reduce(
        (sum, i) => sum + (Number(assignments[i]?.percentage) || 0),
        0
      );

      if (currentOtherTotal > 0) {
        // Distribute proportionally based on current values
        otherIndices.forEach(i => {
          const currentVal = Number(assignments[i]?.percentage) || 0;
          const proportion = currentVal / currentOtherTotal;
          const newVal = Math.round(remaining * proportion);
          form.setValue(`assignments.${i}.percentage`, Math.max(0, newVal));
        });
      } else {
        // All others are 0, distribute equally
        const equalShare = Math.floor(remaining / otherIndices.length);
        otherIndices.forEach((i, idx) => {
          const share = idx === 0 ? remaining - (equalShare * (otherIndices.length - 1)) : equalShare;
          form.setValue(`assignments.${i}.percentage`, Math.max(0, share));
        });
      }
    }
  };

  // Watch selected category to determine if cuotas should be shown
  const selectedCategoryId = form.watch("billTypeId");
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const showCuotas = selectedCategory?.isCreditCard ?? false;

  async function onSubmit(data: BillFormData) {
    setIsLoading(true);
    setError(null);

    try {
      // Determine final cuotas value (from dropdown or custom input)
      let cuotasNum = 0;
      if (showCuotas) {
        if (cuotas === "other") {
          cuotasNum = parseInt(customCuotas) || 0;
        } else {
          cuotasNum = parseInt(cuotas);
        }
      }

      const url =
        mode === "create" ? "/api/bills" : `/api/bills/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          totalInstallments: cuotasNum > 0 ? cuotasNum : undefined,
        }),
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
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      disabled={isLoading}
                      value={amountDisplay}
                      onChange={(e) => {
                        const input = e.target.value;
                        // Allow digits and one comma/dot as decimal separator
                        const cleaned = input.replace(/[^0-9,.]/g, "");
                        // Replace dot with comma for display, but only allow one separator
                        const withComma = cleaned.replace(".", ",");
                        const parts = withComma.split(",");
                        const formatted = parts.length > 2
                          ? parts[0] + "," + parts.slice(1).join("")
                          : withComma;

                        setAmountDisplay(formatted);

                        // Convert to number for form state
                        const numericValue = parseFloat(formatted.replace(",", ".")) || 0;
                        field.onChange(numericValue);
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

            {/* Cuotas - only show for credit card categories */}
            {showCuotas && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Cuotas
                </label>
                <Select value={cuotas} onValueChange={(value) => {
                  setCuotas(value);
                  if (value !== "other") {
                    setCustomCuotas("");
                  }
                }} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cuotas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sin cuotas</SelectItem>
                    <SelectItem value="2">2 cuotas</SelectItem>
                    <SelectItem value="3">3 cuotas</SelectItem>
                    <SelectItem value="6">6 cuotas</SelectItem>
                    <SelectItem value="12">12 cuotas</SelectItem>
                    <SelectItem value="18">18 cuotas</SelectItem>
                    <SelectItem value="24">24 cuotas</SelectItem>
                    <SelectItem value="other">Otro...</SelectItem>
                  </SelectContent>
                </Select>
                {cuotas === "other" && (
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Número de cuotas"
                    value={customCuotas}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setCustomCuotas(value);
                    }}
                    disabled={isLoading}
                    className="mt-2"
                  />
                )}
              </div>
            )}

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
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[Math.round(Number(field.value) || 0)]}
                                    onValueChange={(values) => {
                                      field.onChange(values[0]);
                                      adjustOtherPercentages(index, values[0]);
                                    }}
                                    disabled={isLoading}
                                    className="w-full"
                                  />
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={Math.round(Number(field.value) || 0)}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, "");
                                      const num = Math.min(100, Math.max(0, parseInt(val) || 0));
                                      field.onChange(num);
                                      adjustOtherPercentages(index, num);
                                    }}
                                    disabled={isLoading}
                                    className="w-14 h-8 text-center text-sm px-1"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  disabled={isLoading}
                                  className="flex-shrink-0 h-8 w-8"
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
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        append({ userId: "", percentage: 0 });
                        // Auto-distribute after adding (use setTimeout to wait for state update)
                        setTimeout(() => {
                          const newCount = fields.length + 1;
                          const equalShare = Math.floor(100 / newCount);
                          const remainder = 100 - (equalShare * newCount);
                          for (let i = 0; i < newCount; i++) {
                            const share = i === 0 ? equalShare + remainder : equalShare;
                            form.setValue(`assignments.${i}.percentage`, share);
                          }
                        }, 0);
                      }}
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t.bills.addMember}
                    </Button>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={distributeEqually}
                        disabled={isLoading}
                        className="w-full sm:w-auto text-muted-foreground"
                      >
                        Dividir en partes iguales
                      </Button>
                    )}
                  </div>
                )}

                {fields.length > 0 && (
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t.bills.total}:</span>
                    <span
                      className={
                        totalPercentage === 100
                          ? "text-green-600 dark:text-green-400 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {Math.round(totalPercentage)}%
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

            <div className="flex flex-col gap-3 pt-4">
              <Button type="submit" disabled={isLoading} size="lg" className="w-full">
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
                size="lg"
                className="w-full"
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
