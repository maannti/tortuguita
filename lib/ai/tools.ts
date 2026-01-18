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
            "Optional bill splitting among users. Each entry should have userId and percentage (must total 100%)",
          items: {
            type: "object",
            properties: {
              userId: { type: "string" },
              percentage: { type: "number" },
            },
            required: ["userId", "percentage"],
          },
        },
      },
      required: ["label", "amount", "paymentDate", "categoryName"],
    },
  },
  {
    name: "create_category",
    description:
      "Create a new category/bill type. Use this when the user wants to add a new category for organizing expenses.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Category name (e.g., 'Groceries', 'Utilities')",
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
          description: "Optional emoji icon (e.g., '🛒', '💡')",
        },
      },
      required: ["name"],
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
      "Search and filter bills. Use this when the user wants to find specific bills or see expenses matching certain criteria.",
    input_schema: {
      type: "object",
      properties: {
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
      "Update/edit an existing bill. Use this when the user wants to modify a bill's details like name, amount, date, or category.",
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
];
