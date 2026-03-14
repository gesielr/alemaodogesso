const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ENV_FILE = '.env.local';

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

async function insertPedroCentro() {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found');
    return;
  }
  
  const env = parseEnv(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- Inserindo Obra: Pedro centro ---');

  // 1. Criar ou buscar cliente
  let { data: clients } = await supabase.from('clients').select('*').ilike('name', 'Pedro centro');
  let client_id;
  if (clients && clients.length > 0) {
    client_id = clients[0].id;
    console.log('Cliente encontrado:', clients[0].name);
  } else {
    const { data: newClient, error } = await supabase.from('clients').insert({
      name: 'Pedro centro',
      observations: 'Cliente criado automaticamente.'
    }).select().single();
    if (error) throw error;
    client_id = newClient.id;
    console.log('Novo cliente criado:', newClient.name);
  }

  // 2. Criar Obra (Project)
  // Verificando se já existe para evitar duplicatas:
  const { data: existingProject } = await supabase.from('projects').select('*').eq('client_id', client_id).ilike('title', '%Pedro centro%');
  let project_id;
  if (existingProject && existingProject.length > 0) {
    project_id = existingProject[0].id;
    console.log('Obra já existe, usando ID:', project_id);
    
    // Atualizar dados básicos
    await supabase.from('projects').update({
      start_date: '2026-02-15',
      execution_time: '1 dia',
      service: '10m² de forro',
      total_value: 1300.00
    }).eq('id', project_id);
  } else {
    const { data: newProj, error: pError } = await supabase.from('projects').insert({
      title: 'Obra - Pedro centro',
      client_id: client_id,
      status: 'Concluído',
      start_date: '2026-02-15',
      execution_time: '1 dia',
      service: '10m² de forro',
      total_value: 1300.00,
      entry_value: 0
    }).select().single();
    if (pError) throw pError;
    project_id = newProj.id;
    console.log('Nova obra criada:', newProj.title);
  }

  // 3. Inserir Mão de Obra
  console.log('Inserindo Mão de Obra...');
  await supabase.from('project_costs').insert({
    project_id: project_id,
    type: 'LABOR',
    description: 'Montador José',
    amount: 160.00,
    labor_daily_value: 160.00,
    worker_name: 'Montador José',
    date: '2026-02-15'
  });

  // 4. Inserir Veículo
  console.log('Inserindo Veículo...');
  await supabase.from('project_costs').insert({
    project_id: project_id,
    type: 'VEHICLE',
    description: 'strada 1 dia 2x 50,00',
    amount: 100.00,
    vehicle_fuel_value: 100.00,
    date: '2026-02-15'
  });

  // 5. Inserir Materiais Extras
  console.log('Inserindo Materiais...');
  const materiais = [
    { name: 'placa ST', q: 5, v: 0 },
    { name: 'tabica', q: 4, v: 0 },
    { name: 'f5530', q: 6, v: 0 },
    { name: 'arame', q: 1, v: 0 },
    { name: 'regulador', q: 18, v: 0 },
    { name: 'GN 25', q: 150, v: 0 },
    { name: 'parafuso 45x45', q: 24, v: 0 },
    { name: 'bucha', q: 24, v: 0 },
    { name: 'parafuso 42x13', q: 12, v: 0 },
    { name: 'saco massa', q: 0.5, v: 0 },
    { name: 'balde massa', q: 0.33, v: 0 }
  ];

  for (const m of materiais) {
    await supabase.from('project_costs').insert({
      project_id: project_id,
      type: 'MATERIAL',
      description: `[EXTRA] ${m.name} (${m.q} Unid)`,
      amount: m.q * m.v,
      quantity: m.q,
      date: '2026-02-15',
      notes: 'Material extra inserido via script.'
    });
  }

  console.log('Todos os lançamentos realizados com sucesso!');
}

insertPedroCentro().catch(console.error);
