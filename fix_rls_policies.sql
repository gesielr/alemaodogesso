-- SCRIPT PARA CORREÇÃO DE PERMISSÕES (RLS) - SISTEMA ALEMÃO DO GESSO
-- Execute este script no SQL Editor do Supabase para garantir que o Frontend veja os dados.

-- 1. Desativar RLS temporariamente para garantir limpeza (Opcional, mas seguro)
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements DISABLE ROW LEVEL SECURITY;

-- 2. Recriar Políticas de Acesso Total para Desenvolvimento
-- MATERIAIS
DROP POLICY IF EXISTS materials_full_access ON public.materials;
CREATE POLICY materials_full_access ON public.materials FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- TRANSAÇÕES
DROP POLICY IF EXISTS transactions_full_access ON public.transactions;
CREATE POLICY transactions_full_access ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- PROJETOS
DROP POLICY IF EXISTS projects_full_access ON public.projects;
CREATE POLICY projects_full_access ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- CLIENTES
DROP POLICY IF EXISTS clients_full_access ON public.clients;
CREATE POLICY clients_full_access ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- FORNECEDORES
DROP POLICY IF EXISTS suppliers_full_access ON public.suppliers;
CREATE POLICY suppliers_full_access ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- CUSTOS DE PROJETO
DROP POLICY IF EXISTS project_costs_full_access ON public.project_costs;
CREATE POLICY project_costs_full_access ON public.project_costs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- MOVIMENTAÇÕES DE ESTOQUE
DROP POLICY IF EXISTS inventory_movements_full_access ON public.inventory_movements;
CREATE POLICY inventory_movements_full_access ON public.inventory_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Reativar RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 4. Inserção de dados de teste (Apenas para validar se agora funciona para anon)
-- Este comando no editor funciona sempre, mas valida que o esquema está pronto.
SELECT count(*) FROM materials;
