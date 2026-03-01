-- ==============================================================================
-- SCRIPT DE SEED - DADOS HISTÓRICOS (JANEIRO E NOVEMBRO)
-- Execute este script no SQL Editor do Supabase para popular o sistema.
-- ==============================================================================

-- 1. Limpeza de dados de teste (Opcional - comente se não quiser limpar)
-- DELETE FROM public.transactions;
-- DELETE FROM public.project_costs;
-- DELETE FROM public.projects;

-- 2. CADASTRO DE OBRAS (JANEIRO 2026)
-- Nota: Usaremos IDs fixos temporários para relacionamentos ou sub-queries

DO $$ 
DECLARE 
    v_client_id uuid;
    v_project_id uuid;
BEGIN
    -- Cliente Padrão para Obras Antigas se não existir
    INSERT INTO public.clients (name, phone, observations) 
    VALUES ('Clientes Históricos', '000000000', 'Cadastro automático para migração de dados')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_client_id FROM public.clients WHERE name = 'Clientes Históricos' LIMIT 1;

    -- OBRA: Fancorp Bloco C (Janeiro)
    INSERT INTO public.projects (title, client_id, client_name, status, total_value, start_date)
    VALUES ('Fancorp Bloco C', v_client_id, 'Fancorp', 'Concluido', 44626.44, '2026-01-01')
    RETURNING id INTO v_project_id;

    -- Lançamentos de Receita desta obra
    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status, project_id)
    VALUES 
    ('Recebimento Fancorp Bloco C (16/01)', 23617.94, 23617.94, 'Receita', 'Recebimento Obra', '2026-01-16', 'Pago', v_project_id),
    ('Recebimento Fancorp Bloco C (30/01)', 21008.50, 21008.50, 'Receita', 'Recebimento Obra', '2026-01-30', 'Pago', v_project_id);

    -- OBRA: Nati Penha
    INSERT INTO public.projects (title, client_id, client_name, status, total_value, start_date)
    VALUES ('Nati Penha', v_client_id, 'Nati Penha', 'Concluido', 15776.00, '2026-01-01')
    RETURNING id INTO v_project_id;

    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status, project_id)
    VALUES 
    ('Recebimento Nati Penha (-3% ato)', 14300.00, 14300.00, 'Receita', 'Recebimento Obra', '2026-01-05', 'Pago', v_project_id),
    ('Recebimento Nati Penha (Acréscimo)', 1476.00, 1476.00, 'Receita', 'Recebimento Obra', '2026-01-16', 'Pago', v_project_id);

    -- Outras Receitas Avulsas (Janeiro)
    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status)
    VALUES 
    ('Caroline C duna', 2400.00, 2400.00, 'Receita', 'Recebimento Obra', '2026-01-06', 'Pago'),
    ('Junior Rosa (entrada)', 5826.00, 5826.00, 'Receita', 'Recebimento Obra', '2026-01-06', 'Pago'),
    ('Ricardo Rosa I (final)', 4084.50, 4084.50, 'Receita', 'Recebimento Obra', '2026-01-12', 'Pago'),
    ('Junior Rosa (final)', 5000.00, 5000.00, 'Receita', 'Recebimento Obra', '2026-01-14', 'Pago'),
    ('Jaime Canto (entrada)', 8113.00, 8113.00, 'Receita', 'Recebimento Obra', '2026-01-15', 'Pago'),
    ('Sicli Panorâmico (total)', 2795.00, 2795.00, 'Receita', 'Recebimento Obra', '2026-01-21', 'Pago'),
    ('Gustavo Nedel (acréscimo)', 1900.00, 1900.00, 'Receita', 'Recebimento Obra', '2026-01-23', 'Pago'),
    ('Nicanor', 2500.00, 2500.00, 'Receita', 'Recebimento Obra', '2026-01-29', 'Pago');

    -- DESPESAS GERAIS (JANEIRO)
    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status)
    VALUES 
    ('Mão de Obra - José', 4925.00, 4925.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Mão de Obra - Josué', 3380.00, 3380.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Mão de Obra - Erasminho', 2628.00, 2628.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Mão de Obra - Daniel', 2920.00, 2920.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Seguro Uno/Strada', 209.53, 209.53, 'Despesa', 'Combustível', '2026-01-03', 'Pago'),
    ('Manutenção Cordo Mec', 1000.00, 1000.00, 'Despesa', 'Manutenção', '2026-01-16', 'Pago'),
    ('Combustível Gás Uno/Strada', 1112.90, 1112.90, 'Despesa', 'Combustível', '2026-01-31', 'Pago'),
    ('Uber Mensal', 569.00, 569.00, 'Despesa', 'Transporte', '2026-01-31', 'Pago'),
    ('Compra Material - Metal Perfil', 4000.00, 4000.00, 'Despesa', 'Material', '2026-01-05', 'Pago'),
    ('Compra Material - Espaço Smart', 8379.91, 8379.91, 'Despesa', 'Material', '2026-01-31', 'Pago'),
    ('Tributos - Simples Nacional', 3698.94, 3698.94, 'Despesa', 'Impostos', '2026-01-26', 'Pago'),
    ('Tributos - INSS', 598.37, 598.37, 'Despesa', 'Impostos', '2026-01-26', 'Pago');

    -- LANÇAMENTOS DE NOVEMBRO (RESUMO)
    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status)
    VALUES 
    ('Total Receitas Novembro', 56524.58, 56524.58, 'Receita', 'Recebimento Obra', '2025-11-30', 'Pago'),
    ('Total Despesas Novembro (MDO + Outros)', 14813.00, 14813.00, 'Despesa', 'Outros', '2025-11-30', 'Pago');

END $$;
