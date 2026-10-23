export interface InventoryItem {
  id: string;
  created_at?: string;
  updated_at?: string;
  title?: string;
  name?: string;
  description?: string;
  sku?: string;
  condition?: string;
  status?: string;
  category?: string;
  brand?: string;
  model?: string;
  colour?: string;
  color?: string;
  size?: string;
  weight?: number;
  cost_price?: number;
  purchase_price?: number;
  valuation?: number;
  sale_price?: number;
  listed_price?: number;
  images?: string[];
  image_url?: string;
  location?: string;
  notes?: string;
  user_id?: string;
  business_id?: string;
  tenant_id?: string;
  identification_data?: Record<string, unknown>;
  identified?: boolean;
  confidence?: number;
  [key: string]: unknown;
}

export interface Listing {
  id: string;
  created_at?: string;
  updated_at?: string;
  title?: string;
  item_id?: string;
  inventory_id?: string;
  platform?: string;
  status?: string;
  price?: number;
  listing_id?: string;
  external_id?: string;
  url?: string;
  ebay_listing_id?: string;
  category?: string;
  views?: number;
  watchers?: number;
  bids?: number;
  condition?: string;
  end_time?: string;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  created_at?: string;
  updated_at?: string;
  order_id?: string;
  external_order_id?: string;
  platform?: string;
  status?: string;
  buyer_name?: string;
  buyer_username?: string;
  buyer_email?: string;
  total_amount?: number;
  sale_price?: number;
  shipping_cost?: number;
  item_id?: string;
  listing_id?: string;
  item_title?: string;
  dispatch_by?: string;
  dispatched_at?: string;
  tracking_number?: string;
  carrier?: string;
  [key: string]: unknown;
}

export interface Acquisition {
  id: string;
  created_at?: string;
  source?: string;
  platform?: string;
  status?: string;
  cost?: number;
  total_cost?: number;
  item_count?: number;
  notes?: string;
  user_id?: string;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  created_at?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  completed_at?: string;
  user_id?: string;
  [key: string]: unknown;
}

export interface EbayAccount {
  id: string;
  username?: string;
  email?: string;
  status?: string;
  token_expires_at?: string;
  connected_at?: string;
  user_id?: string;
  [key: string]: unknown;
}

export interface EbayMessage {
  id: string;
  created_at?: string;
  message_id?: string;
  subject?: string;
  body?: string;
  sender?: string;
  item_id?: string;
  item_title?: string;
  read?: boolean;
  responded?: boolean;
  [key: string]: unknown;
}

export interface EbayReturn {
  id: string;
  created_at?: string;
  return_id?: string;
  order_id?: string;
  status?: string;
  reason?: string;
  item_title?: string;
  amount?: number;
  buyer_username?: string;
  [key: string]: unknown;
}

export interface EbayCase {
  id: string;
  created_at?: string;
  case_id?: string;
  type?: string;
  status?: string;
  description?: string;
  item_title?: string;
  amount?: number;
  buyer_username?: string;
  [key: string]: unknown;
}

export interface DashboardStats {
  totalInventory: number;
  activeListings: number;
  ordersToday: number;
  revenueThisMonth: number;
  pendingDispatch: number;
  tasksOpen: number;
  reviewRequired: number;
}

export interface TableColumn {
  key: string;
  label: string;
  render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}
