
import { 
  Project, 
  ProjectServiceItem,
  ProjectStatus, 
  Material, 
  Transaction, 
  TransactionType, 
  Client, 
  DashboardStats,
  Vehicle,
  ReportExport
} from '../types';

// Initial Mock Data (Mutable)
let clients: Client[] = [];

let inventory: Material[] = [];

let projects: Project[] = [];

let projectServiceItems: ProjectServiceItem[] = [];

let transactions: Transaction[] = [];

let vehicles: Vehicle[] = [];

let reportExports: ReportExport[] = [];

const withMaterialMetrics = (item: Material): Material => {
  const priceCost = Number(item.price_cost) || 0;
  const priceSale = Number(item.price_sale) || 0;
  const profitability =
    priceCost > 0 ? ((priceSale - priceCost) / priceCost) * 100 : 0;

  return {
    ...item,
    price_sale: priceSale,
    profitability_pct: profitability
  };
};

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
  updateProject: async (updatedProject: Project) => {
    projects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    return updatedProject;
  },
  getProjectServiceItems: async (projectId: string) =>
    new Promise<ProjectServiceItem[]>((res) =>
      setTimeout(
        () =>
          res(
            projectServiceItems
              .filter((item) => item.project_id === projectId)
              .sort((a, b) => a.order_index - b.order_index)
          ),
        200
      )
    ),
  saveProjectServiceItems: async (
    projectId: string,
    items: Omit<ProjectServiceItem, 'id' | 'project_id'>[]
  ) => {
    projectServiceItems = projectServiceItems.filter((item) => item.project_id !== projectId);
    const inserted = items.map((item, index) => ({
      id: Math.random().toString(36).substr(2, 9),
      project_id: projectId,
      code: item.code,
      description: item.description,
      amount: Number(item.amount) || 0,
      order_index: Number(item.order_index ?? index)
    }));
    projectServiceItems = [...projectServiceItems, ...inserted];
    return inserted.sort((a, b) => a.order_index - b.order_index);
  },

  // Inventory
  getInventory: async () =>
    new Promise<Material[]>(res =>
      setTimeout(() => res(inventory.map((item) => withMaterialMetrics(item))), 300)
    ),
  addItem: async (item: Omit<Material, 'id'>) => {
    const newItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      price_sale: Number(item.price_sale) || 0
    } as Material;
    inventory = [newItem, ...inventory];
    return withMaterialMetrics(newItem);
  },
  updateItem: async (updatedItem: Material) => {
    const normalized = {
      ...updatedItem,
      price_sale: Number(updatedItem.price_sale) || 0
    };
    inventory = inventory.map(i => i.id === updatedItem.id ? normalized : i);
    return withMaterialMetrics(normalized);
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
  },

  // Reports
  getReportExports: async () => new Promise<ReportExport[]>(res => setTimeout(() => res([...reportExports]), 300)),
  addReportExport: async (reportExport: Omit<ReportExport, 'id' | 'generated_at'>) => {
    const newReportExport = {
      ...reportExport,
      id: Math.random().toString(36).substr(2, 9),
      generated_at: new Date().toISOString()
    } as ReportExport;
    reportExports = [newReportExport, ...reportExports];
    return newReportExport;
  }
};

