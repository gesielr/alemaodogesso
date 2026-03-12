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

  console.log('--- Project Dates Audit ---');
  
  const { data: projects, error } = await supabase.from('projects').select('id, title, start_date, total_value');
  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log(`Total projects: ${projects.length}`);
  projects.forEach(p => {
    console.log(`- ${p.title} | Start: ${p.start_date} | Value: ${p.total_value}`);
  });
}

check();
