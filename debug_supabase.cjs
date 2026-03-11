const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregamento manual do .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Credenciais Supabase não encontradas no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStock() {
  console.log('Verificando tabela : materials...');
  const { data, error } = await supabase.from('materials').select('*');
  if (error) {
    console.error('Erro ao buscar materiais:', error);
  } else {
    console.log(`Encontrados ${data?.length || 0} materiais.`);
    if (data && data.length > 0) {
      data.forEach(m => console.log(`- ${m.name} (Qtd: ${m.quantity})`));
    }
  }
}

checkStock();
