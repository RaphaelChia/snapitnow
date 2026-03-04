export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      guest_auth_challenges: {
        Row: {
          attempts: number
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_hash: string
          session_id: string
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_hash: string
          session_id: string
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_auth_challenges_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_identities: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      guest_sessions: {
        Row: {
          created_at: string
          guest_user_id: string
          id: string
          session_id: string
          shots_remaining: number
          shots_taken: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_user_id: string
          id?: string
          session_id: string
          shots_remaining: number
          shots_taken?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_user_id?: string
          id?: string
          session_id?: string
          shots_remaining?: number
          shots_taken?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          created_at: string
          email: string
          id: string
          image: string | null
          last_login_at: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          image?: string | null
          last_login_at?: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          image?: string | null
          last_login_at?: string
          name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          checkout_session_id: string | null
          created_at: string
          currency: string
          host_id: string
          id: string
          paid_at: string | null
          provider: string
          session_id: string
          status: string
        }
        Insert: {
          amount: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          host_id: string
          id?: string
          paid_at?: string | null
          provider?: string
          session_id: string
          status?: string
        }
        Update: {
          amount?: number
          checkout_session_id?: string | null
          created_at?: string
          currency?: string
          host_id?: string
          id?: string
          paid_at?: string | null
          provider?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          capture_committed_at: string
          delete_after: string
          filter_used: string | null
          filtered_key: string | null
          guest_user_id: string
          host_id: string
          id: string
          object_key: string
          processed_at: string | null
          session_id: string
          status: string
          thumbnail_key: string | null
          uploaded_at: string | null
        }
        Insert: {
          capture_committed_at?: string
          delete_after?: string
          filter_used?: string | null
          filtered_key?: string | null
          guest_user_id: string
          host_id: string
          id?: string
          object_key: string
          processed_at?: string | null
          session_id: string
          status?: string
          thumbnail_key?: string | null
          uploaded_at?: string | null
        }
        Update: {
          capture_committed_at?: string
          delete_after?: string
          filter_used?: string | null
          filtered_key?: string | null
          guest_user_id?: string
          host_id?: string
          id?: string
          object_key?: string
          processed_at?: string | null
          session_id?: string
          status?: string
          thumbnail_key?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          activated_at: string | null
          allowed_filters: Json | null
          created_at: string
          expires_at: string | null
          filter_mode: string
          fixed_filter: string | null
          host_id: string
          id: string
          password_hash: string | null
          roll_preset: number
          status: string
          title: string
        }
        Insert: {
          activated_at?: string | null
          allowed_filters?: Json | null
          created_at?: string
          expires_at?: string | null
          filter_mode?: string
          fixed_filter?: string | null
          host_id: string
          id?: string
          password_hash?: string | null
          roll_preset?: number
          status?: string
          title: string
        }
        Update: {
          activated_at?: string | null
          allowed_filters?: Json | null
          created_at?: string
          expires_at?: string | null
          filter_mode?: string
          fixed_filter?: string | null
          host_id?: string
          id?: string
          password_hash?: string | null
          roll_preset?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
