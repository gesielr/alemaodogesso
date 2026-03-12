const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jhvjnftnpfzojimgimui.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodmpuZnRucGZ6b2ppbWdpbXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDM5NTcsImV4cCI6MjA3OTU3OTk1N30.63fpqVi8T0tzrCmXb9rg3nXmMWB7LMtIwoqduoUpxKs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testando conexão com Supabase Remoto...');
  try {
    const { data, error } = await supabase.from('materials').select('*').limit(10);
    if (error) {
      console.error('Erro ao buscar materiais:', error.message);
    } else {
      console.log(`Conexão bem sucedida! Encontrados ${data.length} materiais (limite 10).`);
      data.forEach(m => console.log(`- ${m.name} (Qtd: ${m.quantity}, Unidade: ${m.unit})`));
      
      // Também verificar se existem dados em outras tabelas importantes
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      console.log(`Total de projetos no banco: ${count}`);
    }
  } catch (err) {
    console.error('Falha crítica na conexão:', err.message);
  }
}

testConnection();
