export type UserRole = 'owner' | 'supervisor';
export type JobStatus = 'running' | 'paused' | 'completed';

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  role: UserRole;
  full_name: string;
  companies?: Company;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  gstin?: string;
  address?: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  gstin?: string;
  address?: string;
}

export interface Job {
  id: string;
  company_id: string;
  client_id: string;
  item_name: string;
  hsn_code?: string;
  status: JobStatus;
  clients?: Client;
}

export interface InboundDC {
  id: string;
  company_id: string;
  supplier_id: string;
  challan_no: string;
  challan_date: string;
  item_desc: string;
  hsn_sac?: string;
  quantity_kg: number;
  rate_per_kg?: number;
  amount?: number;
  reference_no?: string;
  eway_bill_no?: string;
  nature_of_processing?: string;
  created_by: string;
  created_at: string;
  suppliers?: Supplier;
}

export interface ProductionLog {
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
  id: string;
  company_id: string;
  client_id: string;
  job_id?: string;
  dc_no: string;
  dc_date: string;
  item_desc: string;
  hsn_code?: string;
  quantity: number;
  value?: number;
  vehicle_no?: string;
  eway_bill_no?: string;
  party_dc_no?: string;
  order_no?: string;
  created_by: string;
  created_at: string;
  clients?: Client;
}
