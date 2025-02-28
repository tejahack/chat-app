export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          created_at: string
          text: string
          user_id: string
          user_display_name: string
          user_avatar_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          text: string
          user_id: string
          user_display_name: string
          user_avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          text?: string
          user_id?: string
          user_display_name?: string
          user_avatar_url?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          display_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          display_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          display_name?: string | null
          avatar_url?: string | null
        }
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
  }
}