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

export function BillForm({ initialData, categories, members, currentUserId, mode }: BillFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const url =
        mode === "create" ? "/api/bills" : `/api/bills/${initialData?.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
          {mode === "create" ? "Add New Bill" : "Edit Bill"}
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Electric bill"
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
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      value={field.value === 0 || field.value === undefined ? "" : field.value}
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
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
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
                  <FormLabel>Payment Date</FormLabel>
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
                  <FormDescription>When the payment was made</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isLoading}
                      value={
                        field.value
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
                    For future payment reminders
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Additional information"
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
                  Assign to Members (Optional)
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Split this bill between organization members. Total must equal 100%.
                </p>

                {fields.map((field, index) => {
                  const assignedUserIds = assignments
                    ?.map((a, i) => (i !== index ? a.userId : null))
                    .filter(Boolean);
                  const availableMembers = members.filter(
                    (m) => !assignedUserIds?.includes(m.id)
                  );

                  return (
                    <div key={field.id} className="flex gap-3 mb-3 items-start">
                      <FormField
                        control={form.control}
                        name={`assignments.${index}.userId`}
                        render={({ field }) => (
                          <FormItem className="w-48">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select member" />
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
                                <Slider
                                  min={0}
                                  max={100}
                                  step={0.01}
                                  value={[field.value || 0]}
                                  onValueChange={(values) => {
                                    field.onChange(values[0]);
                                  }}
                                  disabled={isLoading}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-14 text-right">
                                  {(field.value || 0).toFixed(1)}%
                                </span>
                              </div>
                            </FormControl>
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
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}

                {fields.length > 0 && (
                  <div className="mt-3 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total:</span>
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

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Saving..."
                  : mode === "create"
                    ? "Create"
                    : "Update"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/bills")}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
