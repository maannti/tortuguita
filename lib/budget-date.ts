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
