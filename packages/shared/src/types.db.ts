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
          login_welcome: string | null;
          login_show_powered_by: boolean;
          login_allow_reset: boolean;
          login_2fa: boolean;
          login_bg_url: string | null;
          favicon_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["tenants"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "login_welcome"
          | "login_show_powered_by"
          | "login_allow_reset"
          | "login_2fa"
          | "login_bg_url"
          | "favicon_url"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["tenants"]["Row"],
              | "login_welcome"
              | "login_show_powered_by"
              | "login_allow_reset"
              | "login_2fa"
              | "login_bg_url"
              | "favicon_url"
            >
          >;
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
          last_valid_fix_at: string | null;
          last_gps_valid: boolean | null;
          last_seen_at: string | null;
          last_lat: number | null;
          last_lng: number | null;
          last_speed_kmh: number | null;
          last_course: number | null;
          connection_status: "online" | "offline" | "unknown" | "sleeping";
          ignition: boolean | null;
          engine_cut: boolean;
          engine_hours_min: number;
          traccar_id: number | null;
          last_fuel_level: number | null;
          last_fuel_at: string | null;
          last_fuel_used_l: number | null;
          fuel_profile: unknown;
          ingest_token: string | null;
          firmware_version: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["devices"]["Row"],
          "id" | "created_at" | "updated_at" | "ignition" | "engine_cut" | "engine_hours_min" | "fuel_profile"
        > & {
          ignition?: boolean | null;
          engine_cut?: boolean;
          engine_hours_min?: number;
          fuel_profile?: unknown;
        };
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
          kind: string;
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
          vehicle_id: string | null;
          command: unknown;
          channel: "gprs" | "sms";
          transport: "traccar" | "ingest" | "sms" | "none";
          status: "pending" | "sent" | "acked" | "failed" | "expired" | "cancelled";
          requested_by: string | null;
          requested_by_name: string | null;
          traccar_type: string | null;
          response: unknown;
          error: string | null;
          sent_at: string | null;
          acked_at: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["device_commands"]["Row"],
          | "id"
          | "created_at"
          | "status"
          | "vehicle_id"
          | "channel"
          | "transport"
          | "requested_by_name"
          | "traccar_type"
          | "response"
          | "error"
          | "sent_at"
          | "acked_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["device_commands"]["Row"],
              | "status"
              | "vehicle_id"
              | "channel"
              | "transport"
              | "requested_by_name"
              | "traccar_type"
              | "response"
              | "error"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["device_commands"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      vehicle_profiles: {
        Row: {
          id: string;
          slug: string;
          make: string;
          model: string;
          variant: string | null;
          year_from: number | null;
          year_to: number | null;
          category:
            | "kei"
            | "compact"
            | "sedan"
            | "suv"
            | "pickup"
            | "van"
            | "minibus"
            | "bus"
            | "truck"
            | "other";
          market: string | null;
          voltage: "12V" | "24V" | "hybrid" | "EV";
          difficulty: "easy" | "moderate" | "advanced";
          hybrid_or_ev: boolean;
          canbus: boolean;
          fusebox_notes: string | null;
          cutoff_notes: string | null;
          fuel_sensor_notes: string | null;
          accessories_notes: string | null;
          install_notes: string | null;
          zimbabwe_notes: string | null;
          install_steps: unknown[] | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["vehicle_profiles"]["Row"],
          "id" | "created_at" | "updated_at" | "is_published" | "install_steps"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["vehicle_profiles"]["Row"],
              "is_published" | "install_steps"
            >
          >;
        Update: Partial<
          Omit<Database["public"]["Tables"]["vehicle_profiles"]["Row"], "id" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      hero_slides: {
        Row: {
          id: string;
          sort_order: number;
          title: string;
          description: string;
          cta_label: string;
          cta_href: string;
          image_url: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["hero_slides"]["Row"],
          "id" | "created_at" | "updated_at" | "is_published"
        > &
          Partial<
            Pick<Database["public"]["Tables"]["hero_slides"]["Row"], "is_published">
          >;
        Update: Partial<
          Omit<Database["public"]["Tables"]["hero_slides"]["Row"], "id" | "created_at" | "updated_at">
        >;
        Relationships: [];
      };
      partner_logos: {
        Row: {
          id: string;
          sort_order: number;
          name: string;
          logo_url: string;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["partner_logos"]["Row"],
          "id" | "created_at" | "updated_at" | "is_published" | "logo_url"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["partner_logos"]["Row"],
              "is_published" | "logo_url"
            >
          >;
        Update: Partial<
          Omit<Database["public"]["Tables"]["partner_logos"]["Row"], "id" | "created_at" | "updated_at">
        >;
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
          txn_reference: string | null;
          sender_name: string | null;
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
      marketing_runs: {
        Row: {
          id: string;
          command: string;
          status: string;
          run_secret: string;
          session_id: string | null;
          session_url: string | null;
          summary: string | null;
          prospect_count: number;
          created_by: string | null;
          created_at: string;
          finished_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["marketing_runs"]["Row"], "id" | "created_at" | "status" | "prospect_count" | "session_id" | "session_url" | "summary" | "finished_at"> &
          Partial<Pick<Database["public"]["Tables"]["marketing_runs"]["Row"], "status" | "prospect_count" | "session_id" | "session_url" | "summary" | "finished_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["marketing_runs"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      marketing_prospects: {
        Row: {
          id: string;
          run_id: string | null;
          company: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          whatsapp: string | null;
          location: string | null;
          industry: string | null;
          fleet_estimate: number | null;
          intent: string;
          source: string | null;
          notes: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["marketing_prospects"]["Row"], "id" | "created_at" | "status" | "intent"> &
          Partial<Pick<Database["public"]["Tables"]["marketing_prospects"]["Row"], "status" | "intent">>;
        Update: Partial<Omit<Database["public"]["Tables"]["marketing_prospects"]["Row"], "id" | "created_at">>;
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
      ignition_events: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string;
          vehicle_id: string | null;
          driver_id: string | null;
          kind: "ignition_on" | "ignition_off";
          position: unknown | null;
          recorded_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ignition_events"]["Row"], "id" | "created_at" | "recorded_at"> &
          Partial<Pick<Database["public"]["Tables"]["ignition_events"]["Row"], "recorded_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["ignition_events"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      admin_impersonations: {
        Row: {
          id: string;
          admin_user_id: string;
          tenant_id: string;
          reason: string | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["admin_impersonations"]["Row"], "id" | "started_at" | "ended_at"> &
          Partial<Pick<Database["public"]["Tables"]["admin_impersonations"]["Row"], "id" | "started_at" | "ended_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["admin_impersonations"]["Row"], "id" | "admin_user_id" | "tenant_id" | "started_at">>;
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          value: unknown;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["platform_settings"]["Row"], "updated_at"> &
          Partial<Pick<Database["public"]["Tables"]["platform_settings"]["Row"], "updated_at">>;
        Update: Partial<Omit<Database["public"]["Tables"]["platform_settings"]["Row"], "key">>;
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
          billing_unit: string;
          sort: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["plans"]["Row"], "id" | "created_at" | "updated_at" | "active" | "features" | "sort" | "billing_unit"> &
          Partial<Pick<Database["public"]["Tables"]["plans"]["Row"], "active" | "features" | "sort" | "billing_unit">>;
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
      quotations: {
        Row: {
          id: string;
          number: string;
          client_name: string;
          client_email: string | null;
          kind: "client" | "partner";
          amount_usd: number;
          currency: string;
          status: "draft" | "sent" | "accepted" | "declined" | "expired";
          notes: string | null;
          valid_until: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["quotations"]["Row"],
          | "id"
          | "number"
          | "created_at"
          | "updated_at"
          | "status"
          | "currency"
          | "amount_usd"
          | "kind"
          | "client_email"
          | "notes"
          | "valid_until"
          | "sent_at"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["quotations"]["Row"],
              "status" | "currency" | "amount_usd" | "kind" | "client_email" | "notes" | "valid_until" | "sent_at"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["quotations"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          kind: "installer" | "reseller";
          contact_email: string | null;
          country: string | null;
          status: "application" | "approved" | "active" | "suspended";
          notes: string | null;
          applied_at: string;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["partners"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "applied_at"
          | "approved_at"
          | "status"
          | "contact_email"
          | "country"
          | "notes"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["partners"]["Row"],
              "status" | "applied_at" | "approved_at" | "contact_email" | "country" | "notes"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["partners"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string | null;
          author_name: string;
          author_email: string | null;
          category: "bug" | "feature" | "praise" | "complaint";
          message: string;
          rating: number | null;
          status: "new" | "reviewed" | "actioned" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["feedback"]["Row"],
          "id" | "created_at" | "updated_at" | "status" | "category" | "tenant_id" | "user_id" | "author_email" | "rating"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["feedback"]["Row"],
              "status" | "category" | "tenant_id" | "user_id" | "author_email" | "rating"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["feedback"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      legal_documents: {
        Row: {
          id: string;
          title: string;
          version: string;
          status: "draft" | "published" | "archived";
          content: string | null;
          effective_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["legal_documents"]["Row"],
          "id" | "created_at" | "updated_at" | "status" | "content" | "effective_at" | "created_by"
        > &
          Partial<
            Pick<Database["public"]["Tables"]["legal_documents"]["Row"], "status" | "content" | "effective_at" | "created_by">
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["legal_documents"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      fleet_delegates: {
        Row: {
          id: string;
          name: string;
          email: string;
          organization: string;
          role: "user" | "reseller";
          granted_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["fleet_delegates"]["Row"], "id" | "created_at" | "granted_by"> &
          Partial<Pick<Database["public"]["Tables"]["fleet_delegates"]["Row"], "granted_by">>;
        Update: Partial<Omit<Database["public"]["Tables"]["fleet_delegates"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      device_groups: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["device_groups"]["Row"],
          "id" | "created_at" | "tenant_id" | "color"
        > &
          Partial<Pick<Database["public"]["Tables"]["device_groups"]["Row"], "tenant_id" | "color">>;
        Update: Partial<Omit<Database["public"]["Tables"]["device_groups"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      sms_gateways: {
        Row: {
          id: string;
          name: string;
          provider: string;
          sender_id: string | null;
          credentials: unknown;
          is_default: boolean;
          status: "active" | "inactive";
          balance_usd: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["sms_gateways"]["Row"],
          "id" | "created_at" | "updated_at" | "sender_id" | "credentials" | "is_default" | "status" | "balance_usd"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["sms_gateways"]["Row"],
              "sender_id" | "credentials" | "is_default" | "status" | "balance_usd"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["sms_gateways"]["Row"], "id" | "created_at">>;
        Relationships: [];
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          kind: "system" | "alert" | "billing" | "digest";
          subject: string;
          body: string;
          tenant_id: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["email_templates"]["Row"],
          "id" | "created_at" | "updated_at" | "kind" | "subject" | "body" | "tenant_id"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["email_templates"]["Row"],
              "kind" | "subject" | "body" | "tenant_id"
            >
          >;
        Update: Partial<Omit<Database["public"]["Tables"]["email_templates"]["Row"], "id" | "created_at">>;
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
      increment_engine_hours: {
        Args: { p_device_id: string; p_minutes: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
