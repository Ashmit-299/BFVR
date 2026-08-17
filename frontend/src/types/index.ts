export interface User {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER";
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Transaction {
  id: string;
  amount: number;
  payment_method: "CASH" | "UPI" | "CARD" | "OTHER";
  category_id?: string;
  category_name?: string;
  description?: string;
  transaction_date: string;
  transaction_time: string;
  created_by: string;
  creator_name?: string;
  status: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
}

export interface Expense {
  id: string;
  amount: number;
  category_id: string;
  category_name?: string;
  payment_method: "CASH" | "UPI" | "CARD" | "OTHER";
  vendor_name?: string;
  description?: string;
  expense_date: string;
  created_by: string;
  creator_name?: string;
  status: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
}

export interface Category {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  description?: string;
  is_default: boolean;
  created_at: string;
}

export interface PaymentMethodBreakdown {
  cash: number;
  upi: number;
  card: number;
  other: number;
  total: number;
}

export interface DailySummary {
  date: string;
  total_revenue: number;
  total_expenses: number;
  operating_result: number;
  transaction_count: number;
  expense_count: number;
  payment_methods: PaymentMethodBreakdown;
}

export interface TrendData {
  period: string;
  revenue: number;
  expenses: number;
  result: number;
}

export interface BestDay {
  day: string;
  avg_sales: number;
  total_sales: number;
  count: number;
}

export interface BestMonth {
  month: string;
  month_number: number;
  total_sales: number;
  count: number;
}

export interface ExpenseAlert {
  category: string;
  current: number;
  previous: number;
  change_percent: number;
  alert_type: string;
  message: string;
}

export interface DailyClosing {
  id: string;
  closing_date: string;
  system_cash_total: number;
  actual_cash_counted?: number;
  cash_difference?: number;
  system_upi_total: number;
  upi_settled?: number;
  upi_difference?: number;
  total_expenses: number;
  operating_result: number;
  closed_by: string;
  creator_name?: string;
  notes?: string;
  created_at: string;
}

export interface RestaurantSetting {
  restaurant_name: string;
  tagline: string;
  currency_symbol: string;
}
