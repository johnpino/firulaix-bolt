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
      reports: {
        Row: {
          id: string
          lat: number
          lng: number
          image_url: string
          type: 'dog' | 'cat' | 'other'
          description: string
          timestamp: string
          status: 'active' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          image_url: string
          type: 'dog' | 'cat' | 'other'
          description: string
          timestamp?: string
          status?: 'active' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          image_url?: string
          type?: 'dog' | 'cat' | 'other'
          description?: string
          timestamp?: string
          status?: 'active' | 'resolved'
          created_at?: string
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