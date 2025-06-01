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
      whatsapp_messages: {
        Row: {
          id: string
          sender_id: string
          sender_name: string
          message: string
          message_type: string
          timestamp: string
          ai_response: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          sender_name: string
          message: string
          message_type: string
          timestamp: string
          ai_response: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          sender_name?: string
          message?: string
          message_type?: string
          timestamp?: string
          ai_response?: string
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