export type FilterMode = "fixed" | "preset"
export type SessionStatus = "draft" | "active" | "expired"
export type PhotoStatus = "pending_upload" | "uploaded" | "processed" | "failed"
export type PaymentStatus = "pending" | "succeeded" | "failed"

export interface Host {
  id: string
  email: string
  name: string
  image: string | null
  created_at: string
}

export interface Session {
  id: string
  host_id: string
  title: string
  password_hash: string | null
  filter_mode: FilterMode
  fixed_filter: string | null
  allowed_filters: string[] | null
  roll_preset: number
  status: SessionStatus
  activated_at: string | null
  expires_at: string | null
  created_at: string
}

export interface GuestSession {
  id: string
  session_id: string
  guest_user_id: string
  shots_taken: number
  shots_remaining: number
  created_at: string
  updated_at: string
}

export interface GuestIdentity {
  id: string
  email: string
  created_at: string
}

export interface GuestAuthChallenge {
  id: string
  session_id: string
  email: string
  otp_hash: string
  expires_at: string
  attempts: number
  consumed_at: string | null
  created_at: string
}

export interface Photo {
  id: string
  session_id: string
  host_id: string
  guest_user_id: string
  object_key: string
  filter_used: string | null
  filtered_key: string | null
  thumbnail_key: string | null
  capture_committed_at: string
  uploaded_at: string | null
  processed_at: string | null
  status: PhotoStatus
  delete_after: string
}

export interface Payment {
  id: string
  session_id: string
  host_id: string
  provider: string
  checkout_session_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  paid_at: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      hosts: {
        Row: Host
        Insert: Omit<Host, "created_at">
        Update: Partial<Omit<Host, "id">>
        Relationships: []
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, "id" | "created_at" | "activated_at" | "expires_at" | "status">
        Update: Partial<Omit<Session, "id">>
        Relationships: []
      }
      guest_sessions: {
        Row: GuestSession
        Insert: Omit<GuestSession, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<GuestSession, "id">>
        Relationships: []
      }
      guest_identities: {
        Row: GuestIdentity
        Insert: Omit<GuestIdentity, "id" | "created_at">
        Update: Partial<Omit<GuestIdentity, "id" | "created_at">>
        Relationships: []
      }
      guest_auth_challenges: {
        Row: GuestAuthChallenge
        Insert: Omit<GuestAuthChallenge, "id" | "created_at" | "attempts" | "consumed_at">
        Update: Partial<Omit<GuestAuthChallenge, "id" | "created_at">>
        Relationships: []
      }
      photos: {
        Row: Photo
        Insert: Omit<Photo, "id" | "uploaded_at" | "filtered_key" | "thumbnail_key" | "processed_at">
        Update: Partial<Omit<Photo, "id">>
        Relationships: []
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, "id" | "created_at" | "paid_at">
        Update: Partial<Omit<Payment, "id">>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
