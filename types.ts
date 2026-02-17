
// Status Definitions
export enum ProjectStatus {
  ORCAMENTO = 'OrÃ§amento',
  APROVADO = 'Aprovado',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'ConcluÃ­do',
  CANCELADO = 'Cancelado'
}

export enum TransactionType {
  RECEITA = 'Receita',
  DESPESA = 'Despesa'
}

export enum PaymentMethod {
  PIX = 'Pix',
  BOLETO = 'Boleto',
  CREDITO = 'CrÃ©dito',
  DEBITO = 'DÃ©bito',
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
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  total_value: number; // Valor cobrado do cliente
  address: string;
  
  // Computed/Relation fields for frontend
  client_name?: string;
  total_cost?: number; // Custo de materiais + mÃ£o de obra
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

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  paid_amount?: number; // Valor efetivamente pago/recebido atÃ© o momento
  type: TransactionType;
  category: string; // Material, MÃ£o de Obra, CombustÃ­vel, Recebimento Obra, Administrativo
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
  status: 'Ativo' | 'ManutenÃ§Ã£o';
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

