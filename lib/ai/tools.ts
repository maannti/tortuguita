import { Tool } from "@anthropic-ai/sdk/resources/messages";

export const tools: Tool[] = [
  {
    name: "create_bill",
    description:
      "Create a new bill/expense in the system. Use this when the user wants to add, create, or record a new expense.",
    input_schema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description:
            "Brief description of the bill (e.g., 'Grocery shopping', 'Electric bill')",
        },
        amount: {
          type: "number",
          description: "Amount in dollars (e.g., 150.50)",
        },
        paymentDate: {
          type: "string",
          description:
            "Date the bill was paid in ISO format (YYYY-MM-DD). If user says 'today', use current date.",
        },
        categoryName: {
          type: "string",
          description:
            "Category/type of bill (e.g., 'Groceries', 'Utilities', 'Rent'). If not specified, ask the user.",
        },
        dueDate: {
          type: "string",
          description: "Optional due date in ISO format (YYYY-MM-DD)",
        },
        notes: {
          type: "string",
          description: "Optional additional notes about the bill",
        },
        assignments: {
          type: "array",
          description:
            "Optional bill splitting among users. Specify user names and percentages (must total 100%). Example: [{ userName: 'John', percentage: 50 }, { userName: 'Jane', percentage: 50 }]",
          items: {
            type: "object",
            properties: {
              userName: {
                type: "string",
                description: "Name of the user (use names from the context)",
              },
              percentage: {
                type: "number",
                description:
                  "Percentage allocated to this user (0.01-100, max 2 decimals)",
              },
            },
            required: ["userName", "percentage"],
          },
        },
        totalInstallments: {
          type: "number",
          description:
            "Number of installments/cuotas (2-24). Use this when user says 'en X cuotas' or 'X installments'. Only applicable for credit card categories.",
        },
      },
      required: ["label", "amount", "paymentDate", "categoryName"],
    },
  },
  {
    name: "create_category",
    description:
      "Create a new category/bill type. Use this when the user wants to add a new category for organizing expenses. IMPORTANT: Always ask if the category is a credit card to enable installments/cuotas feature.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Category name (e.g., 'Groceries', 'Utilities', 'VISA', 'Mastercard')",
        },
        description: {
          type: "string",
          description: "Optional description of the category",
        },
        color: {
          type: "string",
          description:
            "Optional hex color code (e.g., '#3b82f6'). Default to a nice blue if not specified.",
        },
        icon: {
          type: "string",
          description: "Optional emoji icon (e.g., '🛒', '💡', '💳' for credit cards)",
        },
        isCreditCard: {
          type: "boolean",
          description:
            "Whether this category represents a credit card. Set to true for credit cards (VISA, Mastercard, Amex, etc.) to enable installments/cuotas when creating bills.",
        },
      },
      required: ["name", "isCreditCard"],
    },
  },
  {
    name: "get_analytics",
    description:
      "Get spending analytics and KPIs. Use this when the user asks about spending patterns, trends, or wants to see statistics.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["current_month", "last_month", "last_6_months", "year_to_date"],
          description: "Time period for analytics",
        },
        groupBy: {
          type: "string",
          enum: ["category", "user", "month"],
          description: "How to group the analytics",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "search_bills",
    description:
      "Search and filter bills. Use this when the user wants to find specific bills or see expenses matching certain criteria. Can filter by creator, assigned user, category, date range, amount, and search text.",
    input_schema: {
      type: "object",
      properties: {
        createdByMe: {
          type: "boolean",
          description: "Filter to bills created/paid by the current user",
        },
        assignedToUser: {
          type: "string",
          description: "Filter to bills assigned to a specific user (use user name)",
        },
        categoryName: {
          type: "string",
          description: "Filter by category name",
        },
        startDate: {
          type: "string",
          description: "Start date for date range filter (ISO format)",
        },
        endDate: {
          type: "string",
          description: "End date for date range filter (ISO format)",
        },
        minAmount: {
          type: "number",
          description: "Minimum amount filter",
        },
        maxAmount: {
          type: "number",
          description: "Maximum amount filter",
        },
        searchText: {
          type: "string",
          description: "Search in bill labels and notes",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
    },
  },
  {
    name: "update_bill",
    description:
      "Update/edit an existing bill. Use this when the user wants to modify a bill's details like name, amount, date, category, or assignments.",
    input_schema: {
      type: "object",
      properties: {
        billId: {
          type: "string",
          description:
            "The ID of the bill to update. Use search_bills first to find the bill if you don't have the ID.",
        },
        label: {
          type: "string",
          description: "New label/name for the bill",
        },
        amount: {
          type: "number",
          description: "New amount",
        },
        paymentDate: {
          type: "string",
          description: "New payment date in ISO format (YYYY-MM-DD)",
        },
        categoryName: {
          type: "string",
          description: "New category name",
        },
        notes: {
          type: "string",
          description: "New notes",
        },
        assignments: {
          type: "array",
          description:
            "New assignment split. Same format as create_bill. Replaces all existing assignments.",
          items: {
            type: "object",
            properties: {
              userName: {
                type: "string",
                description: "Name of the user (use names from the context)",
              },
              percentage: {
                type: "number",
                description:
                  "Percentage allocated to this user (0.01-100, max 2 decimals)",
              },
            },
            required: ["userName", "percentage"],
          },
        },
      },
      required: ["billId"],
    },
  },
  {
    name: "delete_bill",
    description:
      "Delete a bill. IMPORTANT: Always ask the user for confirmation before deleting. Use confirmed parameter to track confirmation.",
    input_schema: {
      type: "object",
      properties: {
        billId: {
          type: "string",
          description:
            "The ID of the bill to delete. Use search_bills first to find the bill if you don't have the ID.",
        },
        confirmed: {
          type: "boolean",
          description:
            "Whether the user has confirmed the deletion. First call should be false to get confirmation, second call should be true after user confirms.",
        },
      },
      required: ["billId", "confirmed"],
    },
  },
  {
    name: "update_category",
    description:
      "Update/edit an existing category. Use this when the user wants to modify a category's name, description, color, or icon.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description:
            "The ID of the category to update. You may need to search or list categories first to get the ID.",
        },
        categoryName: {
          type: "string",
          description:
            "Current name of the category (alternative to categoryId if you don't have the ID)",
        },
        name: {
          type: "string",
          description: "New name for the category",
        },
        description: {
          type: "string",
          description: "New description",
        },
        color: {
          type: "string",
          description: "New hex color code (e.g., '#3b82f6')",
        },
        icon: {
          type: "string",
          description: "New emoji icon (e.g., '🛒', '💡')",
        },
      },
    },
  },
  {
    name: "delete_category",
    description:
      "Delete a category. IMPORTANT: Always ask the user for confirmation before deleting. Use confirmed parameter to track confirmation.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description:
            "The ID of the category to delete. You may need to search or list categories first to get the ID.",
        },
        categoryName: {
          type: "string",
          description:
            "Name of the category to delete (alternative to categoryId if you don't have the ID)",
        },
        confirmed: {
          type: "boolean",
          description:
            "Whether the user has confirmed the deletion. First call should be false to get confirmation, second call should be true after user confirms.",
        },
      },
      required: ["confirmed"],
    },
  },
  {
    name: "create_income",
    description:
      "Create a new income entry in the system. Use this when the user wants to add, create, or record a new income/earning.",
    input_schema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description:
            "Brief description of the income (e.g., 'January salary', 'Freelance project')",
        },
        amount: {
          type: "number",
          description: "Amount in dollars (e.g., 3500.00)",
        },
        incomeDate: {
          type: "string",
          description:
            "Date the income was received in ISO format (YYYY-MM-DD). If user says 'today', use current date.",
        },
        categoryName: {
          type: "string",
          description:
            "Category/type of income (e.g., 'Salary', 'Freelance', 'Investments'). If not specified, ask the user.",
        },
        notes: {
          type: "string",
          description: "Optional additional notes about the income",
        },
        assignments: {
          type: "array",
          description:
            "Optional income splitting among users. Specify user names and percentages (must total 100%). Example: [{ userName: 'John', percentage: 50 }, { userName: 'Jane', percentage: 50 }]",
          items: {
            type: "object",
            properties: {
              userName: {
                type: "string",
                description: "Name of the user (use names from the context)",
              },
              percentage: {
                type: "number",
                description:
                  "Percentage allocated to this user (0.01-100, max 2 decimals)",
              },
            },
            required: ["userName", "percentage"],
          },
        },
      },
      required: ["label", "amount", "incomeDate", "categoryName"],
    },
  },
  {
    name: "create_income_type",
    description:
      "Create a new income category/type. Use this when the user wants to add a new category for organizing incomes.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Category name (e.g., 'Salary', 'Freelance', 'Investments')",
        },
        description: {
          type: "string",
          description: "Optional description of the category",
        },
        color: {
          type: "string",
          description:
            "Optional hex color code (e.g., '#10b981'). Default to a nice green if not specified.",
        },
        icon: {
          type: "string",
          description: "Optional emoji icon (e.g., '💰', '💼')",
        },
        isRecurring: {
          type: "boolean",
          description:
            "Whether this income type is recurring (e.g., monthly salary). Set to true for regular incomes like salary.",
        },
      },
      required: ["name", "isRecurring"],
    },
  },
  {
    name: "search_incomes",
    description:
      "Search and filter incomes. Use this when the user wants to find specific incomes or see earnings matching certain criteria.",
    input_schema: {
      type: "object",
      properties: {
        createdByMe: {
          type: "boolean",
          description: "Filter to incomes created by the current user",
        },
        assignedToUser: {
          type: "string",
          description: "Filter to incomes assigned to a specific user (use user name)",
        },
        categoryName: {
          type: "string",
          description: "Filter by category name",
        },
        startDate: {
          type: "string",
          description: "Start date for date range filter (ISO format)",
        },
        endDate: {
          type: "string",
          description: "End date for date range filter (ISO format)",
        },
        minAmount: {
          type: "number",
          description: "Minimum amount filter",
        },
        maxAmount: {
          type: "number",
          description: "Maximum amount filter",
        },
        searchText: {
          type: "string",
          description: "Search in income labels and notes",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
    },
  },
  {
    name: "update_income",
    description:
      "Update/edit an existing income. Use this when the user wants to modify an income's details.",
    input_schema: {
      type: "object",
      properties: {
        incomeId: {
          type: "string",
          description:
            "The ID of the income to update. Use search_incomes first to find the income if you don't have the ID.",
        },
        label: {
          type: "string",
          description: "New label/name for the income",
        },
        amount: {
          type: "number",
          description: "New amount",
        },
        incomeDate: {
          type: "string",
          description: "New income date in ISO format (YYYY-MM-DD)",
        },
        categoryName: {
          type: "string",
          description: "New category name",
        },
        notes: {
          type: "string",
          description: "New notes",
        },
        assignments: {
          type: "array",
          description:
            "New assignment split. Same format as create_income. Replaces all existing assignments.",
          items: {
            type: "object",
            properties: {
              userName: {
                type: "string",
                description: "Name of the user",
              },
              percentage: {
                type: "number",
                description: "Percentage allocated to this user",
              },
            },
            required: ["userName", "percentage"],
          },
        },
      },
      required: ["incomeId"],
    },
  },
  {
    name: "delete_income",
    description:
      "Delete an income. IMPORTANT: Always ask the user for confirmation before deleting.",
    input_schema: {
      type: "object",
      properties: {
        incomeId: {
          type: "string",
          description:
            "The ID of the income to delete. Use search_incomes first to find the income if you don't have the ID.",
        },
        confirmed: {
          type: "boolean",
          description:
            "Whether the user has confirmed the deletion. First call should be false to get confirmation, second call should be true after user confirms.",
        },
      },
      required: ["incomeId", "confirmed"],
    },
  },
  {
    name: "update_income_type",
    description:
      "Update/edit an existing income category. Use this when the user wants to modify an income category's details.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description: "The ID of the income category to update.",
        },
        categoryName: {
          type: "string",
          description: "Current name of the category (alternative to categoryId)",
        },
        name: {
          type: "string",
          description: "New name for the category",
        },
        description: {
          type: "string",
          description: "New description",
        },
        color: {
          type: "string",
          description: "New hex color code (e.g., '#10b981')",
        },
        icon: {
          type: "string",
          description: "New emoji icon (e.g., '💰')",
        },
      },
    },
  },
  {
    name: "delete_income_type",
    description:
      "Delete an income category. IMPORTANT: Always ask the user for confirmation before deleting.",
    input_schema: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description: "The ID of the income category to delete.",
        },
        categoryName: {
          type: "string",
          description: "Name of the category to delete (alternative to categoryId)",
        },
        confirmed: {
          type: "boolean",
          description:
            "Whether the user has confirmed the deletion. First call should be false to get confirmation, second call should be true after user confirms.",
        },
      },
      required: ["confirmed"],
    },
  },
];
