import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_FILE = '.env.local';
const SOURCE_TAG = 'Dezembro_organized.pdf';

const parseEnv = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    env[key] = value;
  }

  return env;
};

const chunk = (array, size = 200) => {
  const parts = [];
  for (let i = 0; i < array.length; i += size) {
    parts.push(array.slice(i, i + size));
  }
  return parts;
};

const listRows = async (supabase, table, columns = 'id') => {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};

const deleteByIds = async (supabase, table, ids) => {
  if (ids.length === 0) return 0;

  let deleted = 0;
  for (const idsChunk of chunk(ids)) {
    const { error } = await supabase.from(table).delete().in('id', idsChunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    deleted += idsChunk.length;
  }
  return deleted;
};

const wipeTable = async (supabase, table) => {
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error) throw new Error(`${table}: ${error.message}`);
};

const difference = (allIds, keepSet) => allIds.filter((id) => !keepSet.has(id));

const run = async () => {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo ${ENV_FILE} nao encontrado.`);
  }

  const env = parseEnv(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente em .env.local');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const sourcePattern = `%${SOURCE_TAG}%`;

  const [
    keptClientsRows,
    keptProjectsRows,
    keptTransactionsRows,
    keptProjectCostsRows,
    allClientsRows,
    allProjectsRows,
    allTransactionsRows,
    allProjectCostsRows,
    allVehiclesRows
  ] = await Promise.all([
    supabase.from('clients').select('id').ilike('observations', sourcePattern),
    supabase.from('projects').select('id').ilike('description', sourcePattern),
    supabase.from('transactions').select('id,vehicle_id').ilike('notes', sourcePattern),
    supabase.from('project_costs').select('id').ilike('description', sourcePattern),
    listRows(supabase, 'clients', 'id'),
    listRows(supabase, 'projects', 'id'),
    listRows(supabase, 'transactions', 'id'),
    listRows(supabase, 'project_costs', 'id'),
    listRows(supabase, 'vehicles', 'id')
  ]);

  for (const queryResult of [keptClientsRows, keptProjectsRows, keptTransactionsRows, keptProjectCostsRows]) {
    if (queryResult.error) throw new Error(queryResult.error.message);
  }

  const keepClientIds = new Set((keptClientsRows.data ?? []).map((row) => row.id));
  const keepProjectIds = new Set((keptProjectsRows.data ?? []).map((row) => row.id));
  const keepTransactionRows = keptTransactionsRows.data ?? [];
  const keepTransactionIds = new Set(keepTransactionRows.map((row) => row.id));
  const keepProjectCostIds = new Set((keptProjectCostsRows.data ?? []).map((row) => row.id));

  if (keepClientIds.size === 0 || keepProjectIds.size === 0 || keepTransactionIds.size === 0) {
    throw new Error(
      `Nenhum conjunto importado com tag ${SOURCE_TAG} foi encontrado. Execute primeiro o importador antes da limpeza.`
    );
  }

  const keepVehicleIds = new Set(
    keepTransactionRows.map((row) => row.vehicle_id).filter((value) => Boolean(value))
  );

  const allClientIds = (allClientsRows ?? []).map((row) => row.id);
  const allProjectIds = (allProjectsRows ?? []).map((row) => row.id);
  const allTransactionIds = (allTransactionsRows ?? []).map((row) => row.id);
  const allProjectCostIds = (allProjectCostsRows ?? []).map((row) => row.id);
  const allVehicleIds = (allVehiclesRows ?? []).map((row) => row.id);

  const clientsToDelete = difference(allClientIds, keepClientIds);
  const projectsToDelete = difference(allProjectIds, keepProjectIds);
  const transactionsToDelete = difference(allTransactionIds, keepTransactionIds);
  const projectCostsToDelete = difference(allProjectCostIds, keepProjectCostIds);
  const vehiclesToDelete = difference(allVehicleIds, keepVehicleIds);

  const deletedProjectCosts = await deleteByIds(supabase, 'project_costs', projectCostsToDelete);
  const deletedTransactions = await deleteByIds(supabase, 'transactions', transactionsToDelete);
  const deletedProjects = await deleteByIds(supabase, 'projects', projectsToDelete);
  const deletedClients = await deleteByIds(supabase, 'clients', clientsToDelete);
  const deletedVehicles = await deleteByIds(supabase, 'vehicles', vehiclesToDelete);

  // Estas tabelas eram apenas dados de exemplo e devem ficar vazias.
  for (const table of [
    'materials',
    'suppliers',
    'employees',
    'inventory_movements',
    'vehicle_usage_logs',
    'vehicle_maintenance_logs',
    'report_exports'
  ]) {
    await wipeTable(supabase, table);
  }

  const counts = {};
  for (const table of [
    'clients',
    'projects',
    'transactions',
    'project_costs',
    'vehicles',
    'materials',
    'suppliers',
    'employees'
  ]) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = count ?? 0;
  }

  console.log('Limpeza concluida.');
  console.log(
    JSON.stringify(
      {
        deleted: {
          clients: deletedClients,
          projects: deletedProjects,
          transactions: deletedTransactions,
          project_costs: deletedProjectCosts,
          vehicles: deletedVehicles
        },
        remaining: counts
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error('Falha na limpeza:', error.message || error);
  process.exitCode = 1;
});
