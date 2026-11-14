export interface EbayConnector {
  status: string;
  seller_account_id: string | null;
  access_token_expires_at: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  can_list: boolean | null;
  can_publish: boolean | null;
  can_reprice: boolean | null;
  can_read_orders: boolean | null;
  can_fulfil: boolean | null;
}
