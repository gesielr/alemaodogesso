
import { 
  Project, 
  ProjectStatus, 
  Material, 
  Transaction, 
  TransactionType, 
  Client, 
  DashboardStats,
  Vehicle
} from '../types';

// Initial Mock Data (Mutable)
let clients: Client[] = [
  { id: '1', name: 'Construtora Silva', phone: '(11) 99999-0000', email: 'contato@silva.com', address: 'Av. Paulista, 1000', document: '00.000.000/0001-00', observations: 'Cliente VIP. Sempre pede nota fiscal antecipada.' },
  { id: '2', name: 'João Souza', phone: '(11) 98888-1111', email: 'joao@gmail.com', address: 'Rua das Flores, 123', document: '123.456.789-00', observations: 'Prefere contato via WhatsApp.' },
  { id: '3', name: 'Maria Oliveira', phone: '(11) 97777-2222', email: 'maria@outlook.com', address: 'Alameda Santos, 500', document: '321.654.987-00' },
];

let inventory: Material[] = [
  { id: '1', name: 'Placa de Gesso ST 120x180', unit: 'un', price_cost: 28.50, quantity: 450, min_quantity: 100, supplier: 'Gesso Forte' },
  { id: '2', name: 'Placa RU (Verde) 120x180', unit: 'un', price_cost: 35.90, quantity: 80, min_quantity: 50, supplier: 'Gesso Forte' },
  { id: '3', name: 'Perfil Montante 70mm', unit: 'barra', price_cost: 18.00, quantity: 200, min_quantity: 50, supplier: 'Metal Aço' },
  { id: '4', name: 'Massa para Junta 20kg', unit: 'sc', price_cost: 45.00, quantity: 15, min_quantity: 20, supplier: 'Massa Top' },
  { id: '5', name: 'Parafuso GN 25', unit: 'cx', price_cost: 30.00, quantity: 50, min_quantity: 10, supplier: 'Fixa Tudo' },
];

let projects: Project[] = [
  { 
    id: '1', 
    client_id: '1', 
    client_name: 'Construtora Silva',
    title: 'Forro Edifício Horizon - 15º Andar', 
    status: ProjectStatus.EM_ANDAMENTO, 
    total_value: 15000, 
    start_date: '2023-10-01', 
    address: 'Av. Brasil, 500',
    total_cost: 8500,
    profit_margin: 6500
  },
  { 
    id: '2', 
    client_id: '2', 
    client_name: 'João Souza',
    title: 'Divisória Drywall Sala', 
    status: ProjectStatus.CONCLUIDO, 
    total_value: 3200, 
    start_date: '2023-09-15', 
    end_date: '2023-09-18',
    address: 'Rua das Flores, 123',
    total_cost: 1800,
    profit_margin: 1400
  },
  { 
    id: '3', 
    client_id: '3', 
    client_name: 'Maria Oliveira',
    title: 'Sanca Aberta Sala Jantar', 
    status: ProjectStatus.ORCAMENTO, 
    total_value: 2500, 
    address: 'Alameda Santos, 500',
    total_cost: 0,
    profit_margin: 0
  }
];

let transactions: Transaction[] = [
  { id: '1', description: 'Recebimento Obra João Souza', amount: 3200, paid_amount: 3200, type: TransactionType.RECEITA, category: 'Recebimento Obra', date: '2023-09-20', status: 'Pago', project_id: '2' },
  { id: '2', description: 'Compra Material Gesso Forte', amount: 1200, paid_amount: 1200, type: TransactionType.DESPESA, category: 'Material', date: '2023-10-02', status: 'Pago' },
  { id: '3', description: 'Adiantamento Obra Horizon', amount: 5000, paid_amount: 5000, type: TransactionType.RECEITA, category: 'Recebimento Obra', date: '2023-10-01', status: 'Pago', project_id: '1' },
  { id: '4', description: 'Pagamento Ajudante Diária', amount: 150, paid_amount: 150, type: TransactionType.DESPESA, category: 'Mão de Obra', date: '2023-10-03', status: 'Pago', project_id: '1' },
  { id: '5', description: 'Combustível Hilux', amount: 350, paid_amount: 350, type: TransactionType.DESPESA, category: 'Combustível', date: '2023-10-05', status: 'Pago' },
  { id: '6', description: 'Parcela 2 Obra Horizon', amount: 5000, paid_amount: 0, type: TransactionType.RECEITA, category: 'Recebimento Obra', date: '2023-11-01', status: 'Pendente', project_id: '1' },
];

let vehicles: Vehicle[] = [
  { id: '1', model: 'Fiat Strada 1.4', plate: 'ABC-1234', current_km: 154000, last_maintenance: '2023-08-10', status: 'Ativo' },
  { id: '2', model: 'VW Saveiro', plate: 'XYZ-9876', current_km: 98000, last_maintenance: '2023-09-20', status: 'Ativo' },
  { id: '3', model: 'Caminhão Ford Cargo', plate: 'DEF-5678', current_km: 210000, last_maintenance: '2023-07-01', status: 'Manutenção' },
];

export const getDashboardStats = (startDate?: string, endDate?: string): DashboardStats => {
  // Filter transactions by date range if provided
  let filteredTx = transactions;
  if (startDate) {
    filteredTx = filteredTx.filter(t => t.date >= startDate);
  }
  if (endDate) {
    filteredTx = filteredTx.filter(t => t.date <= endDate);
  }

  const revenue = filteredTx.filter(t => t.type === TransactionType.RECEITA).reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const expenses = filteredTx.filter(t => t.type === TransactionType.DESPESA).reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const activeProjects = projects.filter(p => p.status === ProjectStatus.EM_ANDAMENTO).length;
  const lowStock = inventory.filter(i => i.quantity <= i.min_quantity).length;

  return {
    revenue,
    expenses,
    net_profit: revenue - expenses,
    active_projects: activeProjects,
    low_stock_items: lowStock
  };
};

// API Service Simulation with Mutations
export const api = {
  // Projects
  getProjects: async () => new Promise<Project[]>(res => setTimeout(() => res([...projects]), 300)),
  addProject: async (project: Omit<Project, 'id'>) => {
    const newProject = { ...project, id: Math.random().toString(36).substr(2, 9) } as Project;
    projects = [newProject, ...projects];
    return newProject;
  },

  // Inventory
  getInventory: async () => new Promise<Material[]>(res => setTimeout(() => res([...inventory]), 300)),
  addItem: async (item: Omit<Material, 'id'>) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) } as Material;
    inventory = [newItem, ...inventory];
    return newItem;
  },
  updateItem: async (updatedItem: Material) => {
    inventory = inventory.map(i => i.id === updatedItem.id ? updatedItem : i);
    return updatedItem;
  },
  deleteItem: async (id: string) => {
    // FORCE string comparison for safety
    inventory = inventory.filter(i => String(i.id) !== String(id));
    return true;
  },

  // Transactions
  getTransactions: async () => new Promise<Transaction[]>(res => setTimeout(() => res([...transactions]), 300)),
  addTransaction: async (tx: Omit<Transaction, 'id'>) => {
    const newTx = { 
        ...tx, 
        id: Math.random().toString(36).substr(2, 9),
        paid_amount: tx.status === 'Pago' ? tx.amount : (tx.paid_amount || 0)
    } as Transaction;
    transactions = [newTx, ...transactions];
    return newTx;
  },
  updateTransaction: async (updatedTx: Transaction) => {
    transactions = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    return updatedTx;
  },
  
  // Dashboard
  getDashboard: async (startDate?: string, endDate?: string) => new Promise<DashboardStats>(res => setTimeout(() => res(getDashboardStats(startDate, endDate)), 300)),

  // Clients
  getClients: async () => new Promise<Client[]>(res => setTimeout(() => res([...clients]), 300)),
  addClient: async (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: Math.random().toString(36).substr(2, 9) } as Client;
    clients = [newClient, ...clients];
    return newClient;
  },
  updateClient: async (updatedClient: Client) => {
    clients = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    return updatedClient;
  },
  deleteClient: async (id: string) => {
    clients = clients.filter(c => c.id !== id);
    return true;
  },

  // Vehicles
  getVehicles: async () => new Promise<Vehicle[]>(res => setTimeout(() => res([...vehicles]), 300)),
  addVehicle: async (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle = { ...vehicle, id: Math.random().toString(36).substr(2, 9) } as Vehicle;
    vehicles = [newVehicle, ...vehicles];
    return newVehicle;
  },
  deleteVehicle: async (id: string) => {
    vehicles = vehicles.filter(v => v.id !== id);
    return true;
  }
};
