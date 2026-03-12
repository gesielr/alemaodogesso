const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://jhvjnftnpfzojimgimui.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpodmpuZnRucGZ6b2ppbWdpbXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDM5NTcsImV4cCI6MjA3OTU3OTk1N30.63fpqVi8T0tzrCmXb9rg3nXmMWB7LMtIwoqduoUpxKs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const materialsToImport = [
  { name: 'Placa ST 120x180', unit: 'un', price_cost: 28.5, price_sale: 39.9, quantity: 450, min_quantity: 100 },
  { name: 'Placa RU (Verde) 120x180', unit: 'un', price_cost: 35.9, price_sale: 49.5, quantity: 80, min_quantity: 50 },
  { name: 'Perfil Montante 70mm', unit: 'barra', price_cost: 18, price_sale: 26, quantity: 200, min_quantity: 50 },
  { name: 'Massa para Junta 20kg', unit: 'sc', price_cost: 45, price_sale: 58, quantity: 15, min_quantity: 20 },
  { name: 'Parafuso GN 25', unit: 'cx', price_cost: 30, price_sale: 41.9, quantity: 50, min_quantity: 10 },
  { name: 'Gesso em Pó 40kg', unit: 'sc', price_cost: 22.0, price_sale: 35.0, quantity: 100, min_quantity: 20 },
  { name: 'Perfil Guia 70mm', unit: 'barra', price_cost: 15.0, price_sale: 22.0, quantity: 150, min_quantity: 40 },
  { name: 'Perfil Canaleta C', unit: 'barra', price_cost: 12.0, price_sale: 18.0, quantity: 300, min_quantity: 60 },
  { name: 'Cantoneira Metálica', unit: 'un', price_cost: 8.5, price_sale: 12.5, quantity: 200, min_quantity: 50 },
  { name: 'Fita de Papel Microperfurada', unit: 'un', price_cost: 15.0, price_sale: 25.0, quantity: 30, min_quantity: 10 }
];

async function importData() {
  console.log('Iniciando importação de materiais...');
  
  for (const mat of materialsToImport) {
    const { data, error } = await supabase.from('materials').upsert(mat, { onConflict: 'name,unit' });
    if (error) {
      console.error(`Erro ao importar ${mat.name}:`, error.message);
    } else {
      console.log(`Sucesso: ${mat.name}`);
    }
  }

  console.log('\nImportação concluída com sucesso!');
}

importData();
