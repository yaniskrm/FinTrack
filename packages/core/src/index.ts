// Types
export * from "./types/index.js";

// Calculations
export * from "./calculations/accounts.js";
export * from "./calculations/balance.js";
export * from "./calculations/budget.js";
export * from "./calculations/dashboard.js";
export * from "./calculations/goal.js";
export * from "./calculations/health-score.js";
export * from "./calculations/investments.js";
export * from "./calculations/reimbursements.js";

// Categorization
export * from "./categorization/suggest.js";

// Currency
export * from "./currency/conversion.js";
export * from "./currency/formatting.js";

// Export
export * from "./export/csv.js";
export * from "./export/json.js";

// Import (bank statements)
export * from "./import/parse-csv.js";
export * from "./import/bank-statement.js";
export * from "./import/duplicates.js";

// Banking (Enable Banking — Open Banking, Phase 13). Only the pure,
// client-safe pieces (normalization, response shapes) — signing/fetching
// (jwt.ts/client.ts) import `node:crypto` and live behind the "./server"
// entry point instead (see server.ts), so a Client Component pulling in
// *anything* from this barrel never drags a Node builtin into its bundle.
export * from "./banking/normalize.js";
export * from "./banking/types.js";

// Validators
export * from "./validators/auth.js";
export * from "./validators/mfa.js";
export * from "./validators/transaction.js";
export * from "./validators/transaction-schema.js";
export { validateRecurringRule, getNextOccurrence } from "./validators/recurring.js";
export type { RecurringRuleInput } from "./validators/recurring.js";
export * from "./validators/recurring-schema.js";
export * from "./validators/budget-schema.js";
export * from "./validators/goal-schema.js";
export * from "./validators/investment-schema.js";
export * from "./validators/category-schema.js";
export * from "./validators/account-schema.js";
export * from "./validators/import-schema.js";
