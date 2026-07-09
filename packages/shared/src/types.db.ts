/**
 * Supabase Database types — generated from schema.
 * This is a manual type definition; in production use `supabase gen types` to auto-generate.
 */

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          primary_color: string;
          custom_domain: string | null;
          plan: "starter" | "pro" | "enterprise";
          status: "trial" | "active" | "suspended" | "cancelled";
          vehicle_limit: number;
          user_limit: number;
          mrr_usd: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          auth_id: string;
          email: string;
          full_name: string | null;
          role: "super_admin" | "admin" | "manager" | "driver" | "viewer" | "user";
          permissions: unknown[];
          phone: string | null;
          avatar_url: string | null;
          status: "active" | "inactive" | "suspended";
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          tenant_id: string;
          imei: string;
          protocol: string;
          device_model: string;
          name: string;
          status: "active" | "inactive" | "lost" | "maintenance";
          serial_number: string | null;
          phone_number: string | null;
          sim_number: string | null;
          battery_level: number | null;
          signal_strength: number | null;
          server_ip: string | null;
          server_port: number | null;
          last_position_at: string | null;
          last_seen_at: string | null;
          firmware_version: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["devices"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["devices"]["Insert"]>;
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string | null;
          plate: string;
          name: string;
          make: string | null;
          model: string | null;
          year: number | null;
          vin: string | null;
          status: "active" | "inactive" | "maintenance" | "sold";
          color: string | null;
          group_name: string | null;
          fuel_type: string | null;
          fuel_capacity_liters: number | null;
          odometer_km: number | null;
          speed_limit_kmh: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vehicles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Insert"]>;
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string;
          vehicle_id: string | null;
          lng: number;
          lat: number;
          speed_kmh: number | null;
          course: number | null;
          altitude: number | null;
          accuracy: number | null;
          event_type: string;
          raw_data: unknown;
          recorded_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["positions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["positions"]["Insert"]>;
        Relationships: [];
      };
      geofences: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          kind: "circle" | "polygon";
          center: number[] | null;
          radius_m: number | null;
          points: number[][] | null;
          color: string;
          active: boolean;
          alert_on_enter: boolean;
          alert_on_exit: boolean;
          alert_users: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["geofences"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["geofences"]["Insert"]>;
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string;
          vehicle_id: string | null;
          alert_type: string;
          severity: "info" | "warning" | "critical";
          title: string;
          message: string | null;
          status: "active" | "acknowledged" | "resolved";
          position: unknown | null;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["alerts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          device_id: string;
          start_at: string;
          end_at: string | null;
          start_address: string | null;
          end_address: string | null;
          distance_km: number | null;
          duration_min: number | null;
          max_speed_kmh: number | null;
          avg_speed_kmh: number | null;
          idle_time_min: number | null;
          path: number[][];
          completed: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trips"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["trips"]["Insert"]>;
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          name: string;
          key_hash: string;
          scopes: string[];
          status: "active" | "revoked";
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["api_keys"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Insert"]>;
        Relationships: [];
      };
      webhooks: {
        Row: {
          id: string;
          tenant_id: string;
          url: string;
          events: string[];
          active: boolean;
          secret: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["webhooks"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["webhooks"]["Insert"]>;
        Relationships: [];
      };
      device_commands: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string;
          command: unknown;
          status: "pending" | "sent" | "acked" | "failed" | "expired";
          requested_by: string | null;
          error: string | null;
          sent_at: string | null;
          acked_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["device_commands"]["Row"],
          "id" | "created_at" | "status" | "error" | "sent_at" | "acked_at"
        > &
          Partial<Pick<Database["public"]["Tables"]["device_commands"]["Row"], "status">>;
        Update: Partial<Omit<Database["public"]["Tables"]["device_commands"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
