"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { incomeSchema, type IncomeFormData } from "@/lib/validations/income";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { X, Plus, Check, Home } from "lucide-react";
import { useTranslations } from "@/components/providers/language-provider";

interface UserOrganization {
  id: string;
  name: string;
  isPersonal: boolean;
  role: string;
  memberCount: number;
}

interface IncomeFormProps {
  initialData?: IncomeFormData & { id: string };
  categories: Array<{
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    isRecurring: boolean;
  }>;
  members: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  memberIncomes?: Record<string, number>; // userId -> total income for current month
  currentUserId: string;
  mode: "create" | "edit";
  isPersonalOrg: boolean;
  userOrganizations: UserOrganization[];
  currentOrganizationId: string;
}

export function IncomeForm({ initialData, categories, members, memberIncomes = {}, currentUserId, mode, isPersonalOrg, userOrganizations, currentOrganizationId }: IncomeFormProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountDisplay, setAmountDisplay] = useState(() => {
    if (initialData?.amount && Number(initialData.amount) > 0) {
      return formatAmountDisplay(Number(initialData.amount));
    }
    return "";
  });

  // Multi-home state
  const [multiHomeEnabled, setMultiHomeEnabled] = useState(false);
  const [selectedHomes, setSelectedHomes] = useState<Map<string, number>>(() => {
    // Initialize with current organization at 100%
    const initial = new Map<string, number>();
    initial.set(currentOrganizationId, 100);
    return initial;
  });
  const [homeDropdownOpen, setHomeDropdownOpen] = useState(false);

  // Filter out current org to get other available homes
  const otherHomes = userOrganizations.filter(org => org.id !== currentOrganizationId);
  const hasMultipleHomes = otherHomes.length > 0;
  const showMultiHomeOption = hasMultipleHomes;

  // Format number with thousands separator (.) and decimal separator (,)
  function formatAmountDisplay(value: number): string {
    const [intPart, decPart] = value.toString().split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart ? `${formattedInt},${decPart}` : formattedInt;
  }

  // Parse display string back to number
  function parseAmountDisplay(display: string): number {
    // Remove thousands separators, replace decimal comma with dot
    const normalized = display.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalized) || 0;
  }

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: initialData || {
      label: "",
      amount: 0,
      incomeDate: new Date(),
      incomeTypeId: "",
      notes: "",
      // Auto-assign to current user at 100%
      assignments: [{ userId: currentUserId, percentage: 100 }],
    },
  });

  const { fields, append, remove: removeField } = useFieldArray({
    control: form.control,
    name: "assignments",
  });

  // Custom remove that sets remaining member to 100% if only one left
  const remove = (index: number) => {
    removeField(index);
    // If only 1 member will remain, set their percentage to 100
    if (fields.length === 2) {
      setTimeout(() => {
        form.setValue(`assignments.0.percentage`, 100);
      }, 0);
    }
  };

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

  // Distribute percentages based on income ratio
  const distributeByIncome = () => {
    if (!assignments || assignments.length === 0) return;

    // Calculate total income of assigned members
    const totalIncome = assignments.reduce((sum, a) => {
      return sum + (memberIncomes[a.userId] || 0);
    }, 0);

    if (totalIncome === 0) {
      // No income data, fall back to equal distribution
      distributeEqually();
      return;
    }

    // Calculate percentage for each member based on their income ratio
    let distributedTotal = 0;
    assignments.forEach((assignment, index) => {
      const income = memberIncomes[assignment.userId] || 0;
      const percentage = Math.round((income / totalIncome) * 100);
      distributedTotal += percentage;
      form.setValue(`assignments.${index}.percentage`, percentage);
    });

    // Handle rounding errors - adjust first member to ensure total is 100
    if (distributedTotal !== 100 && assignments.length > 0) {
      const firstPercentage = Number(form.getValues(`assignments.0.percentage`)) || 0;
      form.setValue(`assignments.0.percentage`, firstPercentage + (100 - distributedTotal));
    }
  };

  // Check if we have income data for the current assignments
  const hasIncomeData = assignments?.some(a => memberIncomes[a.userId] && memberIncomes[a.userId] > 0) ?? false;

  // Multi-home helpers
  const toggleHomeSelection = (orgId: string) => {
    const newSelected = new Map(selectedHomes);
    if (newSelected.has(orgId)) {
      // Can't deselect if it's the only one or if it's the current org
      if (newSelected.size > 1 && orgId !== currentOrganizationId) {
        newSelected.delete(orgId);
        // Redistribute percentages
        redistributeHomePercentages(newSelected);
      }
    } else {
      // Add with equal distribution
      newSelected.set(orgId, 0);
      redistributeHomePercentages(newSelected);
    }
    setSelectedHomes(newSelected);
  };

  const redistributeHomePercentages = (homes: Map<string, number>) => {
    const count = homes.size;
    const equalShare = Math.floor(100 / count);
    const remainder = 100 - (equalShare * count);
    let index = 0;
    homes.forEach((_, key) => {
      homes.set(key, index === 0 ? equalShare + remainder : equalShare);
      index++;
    });
  };

  const updateHomePercentage = (orgId: string, percentage: number) => {
    const newSelected = new Map(selectedHomes);
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    newSelected.set(orgId, clampedPercentage);

    // Auto-adjust other homes
    const otherOrgIds = Array.from(newSelected.keys()).filter(id => id !== orgId);
    if (otherOrgIds.length > 0) {
      const remaining = 100 - clampedPercentage;
      const currentOtherTotal = otherOrgIds.reduce((sum, id) => sum + (newSelected.get(id) || 0), 0);

      if (currentOtherTotal > 0) {
        otherOrgIds.forEach(id => {
          const currentVal = newSelected.get(id) || 0;
          const proportion = currentVal / currentOtherTotal;
          newSelected.set(id, Math.max(0, Math.round(remaining * proportion)));
        });
      } else {
        const equalShare = Math.floor(remaining / otherOrgIds.length);
        otherOrgIds.forEach((id, idx) => {
          const share = idx === 0 ? remaining - (equalShare * (otherOrgIds.length - 1)) : equalShare;
          newSelected.set(id, Math.max(0, share));
        });
      }
    }

    setSelectedHomes(newSelected);
  };

  const totalHomePercentage = Array.from(selectedHomes.values()).reduce((sum, p) => sum + p, 0);

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

  async function onSubmit(data: IncomeFormData) {
    setIsLoading(true);
    setError(null);

    try {
      // If multi-home is enabled, include the home distributions
      const multiHomeData = multiHomeEnabled && selectedHomes.size > 1
        ? Array.from(selectedHomes.entries()).map(([orgId, percentage]) => ({
            organizationId: orgId,
            percentage,
          }))
        : undefined;

      const url =
        mode === "create" ? "/api/incomes" : `/api/incomes/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          multiHomeDistribution: multiHomeData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Something went wrong");
        return;
      }

      router.push("/incomes");
      router.refresh();
    } catch (error) {
      setError("Failed to save income");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="md:rounded-lg md:border md:bg-card md:shadow-sm overflow-hidden">
      <div className="px-4 pb-2 md:p-6 md:pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "create" ? t.incomes?.newIncome || "Nuevo Ingreso" : t.incomes?.editIncome || "Editar Ingreso"}
        </h1>
      </div>
      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <Form {...form}>
          <form id="income-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  <FormLabel>{t.incomes?.label || "Descripción"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.incomes?.labelPlaceholder || "ej., Salario de enero"}
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
                  <FormLabel>{t.incomes?.amount || "Monto"}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        disabled={isLoading}
                        value={amountDisplay}
                        onChange={(e) => {
                          const input = e.target.value;
                          // Remove everything except digits and comma (decimal separator)
                          const cleaned = input.replace(/[^0-9,]/g, "");
                          // Only allow one comma
                          const parts = cleaned.split(",");
                          const intPart = parts[0].replace(/^0+(?=\d)/, ""); // Remove leading zeros
                          const decPart = parts[1]?.slice(0, 2); // Max 2 decimal places

                          // Format with thousands separator
                          const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                          const formatted = decPart !== undefined ? `${formattedInt},${decPart}` : formattedInt;

                          setAmountDisplay(formatted);

                          // Convert to number for form state
                          const numericValue = parseAmountDisplay(formatted);
                          field.onChange(numericValue);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="pl-7"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="incomeTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.incomes?.category || "Categoría"}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.incomes?.selectCategory || "Selecciona una categoría"} />
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
              name="incomeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.incomes?.incomeDate || "Fecha de Ingreso"}</FormLabel>
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
                  <FormDescription>{t.incomes?.incomeDateDescription || "Cuando se recibió el ingreso"}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.incomes?.notes || "Notas (Opcional)"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.incomes?.notesPlaceholder || "Detalles adicionales sobre este ingreso..."}
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multi-home toggle - only show in create mode with multiple homes */}
            {showMultiHomeOption && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium leading-none">
                      {t.incomes?.multiHome || "Compartir con varios hogares"}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t.incomes?.multiHomeDescription || "Registrar este ingreso en más de un hogar"}
                    </p>
                  </div>
                  <Switch
                    checked={multiHomeEnabled}
                    onCheckedChange={(checked) => {
                      setMultiHomeEnabled(checked);
                      if (!checked) {
                        // Reset to only current organization at 100%
                        const reset = new Map<string, number>();
                        reset.set(currentOrganizationId, 100);
                        setSelectedHomes(reset);
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>

                {multiHomeEnabled && (
                  <div className="space-y-3">
                    {/* Home selector dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setHomeDropdownOpen(!homeDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent/50 transition-colors"
                        disabled={isLoading}
                      >
                        <span className="text-muted-foreground">
                          {selectedHomes.size} {t.incomes?.homesSelected || "hogares seleccionados"}
                        </span>
                        <svg
                          className={`h-4 w-4 transition-transform ${homeDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {homeDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                          {/* Current organization (always selected) */}
                          {userOrganizations.filter(org => org.id === currentOrganizationId).map(org => (
                            <div
                              key={org.id}
                              className="flex items-center gap-3 px-3 py-2 bg-muted/30"
                            >
                              <div className="h-5 w-5 rounded border border-primary bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                              <div className="flex items-center gap-2 flex-1">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{org.name}</span>
                                <span className="text-xs text-muted-foreground">(actual)</span>
                              </div>
                            </div>
                          ))}

                          {/* Other organizations */}
                          {otherHomes.map(org => (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => toggleHomeSelection(org.id)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/50 transition-colors"
                            >
                              <div className={`h-5 w-5 rounded border ${selectedHomes.has(org.id) ? "border-primary bg-primary" : "border-muted-foreground/30"} flex items-center justify-center`}>
                                {selectedHomes.has(org.id) && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-1 text-left">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{org.name}</span>
                                {org.isPersonal && (
                                  <span className="text-xs text-muted-foreground">(personal)</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Percentage distribution for selected homes */}
                    {selectedHomes.size > 1 && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          {t.incomes?.homePercentage || "Porcentaje por hogar"}
                        </p>
                        {Array.from(selectedHomes.entries()).map(([orgId, percentage]) => {
                          const org = userOrganizations.find(o => o.id === orgId);
                          if (!org) return null;
                          const currentAmount = Number(form.watch("amount")) || 0;
                          const calculatedAmount = Math.round((currentAmount * percentage) / 100 * 100) / 100;
                          return (
                            <div key={orgId} className="p-3 bg-muted/30 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium flex-1">{org.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <Slider
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={[percentage]}
                                    onValueChange={(values) => updateHomePercentage(orgId, values[0])}
                                    disabled={isLoading}
                                  />
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={percentage}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, "");
                                      const num = Math.min(100, Math.max(0, parseInt(val) || 0));
                                      updateHomePercentage(orgId, num);
                                    }}
                                    disabled={isLoading}
                                    className="w-14 h-8 text-center text-sm px-1"
                                  />
                                  <span className="text-sm">%</span>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground text-right">
                                ${formatAmountDisplay(calculatedAmount)}
                              </p>
                            </div>
                          );
                        })}
                        {totalHomePercentage !== 100 && (
                          <p className="text-sm text-destructive">
                            Total: {totalHomePercentage}% (debe ser 100%)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Only show assignments for shared organizations */}
            {!isPersonalOrg && (
              <div className="space-y-4 pt-2">
                <div>
                  {fields.length > 0 && (
                    <>
                      <h3 className="text-sm font-medium mb-2">
                        {t.incomes?.assignToMembers || "Asignar a Miembros (Opcional)"}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {t.incomes?.splitIncomeDescription || "Dividir este ingreso entre los miembros. El total debe ser 100%."}
                      </p>
                    </>
                  )}

                  {fields.map((field, index) => {
                    const assignedUserIds = assignments
                      ?.map((a, i) => (i !== index ? a.userId : null))
                      .filter(Boolean);
                    const availableMembers = members.filter(
                      (m) => !assignedUserIds?.includes(m.id)
                    );
                    const showPercentageControls = fields.length > 1;

                    return (
                      <div key={field.id} className="mb-3 p-3 bg-muted/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          <FormField
                            control={form.control}
                            name={`assignments.${index}.userId`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={isLoading}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t.incomes?.selectMember || "Seleccionar miembro"} />
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
                        {showPercentageControls && (
                          <FormField
                            control={form.control}
                            name={`assignments.${index}.percentage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
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
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
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
                          append({ userId: currentUserId, percentage: 100 });
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
                        {t.incomes?.addMember || "Agregar Miembro"}
                      </Button>
                      {fields.length > 1 && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={distributeEqually}
                            disabled={isLoading}
                            className="w-full sm:w-auto text-muted-foreground"
                          >
                            Dividir igual
                          </Button>
                          {hasIncomeData && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={distributeByIncome}
                              disabled={isLoading}
                              className="w-full sm:w-auto text-muted-foreground"
                            >
                              📊 Por ingresos
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {form.formState.errors.assignments?.message && (
                    <p className="text-sm text-destructive mt-2">
                      {form.formState.errors.assignments.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Spacer for sticky button on mobile */}
            <div className="h-20 md:hidden" />
          </form>
        </Form>
      </div>

      {/* Sticky submit button on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm md:relative md:bg-transparent md:backdrop-blur-none md:p-6 md:pt-0">
        <div className="flex flex-col gap-2 max-w-2xl mx-auto md:max-w-none">
          <Button type="submit" form="income-form" disabled={isLoading} size="lg" className="w-full">
            {isLoading
              ? t.incomes?.saving || "Guardando..."
              : mode === "create"
                ? t.incomes?.create || "Crear"
                : t.incomes?.update || "Actualizar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/incomes")}
            disabled={isLoading}
            className="w-full md:hidden"
          >
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
