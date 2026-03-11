import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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
      console.log('Primeiro item:', data[0]);
    }
  }
}

checkStock();
