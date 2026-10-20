export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      contatos: {
        Row: {
          canal: string
          id: string
          valor: string
          vendedor_id: string
        }
        Insert: {
          canal: string
          id?: string
          valor: string
          vendedor_id: string
        }
        Update: {
          canal?: string
          id?: string
          valor?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contatos_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: false
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
        ]
      }
      perfis: {
        Row: {
          criado_em: string
          eh_moderador: boolean
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          eh_moderador?: boolean
          id: string
          nome?: string
        }
        Update: {
          criado_em?: string
          eh_moderador?: boolean
          id?: string
          nome?: string
        }
        Relationships: []
      }
      presenca: {
        Row: {
          ativado_em: string
          latitude: number
          longitude: number
          ponto_escolhido: boolean
          referencia: string | null
          ultimo_sinal_em: string
          vendedor_id: string
        }
        Insert: {
          ativado_em?: string
          latitude: number
          longitude: number
          ponto_escolhido?: boolean
          referencia?: string | null
          ultimo_sinal_em?: string
          vendedor_id: string
        }
        Update: {
          ativado_em?: string
          latitude?: number
          longitude?: number
          ponto_escolhido?: boolean
          referencia?: string | null
          ultimo_sinal_em?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'presenca_vendedor_id_fkey'
            columns: ['vendedor_id']
            isOneToOne: true
            referencedRelation: 'vendedores'
            referencedColumns: ['id']
          },
        ]
      }
      vendedores: {
        Row: {
          criado_em: string
          descricao: string | null
          foto_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome_exibicao: string
          perfil_id: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_exibicao: string
          perfil_id: string
          tipo?: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome_exibicao?: string
          perfil_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vendedores_perfil_id_fkey'
            columns: ['perfil_id']
            isOneToOne: true
            referencedRelation: 'perfis'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      no_perimetro_do_campus: {
        Args: { lat: number; lng: number }
        Returns: boolean
      }
      registrar_presenca: {
        Args: {
          lat_ponto?: number
          lat_real: number
          lng_ponto?: number
          lng_real: number
          referencia?: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
