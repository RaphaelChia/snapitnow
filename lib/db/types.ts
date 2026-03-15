export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      guest_auth_challenges: {
        Row: {
          attempts: number;
          consumed_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          otp_hash: string;
          session_id: string;
        };
        Insert: {
          attempts?: number;
          consumed_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          otp_hash: string;
          session_id: string;
        };
        Update: {
          attempts?: number;
          consumed_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          otp_hash?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_auth_challenges_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      guest_identities: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
        Relationships: [];
      };
      guest_sessions: {
        Row: {
          created_at: string;
          guest_user_id: string;
          id: string;
          session_id: string;
          shots_remaining: number;
          shots_taken: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          guest_user_id: string;
          id?: string;
          session_id: string;
          shots_remaining: number;
          shots_taken?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          guest_user_id?: string;
          id?: string;
          session_id?: string;
          shots_remaining?: number;
          shots_taken?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_sessions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      discounts: {
        Row: {
          id: string;
          roll_preset: number;
          discount_percent: number;
          label: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          roll_preset: number;
          discount_percent?: number;
          label?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          roll_preset?: number;
          discount_percent?: number;
          label?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          image: string | null;
          last_login_at: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          image?: string | null;
          last_login_at?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          image?: string | null;
          last_login_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          checkout_intent: Json | null;
          dispute_amount: number | null;
          dispute_closed_at: string | null;
          dispute_reason: string | null;
          disputed_at: string | null;
          checkout_session_id: string | null;
          created_at: string;
          currency: string;
          host_id: string;
          id: string;
          paid_at: string | null;
          payment_type: string;
          provider: string;
          raw_event_snapshot: Json | null;
          refunded_amount: number;
          refunded_at: string | null;
          session_id: string;
          status: string;
          stripe_charge_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_dispute_id: string | null;
          stripe_payment_intent_id: string | null;
        };
        Insert: {
          amount: number;
          checkout_session_id?: string | null;
          checkout_intent?: Json | null;
          created_at?: string;
          currency?: string;
          dispute_amount?: number | null;
          dispute_closed_at?: string | null;
          dispute_reason?: string | null;
          disputed_at?: string | null;
          host_id: string;
          id?: string;
          paid_at?: string | null;
          payment_type?: string;
          provider?: string;
          raw_event_snapshot?: Json | null;
          refunded_amount?: number;
          refunded_at?: string | null;
          session_id: string;
          status?: string;
          stripe_charge_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_dispute_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
        Update: {
          amount?: number;
          checkout_session_id?: string | null;
          checkout_intent?: Json | null;
          created_at?: string;
          currency?: string;
          dispute_amount?: number | null;
          dispute_closed_at?: string | null;
          dispute_reason?: string | null;
          disputed_at?: string | null;
          host_id?: string;
          id?: string;
          paid_at?: string | null;
          payment_type?: string;
          provider?: string;
          raw_event_snapshot?: Json | null;
          refunded_amount?: number;
          refunded_at?: string | null;
          session_id?: string;
          status?: string;
          stripe_charge_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_dispute_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      archive_entitlements: {
        Row: {
          created_at: string;
          host_id: string;
          id: string;
          photos_quota: number;
          session_id: string | null;
          source_payment_id: string;
          status: string;
          valid_from: string;
          valid_until: string;
        };
        Insert: {
          created_at?: string;
          host_id: string;
          id?: string;
          photos_quota: number;
          session_id?: string | null;
          source_payment_id: string;
          status?: string;
          valid_from: string;
          valid_until: string;
        };
        Update: {
          created_at?: string;
          host_id?: string;
          id?: string;
          photos_quota?: number;
          session_id?: string | null;
          source_payment_id?: string;
          status?: string;
          valid_from?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: "archive_entitlements_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "archive_entitlements_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "archive_entitlements_source_payment_id_fkey";
            columns: ["source_payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          host_id: string;
          id: string;
          notes: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          role: string;
          status: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          host_id: string;
          id?: string;
          notes?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          status?: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          host_id?: string;
          id?: string;
          notes?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_users_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_users_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_users_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_events: {
        Row: {
          actor_id: string | null;
          actor_type: string;
          correlation_id: string | null;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id: string;
          metadata: Json;
          occurred_at: string;
          request_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          actor_type: string;
          correlation_id?: string | null;
          entity_id: string;
          entity_type: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          actor_type?: string;
          correlation_id?: string | null;
          entity_id?: string;
          entity_type?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          request_id?: string | null;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          attempt_count: number;
          error_message: string | null;
          event_type: string;
          id: string;
          lease_expires_at: string | null;
          processing_started_at: string | null;
          processed_at: string | null;
          received_at: string;
          status: string;
          stripe_event_id: string;
        };
        Insert: {
          attempt_count?: number;
          error_message?: string | null;
          event_type: string;
          id?: string;
          lease_expires_at?: string | null;
          processing_started_at?: string | null;
          processed_at?: string | null;
          received_at?: string;
          status?: string;
          stripe_event_id: string;
        };
        Update: {
          attempt_count?: number;
          error_message?: string | null;
          event_type?: string;
          id?: string;
          lease_expires_at?: string | null;
          processing_started_at?: string | null;
          processed_at?: string | null;
          received_at?: string;
          status?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          caption: string | null;
          capture_committed_at: string;
          delete_after: string;
          filter_used: string | null;
          filtered_key: string | null;
          guest_user_id: string;
          host_id: string;
          id: string;
          object_key: string;
          processed_at: string | null;
          session_id: string;
          status: string;
          thumbnail_key: string | null;
          uploaded_at: string | null;
        };
        Insert: {
          caption?: string | null;
          capture_committed_at?: string;
          delete_after?: string;
          filter_used?: string | null;
          filtered_key?: string | null;
          guest_user_id: string;
          host_id: string;
          id?: string;
          object_key: string;
          processed_at?: string | null;
          session_id: string;
          status?: string;
          thumbnail_key?: string | null;
          uploaded_at?: string | null;
        };
        Update: {
          caption?: string | null;
          capture_committed_at?: string;
          delete_after?: string;
          filter_used?: string | null;
          filtered_key?: string | null;
          guest_user_id?: string;
          host_id?: string;
          id?: string;
          object_key?: string;
          processed_at?: string | null;
          session_id?: string;
          status?: string;
          thumbnail_key?: string | null;
          uploaded_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      sessions: {
        Row: {
          activated_at: string | null;
          allowed_filters: Json | null;
          created_at: string;
          ended_at: string | null;
          ended_by: string | null;
          end_reason: string | null;
          event_timezone: string | null;
          expires_at: string | null;
          filter_mode: string;
          fixed_filter: string | null;
          host_id: string;
          id: string;
          password_hash: string | null;
          roll_preset: number;
          status: string;
          title: string;
          wedding_date_local: string | null;
          wedding_date_update_count: number;
        };
        Insert: {
          activated_at?: string | null;
          allowed_filters?: Json | null;
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          end_reason?: string | null;
          event_timezone?: string | null;
          expires_at?: string | null;
          filter_mode?: string;
          fixed_filter?: string | null;
          host_id: string;
          id?: string;
          password_hash?: string | null;
          roll_preset?: number;
          status?: string;
          title: string;
          wedding_date_local?: string | null;
          wedding_date_update_count?: number;
        };
        Update: {
          activated_at?: string | null;
          allowed_filters?: Json | null;
          created_at?: string;
          ended_at?: string | null;
          ended_by?: string | null;
          end_reason?: string | null;
          event_timezone?: string | null;
          expires_at?: string | null;
          filter_mode?: string;
          fixed_filter?: string | null;
          host_id?: string;
          id?: string;
          password_hash?: string | null;
          roll_preset?: number;
          status?: string;
          title?: string;
          wedding_date_local?: string | null;
          wedding_date_update_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_host_id_fkey";
            columns: ["host_id"];
            isOneToOne: false;
            referencedRelation: "hosts";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      finalize_activation_payment: {
        Args: {
          p_checkout_session_id: string;
          p_payment_intent_id: string | null;
          p_amount: number;
          p_currency: string;
          p_payment_type: string;
          p_session_id: string;
          p_host_id: string;
          p_raw_event_snapshot: Json;
        };
        Returns: string;
      };
      release_guest_shot: {
        Args: {
          p_guest_session_id: string;
        };
        Returns: {
          id: string;
          shots_remaining: number;
          shots_taken: number;
        }[];
      };
      reserve_guest_shot: {
        Args: {
          p_guest_session_id: string;
        };
        Returns: {
          id: string;
          shots_remaining: number;
          shots_taken: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export type Host = Tables<"hosts">;
export type Photo = Tables<"photos">;
export type Discount = Tables<"discounts">;
export type GuestSession = Tables<"guest_sessions">;
export type GuestAuthChallenge = Tables<"guest_auth_challenges">;
export type GuestIdentity = Tables<"guest_identities">;
export type FilterMode = "fixed" | "preset";
export type SessionStatus = "draft" | "active" | "expired";
export type Session = Omit<Tables<"sessions">, "filter_mode" | "allowed_filters" | "status"> & {
  filter_mode: FilterMode;
  allowed_filters: string[] | null;
  status: SessionStatus;
};
