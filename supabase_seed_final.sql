-- ==============================================================================
-- SCRIPT DE SEED COMPLETO - MATERIAIS + DADOS HISTÓRICOS
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

BEGIN;

-- 1. IMPORTAÇÃO DE MATERIAIS RREAIS (Extraídos do OCR/Sistema)
INSERT INTO public.materials (name, unit, price_cost, price_sale, quantity, min_quantity)
VALUES 
('Placa ST 120x180', 'un', 28.5, 39.9, 450, 100),
('Placa RU (Verde) 120x180', 'un', 35.9, 49.5, 80, 50),
('Perfil Montante 70mm', 'barra', 18.0, 26.0, 200, 50),
('Massa para Junta 20kg', 'sc', 45.0, 58.0, 15, 20),
('Parafuso GN 25', 'cx', 30.0, 41.9, 50, 10),
('Gesso em Pó 40kg', 'sc', 22.0, 35.0, 100, 20),
('Perfil Guia 70mm', 'barra', 15.0, 22.0, 150, 40),
('Perfil Canaleta C', 'barra', 12.0, 18.0, 300, 60),
('Cantoneira Metálica', 'un', 8.5, 12.5, 200, 50),
('Fita de Papel Microperfurada', 'un', 15.0, 25.0, 30, 10)
ON CONFLICT (name, unit) DO UPDATE SET
    price_cost = EXCLUDED.price_cost,
    price_sale = EXCLUDED.price_sale,
    quantity = EXCLUDED.quantity;

-- 2. CLIENTE PADRÃO PARA HISTÓRICO
INSERT INTO public.clients (name, phone, observations) 
VALUES ('Clientes Históricos', '000000000', 'Cadastro automático para migração de dados')
ON CONFLICT DO NOTHING;

-- 3. IMPORTAÇÃO DE OBRAS E TRANSAÇÕES (JANEIRO/NOVEMBRO)
DO $$ 
DECLARE 
    v_client_id uuid;
    v_project_id uuid;
BEGIN
    SELECT id INTO v_client_id FROM public.clients WHERE name = 'Clientes Históricos' LIMIT 1;

    -- Fancorp Bloco C
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Fancorp Bloco C') THEN
        INSERT INTO public.projects (title, client_id, status, total_value, start_date)
        VALUES ('Fancorp Bloco C', v_client_id, 'Concluído', 44626.44, '2026-01-01')
        RETURNING id INTO v_project_id;

        INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status, project_id)
        VALUES 
        ('Recebimento Fancorp Bloco C (16/01)', 23617.94, 23617.94, 'Receita', 'Recebimento Obra', '2026-01-16', 'Pago', v_project_id),
        ('Recebimento Fancorp Bloco C (30/01)', 21008.50, 21008.50, 'Receita', 'Recebimento Obra', '2026-01-30', 'Pago', v_project_id);
    END IF;

    -- Nati Penha
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE title = 'Nati Penha') THEN
        INSERT INTO public.projects (title, client_id, status, total_value, start_date)
        VALUES ('Nati Penha', v_client_id, 'Concluído', 15776.00, '2026-01-01')
        RETURNING id INTO v_project_id;

        INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status, project_id)
        VALUES 
        ('Recebimento Nati Penha (-3% ato)', 14300.00, 14300.00, 'Receita', 'Recebimento Obra', '2026-01-05', 'Pago', v_project_id),
        ('Recebimento Nati Penha (Acréscimo)', 1476.00, 1476.00, 'Receita', 'Recebimento Obra', '2026-01-16', 'Pago', v_project_id);
    END IF;

    -- Despesas Janeiro
    INSERT INTO public.transactions (description, amount, paid_amount, type, category, date, status)
    VALUES 
    ('Mão de Obra - José', 4925.00, 4925.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Mão de Obra - Josué', 3380.00, 3380.00, 'Despesa', 'Mão de Obra', '2026-01-31', 'Pago'),
    ('Seguro Uno/Strada', 209.53, 209.53, 'Despesa', 'Combustível', '2026-01-03', 'Pago'),
    ('Total Receitas Novembro', 56524.58, 56524.58, 'Receita', 'Recebimento Obra', '2025-11-30', 'Pago');

END $$;

COMMIT;
