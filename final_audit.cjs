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

  console.log('URL:', supabaseUrl);
  
  const pData = await supabase.from('projects').select('id, title');
  console.log('Projects Table Raw:', JSON.stringify(pData.data, null, 2));

  const vData = await supabase.from('vw_project_financial_summary').select('id, title');
  console.log('View vw_project_financial_summary Raw:', JSON.stringify(vData.data, null, 2));

  const mData = await supabase.from('materials').select('id, name, quantity');
  console.log('Materials Raw:', JSON.stringify(mData.data, null, 2));

  const tData = await supabase.from('transactions').select('id, description').limit(10);
  console.log('Transactions Sample Raw:', JSON.stringify(tData.data, null, 2));
}

check();
