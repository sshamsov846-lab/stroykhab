// ============================================
// ТИПЫ SUPABASE (генерируются автоматически)
// ============================================

export interface Database {
  public: {
    Tables: {
      objects: {
        Row: {
          id: string
          name: string
          address: string
          client_name: string
          client_phone: string
          foreman_id: string
          status: 'new' | 'active' | 'delayed' | 'done'
          budget_total: number
          budget_spent: number
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['objects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['objects']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          object_id: string
          title: string
          description: string | null
          room: string | null
          assigned_to: string | null
          status: 'pending' | 'in_progress' | 'review' | 'done' | 'rejected'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          estimated_hours: number | null
          actual_hours: number | null
          start_date: string | null
          end_date: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          object_id: string
          amount: number
          category: 'materials' | 'tools' | 'salary' | 'transport' | 'other'
          description: string
          receipt_url: string | null
          receipt_data: Record<string, unknown> | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      photos: {
        Row: {
          id: string
          task_id: string | null
          object_id: string
          room: string | null
          photo_url: string
          thumbnail_url: string
          type: 'before' | 'after' | 'progress' | 'defect' | 'hidden_work'
          description: string | null
          taken_by: string
          taken_at: string
          geolocation: { lat: number; lng: number } | null
        }
        Insert: Omit<Database['public']['Tables']['photos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
      }
      users: {
        Row: {
          id: string
          telegram_id: number
          phone: string
          full_name: string
          role: 'foreman' | 'worker' | 'client' | 'supplier'
          avatar_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
    }
  }
}
