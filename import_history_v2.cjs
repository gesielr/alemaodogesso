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

async function run() {
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

  const supabase = createClient(supabaseUrl, supabaseKey);

  const dataPath = path.resolve(process.cwd(), 'history_consolidated_data.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  console.log('Iniciando importação de dados históricos...');

  // 1. Materiais Básicos (Estoque Inicial)
  const initialMaterials = [
    { name: 'Placa ST', unit: 'Unid', cost: 40.00, quantity: 50, min_quantity: 10 },
    { name: 'Placa RU', unit: 'Unid', cost: 57.00, quantity: 20, min_quantity: 5 },
    { name: 'Guia 48', unit: 'Unid', cost: 18.50, quantity: 100, min_quantity: 20 },
    { name: 'Montante 48', unit: 'Unid', cost: 22.50, quantity: 100, min_quantity: 20 },
    { name: 'Tabica', unit: 'Unid', cost: 19.00, quantity: 80, min_quantity: 15 },
    { name: 'Perfil F530', unit: 'Unid', cost: 16.50, quantity: 120, min_quantity: 25 },
    { name: 'Massa em Pó (Saco)', unit: 'Saco', cost: 80.00, quantity: 30, min_quantity: 5 },
    { name: 'Massa em Balde', unit: 'Balde', cost: 78.00, quantity: 15, min_quantity: 3 }
  ];

  console.log('Importando materiais...');
  for (const mat of initialMaterials) {
    const { error } = await supabase.from('materials').upsert(mat, { onConflict: 'name' });
    if (error) console.error(`Erro ao importar material ${mat.name}:`, error.message);
  }

  // 2. Processar meses
  for (const [month, content] of Object.entries(data)) {
    console.log(`\nProcessando ${month}...`);

    if (content.revenues) {
      for (const rev of content.revenues) {
        // Criar ou buscar projeto
        let { data: project, error: pError } = await supabase
          .from('projects')
          .select('id')
          .eq('description', rev.client)
          .single();

        if (pError || !project) {
          const { data: newProject, error: nPError } = await supabase
            .from('projects')
            .insert({
              description: rev.client,
              status: 'Concluído',
              total_value: rev.amount,
              start_date: rev.date || '2025-10-01'
            })
            .select()
            .single();
          
          if (nPError) {
             console.error(`Erro ao criar projeto ${rev.client}:`, nPError.message);
             continue;
          }
          project = newProject;
        }

        // Criar transação de receita
        const { error: tError } = await supabase.from('transactions').insert({
          type: 'Receita',
          amount: rev.amount,
          date: rev.date || '2025-10-01',
          category: 'Obra',
          description: `Pagamento Obra - ${rev.client}`,
          status: 'Pago'
        });
        if (tError) console.error(`Erro ao criar transação para ${rev.client}:`, tError.message);
      }
    }

    // Mão de Obra como despesa geral se não tiver projeto específico
    if (content.total_labor || content.labor_total) {
        const amount = content.total_labor || content.labor_total;
        await supabase.from('transactions').insert({
          type: 'Despesa',
          amount: amount,
          date: content.revenues?.[0]?.date || '2025-10-01',
          category: 'Mão de Obra',
          description: `Mão de Obra Total - ${month}`,
          status: 'Pago'
        });
    }
  }

  console.log('\nImportação concluída com sucesso!');
}

run().catch(err => {
  console.error('Falha crítica na importação:', err.message);
});
