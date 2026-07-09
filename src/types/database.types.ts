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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string
          file_id: string | null
          folder_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          folder_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          deleted_at: string | null
          folder_id: string | null
          id: string
          last_accessed_at: string
          mime_type: string | null
          name: string
          owner_id: string
          repository_id: string | null
          size_bytes: number
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          last_accessed_at?: string
          mime_type?: string | null
          name: string
          owner_id: string
          repository_id?: string | null
          size_bytes?: number
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          last_accessed_at?: string
          mime_type?: string | null
          name?: string
          owner_id?: string
          repository_id?: string | null
          size_bytes?: number
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_shares: {
        Row: {
          created_at: string
          folder_id: string
          granted_by: string
          id: string
          permission: Database["public"]["Enums"]["share_permission"]
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          granted_by: string
          id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          granted_by?: string
          id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_shares_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_locked: boolean
          name: string
          owner_id: string
          parent_id: string | null
          repository_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean
          name: string
          owner_id: string
          parent_id?: string | null
          repository_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_locked?: boolean
          name?: string
          owner_id?: string
          parent_id?: string | null
          repository_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          must_change_password: boolean
          role: Database["public"]["Enums"]["user_role"]
          storage_quota_bytes: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          storage_quota_bytes?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          must_change_password?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          storage_quota_bytes?: number
        }
        Relationships: []
      }
      repositories: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          quota_bytes: number
          root_folder_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          quota_bytes?: number
          root_folder_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          quota_bytes?: number
          root_folder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repositories_root_folder_id_fkey"
            columns: ["root_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          file_id: string | null
          folder_id: string | null
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          file_id?: string | null
          folder_id?: string | null
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_all_folders: {
        Args: never
        Returns: {
          id: string
          name: string
          owner_email: string
          owner_id: string
          parent_id: string
        }[]
      }
      create_repository: {
        Args: { p_name: string; p_quota_bytes: number }
        Returns: {
          repository_id: string
          root_folder_id: string
        }[]
      }
      get_repository_usage: {
        Args: { p_repository_id: string }
        Returns: {
          quota_bytes: number
          used_bytes: number
        }[]
      }
      get_storage_usage: {
        Args: { p_user: string }
        Returns: {
          quota_bytes: number
          used_bytes: number
        }[]
      }
      list_public_folder_files: {
        Args: { p_token: string }
        Returns: {
          id: string
          mime_type: string
          name: string
          size_bytes: number
          storage_path: string
        }[]
      }
      object_has_valid_public_link: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      purge_old_trash: { Args: never; Returns: undefined }
      resolve_share_link: {
        Args: { p_token: string }
        Returns: {
          id: string
          kind: string
          mime_type: string
          name: string
          size_bytes: number
          storage_path: string
        }[]
      }
      restore_folder: { Args: { p_folder_id: string }; Returns: undefined }
      soft_delete_folder: { Args: { p_folder_id: string }; Returns: undefined }
      user_can_access_folder: {
        Args: { p_folder_id: string; p_user: string }
        Returns: boolean
      }
      user_can_access_storage_object: {
        Args: { p_object_name: string; p_user: string }
        Returns: boolean
      }
      user_can_edit_folder: {
        Args: { p_folder_id: string; p_user: string }
        Returns: boolean
      }
      user_can_edit_storage_object: {
        Args: { p_object_name: string; p_user: string }
        Returns: boolean
      }
    }
    Enums: {
      share_permission: "view_edit"
      user_role: "admin" | "manager" | "user" | "guest"
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
    Enums: {
      share_permission: ["view_edit"],
      user_role: ["admin", "manager", "user", "guest"],
    },
  },
} as const
