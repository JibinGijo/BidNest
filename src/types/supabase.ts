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
      profiles: {
        Row: {
          id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          address: string | null
          phone: string | null
          dob: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          address?: string | null
          phone?: string | null
          dob?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          address?: string | null
          phone?: string | null
          dob?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          title: string
          description: string | null
          starting_price: number
          current_bid: number | null
          image_url: string | null
          seller_id: string
          winner_id: string | null
          status: 'active' | 'ended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          starting_price: number
          current_bid?: number | null
          image_url?: string | null
          seller_id: string
          winner_id?: string | null
          status?: 'active' | 'ended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          starting_price?: number
          current_bid?: number | null
          image_url?: string | null
          seller_id?: string
          winner_id?: string | null
          status?: 'active' | 'ended'
          created_at?: string
          updated_at?: string
        }
      }
      bids: {
        Row: {
          id: string
          listing_id: string
          bidder_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          bidder_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          bidder_id?: string
          amount?: number
          created_at?: string
        }
      }
    }
  }
}