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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          entity: string
          entity_id: string
          id: string
          reason: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          entity: string
          entity_id: string
          id?: string
          reason: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          entity?: string
          entity_id?: string
          id?: string
          reason?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_children: {
        Row: {
          birth_month: number
          birth_year: number
          created_at: string
          customer_id: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          birth_month: number
          birth_year: number
          created_at?: string
          customer_id: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          birth_month?: number
          birth_year?: number
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_children_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_children_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          down_payment_cents: number
          id: string
          notes: string | null
          party_id: string
          tenant_id: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          down_payment_cents?: number
          id?: string
          notes?: string | null
          party_id: string
          tenant_id: string
          total_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          down_payment_cents?: number
          id?: string
          notes?: string | null
          party_id?: string
          tenant_id?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          party_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          party_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          party_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_groups_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          age: number | null
          attendance: Database["public"]["Enums"]["attendance_status"] | null
          checked_in_at: string | null
          companion_of: string | null
          created_at: string
          group_id: string | null
          id: string
          name: string
          note: string | null
          origin: Database["public"]["Enums"]["guest_origin"]
          party_id: string
          phone: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          attendance?: Database["public"]["Enums"]["attendance_status"] | null
          checked_in_at?: string | null
          companion_of?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name: string
          note?: string | null
          origin?: Database["public"]["Enums"]["guest_origin"]
          party_id: string
          phone?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          attendance?: Database["public"]["Enums"]["attendance_status"] | null
          checked_in_at?: string | null
          companion_of?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          name?: string
          note?: string | null
          origin?: Database["public"]["Enums"]["guest_origin"]
          party_id?: string
          phone?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_companion_of_fkey"
            columns: ["companion_of"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "guest_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount_cents: number
          contract_id: string
          created_at: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["installment_kind"]
          paid_at: string | null
          payment_method: string | null
          payment_note: string | null
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          contract_id: string
          created_at?: string
          due_date: string
          id?: string
          kind?: Database["public"]["Enums"]["installment_kind"]
          paid_at?: string | null
          payment_method?: string | null
          payment_note?: string | null
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          contract_id?: string
          created_at?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["installment_kind"]
          paid_at?: string | null
          payment_method?: string | null
          payment_note?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["membership_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["membership_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      packages: {
        Row: {
          adult_age: number
          adult_capacity: number
          archived: boolean
          base_price_cents: number
          child_capacity: number
          created_at: string
          exempt_age: number
          extra_adult_price_cents: number
          extra_child_price_cents: number
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adult_age: number
          adult_capacity: number
          archived?: boolean
          base_price_cents: number
          child_capacity: number
          created_at?: string
          exempt_age: number
          extra_adult_price_cents: number
          extra_child_price_cents: number
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adult_age?: number
          adult_capacity?: number
          archived?: boolean
          base_price_cents?: number
          child_capacity?: number
          created_at?: string
          exempt_age?: number
          extra_adult_price_cents?: number
          extra_child_price_cents?: number
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          birthday_child_id: string | null
          closing_snapshot: Json | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          host_message: string | null
          id: string
          invite_published: boolean
          invite_token: string | null
          list_mode: Database["public"]["Enums"]["list_mode"]
          notes: string | null
          overage_adults: number | null
          overage_children: number | null
          overage_decision: Database["public"]["Enums"]["overage_decision"]
          overage_total_cents: number | null
          package_id: string
          party_date: string
          report_shared_with_customer: boolean
          rsvp_deadline: string | null
          rule_adult_age: number | null
          rule_adult_capacity: number | null
          rule_child_capacity: number | null
          rule_exempt_age: number | null
          rule_extra_adult_price_cents: number | null
          rule_extra_child_price_cents: number | null
          shift_id: string
          status: Database["public"]["Enums"]["party_status"]
          tenant_id: string
          turning_age: number | null
          updated_at: string
        }
        Insert: {
          birthday_child_id?: string | null
          closing_snapshot?: Json | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          host_message?: string | null
          id?: string
          invite_published?: boolean
          invite_token?: string | null
          list_mode?: Database["public"]["Enums"]["list_mode"]
          notes?: string | null
          overage_adults?: number | null
          overage_children?: number | null
          overage_decision?: Database["public"]["Enums"]["overage_decision"]
          overage_total_cents?: number | null
          package_id: string
          party_date: string
          report_shared_with_customer?: boolean
          rsvp_deadline?: string | null
          rule_adult_age?: number | null
          rule_adult_capacity?: number | null
          rule_child_capacity?: number | null
          rule_exempt_age?: number | null
          rule_extra_adult_price_cents?: number | null
          rule_extra_child_price_cents?: number | null
          shift_id: string
          status?: Database["public"]["Enums"]["party_status"]
          tenant_id: string
          turning_age?: number | null
          updated_at?: string
        }
        Update: {
          birthday_child_id?: string | null
          closing_snapshot?: Json | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          host_message?: string | null
          id?: string
          invite_published?: boolean
          invite_token?: string | null
          list_mode?: Database["public"]["Enums"]["list_mode"]
          notes?: string | null
          overage_adults?: number | null
          overage_children?: number | null
          overage_decision?: Database["public"]["Enums"]["overage_decision"]
          overage_total_cents?: number | null
          package_id?: string
          party_date?: string
          report_shared_with_customer?: boolean
          rsvp_deadline?: string | null
          rule_adult_age?: number | null
          rule_adult_capacity?: number | null
          rule_child_capacity?: number | null
          rule_exempt_age?: number | null
          rule_extra_adult_price_cents?: number | null
          rule_extra_child_price_cents?: number | null
          shift_id?: string
          status?: Database["public"]["Enums"]["party_status"]
          tenant_id?: string
          turning_age?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_birthday_child_id_fkey"
            columns: ["birthday_child_id"]
            isOneToOne: false
            referencedRelation: "birthday_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          is_platform_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          is_platform_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          is_platform_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string
          id: string
          label: string
          starts_at: string
          tenant_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at: string
          id?: string
          label: string
          starts_at: string
          tenant_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          label?: string
          starts_at?: string
          tenant_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          block_at: string | null
          created_at: string
          delete_at: string | null
          id: string
          name: string
          phone: string | null
          read_only_since: string | null
          rebooking_message: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          block_at?: string | null
          created_at?: string
          delete_at?: string | null
          id?: string
          name: string
          phone?: string | null
          read_only_since?: string | null
          rebooking_message?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          block_at?: string | null
          created_at?: string
          delete_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          read_only_since?: string | null
          rebooking_message?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkin_add_walkin: {
        Args: { p_age?: number; p_name: string; p_party_id: string }
        Returns: string
      }
      checkin_group: {
        Args: { p_group_id: string; p_present: boolean }
        Returns: undefined
      }
      checkin_set_present: {
        Args: { p_guest_id: string; p_present: boolean }
        Returns: undefined
      }
      close_party: {
        Args: {
          p_overage_adults: number
          p_overage_children: number
          p_overage_total_cents: number
          p_party_id: string
          p_snapshot: Json
        }
        Returns: undefined
      }
      confirm_party_with_contract: {
        Args: {
          p_customer_id: string
          p_down_payment_cents: number
          p_installments: Json
          p_party_id: string
          p_total_cents: number
        }
        Returns: string
      }
      create_tenant: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      customer_invite_path: { Args: { p_party_id: string }; Returns: string }
      decide_overage: {
        Args: {
          p_amount_cents: number
          p_decision: Database["public"]["Enums"]["overage_decision"]
          p_party_id: string
          p_reason: string
        }
        Returns: undefined
      }
      find_guest: {
        Args: { p_name: string; p_slug: string; p_token: string }
        Returns: {
          group_name: string
          guest_id: string
          guest_name: string
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
        }[]
      }
      get_invite: {
        Args: { p_slug: string; p_token: string }
        Returns: {
          birthday_child_name: string
          buffet_address: string
          buffet_name: string
          host_message: string
          list_mode: Database["public"]["Enums"]["list_mode"]
          party_date: string
          party_id: string
          rsvp_deadline: string
          rsvp_open: boolean
          shift_ends_at: string
          shift_label: string
          shift_starts_at: string
          turning_age: number
        }[]
      }
      link_customer_account: { Args: never; Returns: string }
      submit_rsvp: {
        Args: {
          p_companions?: Json
          p_guest_id?: string
          p_guest_name?: string
          p_response: Database["public"]["Enums"]["rsvp_status"]
          p_slug: string
          p_token: string
        }
        Returns: string
      }
    }
    Enums: {
      attendance_status: "present" | "absent"
      guest_origin: "host" | "companion" | "self_registered" | "walk_in"
      installment_kind: "down_payment" | "regular" | "overage"
      list_mode: "closed" | "open"
      membership_role: "manager" | "receptionist"
      overage_decision: "pending" | "confirmed" | "adjusted" | "waived"
      party_status:
        | "budget"
        | "reserved"
        | "confirmed"
        | "completed"
        | "canceled"
      rsvp_status: "invited" | "confirmed" | "declined"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "read_only"
        | "blocked"
        | "canceled"
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
      attendance_status: ["present", "absent"],
      guest_origin: ["host", "companion", "self_registered", "walk_in"],
      installment_kind: ["down_payment", "regular", "overage"],
      list_mode: ["closed", "open"],
      membership_role: ["manager", "receptionist"],
      overage_decision: ["pending", "confirmed", "adjusted", "waived"],
      party_status: [
        "budget",
        "reserved",
        "confirmed",
        "completed",
        "canceled",
      ],
      rsvp_status: ["invited", "confirmed", "declined"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "read_only",
        "blocked",
        "canceled",
      ],
    },
  },
} as const

