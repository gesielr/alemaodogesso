import {
  Client,
  DashboardStats,
  InventoryMovementInput,
  Material,
  Project,
  ProjectBudgetRevision,
  ProjectCost,
  ProjectStatus,
  Transaction,
  TransactionType,
  Vehicle
} from '../types';

let clients: Client[] = [
  {
    id: '1',
    name: 'Construtora Silva',
    phone: '(11) 99999-0000',
    email: 'contato@silva.com',
    address: 'Av. Paulista, 1000',
    document: '00.000.000/0001-00',
    observations: 'Cliente VIP. Sempre pede nota fiscal antecipada.'
  },
  {
    id: '2',
    name: 'Joao Souza',
    phone: '(11) 98888-1111',
    email: 'joao@gmail.com',
    address: 'Rua das Flores, 123',
    document: '123.456.789-00',
    observations: 'Prefere contato via WhatsApp.'
  },
  {
    id: '3',
    name: 'Maria Oliveira',
    phone: '(11) 97777-2222',
    email: 'maria@outlook.com',
    address: 'Alameda Santos, 500',
    document: '321.654.987-00'
  }
];

const calcProfitability = (priceCost: number, priceSale: number) =>
  priceCost > 0 ? ((priceSale - priceCost) / priceCost) * 100 : 0;

let inventory: Material[] = [
  {
    id: '1',
    name: 'Placa de Gesso ST 120x180',
    unit: 'un',
    price_cost: 28.5,
    price_sale: 39.9,
    quantity: 450,
    min_quantity: 100,
    supplier: 'Gesso Forte',
    profitability_pct: calcProfitability(28.5, 39.9)
  },
  {
    id: '2',
    name: 'Placa RU (Verde) 120x180',
    unit: 'un',
    price_cost: 35.9,
    price_sale: 49.5,
    quantity: 80,
    min_quantity: 50,
    supplier: 'Gesso Forte',
    profitability_pct: calcProfitability(35.9, 49.5)
  },
  {
    id: '3',
    name: 'Perfil Montante 70mm',
    unit: 'barra',
    price_cost: 18,
    price_sale: 26,
    quantity: 200,
    min_quantity: 50,
    supplier: 'Metal Aco',
    profitability_pct: calcProfitability(18, 26)
  },
  {
    id: '4',
    name: 'Massa para Junta 20kg',
    unit: 'sc',
    price_cost: 45,
    price_sale: 58,
    quantity: 15,
    min_quantity: 20,
    supplier: 'Massa Top',
    profitability_pct: calcProfitability(45, 58)
  },
  {
    id: '5',
    name: 'Parafuso GN 25',
    unit: 'cx',
    price_cost: 30,
    price_sale: 41.9,
    quantity: 50,
    min_quantity: 10,
    supplier: 'Fixa Tudo',
    profitability_pct: calcProfitability(30, 41.9)
  }
];

let projects: Project[] = [
  {
    id: '1',
    client_id: '1',
    client_name: 'Construtora Silva',
    title: 'Forro Edificio Horizon - 15 Andar',
    status: ProjectStatus.EM_ANDAMENTO,
    total_value: 15000,
    entry_value: 4500,
    start_date: '2023-10-01',
    address: 'Av. Brasil, 500',
    total_cost: 8500,
    profit_margin: 6500
  },
  {
    id: '2',
    client_id: '2',
    client_name: 'Joao Souza',
    title: 'Divisoria Drywall Sala',
    status: ProjectStatus.CONCLUIDO,
    total_value: 3200,
    entry_value: 1200,
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
    entry_value: 0,
    address: 'Alameda Santos, 500',
    total_cost: 0,
    profit_margin: 0
  }
];

let projectCosts: ProjectCost[] = [
  {
    id: 'pc-1',
    project_id: '1',
    type: 'MATERIAL',
    description: 'Placas de gesso e perfis',
    amount: 4200,
    date: '2023-10-02',
    quantity: 120,
    notes: 'Compra inicial para forro'
  },
  {
    id: 'pc-2',
    project_id: '1',
    type: 'LABOR',
    description: 'Equipe de instalacao (semana 1)',
    amount: 2800,
    date: '2023-10-05',
    notes: '2 ajudantes + 1 gesseiro'
  },
  {
    id: 'pc-3',
    project_id: '1',
    type: 'VEHICLE',
    description: 'Combustivel e frete',
    amount: 1500,
    date: '2023-10-06',
    notes: 'Deslocamento de material'
  },
  {
    id: 'pc-4',
    project_id: '2',
    type: 'MATERIAL',
    description: 'Drywall e massa',
    amount: 900,
    date: '2023-09-15'
  },
  {
    id: 'pc-5',
    project_id: '2',
    type: 'LABOR',
    description: 'Mao de obra da divisoria',
    amount: 700,
    date: '2023-09-16'
  },
  {
    id: 'pc-6',
    project_id: '2',
    type: 'VEHICLE',
    description: 'Entrega de materiais',
    amount: 200,
    date: '2023-09-15'
  }
];

let projectBudgetRevisions: ProjectBudgetRevision[] = [
  {
    id: 'pbr-1',
    project_id: '1',
    previous_value: 14000,
    new_value: 15000,
    reason: 'Acrescimo de area no forro',
    changed_at: '2023-10-01T09:00:00.000Z'
  }
];

let transactions: Transaction[] = [
  {
    id: '1',
    description: 'Recebimento Obra Joao Souza',
    amount: 3200,
    paid_amount: 3200,
    type: TransactionType.RECEITA,
    category: 'Recebimento Obra',
    date: '2023-09-20',
    status: 'Pago',
    project_id: '2'
  },
  {
    id: '2',
    description: 'Compra Material Gesso Forte',
    amount: 1200,
    paid_amount: 1200,
    type: TransactionType.DESPESA,
    category: 'Material',
    date: '2023-10-02',
    status: 'Pago'
  },
  {
    id: '3',
    description: 'Adiantamento Obra Horizon',
    amount: 5000,
    paid_amount: 5000,
    type: TransactionType.RECEITA,
    category: 'Recebimento Obra',
    date: '2023-10-01',
    status: 'Pago',
    project_id: '1'
  },
  {
    id: '4',
    description: 'Pagamento Ajudante Diaria',
    amount: 150,
    paid_amount: 150,
    type: TransactionType.DESPESA,
    category: 'Mao de Obra',
    date: '2023-10-03',
    status: 'Pago',
    project_id: '1'
  },
  {
    id: '5',
    description: 'Combustivel Hilux',
    amount: 350,
    paid_amount: 350,
    type: TransactionType.DESPESA,
    category: 'Combustivel',
    date: '2023-10-05',
    status: 'Pago'
  },
  {
    id: '6',
    description: 'Parcela 2 Obra Horizon',
    amount: 5000,
    paid_amount: 0,
    type: TransactionType.RECEITA,
    category: 'Recebimento Obra',
    date: '2023-11-01',
    status: 'Pendente',
    project_id: '1'
  }
];

let vehicles: Vehicle[] = [
  { id: '1', model: 'Fiat Strada 1.4', plate: 'ABC-1234', current_km: 154000, last_maintenance: '2023-08-10', status: 'Ativo' },
  { id: '2', model: 'VW Saveiro', plate: 'XYZ-9876', current_km: 98000, last_maintenance: '2023-09-20', status: 'Ativo' },
  { id: '3', model: 'Caminhao Ford Cargo', plate: 'DEF-5678', current_km: 210000, last_maintenance: '2023-07-01', status: 'Manutencao' as Vehicle['status'] }
];

const randomId = () => Math.random().toString(36).slice(2, 11);

const recomputeProjectFinancials = (projectId?: string) => {
  projects = projects.map((project) => {
    if (projectId && project.id !== projectId) return project;

    const totalCost = projectCosts
      .filter((cost) => cost.project_id === project.id)
      .reduce((sum, cost) => sum + cost.amount, 0);

    return {
      ...project,
      total_cost: totalCost,
      profit_margin: project.total_value - totalCost
    };
  });
};

const withProfitability = (material: Material): Material => ({
  ...material,
  price_sale: material.price_sale ?? 0,
  profitability_pct: calcProfitability(material.price_cost, material.price_sale ?? 0)
});

recomputeProjectFinancials();

export const getDashboardStats = (startDate?: string, endDate?: string): DashboardStats => {
  let filteredTx = transactions;

  if (startDate) {
    filteredTx = filteredTx.filter((tx) => tx.date >= startDate);
  }

  if (endDate) {
    filteredTx = filteredTx.filter((tx) => tx.date <= endDate);
  }

  const revenue = filteredTx
    .filter((tx) => tx.type === TransactionType.RECEITA)
    .reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const expenses = filteredTx
    .filter((tx) => tx.type === TransactionType.DESPESA)
    .reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const activeProjects = projects.filter((project) => project.status === ProjectStatus.EM_ANDAMENTO).length;
  const lowStock = inventory.filter((item) => item.quantity <= item.min_quantity).length;

  return {
    revenue,
    expenses,
    net_profit: revenue - expenses,
    active_projects: activeProjects,
    low_stock_items: lowStock
  };
};

export const api = {
  getProjects: async () => new Promise<Project[]>((res) => setTimeout(() => res([...projects]), 300)),
  getProjectById: async (projectId: string) =>
    new Promise<Project | null>((res) =>
      setTimeout(() => {
        const project = projects.find((item) => item.id === projectId);
        res(project ? { ...project } : null);
      }, 200)
    ),
  addProject: async (project: Omit<Project, 'id'>) => {
    const newProject = {
      ...project,
      id: randomId(),
      entry_value: project.entry_value || 0,
      total_cost: 0,
      profit_margin: project.total_value || 0
    } as Project;

    projects = [newProject, ...projects];
    return newProject;
  },
  updateProject: async (updatedProject: Project) => {
    projects = projects.map((project) => (project.id === updatedProject.id ? { ...project, ...updatedProject } : project));
    recomputeProjectFinancials(updatedProject.id);
    return projects.find((project) => project.id === updatedProject.id) || updatedProject;
  },

  getProjectCosts: async (projectId: string) =>
    new Promise<ProjectCost[]>((res) =>
      setTimeout(
        () =>
          res(
            projectCosts
              .filter((cost) => cost.project_id === projectId)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((cost) => ({ ...cost }))
          ),
        200
      )
    ),
  addProjectCost: async (cost: Omit<ProjectCost, 'id'>) => {
    const newCost = { ...cost, id: randomId() } as ProjectCost;
    projectCosts = [newCost, ...projectCosts];
    recomputeProjectFinancials(cost.project_id);
    return newCost;
  },
  updateProjectCost: async (updatedCost: ProjectCost) => {
    projectCosts = projectCosts.map((cost) => (cost.id === updatedCost.id ? updatedCost : cost));
    recomputeProjectFinancials(updatedCost.project_id);
    return updatedCost;
  },
  deleteProjectCost: async (id: string) => {
    const existing = projectCosts.find((cost) => cost.id === id);
    projectCosts = projectCosts.filter((cost) => cost.id !== id);
    if (existing) {
      recomputeProjectFinancials(existing.project_id);
    }
    return true;
  },

  getProjectBudgetRevisions: async (projectId: string) =>
    new Promise<ProjectBudgetRevision[]>((res) =>
      setTimeout(
        () =>
          res(
            projectBudgetRevisions
              .filter((revision) => revision.project_id === projectId)
              .sort((a, b) => b.changed_at.localeCompare(a.changed_at))
              .map((revision) => ({ ...revision }))
          ),
        150
      )
    ),
  addProjectBudgetRevision: async (
    revision: Omit<ProjectBudgetRevision, 'id' | 'changed_at'> & { changed_at?: string }
  ) => {
    const newRevision: ProjectBudgetRevision = {
      ...revision,
      id: randomId(),
      changed_at: revision.changed_at || new Date().toISOString()
    };

    projectBudgetRevisions = [newRevision, ...projectBudgetRevisions];
    return newRevision;
  },

  getInventory: async () =>
    new Promise<Material[]>((res) => setTimeout(() => res(inventory.map((item) => ({ ...item }))), 300)),
  addItem: async (item: Omit<Material, 'id'>) => {
    const newItem = withProfitability({ ...item, id: randomId() } as Material);
    inventory = [newItem, ...inventory];
    return newItem;
  },
  updateItem: async (updatedItem: Material) => {
    const nextItem = withProfitability(updatedItem);
    inventory = inventory.map((item) => (item.id === updatedItem.id ? nextItem : item));
    return nextItem;
  },
  deleteItem: async (id: string) => {
    inventory = inventory.filter((item) => String(item.id) !== String(id));
    return true;
  },
  addInventoryMovement: async (movement: InventoryMovementInput) => {
    const delta =
      movement.movement_type === 'Entrada'
        ? movement.quantity
        : movement.movement_type === 'Sa\u00edda'
          ? -movement.quantity
          : movement.quantity;

    inventory = inventory.map((item) =>
      item.id === movement.material_id
        ? withProfitability({ ...item, quantity: Math.max(0, item.quantity + delta) })
        : item
    );

    return true;
  },

  getTransactions: async () => new Promise<Transaction[]>((res) => setTimeout(() => res([...transactions]), 300)),
  addTransaction: async (tx: Omit<Transaction, 'id'>) => {
    const newTx = {
      ...tx,
      id: randomId(),
      paid_amount: tx.status === 'Pago' ? tx.amount : tx.paid_amount || 0
    } as Transaction;
    transactions = [newTx, ...transactions];
    return newTx;
  },
  updateTransaction: async (updatedTx: Transaction) => {
    transactions = transactions.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx));
    return updatedTx;
  },

  addReportExport: async (_reportExport: {
    report_name: string;
    period_start?: string;
    period_end?: string;
    file_format?: string;
    notes?: string;
  }) => true,

  getDashboard: async (startDate?: string, endDate?: string) =>
    new Promise<DashboardStats>((res) => setTimeout(() => res(getDashboardStats(startDate, endDate)), 300)),

  getClients: async () => new Promise<Client[]>((res) => setTimeout(() => res([...clients]), 300)),
  addClient: async (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: randomId() } as Client;
    clients = [newClient, ...clients];
    return newClient;
  },
  updateClient: async (updatedClient: Client) => {
    clients = clients.map((client) => (client.id === updatedClient.id ? updatedClient : client));
    return updatedClient;
  },
  deleteClient: async (id: string) => {
    clients = clients.filter((client) => client.id !== id);
    return true;
  },

  getVehicles: async () => new Promise<Vehicle[]>((res) => setTimeout(() => res([...vehicles]), 300)),
  addVehicle: async (vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle = { ...vehicle, id: randomId() } as Vehicle;
    vehicles = [newVehicle, ...vehicles];
    return newVehicle;
  },
  deleteVehicle: async (id: string) => {
    vehicles = vehicles.filter((vehicle) => vehicle.id !== id);
    return true;
  }
};

