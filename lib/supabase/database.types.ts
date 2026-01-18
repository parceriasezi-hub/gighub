export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          portfolio_url: string | null
          role: string
          permissions: Json
          created_at: string
          updated_at: string
          bio: string | null
          location: string | null
          website: string | null
          phone: string | null
          is_provider: boolean
          provider_status: string | null
          provider_verified_at: string | null
          provider_documents: Json | null
          skills: string[] | null
          hourly_rate: number | null
          availability: Json | null
          rating: number | null
          total_reviews: number
          total_earnings: number
          profile_completion: number
          last_active: string
          notification_preferences: Json
          privacy_settings: Json
          plan: string
          is_online: boolean
          provider_avatar_url: string | null
          provider_full_name: string | null
          vat_number: string | null
          provider_bio: string | null
          provider_website: string | null
          provider_phone: string | null
          provider_experience_years: number | null
          provider_hourly_rate: number | null
          provider_availability: string | null
          provider_rejection_reason: string | null
          provider_application_date: string | null
          provider_emergency_calls: boolean | null
          provider_location: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          portfolio_url?: string | null
          role?: string
          permissions?: Json
          created_at?: string
          updated_at?: string
          bio?: string | null
          location?: string | null
          website?: string | null
          phone?: string | null
          is_provider?: boolean
          provider_status?: string | null
          provider_verified_at?: string | null
          provider_documents?: Json | null
          skills?: string[] | null
          hourly_rate?: number | null
          availability?: Json | null
          rating?: number | null
          total_reviews?: number
          total_earnings?: number
          profile_completion?: number
          last_active?: string
          notification_preferences?: Json
          privacy_settings?: Json
          plan?: string
          is_online?: boolean
          provider_bio?: string | null
          provider_website?: string | null
          provider_phone?: string | null
          provider_experience_years?: number | null
          provider_hourly_rate?: number | null
          provider_availability?: string | null
          provider_rejection_reason?: string | null
          provider_application_date?: string | null
          provider_location?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          portfolio_url?: string | null
          role?: string
          permissions?: Json
          created_at?: string
          updated_at?: string
          bio?: string | null
          location?: string | null
          website?: string | null
          phone?: string | null
          is_provider?: boolean
          provider_status?: string | null
          provider_verified_at?: string | null
          provider_documents?: Json | null
          skills?: string[] | null
          hourly_rate?: number | null
          availability?: Json | null
          rating?: number | null
          total_reviews?: number
          total_earnings?: number
          profile_completion?: number
          last_active?: string
          notification_preferences?: Json
          privacy_settings?: Json
          plan?: string
          is_online?: boolean
          provider_bio?: string | null
          provider_website?: string | null
          provider_phone?: string | null
          provider_experience_years?: number | null
          provider_hourly_rate?: number | null
          provider_availability?: string | null
          provider_rejection_reason?: string | null
          provider_application_date?: string | null
          provider_location?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          last_message_at: string
          gig_id: string | null
          status: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          last_message_at?: string
          gig_id?: string | null
          status?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          last_message_at?: string
          gig_id?: string | null
          status?: string
        }
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
          created_at: string
          last_read_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          created_at?: string
          last_read_at?: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
          created_at?: string
          last_read_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          created_at: string
          is_read: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          created_at?: string
          is_read?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          created_at?: string
          is_read?: boolean
          metadata?: Json | null
        }
      }
      email_templates: {
        Row: {
          id: string
          name: string
          slug: string
          category: string
          subject: string
          body: string
          variables: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          category: string
          subject: string
          body: string
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          category?: string
          subject?: string
          body?: string
          variables?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      gig_responses: {
        Row: {
          id: string
          gig_id: string
          provider_id: string
          client_id: string
          message: string
          proposed_price: number | null
          estimated_delivery_days: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          gig_id: string
          provider_id: string
          client_id: string
          message: string
          proposed_price?: number | null
          estimated_delivery_days?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          gig_id?: string
          provider_id?: string
          client_id?: string
          message?: string
          proposed_price?: number | null
          estimated_delivery_days?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      moderation_alerts: {
        Row: {
          id: string
          type: string
          severity: string
          status: string
          target_type: string
          target_id: string
          reporter_id: string | null
          description: string | null
          metadata: Json
          created_at: string
          updated_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          type: string
          severity: string
          status?: string
          target_type: string
          target_id: string
          reporter_id?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          type?: string
          severity?: string
          status?: string
          target_type?: string
          target_id?: string
          reporter_id?: string | null
          description?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
      }
      moderation_actions: {
        Row: {
          id: string
          alert_id: string
          moderator_id: string
          action_type: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          alert_id: string
          moderator_id: string
          action_type: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          alert_id?: string
          moderator_id?: string
          action_type?: string
          notes?: string | null
          created_at?: string
        }
      }
      user_feedback: {
        Row: {
          id: string
          user_id: string | null
          category: string
          subject: string
          message: string
          rating: number | null
          status: string
          admin_response: string | null
          priority: string
          assigned_to: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          category: string
          subject: string
          message: string
          rating?: number | null
          status?: string
          admin_response?: string | null
          priority?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          category?: string
          subject?: string
          message?: string
          rating?: number | null
          status?: string
          admin_response?: string | null
          priority?: string
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          user_type: string | null
          data: Json | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          user_type?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          user_type?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      providers: {
        Row: {
          id: string
          user_id: string
          experience: string | null
          status: string
          application_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          experience?: string | null
          status?: string
          application_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          experience?: string | null
          status?: string
          application_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          type: "credit" | "debit"
          status: "pending" | "completed" | "failed" | "refunded"
          description: string | null
          metadata: Json | null
          user_type: "client" | "provider" | "both" | "system"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          type: "credit" | "debit"
          status?: "pending" | "completed" | "failed" | "refunded"
          description?: string | null
          metadata?: Json | null
          user_type?: "client" | "provider" | "both" | "system"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          type?: "credit" | "debit"
          status?: "pending" | "completed" | "failed" | "refunded"
          description?: string | null
          metadata?: Json | null
          user_type?: "client" | "provider" | "both" | "system"
          created_at?: string
        }
      }
      plan_limits: {
        Row: {
          id: string
          plan_tier: string
          user_type: string
          contact_views_limit: number
          proposals_limit: number
          gig_responses_limit: number
          has_search_boost: boolean
          has_profile_highlight: boolean
          badge_text: string | null
          reset_period: string
          features: Json
          price: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_tier: string
          user_type?: string
          contact_views_limit?: number
          proposals_limit?: number
          gig_responses_limit?: number
          has_search_boost?: boolean
          has_profile_highlight?: boolean
          badge_text?: string | null
          reset_period?: string
          features?: Json
          price?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_tier?: string
          user_type?: string
          contact_views_limit?: number
          proposals_limit?: number
          gig_responses_limit?: number
          has_search_boost?: boolean
          has_profile_highlight?: boolean
          badge_text?: string | null
          reset_period?: string
          features?: Json
          price?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      usage_history: {
        Row: {
          id: string
          user_id: string
          action_type: string
          target_id: string | null
          target_type: string | null
          credits_used: number
          plan_tier: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          target_id?: string | null
          target_type?: string | null
          credits_used?: number
          plan_tier?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          target_id?: string | null
          target_type?: string | null
          credits_used?: number
          plan_tier?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      job_completions: {
        Row: {
          id: string
          gig_id: string
          provider_id: string
          description: string
          attachments: Json
          status: "pending" | "approved" | "rejected"
          created_at: string
          reviewed_at: string | null
          rejection_reason: string | null
        }
        Insert: {
          id?: string
          gig_id: string
          provider_id: string
          description: string
          attachments?: Json
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          reviewed_at?: string | null
          rejection_reason?: string | null
        }
        Update: {
          id?: string
          gig_id?: string
          provider_id?: string
          description?: string
          attachments?: Json
          status?: "pending" | "approved" | "rejected"
          created_at?: string
          reviewed_at?: string | null
          rejection_reason?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_quotas: {
        Args: {
          p_user_id: string
        }
        Returns: {
          plan_tier: string
          contact_views_used: number
          contact_views_limit: number
          contact_views_remaining: number
          proposals_used: number
          proposals_limit: number
          proposals_remaining: number
          gig_responses_used: number
          gig_responses_limit: number
          gig_responses_remaining: number
          next_reset_date: string
        }[]
      }
      reset_user_quotas: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
