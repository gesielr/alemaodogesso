
// Status Definitions
export enum ProjectStatus {
  ORCAMENTO = 'Orçamento',
  APROVADO = 'Aprovado',
  EM_ANDAMENTO = 'Em Andamento',
  CONCLUIDO = 'Concluído',
  CANCELADO = 'Cancelado'
}

export enum TransactionType {
  RECEITA = 'Receita',
  DESPESA = 'Despesa'
}

export enum PaymentMethod {
  PIX = 'Pix',
  BOLETO = 'Boleto',
  CREDITO = 'Crédito',
  DEBITO = 'Débito',
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
  quantity: number;
  min_quantity: number;
  supplier?: string;
  profitability_pct?: number;
  notes?: string;
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
  entry_value?: number;
  address: string;

  // Computed/Relation fields for frontend
  client_name?: string;
  total_cost?: number; // Custo de materiais + mão de obra
  profit_margin?: number;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  type: 'MATERIAL' | 'LABOR' | 'VEHICLE';
  description: string;
  amount: number;
  date: string;
  material_id?: string;
  employee_id?: string; // Link to worker
  vehicle_id?: string; // Link to vehicle
  quantity?: number;
  inventory_deducted_quantity?: number;

  // Labor detailing
  labor_daily_value?: number;
  labor_snack_value?: number;
  labor_transport_value?: number;

  // Vehicle detailing
  vehicle_fuel_value?: number;
  vehicle_toll_value?: number;
  vehicle_maintenance_value?: number;

  notes?: string;
}

export interface InventoryMovementInput {
  material_id: string;
  movement_type: 'Entrada' | 'Saída' | 'Ajuste';
  quantity: number;
  unit_cost?: number;
  project_id?: string;
  supplier_id?: string;
  notes?: string;
  movement_date: string;
}

export interface ProjectBudgetRevision {
  id: string;
  project_id: string;
  previous_value: number;
  new_value: number;
  reason: string;
  changed_at: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  paid_amount?: number; // Valor efetivamente pago/recebido até o momento
  type: TransactionType;
  category: string; // Material, Mão de Obra, Combustível, Recebimento Obra, Administrativo
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
  status: 'Ativo' | 'Manutenção';
}

// Dashboard Summary Type
export interface DashboardStats {
  revenue: number;
  expenses: number;
  net_profit: number;
  active_projects: number;
  low_stock_items: number;
}
