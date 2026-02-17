import {
  Client,
  DashboardStats,
  Material,
  Project,
  ReportExport,
  Transaction,
  Vehicle
} from '../types';
import { api as mockApi } from './mockData';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type SupplierJoin = { name: string } | { name: string }[] | null;

let hasWarnedAboutFallback = false;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const warnUsingMockFallback = () => {
  if (hasWarnedAboutFallback) return;
  hasWarnedAboutFallback = true;
  console.warn(
    '[api] Supabase não configurado. Usando dados locais em memória (mockData). Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
};

const isUsingSupabase = () => Boolean(isSupabaseConfigured && supabase);

const run = async <T>(supabaseAction: () => Promise<T>, mockAction: () => Promise<T>): Promise<T> => {
  if (!isUsingSupabase()) {
    warnUsingMockFallback();
    return mockAction();
  }
  return supabaseAction();
};

const readSupplierName = (suppliers: SupplierJoin): string | undefined => {
  if (!suppliers) return undefined;
  if (Array.isArray(suppliers)) return suppliers[0]?.name;
  return suppliers.name;
};

const mapProjectRow = (row: any): Project => ({
  id: String(row.id),
  client_id: String(row.client_id),
  client_name: row.client_name ?? '',
  title: row.title ?? '',
  description: row.description ?? undefined,
  status: row.status,
  start_date: row.start_date ?? undefined,
  end_date: row.end_date ?? undefined,
  total_value: toNumber(row.total_value),
  address: row.address ?? '',
  total_cost: row.total_cost == null ? undefined : toNumber(row.total_cost),
  profit_margin: row.profit_margin == null ? undefined : toNumber(row.profit_margin)
});

const mapMaterialRow = (row: any): Material => ({
  id: String(row.id),
  name: row.name ?? '',
  unit: row.unit ?? 'un',
  price_cost: toNumber(row.price_cost),
  quantity: toNumber(row.quantity),
  min_quantity: toNumber(row.min_quantity),
  supplier: readSupplierName(row.suppliers)
});

const mapTransactionRow = (row: any): Transaction => ({
  id: String(row.id),
  description: row.description ?? '',
  amount: toNumber(row.amount),
  paid_amount: toNumber(row.paid_amount),
  type: row.type,
  category: row.category ?? 'Outros',
  date: row.date,
  status: row.status,
  project_id: row.project_id ?? undefined,
  vehicle_id: row.vehicle_id ?? undefined
});

const mapClientRow = (row: any): Client => ({
  id: String(row.id),
  name: row.name ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  address: row.address ?? '',
  document: row.document ?? '',
  observations: row.observations ?? undefined
});

const mapVehicleRow = (row: any): Vehicle => ({
  id: String(row.id),
  model: row.model ?? '',
  plate: row.plate ?? '',
  current_km: toNumber(row.current_km),
  last_maintenance: row.last_maintenance ?? undefined,
  status: row.status
});

const mapReportExportRow = (row: any): ReportExport => ({
  id: String(row.id),
  report_name: row.report_name ?? '',
  period_start: row.period_start ?? undefined,
  period_end: row.period_end ?? undefined,
  file_url: row.file_url ?? undefined,
  file_format: row.file_format ?? 'pdf',
  generated_at: row.generated_at ?? new Date().toISOString(),
  notes: row.notes ?? undefined
});

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase não configurado');
  }
  return supabase;
};

const findOrCreateSupplierId = async (supplierName?: string): Promise<string | null> => {
  const client = requireSupabase();
  const normalizedName = supplierName?.trim();

  if (!normalizedName) return null;

  const { data: existing, error: searchError } = await client
    .from('suppliers')
    .select('id')
    .ilike('name', normalizedName)
    .limit(1);

  if (searchError) throw searchError;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error: createError } = await client
    .from('suppliers')
    .insert({
      name: normalizedName,
      phone: '',
      email: '',
      document: '',
      address: ''
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
};

const getProjectById = async (projectId: string): Promise<Project | null> => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('vw_project_financial_summary')
    .select('*')
    .eq('id', projectId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapProjectRow(data);
};

export const api = {
  // Projects
  getProjects: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('vw_project_financial_summary')
          .select('*')
          .order('start_date', { ascending: false });

        if (error) throw error;
        return (data ?? []).map(mapProjectRow);
      },
      () => mockApi.getProjects()
    ),

  addProject: async (project: Omit<Project, 'id'>) =>
    run(
      async () => {
        const client = requireSupabase();

        const { data: inserted, error } = await client
          .from('projects')
          .insert({
            client_id: project.client_id,
            title: project.title,
            description: project.description ?? null,
            status: project.status,
            start_date: project.start_date ?? null,
            end_date: project.end_date ?? null,
            total_value: toNumber(project.total_value),
            address: project.address
          })
          .select('*')
          .single();

        if (error) throw error;

        const fullProject = await getProjectById(inserted.id);
        if (fullProject) return fullProject;

        return mapProjectRow({
          ...inserted,
          client_name: project.client_name ?? ''
        });
      },
      () => mockApi.addProject(project)
    ),

  // Inventory
  getInventory: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('materials')
          .select('id,name,unit,price_cost,quantity,min_quantity,suppliers(name)')
          .order('name', { ascending: true });

        if (error) throw error;
        return (data ?? []).map(mapMaterialRow);
      },
      () => mockApi.getInventory()
    ),

  addItem: async (item: Omit<Material, 'id'>) =>
    run(
      async () => {
        const client = requireSupabase();
        const supplierId = await findOrCreateSupplierId(item.supplier);

        const { data, error } = await client
          .from('materials')
          .insert({
            name: item.name,
            unit: item.unit,
            price_cost: toNumber(item.price_cost),
            quantity: toNumber(item.quantity),
            min_quantity: toNumber(item.min_quantity),
            supplier_id: supplierId
          })
          .select('id,name,unit,price_cost,quantity,min_quantity,suppliers(name)')
          .single();

        if (error) throw error;
        return mapMaterialRow(data);
      },
      () => mockApi.addItem(item)
    ),

  updateItem: async (updatedItem: Material) =>
    run(
      async () => {
        const client = requireSupabase();
        const supplierId = await findOrCreateSupplierId(updatedItem.supplier);

        const { data, error } = await client
          .from('materials')
          .update({
            name: updatedItem.name,
            unit: updatedItem.unit,
            price_cost: toNumber(updatedItem.price_cost),
            quantity: toNumber(updatedItem.quantity),
            min_quantity: toNumber(updatedItem.min_quantity),
            supplier_id: supplierId
          })
          .eq('id', updatedItem.id)
          .select('id,name,unit,price_cost,quantity,min_quantity,suppliers(name)')
          .single();

        if (error) throw error;
        return mapMaterialRow(data);
      },
      () => mockApi.updateItem(updatedItem)
    ),

  deleteItem: async (id: string) =>
    run(
      async () => {
        const client = requireSupabase();
        const { error } = await client.from('materials').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
      () => mockApi.deleteItem(id)
    ),

  // Transactions
  getTransactions: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('transactions')
          .select('*')
          .order('date', { ascending: false });

        if (error) throw error;
        return (data ?? []).map(mapTransactionRow);
      },
      () => mockApi.getTransactions()
    ),

  addTransaction: async (tx: Omit<Transaction, 'id'>) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('transactions')
          .insert({
            description: tx.description,
            amount: toNumber(tx.amount),
            paid_amount: tx.status === 'Pago' ? toNumber(tx.amount) : toNumber(tx.paid_amount),
            type: tx.type,
            category: tx.category,
            date: tx.date,
            status: tx.status,
            project_id: tx.project_id ?? null,
            vehicle_id: tx.vehicle_id ?? null
          })
          .select('*')
          .single();

        if (error) throw error;
        return mapTransactionRow(data);
      },
      () => mockApi.addTransaction(tx)
    ),

  updateTransaction: async (updatedTx: Transaction) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('transactions')
          .update({
            description: updatedTx.description,
            amount: toNumber(updatedTx.amount),
            paid_amount: toNumber(updatedTx.paid_amount),
            type: updatedTx.type,
            category: updatedTx.category,
            date: updatedTx.date,
            status: updatedTx.status,
            project_id: updatedTx.project_id ?? null,
            vehicle_id: updatedTx.vehicle_id ?? null
          })
          .eq('id', updatedTx.id)
          .select('*')
          .single();

        if (error) throw error;
        return mapTransactionRow(data);
      },
      () => mockApi.updateTransaction(updatedTx)
    ),

  addTransactionSettlement: async (transactionId: string, amount: number, settlementDate: string) =>
    run(
      async () => {
        const client = requireSupabase();
        const { error } = await client.from('transaction_settlements').insert({
          transaction_id: transactionId,
          amount: toNumber(amount),
          settlement_date: settlementDate
        });

        if (error) throw error;
        return true;
      },
      async () => {
        const currentTransactions = await mockApi.getTransactions();
        const tx = currentTransactions.find((item) => item.id === transactionId);
        if (!tx) {
          throw new Error('Transação não encontrada para baixa');
        }

        const newPaidAmount = (tx.paid_amount || 0) + toNumber(amount);
        const normalizedPaidAmount = Math.min(newPaidAmount, tx.amount);
        const status = normalizedPaidAmount >= tx.amount - 0.01 ? 'Pago' : 'Parcial';

        await mockApi.updateTransaction({
          ...tx,
          paid_amount: normalizedPaidAmount,
          status
        });
        return true;
      }
    ),

  // Dashboard
  getDashboard: async (startDate?: string, endDate?: string) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client.rpc('get_dashboard_stats', {
          p_start_date: startDate ?? null,
          p_end_date: endDate ?? null
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : null;
        const stats: DashboardStats = {
          revenue: toNumber(row?.revenue),
          expenses: toNumber(row?.expenses),
          net_profit: toNumber(row?.net_profit),
          active_projects: toNumber(row?.active_projects),
          low_stock_items: toNumber(row?.low_stock_items)
        };

        return stats;
      },
      () => mockApi.getDashboard(startDate, endDate)
    ),

  // Clients
  getClients: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('clients')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        return (data ?? []).map(mapClientRow);
      },
      () => mockApi.getClients()
    ),

  addClient: async (clientPayload: Omit<Client, 'id'>) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('clients')
          .insert({
            name: clientPayload.name,
            phone: clientPayload.phone ?? '',
            email: clientPayload.email ?? '',
            address: clientPayload.address ?? '',
            document: clientPayload.document ?? '',
            observations: clientPayload.observations ?? null
          })
          .select('*')
          .single();

        if (error) throw error;
        return mapClientRow(data);
      },
      () => mockApi.addClient(clientPayload)
    ),

  updateClient: async (updatedClient: Client) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('clients')
          .update({
            name: updatedClient.name,
            phone: updatedClient.phone ?? '',
            email: updatedClient.email ?? '',
            address: updatedClient.address ?? '',
            document: updatedClient.document ?? '',
            observations: updatedClient.observations ?? null
          })
          .eq('id', updatedClient.id)
          .select('*')
          .single();

        if (error) throw error;
        return mapClientRow(data);
      },
      () => mockApi.updateClient(updatedClient)
    ),

  deleteClient: async (id: string) =>
    run(
      async () => {
        const client = requireSupabase();
        const { error } = await client.from('clients').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
      () => mockApi.deleteClient(id)
    ),

  // Vehicles
  getVehicles: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('vehicles')
          .select('*')
          .order('model', { ascending: true });

        if (error) throw error;
        return (data ?? []).map(mapVehicleRow);
      },
      () => mockApi.getVehicles()
    ),

  addVehicle: async (vehicle: Omit<Vehicle, 'id'>) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('vehicles')
          .insert({
            model: vehicle.model,
            plate: vehicle.plate,
            current_km: toNumber(vehicle.current_km),
            last_maintenance: vehicle.last_maintenance ?? null,
            status: vehicle.status
          })
          .select('*')
          .single();

        if (error) throw error;
        return mapVehicleRow(data);
      },
      () => mockApi.addVehicle(vehicle)
    ),

  deleteVehicle: async (id: string) =>
    run(
      async () => {
        const client = requireSupabase();
        const { error } = await client.from('vehicles').delete().eq('id', id);
        if (error) throw error;
        return true;
      },
      () => mockApi.deleteVehicle(id)
    ),

  // Reports
  getReportExports: async () =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('report_exports')
          .select('*')
          .order('generated_at', { ascending: false });

        if (error) throw error;
        return (data ?? []).map(mapReportExportRow);
      },
      () => mockApi.getReportExports()
    ),

  addReportExport: async (reportExport: Omit<ReportExport, 'id' | 'generated_at'>) =>
    run(
      async () => {
        const client = requireSupabase();
        const { data, error } = await client
          .from('report_exports')
          .insert({
            report_name: reportExport.report_name,
            period_start: reportExport.period_start ?? null,
            period_end: reportExport.period_end ?? null,
            file_url: reportExport.file_url ?? null,
            file_format: reportExport.file_format ?? 'pdf',
            notes: reportExport.notes ?? null
          })
          .select('*')
          .single();

        if (error) throw error;
        return mapReportExportRow(data);
      },
      () => mockApi.addReportExport(reportExport)
    )
};
