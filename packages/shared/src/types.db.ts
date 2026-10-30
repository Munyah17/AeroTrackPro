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
          plan: "starter" | "basic" | "standard" | "pro" | "enterprise";
          status: "trial" | "active" | "suspended" | "cancelled";
          vehicle_limit: number;
          user_limit: number;
          mrr_usd: number;
          account_kind: "platform" | "owner" | "reseller" | "client";
          parent_tenant_id: string | null;
          contact_email: string | null;
          logo_url: string | null;
          domain_status: "pending" | "active" | "failed";
          trial_ends_at: string | null;
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
          role: "super_admin" | "admin" | "manager" | "dispatcher" | "driver" | "viewer" | "user";
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
          last_lat: number | null;
          last_lng: number | null;
          last_speed_kmh: number | null;
          last_course: number | null;
          connection_status: "online" | "offline" | "unknown";
          traccar_id: number | null;
          last_fuel_level: number | null;
          last_fuel_at: string | null;
          last_fuel_used_l: number | null;
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
          driver_id: string | null;
          group_id: string | null;
          insurance_expiry: string | null;
          license_expiry: string | null;
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
      fuel_coupons: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          amount_usd: number | null;
          litres: number | null;
          fuel_type: "diesel" | "petrol" | "any";
          driver_id: string | null;
          driver_name: string | null;
          vehicle_id: string | null;
          issued_by: string | null;
          status: "active" | "redeemed" | "expired" | "void";
          expires_at: string | null;
          notes: string | null;
          redeemed_at: string | null;
          redeemed_station: string | null;
          redeemed_litres: number | null;
          redeemed_amount_usd: number | null;
          redeemed_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["fuel_coupons"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "status"
          | "redeemed_at"
          | "redeemed_station"
          | "redeemed_litres"
          | "redeemed_amount_usd"
          | "redeemed_ref"
        > &
          Partial<Pick<Database["public"]["Tables"]["fuel_coupons"]["Row"], "status">>;
        Update: Partial<Omit<Database["public"]["Tables"]["fuel_coupons"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      fuel_stations: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          brand: string | null;
          town: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fuel_stations"]["Row"], "id" | "created_at" | "active"> &
          Partial<Pick<Database["public"]["Tables"]["fuel_stations"]["Row"], "active">>;
        Update: Partial<Omit<Database["public"]["Tables"]["fuel_stations"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          license_number: string | null;
          license_expiry: string | null;
          rfid_tag: string | null;
          status: "active" | "inactive" | "suspended";
          vehicle_id: string | null;
          behavior_score: number;
          risk_level: "low" | "medium" | "high";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["drivers"]["Row"],
          "id" | "created_at" | "updated_at" | "status" | "behavior_score" | "risk_level"
        > &
          Partial<Pick<Database["public"]["Tables"]["drivers"]["Row"], "status" | "behavior_score" | "risk_level">>;
        Update: Partial<Omit<Database["public"]["Tables"]["drivers"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      vehicle_groups: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vehicle_groups"]["Row"], "id" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["vehicle_groups"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      fuel_records: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          device_id: string | null;
          coupon_id: string | null;
          kind: "refill" | "consumption" | "theft";
          litres: number;
          cost_usd: number | null;
          odometer_km: number | null;
          level_after_pct: number | null;
          station: string | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fuel_records"]["Row"], "id" | "created_at" | "recorded_at"> &
          Partial<Pick<Database["public"]["Tables"]["fuel_records"]["Row"], "recorded_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["fuel_records"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string;
          company: string | null;
          fleet_size: number | null;
          services: string[];
          message: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at" | "status"> &
          Partial<Pick<Database["public"]["Tables"]["leads"]["Row"], "status">>;
        Update: Partial<Omit<Database["public"]["Tables"]["leads"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          lead_id: string | null;
          reference: string;
          amount: number;
          method: string;
          channel: string;
          status: string;
          payer_phone: string | null;
          poll_url: string | null;
          instructions: string | null;
          gateway_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> &
          Required<Pick<Database["public"]["Tables"]["payments"]["Row"], "reference" | "amount" | "method">>;
        Update: Partial<Omit<Database["public"]["Tables"]["payments"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      maintenance_items: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          title: string;
          type: "service" | "inspection" | "tyres" | "battery" | "brakes" | "oil" | "other";
          status: "upcoming" | "overdue" | "completed";
          due_date: string | null;
          due_odometer_km: number | null;
          repeat_every_km: number | null;
          repeat_every_months: number | null;
          cost_usd: number | null;
          provider: string | null;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["maintenance_items"]["Row"],
          "id" | "created_at" | "updated_at" | "status" | "completed_at"
        > &
          Partial<Pick<Database["public"]["Tables"]["maintenance_items"]["Row"], "status" | "completed_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["maintenance_items"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      insurance_policies: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          policy_number: string;
          provider: string;
          coverage: string | null;
          premium_usd: number | null;
          start_date: string | null;
          expiry_date: string;
          status: "active" | "expired" | "cancelled";
          document_path: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["insurance_policies"]["Row"],
          "id" | "created_at" | "updated_at" | "status"
        > &
          Partial<Pick<Database["public"]["Tables"]["insurance_policies"]["Row"], "status">>;
        Update: Partial<Omit<Database["public"]["Tables"]["insurance_policies"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      driver_events: {
        Row: {
          id: string;
          tenant_id: string;
          driver_id: string | null;
          vehicle_id: string | null;
          device_id: string | null;
          type: "harsh_braking" | "harsh_acceleration" | "harsh_cornering" | "overspeed" | "idling" | "crash";
          speed_kmh: number | null;
          position: unknown | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["driver_events"]["Row"], "id" | "created_at" | "recorded_at"> &
          Partial<Pick<Database["public"]["Tables"]["driver_events"]["Row"], "recorded_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["driver_events"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          tenant_id: string;
          generated_by: string | null;
          type: string;
          params: unknown;
          file_path: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          price_monthly_usd: number;
          max_vehicles: number | null;
          max_users: number | null;
          features: string[];
          active: boolean;
          sort: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["plans"]["Row"], "id" | "created_at" | "updated_at" | "active" | "features" | "sort"> &
          Partial<Pick<Database["public"]["Tables"]["plans"]["Row"], "active" | "features" | "sort">>;
        Update: Partial<Omit<Database["public"]["Tables"]["plans"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      tenant_addons: {
        Row: {
          id: string;
          tenant_id: string;
          module: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenant_addons"]["Row"], "id" | "created_at" | "active"> &
          Partial<Pick<Database["public"]["Tables"]["tenant_addons"]["Row"], "active">>;
        Update: Partial<Omit<Database["public"]["Tables"]["tenant_addons"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          tenant_id: string;
          number: string;
          amount_usd: number;
          status: "paid" | "pending" | "overdue" | "failed" | "void";
          items: unknown;
          issued_at: string;
          due_at: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at" | "status" | "issued_at" | "items"> &
          Partial<Pick<Database["public"]["Tables"]["invoices"]["Row"], "status" | "issued_at" | "items">>;
        Update: Partial<Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          subject: string;
          status: "open" | "in_progress" | "resolved" | "closed";
          priority: "low" | "medium" | "high" | "urgent";
          last_reply_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["support_tickets"]["Row"],
          "id" | "created_at" | "updated_at" | "status" | "priority" | "last_reply_at"
        > &
          Partial<Pick<Database["public"]["Tables"]["support_tickets"]["Row"], "status" | "priority" | "last_reply_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["support_tickets"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      ticket_replies: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string | null;
          author_name: string;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ticket_replies"]["Row"], "id" | "created_at">;
        Update: Partial<Omit<Database["public"]["Tables"]["ticket_replies"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          body: string | null;
          audience: "all" | "resellers" | "specific";
          tenant_ids: string[] | null;
          status: "draft" | "published";
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["announcements"]["Row"],
          "id" | "created_at" | "updated_at" | "audience" | "tenant_ids" | "status" | "published_at"
        > &
          Partial<Pick<Database["public"]["Tables"]["announcements"]["Row"], "audience" | "tenant_ids" | "status" | "published_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["announcements"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          user_name: string;
          action: string;
          module: string;
          ip: string | null;
          metadata: unknown;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "created_at" | "metadata"> &
          Partial<Pick<Database["public"]["Tables"]["activity_logs"]["Row"], "metadata">>;
        Update: Partial<Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at" | "type" | "read_at"> &
          Partial<Pick<Database["public"]["Tables"]["notifications"]["Row"], "type" | "read_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          event_type: string;
          in_app_enabled: boolean;
          email_enabled: boolean;
          sms_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_preferences"]["Row"], "id" | "created_at" | "updated_at" | "in_app_enabled" | "email_enabled" | "sms_enabled"> &
          Partial<Pick<Database["public"]["Tables"]["notification_preferences"]["Row"], "in_app_enabled" | "email_enabled" | "sms_enabled">>;
        Update: Partial<Omit<Database["public"]["Tables"]["notification_preferences"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          event_type: string;
          channel: "in_app" | "email" | "sms";
          destination: string | null;
          status: "sent" | "failed";
          detail: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notification_deliveries"]["Row"], "id" | "created_at" | "status"> &
          Partial<Pick<Database["public"]["Tables"]["notification_deliveries"]["Row"], "status">>;
        Update: Partial<Omit<Database["public"]["Tables"]["notification_deliveries"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_fuel_coupon: {
        Args: {
          p_code: string;
          p_station: string;
          p_litres?: number;
          p_amount?: number;
          p_ref?: string;
        };
        Returns: unknown;
      };
      auth_tenant_id: { Args: Record<string, never>; Returns: string };
      auth_user_role: { Args: Record<string, never>; Returns: string };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
