/**
 * Budget Date Calculation for Credit Cards
 *
 * For credit cards, expenses are recorded on the consumption date but
 * the actual budget impact occurs on the due date of the billing cycle.
 *
 * This module provides functions to calculate the budgetDate based on
 * billing periods configured for each credit card.
 */

export interface BillingPeriod {
  currentClosingDate: Date | null;
  currentDueDate: Date | null;
  nextClosingDate: Date | null;
  nextDueDate: Date | null;
}

export interface BudgetDateResult {
  budgetDate: Date;
  needsCurrentPeriod?: boolean;
  needsNextPeriod?: boolean;
}

/**
 * Calculate the budget date for an expense based on the billing period.
 *
 * Logic:
 * - If not a credit card: budgetDate = paymentDate
 * - If credit card:
 *   - If paymentDate <= currentClosingDate: budgetDate = currentDueDate
 *   - If paymentDate > currentClosingDate: budgetDate = nextDueDate
 *
 * @param paymentDate - The date of the expense/consumption
 * @param isCreditCard - Whether the category is a credit card
 * @param billingPeriod - The billing period configuration for the card
 * @returns BudgetDateResult with the calculated budget date or flags indicating missing data
 */
export function calculateBudgetDate(
  paymentDate: Date,
  isCreditCard: boolean,
  billingPeriod?: BillingPeriod | null
): BudgetDateResult {
  // Non-credit card expenses: budget date equals payment date
  if (!isCreditCard) {
    return { budgetDate: paymentDate };
  }

  // Credit card without billing period configured
  if (!billingPeriod || !billingPeriod.currentClosingDate || !billingPeriod.currentDueDate) {
    return {
      budgetDate: paymentDate,
      needsCurrentPeriod: true,
    };
  }

  const closingDate = new Date(billingPeriod.currentClosingDate);
  const dueDate = new Date(billingPeriod.currentDueDate);
  const payment = new Date(paymentDate);

  // Normalize to start of day for comparison
  closingDate.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  payment.setHours(0, 0, 0, 0);

  // If payment is before or on closing date, it goes to current period
  if (payment <= closingDate) {
    return { budgetDate: dueDate };
  }

  // Payment is after closing date, needs next period
  if (!billingPeriod.nextClosingDate || !billingPeriod.nextDueDate) {
    return {
      budgetDate: paymentDate,
      needsNextPeriod: true,
    };
  }

  const nextDueDate = new Date(billingPeriod.nextDueDate);
  nextDueDate.setHours(0, 0, 0, 0);

  return { budgetDate: nextDueDate };
}

/**
 * Check if the billing period needs rotation (current period has passed).
 *
 * Rotation should happen when today > currentDueDate.
 * After rotation: current = next, next = null
 *
 * @param billingPeriod - The current billing period configuration
 * @returns true if rotation is needed
 */
export function needsRotation(billingPeriod: BillingPeriod | null): boolean {
  if (!billingPeriod || !billingPeriod.currentDueDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDueDate = new Date(billingPeriod.currentDueDate);
  currentDueDate.setHours(0, 0, 0, 0);

  return today > currentDueDate;
}

/**
 * Rotate the billing period: move next period to current, clear next.
 *
 * @param billingPeriod - The current billing period configuration
 * @returns The rotated billing period
 */
export function rotateBillingPeriod(billingPeriod: BillingPeriod): BillingPeriod {
  return {
    currentClosingDate: billingPeriod.nextClosingDate,
    currentDueDate: billingPeriod.nextDueDate,
    nextClosingDate: null,
    nextDueDate: null,
  };
}

/**
 * Check if the billing period is configured (has at least current period).
 *
 * @param billingPeriod - The billing period configuration
 * @returns true if at least the current period is configured
 */
export function hasBillingPeriod(billingPeriod: BillingPeriod | null): boolean {
  return !!(
    billingPeriod &&
    billingPeriod.currentClosingDate &&
    billingPeriod.currentDueDate
  );
}

/**
 * Check if the expense date falls after the current closing date
 * (meaning it would need the next period to be configured).
 *
 * @param paymentDate - The date of the expense
 * @param billingPeriod - The billing period configuration
 * @returns true if the expense is after the current closing date
 */
export function isAfterCurrentClosing(
  paymentDate: Date,
  billingPeriod: BillingPeriod | null
): boolean {
  if (!billingPeriod || !billingPeriod.currentClosingDate) {
    return false;
  }

  const payment = new Date(paymentDate);
  const closingDate = new Date(billingPeriod.currentClosingDate);

  payment.setHours(0, 0, 0, 0);
  closingDate.setHours(0, 0, 0, 0);

  return payment > closingDate;
}

/**
 * Check if the next billing period is configured.
 *
 * @param billingPeriod - The billing period configuration
 * @returns true if the next period is configured
 */
export function hasNextPeriod(billingPeriod: BillingPeriod | null): boolean {
  return !!(
    billingPeriod &&
    billingPeriod.nextClosingDate &&
    billingPeriod.nextDueDate
  );
}

/**
 * Calculate budget dates for multiple installments.
 * Each installment's payment date is offset by one month.
 *
 * @param firstPaymentDate - The date of the first installment
 * @param totalInstallments - Total number of installments
 * @param isCreditCard - Whether this is a credit card
 * @param billingPeriod - The billing period configuration
 * @returns Array of budget dates for each installment
 */
export function calculateInstallmentBudgetDates(
  firstPaymentDate: Date,
  totalInstallments: number,
  isCreditCard: boolean,
  billingPeriod?: BillingPeriod | null
): Date[] {
  const budgetDates: Date[] = [];

  for (let i = 0; i < totalInstallments; i++) {
    const paymentDate = new Date(firstPaymentDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    const result = calculateBudgetDate(paymentDate, isCreditCard, billingPeriod);
    budgetDates.push(result.budgetDate);
  }

  return budgetDates;
}
