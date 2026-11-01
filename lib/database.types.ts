/**
 * Supabase Database Types — generated from schema.sql
 * Keep in sync with supabase/schema.sql whenever you run migrations.
 */

export type UserRole = 'customer' | 'delivery_partner';
export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';
export type FulfillmentType = 'pickup' | 'delivery';
export type DeliveryStatus = 'assigned' | 'picked_up' | 'delivered';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          hostel_block: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name?: string | null;
          phone?: string | null;
          hostel_block?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          hostel_block?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      outlets: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          image_url: string | null;
          rating: number | null;
          eta_text: string | null;
          open_hours: string | null;
          is_open: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          image_url?: string | null;
          rating?: number | null;
          eta_text?: string | null;
          open_hours?: string | null;
          is_open?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['outlets']['Insert']>;
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          outlet_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category: string | null;
          is_veg: boolean;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          category?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          outlet_id: string;
          status: OrderStatus;
          fulfillment: FulfillmentType;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          outlet_id: string;
          status?: OrderStatus;
          fulfillment: FulfillmentType;
          total: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          qty: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id: string;
          qty: number;
          unit_price: number;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          partner_id: string;
          status: DeliveryStatus;
          earnings: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          partner_id: string;
          status?: DeliveryStatus;
          earnings?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['deliveries']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      fulfillment_type: FulfillmentType;
      delivery_status: DeliveryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
