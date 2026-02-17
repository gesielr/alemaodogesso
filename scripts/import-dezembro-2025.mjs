import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ENV_FILE = '.env.local';
const SOURCE_TAG = 'Dezembro_organized.pdf';
const COMPLETED_STATUS = `Conclu\u00eddo`;
const LABOR_CATEGORY = `M\u00e3o de Obra`;

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

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const money = (value) => Number(Number(value).toFixed(2));
const dateISO = (ddmm) => {
  const [dd, mm] = ddmm.split('/');
  return `2025-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
};

const works = [
  {
    key: 'leide_parovencio',
    clientName: 'Leide Parovencio',
    projectTitle: 'Leide Parovencio',
    contractValue: 7358.0,
    startDate: dateISO('09/12'),
    endDate: dateISO('09/12'),
    revenues: [{ date: dateISO('09/12'), amount: 7358.0, status: 'Pago', label: 'Recebimento obra Leide Parovencio' }],
    costs: [
      { type: 'MATERIAL', amount: 3342.5, date: dateISO('09/12') },
      { type: 'LABOR', amount: 1120.0, date: dateISO('09/12') },
      { type: 'VEHICLE', amount: 150.0, date: dateISO('09/12') }
    ]
  },
  {
    key: 'fabricio_semoria',
    clientName: 'Fabricio Semoria',
    projectTitle: 'Fabricio Semoria - Pos Obra',
    contractValue: 1690.0,
    startDate: dateISO('09/12'),
    endDate: dateISO('09/12'),
    revenues: [{ date: dateISO('09/12'), amount: 1690.0, status: 'Pago', label: 'Recebimento obra Fabricio Semoria (pos-obra)' }],
    costs: [
      { type: 'MATERIAL', amount: 350.0, date: dateISO('09/12') },
      { type: 'LABOR', amount: 450.0, date: dateISO('09/12') },
      { type: 'VEHICLE', amount: 100.0, date: dateISO('09/12') }
    ]
  },
  {
    key: 'julia_rosa',
    clientName: 'Julia Rosa',
    projectTitle: 'Julia Rosa',
    contractValue: 8600.0,
    startDate: dateISO('10/12'),
    endDate: dateISO('11/12'),
    revenues: [
      { date: dateISO('10/12'), amount: 4300.0, status: 'Pago', label: 'Recebimento obra Julia Rosa (entrada)' },
      { date: dateISO('11/12'), amount: 4300.0, status: 'Pago', label: 'Recebimento obra Julia Rosa (final)' }
    ],
    costs: [
      { type: 'MATERIAL', amount: 3591.5, date: dateISO('11/12') },
      { type: 'LABOR', amount: 1598.0, date: dateISO('11/12') },
      { type: 'VEHICLE', amount: 150.0, date: dateISO('11/12') }
    ]
  },
  {
    key: 'falorp',
    clientName: 'Falorp',
    projectTitle: 'Falorp',
    contractValue: 33472.36,
    startDate: dateISO('12/12'),
    endDate: dateISO('12/12'),
    revenues: [{ date: dateISO('12/12'), amount: 33472.36, status: 'Pago', label: 'Recebimento obra Falorp' }],
    costs: [
      { type: 'MATERIAL', amount: 14474.0, date: dateISO('12/12') },
      { type: 'LABOR', amount: 1447.4, date: dateISO('12/12') }
    ]
  },
  {
    key: 'marisa_imbituba',
    clientName: 'Marisa Imbituba',
    projectTitle: 'Marisa Imbituba',
    contractValue: 3930.0,
    startDate: dateISO('12/12'),
    endDate: dateISO('12/12'),
    revenues: [{ date: dateISO('12/12'), amount: 3930.0, status: 'Pago', label: 'Recebimento obra Marisa Imbituba' }],
    costs: [
      { type: 'MATERIAL', amount: 1922.0, date: dateISO('12/12') },
      { type: 'LABOR', amount: 750.0, date: dateISO('12/12') },
      { type: 'VEHICLE', amount: 150.0, date: dateISO('12/12') }
    ]
  },
  {
    key: 'adilson_rodoviaria',
    clientName: 'Adilson Rodoviaria',
    projectTitle: 'Adilson Rodoviaria',
    contractValue: 1000.0,
    startDate: dateISO('22/12'),
    endDate: dateISO('22/12'),
    revenues: [{ date: dateISO('22/12'), amount: 1000.0, status: 'Pago', label: 'Recebimento obra Adilson Rodoviaria' }],
    costs: [
      { type: 'MATERIAL', amount: 244.5, date: dateISO('22/12') },
      { type: 'LABOR', amount: 180.0, date: dateISO('22/12') },
      { type: 'VEHICLE', amount: 100.0, date: dateISO('22/12') }
    ]
  },
  {
    key: 'caue_parovencio',
    clientName: 'Caue Parovencio',
    projectTitle: 'Caue Parovencio - Ar Condicionado',
    contractValue: 500.0,
    startDate: dateISO('27/12'),
    endDate: dateISO('27/12'),
    revenues: [{ date: dateISO('27/12'), amount: 500.0, status: 'Pago', label: 'Recebimento obra Caue Parovencio (ar condicionado)' }],
    costs: [
      { type: 'MATERIAL', amount: 100.0, date: dateISO('27/12') },
      { type: 'LABOR', amount: 150.0, date: dateISO('27/12') },
      { type: 'VEHICLE', amount: 50.0, date: dateISO('27/12') }
    ]
  },
  {
    key: 'cledis_pedra_branca',
    clientName: 'Cledis Pedra Branca',
    projectTitle: 'Cledis Pedra Branca',
    contractValue: 15200.0,
    startDate: dateISO('18/12'),
    endDate: dateISO('29/12'),
    revenues: [
      { date: dateISO('18/12'), amount: 7600.0, status: 'Pago', label: 'Recebimento obra Cledis Pedra Branca (entrada)' },
      { date: dateISO('29/12'), amount: 7600.0, status: 'Pago', label: 'Recebimento obra Cledis Pedra Branca (final)' }
    ],
    costs: [
      { type: 'MATERIAL', amount: 6450.5, date: dateISO('29/12') },
      { type: 'LABOR', amount: 3220.0, date: dateISO('29/12') },
      { type: 'VEHICLE', amount: 300.0, date: dateISO('29/12') }
    ]
  },
  {
    key: 'ricardo_hora',
    clientName: 'Ricardo Hora',
    projectTitle: 'Ricardo Hora',
    contractValue: 6975.0,
    startDate: dateISO('30/12'),
    endDate: dateISO('30/12'),
    revenues: [
      { date: dateISO('30/12'), amount: 3487.5, status: 'Pago', label: 'Recebimento obra Ricardo Hora (entrada)' },
      { date: dateISO('30/12'), amount: 3487.5, status: 'Pendente', label: 'Saldo a receber obra Ricardo Hora', paidAmount: 0 }
    ],
    costs: [
      { type: 'MATERIAL', amount: 2748.0, date: dateISO('30/12') },
      { type: 'LABOR', amount: 1300.0, date: dateISO('30/12') },
      { type: 'VEHICLE', amount: 120.0, date: dateISO('30/12') }
    ]
  }
];

const consolidatedTransactions = [
  {
    description: 'Venda de material (resumo dezembro/2025)',
    amount: 399.0,
    paidAmount: 399.0,
    type: 'Receita',
    category: 'Material',
    date: dateISO('22/12'),
    status: 'Pago'
  },
  {
    description: 'Folha de pagamento dezembro/2025',
    amount: 16026.0,
    paidAmount: 16026.0,
    type: 'Despesa',
    category: LABOR_CATEGORY,
    date: dateISO('30/12'),
    status: 'Pago'
  },
  {
    description: 'Contabilizacao da folha dezembro/2025',
    amount: 952.0,
    paidAmount: 952.0,
    type: 'Despesa',
    category: 'Administrativo',
    date: dateISO('30/12'),
    status: 'Pago'
  },
  {
    description: 'Gasolina Fiat Uno (dezembro/2025)',
    amount: 2500.0,
    paidAmount: 2500.0,
    type: 'Despesa',
    category: 'Combustivel',
    date: dateISO('31/12'),
    status: 'Pago',
    vehicleKey: 'uno'
  },
  {
    description: 'Gasolina Fiat Strada (dezembro/2025)',
    amount: 1000.0,
    paidAmount: 1000.0,
    type: 'Despesa',
    category: 'Combustivel',
    date: dateISO('31/12'),
    status: 'Pago',
    vehicleKey: 'strada'
  },
  {
    description: 'Seguro Uno/Strada (dezembro/2025)',
    amount: 485.2,
    paidAmount: 485.2,
    type: 'Despesa',
    category: 'Seguro',
    date: dateISO('31/12'),
    status: 'Pago'
  },
  {
    description: 'Manutencao Fiat Strada (22/12/2025)',
    amount: 1000.0,
    paidAmount: 1000.0,
    type: 'Despesa',
    category: 'Manutencao',
    date: dateISO('22/12'),
    status: 'Pago',
    vehicleKey: 'strada'
  },
  {
    description: 'Compras de materiais dezembro/2025 (consolidado)',
    amount: 29610.04,
    paidAmount: 29610.04,
    type: 'Despesa',
    category: 'Material',
    date: dateISO('31/12'),
    status: 'Pago'
  },
  {
    description: 'Notas fiscais dezembro/2025',
    amount: 5556.25,
    paidAmount: 5556.25,
    type: 'Despesa',
    category: 'Impostos',
    date: dateISO('31/12'),
    status: 'Pago'
  },
  {
    description: 'Contador dezembro/2025',
    amount: 360.0,
    paidAmount: 360.0,
    type: 'Despesa',
    category: 'Administrativo',
    date: dateISO('31/12'),
    status: 'Pago'
  }
];

const txSignature = (tx) =>
  [
    normalize(tx.description),
    tx.date,
    money(tx.amount).toFixed(2),
    tx.type,
    tx.status
  ].join('|');

const costSignature = (item) =>
  [
    item.project_id,
    item.type,
    money(item.amount).toFixed(2),
    item.date,
    normalize(item.description)
  ].join('|');

const run = async () => {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Arquivo ${ENV_FILE} nao encontrado.`);
  }

  const env = parseEnv(envPath);
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente em .env.local');
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const [clientsRes, projectsRes, vehiclesRes, transactionsRes, projectCostsRes] = await Promise.all([
    supabase.from('clients').select('id,name'),
    supabase.from('projects').select('id,title,client_id'),
    supabase.from('vehicles').select('id,model,plate'),
    supabase.from('transactions').select('id,description,date,amount,type,status'),
    supabase.from('project_costs').select('id,project_id,type,amount,date,description')
  ]);

  for (const res of [clientsRes, projectsRes, vehiclesRes, transactionsRes, projectCostsRes]) {
    if (res.error) throw res.error;
  }

  const clients = clientsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const projectCosts = projectCostsRes.data ?? [];

  const counters = {
    clientsCreated: 0,
    projectsCreated: 0,
    vehiclesCreated: 0,
    transactionsCreated: 0,
    projectCostsCreated: 0
  };

  const findClient = (name) => clients.find((c) => normalize(c.name) === normalize(name));
  const findProject = (title) => projects.find((p) => normalize(p.title) === normalize(title));
  const findVehicleByModel = (modelToken) =>
    vehicles.find((v) => normalize(v.model).includes(normalize(modelToken)));

  const ensureClient = async (name) => {
    const existing = findClient(name);
    if (existing) return existing;

    const payload = {
      name,
      phone: '',
      email: '',
      address: '',
      document: '',
      observations: `Importado de ${SOURCE_TAG} (dezembro/2025).`
    };
    const { data, error } = await supabase.from('clients').insert(payload).select('id,name').single();
    if (error) throw error;
    clients.push(data);
    counters.clientsCreated += 1;
    return data;
  };

  const ensureProject = async (work, clientId) => {
    const existing = findProject(work.projectTitle);
    if (existing) return existing;

    const payload = {
      client_id: clientId,
      title: work.projectTitle,
      description: `Importado de ${SOURCE_TAG}.`,
      status: COMPLETED_STATUS,
      start_date: work.startDate,
      end_date: work.endDate,
      total_value: money(work.contractValue),
      address: work.clientName
    };
    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select('id,title,client_id')
      .single();
    if (error) throw error;
    projects.push(data);
    counters.projectsCreated += 1;
    return data;
  };

  const ensureVehicle = async ({ model, plate }) => {
    const existingByPlate = vehicles.find((v) => normalize(v.plate) === normalize(plate));
    if (existingByPlate) return existingByPlate;
    const existingByModel = findVehicleByModel(model);
    if (existingByModel) return existingByModel;

    const payload = {
      model,
      plate,
      current_km: 0,
      status: 'Ativo'
    };
    const { data, error } = await supabase.from('vehicles').insert(payload).select('id,model,plate').single();
    if (error) throw error;
    vehicles.push(data);
    counters.vehiclesCreated += 1;
    return data;
  };

  const txSignatures = new Set(transactions.map(txSignature));
  const costSignatures = new Set(projectCosts.map(costSignature));

  const vehicleMap = {};
  const uno = await ensureVehicle({ model: 'Fiat Uno', plate: 'UNO2D25' });
  vehicleMap.uno = uno.id;

  const strada =
    findVehicleByModel('strada') ||
    (await ensureVehicle({ model: 'Fiat Strada 1.4', plate: 'STR2D25' }));
  vehicleMap.strada = strada.id;

  const projectIdByKey = {};
  for (const work of works) {
    const client = await ensureClient(work.clientName);
    const project = await ensureProject(work, client.id);
    projectIdByKey[work.key] = project.id;
  }

  const revenueTransactions = works.flatMap((work) =>
    work.revenues.map((rev) => ({
      description: rev.label,
      amount: money(rev.amount),
      paidAmount: rev.status === 'Pago' ? money(rev.amount) : money(rev.paidAmount ?? 0),
      type: 'Receita',
      category: 'Recebimento Obra',
      date: rev.date,
      status: rev.status,
      project_id: projectIdByKey[work.key]
    }))
  );

  const allTransactions = [
    ...revenueTransactions,
    ...consolidatedTransactions.map((tx) => ({
      ...tx,
      amount: money(tx.amount),
      paidAmount: money(tx.paidAmount),
      vehicle_id: tx.vehicleKey ? vehicleMap[tx.vehicleKey] : undefined
    }))
  ];

  for (const tx of allTransactions) {
    const signature = txSignature({
      description: tx.description,
      date: tx.date,
      amount: tx.amount,
      type: tx.type,
      status: tx.status
    });
    if (txSignatures.has(signature)) continue;

    const payload = {
      description: tx.description,
      amount: tx.amount,
      paid_amount: tx.paidAmount,
      type: tx.type,
      category: tx.category,
      date: tx.date,
      status: tx.status,
      project_id: tx.project_id ?? null,
      vehicle_id: tx.vehicle_id ?? null,
      notes: `Importado automaticamente de ${SOURCE_TAG}.`
    };

    const { error } = await supabase.from('transactions').insert(payload);
    if (error) throw error;
    txSignatures.add(signature);
    counters.transactionsCreated += 1;
  }

  const costRows = works.flatMap((work) =>
    work.costs.map((cost) => ({
      project_id: projectIdByKey[work.key],
      type: cost.type,
      amount: money(cost.amount),
      date: cost.date,
      description: `${cost.type} - importado de ${SOURCE_TAG}`
    }))
  );

  for (const row of costRows) {
    const signature = costSignature(row);
    if (costSignatures.has(signature)) continue;

    const { error } = await supabase.from('project_costs').insert(row);
    if (error) throw error;
    costSignatures.add(signature);
    counters.projectCostsCreated += 1;
  }

  const entradaTotal = allTransactions
    .filter((tx) => tx.type === 'Receita' && tx.status === 'Pago')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const saidaTotal = allTransactions
    .filter((tx) => tx.type === 'Despesa' && tx.status === 'Pago')
    .reduce((sum, tx) => sum + tx.amount, 0);

  console.log('Importacao concluida.');
  console.log(JSON.stringify(counters, null, 2));
  console.log(
    JSON.stringify(
      {
        entrada_importada_pago: money(entradaTotal),
        saida_importada_pago: money(saidaTotal),
        resultado_pago: money(entradaTotal - saidaTotal)
      },
      null,
      2
    )
  );
};

run().catch((error) => {
  console.error('Falha na importacao:', error.message || error);
  process.exitCode = 1;
});
