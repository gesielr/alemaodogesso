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

async function check() {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  const env = parseEnv(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- DB Audit ---');
  console.log('URL:', supabaseUrl);
  
  const { data: pList } = await supabase.from('projects').select('title');
  console.log(`Projetos (${pList?.length || 0}):`, pList?.map(p => p.title).join(', ') || 'NENHUM');

  const { data: mList } = await supabase.from('materials').select('name');
  console.log(`Materiais (${mList?.length || 0}):`, mList?.map(m => m.name).join(', ') || 'NENHUM');

  const { data: cList } = await supabase.from('clients').select('name');
  console.log(`Clientes (${cList?.length || 0}):`, cList?.map(c => c.name).join(', ') || 'NENHUM');

  console.log('\n--- Amostra de Materiais ---');
  const { data: mats, error: mErr } = await supabase.from('materials').select('*').limit(5);
  console.log(JSON.stringify(mats, null, 2));

  console.log('\n--- Amostra de Transações ---');
  const { data: trans, error: tErr } = await supabase.from('transactions').select('*').limit(5);
  console.log(JSON.stringify(trans, null, 2));
}

check();
