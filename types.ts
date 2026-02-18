
// Status Definitions
export enum ProjectStatus {
  ORCAMENTO = 'Or\u00e7amento',
  APROVADO = 'Aprovado',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'Conclu\u00eddo',
  CANCELADO = 'Cancelado'
}

export enum TransactionType {
  RECEITA = 'Receita',
  DESPESA = 'Despesa'
}

export enum PaymentMethod {
  PIX = 'Pix',
  BOLETO = 'Boleto',
  CREDITO = 'Cr\u00e9dito',
  DEBITO = 'D\u00e9bito',
  DINHEIRO = 'Dinheiro'
}

// Domain Interfaces
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  document: string; // CPF/CNPJ
  observations?: string; // New field for notes
}

export interface Material {
  id: string;
  name: string;
  unit: string; // m2, kg, sc, un
  price_cost: number;
  price_sale?: number;
  profitability_pct?: number;
  quantity: number;
  min_quantity: number;
  supplier?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  cost_per_hour: number;
  phone: string;
  active: boolean;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  service?: string;
  execution_time?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  total_value: number; // Valor cobrado do cliente
  address: string;
  material_cost?: number;
  vehicle_cost?: number;
  labor_cost?: number;
  tax_cost?: number;
  invoice_sent?: boolean;
  
  // Computed/Relation fields for frontend
  client_name?: string;
  total_cost?: number; // Custo total consolidado da obra
  profit_margin?: number;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  type: 'MATERIAL' | 'LABOR' | 'VEHICLE';
  description: string;
  amount: number;
  date: string;
}

export interface ProjectServiceItem {
  id: string;
  project_id: string;
  code: string;
  description: string;
  amount: number;
  order_index: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  paid_amount?: number; // Valor efetivamente pago/recebido ate o momento
  type: TransactionType;
  category: string; // Material, Mao de Obra, Combustivel, Recebimento Obra, Administrativo
  date: string;
  status: 'Pendente' | 'Pago' | 'Parcial';
  project_id?: string;
  vehicle_id?: string; // Link transaction to a vehicle
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  current_km: number;
  last_maintenance?: string;
  status: 'Ativo' | 'Manuten\u00e7\u00e3o';
}

export interface ReportExport {
  id: string;
  report_name: string;
  period_start?: string;
  period_end?: string;
  file_url?: string;
  file_format: string;
  generated_at: string;
  notes?: string;
}
// Dashboard Summary Type
export interface DashboardStats {
  revenue: number;
  expenses: number;
  net_profit: number;
  active_projects: number;
  low_stock_items: number;
}

