// Temporary types for new database structure
// TODO: Replace with auto-generated types from Supabase Dashboard

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
      data_nodes: {
        Row: {
          id: string
          node_id: string
          node_name: string
          node_type: string
          location: string | null
          assigned_user_id: string | null
          is_active: boolean
          last_active_timestamp: string
          created_at: string
          updated_at: string
          notes: string | null
          hardware_version: string | null
          firmware_version: string | null
        }
        Insert: {
          id?: string
          node_id: string
          node_name: string
          node_type?: string
          location?: string | null
          assigned_user_id?: string | null
          is_active?: boolean
          last_active_timestamp?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          hardware_version?: string | null
          firmware_version?: string | null
        }
        Update: {
          id?: string
          node_id?: string
          node_name?: string
          node_type?: string
          location?: string | null
          assigned_user_id?: string | null
          is_active?: boolean
          last_active_timestamp?: string
          created_at?: string
          updated_at?: string
          notes?: string | null
          hardware_version?: string | null
          firmware_version?: string | null
        }
      }
      control_rules: {
        Row: {
          id: string
          rule_name: string
          description: string | null
          node_id: string | null
          sensor_type: string
          condition_type: string
          threshold_value_1: number
          threshold_value_2: number | null
          action_type: string
          action_target: string | null
          action_command: string | null
          notification_message: string | null
          is_enabled: boolean
          priority: number
          cooldown_minutes: number
          last_triggered_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          description?: string | null
          node_id?: string | null
          sensor_type: string
          condition_type: string
          threshold_value_1: number
          threshold_value_2?: number | null
          action_type: string
          action_target?: string | null
          action_command?: string | null
          notification_message?: string | null
          is_enabled?: boolean
          priority?: number
          cooldown_minutes?: number
          last_triggered_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          description?: string | null
          node_id?: string | null
          sensor_type?: string
          condition_type?: string
          threshold_value_1?: number
          threshold_value_2?: number | null
          action_type?: string
          action_target?: string | null
          action_command?: string | null
          notification_message?: string | null
          is_enabled?: boolean
          priority?: number
          cooldown_minutes?: number
          last_triggered_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      control_actions_log: {
        Row: {
          id: string
          rule_id: string | null
          node_id: string | null
          sensor_reading_id: string | null
          action_type: string
          action_target: string | null
          action_command: string | null
          trigger_value: number | null
          threshold_value: number | null
          status: string
          execution_time: string
          completion_time: string | null
          error_message: string | null
          notification_sent: boolean
          notification_recipients: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id?: string | null
          node_id?: string | null
          sensor_reading_id?: string | null
          action_type: string
          action_target?: string | null
          action_command?: string | null
          trigger_value?: number | null
          threshold_value?: number | null
          status?: string
          execution_time?: string
          completion_time?: string | null
          error_message?: string | null
          notification_sent?: boolean
          notification_recipients?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string | null
          node_id?: string | null
          sensor_reading_id?: string | null
          action_type?: string
          action_target?: string | null
          action_command?: string | null
          trigger_value?: number | null
          threshold_value?: number | null
          status?: string
          execution_time?: string
          completion_time?: string | null
          error_message?: string | null
          notification_sent?: boolean
          notification_recipients?: string[] | null
          created_at?: string
        }
      }
      news_articles: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          content: string
          summary: string | null
          featured_image_url: string | null
          thumbnail_url: string | null
          category: string
          tags: string[] | null
          related_crops: string[] | null
          priority: number
          is_featured: boolean
          is_published: boolean
          author: string | null
          source_name: string | null
          source_url: string | null
          view_count: number
          likes_count: number
          published_at: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          subtitle?: string | null
          content: string
          summary?: string | null
          featured_image_url?: string | null
          thumbnail_url?: string | null
          category?: string
          tags?: string[] | null
          related_crops?: string[] | null
          priority?: number
          is_featured?: boolean
          is_published?: boolean
          author?: string | null
          source_name?: string | null
          source_url?: string | null
          view_count?: number
          likes_count?: number
          published_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          subtitle?: string | null
          content?: string
          summary?: string | null
          featured_image_url?: string | null
          thumbnail_url?: string | null
          category?: string
          tags?: string[] | null
          related_crops?: string[] | null
          priority?: number
          is_featured?: boolean
          is_published?: boolean
          author?: string | null
          source_name?: string | null
          source_url?: string | null
          view_count?: number
          likes_count?: number
          published_at?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      sensor_readings: {
        Row: {
          id: string
          node_id: string
          temperature: number | null
          humidity: number | null
          soil_moisture: number | null
          air_quality_mq135: number | null
          alcohol_mq3: number | null
          smoke_mq2: number | null
          timestamp: string
        }
        Insert: {
          id?: string
          node_id: string
          temperature?: number | null
          humidity?: number | null
          soil_moisture?: number | null
          air_quality_mq135?: number | null
          alcohol_mq3?: number | null
          smoke_mq2?: number | null
          timestamp?: string
        }
        Update: {
          id?: string
          node_id?: string
          temperature?: number | null
          humidity?: number | null
          soil_moisture?: number | null
          air_quality_mq135?: number | null
          alcohol_mq3?: number | null
          smoke_mq2?: number | null
          timestamp?: string
        }
      }
      alerts: {
        Row: {
          id: string
          user_id: string | null
          message: string
          severity: string
          is_read: boolean
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          message: string
          severity?: string
          is_read?: boolean
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          message?: string
          severity?: string
          is_read?: boolean
          timestamp?: string
        }
      }
      user_profiles: {
        Row: {
          user_id: string
          name: string | null
          email: string | null
          role: string
          preferred_language: string
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name?: string | null
          email?: string | null
          role?: string
          preferred_language?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          name?: string | null
          email?: string | null
          role?: string
          preferred_language?: string
          theme?: string
          created_at?: string
          updated_at?: string
        }
      }
      farm_tasks: {
        Row: {
          id: string
          user_id: string | null
          task_description: string
          due_date: string | null
          is_completed: boolean
          priority: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          task_description: string
          due_date?: string | null
          is_completed?: boolean
          priority?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          task_description?: string
          due_date?: string | null
          is_completed?: boolean
          priority?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      evaluate_control_rules: {
        Args: {
          p_node_id: string
          p_sensor_type: string
          p_sensor_value: number
        }
        Returns: {
          rule_id: string
          should_trigger: boolean
          action_type: string
          action_target: string
          action_command: string
          notification_message: string
        }[]
      }
      log_control_action: {
        Args: {
          p_rule_id: string
          p_node_id: string
          p_sensor_reading_id: string
          p_action_type: string
          p_action_target: string
          p_action_command: string
          p_trigger_value: number
          p_threshold_value: number
        }
        Returns: string
      }
      get_personalized_news: {
        Args: {
          p_user_id?: string
          p_limit?: number
        }
        Returns: {
          id: string
          title: string
          subtitle: string
          summary: string
          category: string
          tags: string[]
          featured_image_url: string
          is_featured: boolean
          published_at: string
          relevance_score: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
