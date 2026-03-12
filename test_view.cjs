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

async function test() {
  const envPath = path.resolve(process.cwd(), ENV_FILE);
  const env = parseEnv(envPath);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('--- Testing vw_project_financial_summary ---');
  
  const { data, error } = await supabase.from('vw_project_financial_summary').select('*').limit(5);
  if (error) {
    console.error('Error querying view:', error);
    return;
  }

  console.log(`Results: ${data.length}`);
  console.log(JSON.stringify(data, null, 2));
}

test();
