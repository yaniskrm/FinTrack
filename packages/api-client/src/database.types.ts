export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount_eur: number
          category_id: string
          created_at: string
          id: string
          period: Database["public"]["Enums"]["budget_period"]
          workspace_id: string
        }
        Insert: {
          amount_eur: number
          category_id: string
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          workspace_id: string
        }
        Update: {
          amount_eur?: number
          category_id?: string
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["budget_period"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          currency: string
          rate_to_eur: number
          updated_at: string
        }
        Insert: {
          currency: string
          rate_to_eur: number
          updated_at?: string
        }
        Update: {
          currency?: string
          rate_to_eur?: number
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_amount_eur: number
          deadline: string | null
          id: string
          name: string
          target_amount_eur: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_amount_eur?: number
          deadline?: string | null
          id?: string
          name: string
          target_amount_eur: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_amount_eur?: number
          deadline?: string | null
          id?: string
          name?: string
          target_amount_eur?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_valuations: {
        Row: {
          created_at: string
          id: string
          investment_id: string
          price_eur: number
          recorded_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investment_id: string
          price_eur: number
          recorded_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investment_id?: string
          price_eur?: number
          recorded_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_valuations_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_valuations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          asset_type: Database["public"]["Enums"]["investment_type"]
          broker: string | null
          buy_price_eur: number
          closed_at: string | null
          created_at: string
          currency: string
          current_price_eur: number
          id: string
          name: string
          notes: string | null
          opened_at: string | null
          quantity: number
          sale_price_eur: number | null
          ticker: string | null
          workspace_id: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["investment_type"]
          broker?: string | null
          buy_price_eur: number
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_price_eur: number
          id?: string
          name: string
          notes?: string | null
          opened_at?: string | null
          quantity: number
          sale_price_eur?: number | null
          ticker?: string | null
          workspace_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["investment_type"]
          broker?: string | null
          buy_price_eur?: number
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_price_eur?: number
          id?: string
          name?: string
          notes?: string | null
          opened_at?: string | null
          quantity?: number
          sale_price_eur?: number | null
          ticker?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "investments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_currency: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          display_name?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          label: string
          next_occurrence: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          workspace_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          label: string
          next_occurrence: string
          start_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          label?: string
          next_occurrence?: string
          start_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "recurring_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          amount_eur: number
          category_id: string | null
          created_at: string
          currency: string
          date: string
          id: string
          label: string
          note: string | null
          rate_approximate: boolean
          recurring_rule_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount: number
          amount_eur: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date: string
          id?: string
          label: string
          note?: string | null
          rate_approximate?: boolean
          recurring_rule_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_eur?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          id?: string
          label?: string
          note?: string | null
          rate_approximate?: boolean
          recurring_rule_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      enforce_aal2_when_enrolled: { Args: never; Returns: boolean }
      generate_due_recurring_transactions: { Args: never; Returns: number }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      seed_default_categories: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      budget_period: "monthly" | "yearly"
      investment_type: "etf" | "stock" | "scpi" | "savings" | "crypto" | "other"
      member_role: "owner" | "member"
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly"
      transaction_type: "expense" | "income" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      budget_period: ["monthly", "yearly"],
      investment_type: ["etf", "stock", "scpi", "savings", "crypto", "other"],
      member_role: ["owner", "member"],
      recurring_frequency: ["daily", "weekly", "monthly", "yearly"],
      transaction_type: ["expense", "income", "transfer"],
    },
  },
} as const

