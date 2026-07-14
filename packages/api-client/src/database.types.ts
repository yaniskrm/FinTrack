/**
 * Auto-generated Supabase types.
 * Regenerate with: pnpm --filter @fintrack/api-client generate-types
 * (requires `supabase start` to be running locally)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "member";
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: "owner" | "member";
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          role?: "owner" | "member";
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          default_currency: string;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          default_currency?: string;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          default_currency?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          icon: string;
          color: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          icon?: string;
          color?: string;
          is_default?: boolean;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          workspace_id: string;
          category_id: string | null;
          amount: number;
          currency: string;
          amount_eur: number;
          type: "expense" | "income" | "transfer";
          label: string;
          note: string | null;
          date: string;
          recurring_rule_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_id?: string | null;
          amount: number;
          currency?: string;
          amount_eur: number;
          type: "expense" | "income" | "transfer";
          label: string;
          note?: string | null;
          date: string;
          recurring_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          amount?: number;
          currency?: string;
          amount_eur?: number;
          type?: "expense" | "income" | "transfer";
          label?: string;
          note?: string | null;
          date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_rules: {
        Row: {
          id: string;
          workspace_id: string;
          category_id: string | null;
          amount: number;
          currency: string;
          type: "expense" | "income" | "transfer";
          label: string;
          frequency: "daily" | "weekly" | "monthly" | "yearly";
          start_date: string;
          end_date: string | null;
          next_occurrence: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_id?: string | null;
          amount: number;
          currency?: string;
          type: "expense" | "income" | "transfer";
          label: string;
          frequency: "daily" | "weekly" | "monthly" | "yearly";
          start_date: string;
          end_date?: string | null;
          next_occurrence: string;
          created_at?: string;
        };
        Update: {
          category_id?: string | null;
          amount?: number;
          currency?: string;
          end_date?: string | null;
          next_occurrence?: string;
        };
        Relationships: [];
      };
      exchange_rates: {
        Row: {
          currency: string;
          rate_to_eur: number;
          updated_at: string;
        };
        Insert: {
          currency: string;
          rate_to_eur: number;
          updated_at?: string;
        };
        Update: {
          rate_to_eur?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          workspace_id: string;
          category_id: string;
          amount_eur: number;
          period: "monthly" | "yearly";
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          category_id: string;
          amount_eur: number;
          period?: "monthly" | "yearly";
          created_at?: string;
        };
        Update: {
          amount_eur?: number;
          period?: "monthly" | "yearly";
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          ticker: string | null;
          quantity: number;
          buy_price_eur: number;
          current_price_eur: number;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          ticker?: string | null;
          quantity: number;
          buy_price_eur: number;
          current_price_eur: number;
          currency?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          ticker?: string | null;
          quantity?: number;
          buy_price_eur?: number;
          current_price_eur?: number;
          currency?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          target_amount_eur: number;
          current_amount_eur: number;
          deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          target_amount_eur: number;
          current_amount_eur?: number;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          target_amount_eur?: number;
          current_amount_eur?: number;
          deadline?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_type: "expense" | "income" | "transfer";
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly";
      member_role: "owner" | "member";
      budget_period: "monthly" | "yearly";
    };
    CompositeTypes: Record<string, never>;
  };
}
