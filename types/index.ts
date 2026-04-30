export type UserRole = 'owner' | 'supervisor';
export type JobStatus = 'running' | 'paused' | 'completed';
export type DCType = 'inbound' | 'outbound';
export type VendorType = 'supplier' | 'client' | 'both';

export interface ProductItem {
  id: string;
  company_id: string;
  dc_type: DCType;
  inbound_dc_id?: string;
  outbound_dc_id?: string;
  item_desc: string;
  hsn_code?: string;
  // Inbound fields
  quantity_kg?: number;
  rate_per_kg?: number;
  amount?: number;
  // Outbound fields
  quantity?: number;
  value?: number;
}

export interface ProductionLogItem {
  id: string;
  log_id: string;
  company_id: string;
  job_id: string;
  material_consumed_kg: number;
  good_qty: number;
  reject_qty: number;
  notes?: string;
  jobs?: Job;
}

export interface Company {
  id: number;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: number;
  role: UserRole;
  full_name: string;
  companies?: Company;
}

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  type: VendorType;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  client_id: string;
  item_name: string;
  hsn_code?: string;
  status: JobStatus;
  vendors?: Vendor;
}

export interface InboundDC {
  product_items?: ProductItem[];
  id: string;
  company_id: string;
  supplier_id: string;
  challan_no: string;
  challan_date: string;
  item_desc: string;
  quantity_kg: number;
  rate_per_kg?: number;
  amount?: number;
  reference_no?: string;
  eway_bill_no?: string;
  nature_of_processing?: string;
  created_by: string;
  created_at: string;
  vendors?: Vendor;
}

export interface ProductionLog {
  production_log_items?: ProductionLogItem[];
  id: string;
  company_id: string;
  job_id: string;
  inbound_dc_id?: string;
  material_consumed_kg: number;
  good_qty: number;
  reject_qty: number;
  notes?: string;
  created_by: string;
  created_at: string;
  jobs?: Job;
}

export interface OutboundDC {
  product_items?: ProductItem[];
  id: string;
  company_id: string;
  client_id: string;
  job_id?: string;
  dc_no: string;
  dc_date: string;
  item_desc: string;
  quantity: number;
  value?: number;
  vehicle_no?: string;
  eway_bill_no?: string;
  party_dc_no?: string;
  order_no?: string;
  created_by: string;
  created_at: string;
  vendors?: Vendor;
}
