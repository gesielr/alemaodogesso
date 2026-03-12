-- SCRIPT DE IMPORTAÇÃO DE DADOS HISTÓRICOS (OUT/2025 - FEV/2026) - VERSÃO CORRIGIDA
-- Execute este script no SQL Editor do Supabase

-- 1. Criar um cliente para o Histórico (se não existir)
DO $$
DECLARE
    v_client_id UUID;
BEGIN
    INSERT INTO clients (name, observations) 
    VALUES ('Histórico PDF', 'Cliente gerado para importar dados legados')
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_client_id FROM clients WHERE name = 'Histórico PDF' LIMIT 1;

    -- 2. Limpeza e Inserção de Materiais (price_cost corrigido)
    DELETE FROM materials WHERE name IN ('Placa ST', 'Placa RU', 'Guia 48', 'Montante 48', 'Tabica', 'Perfil F530', 'Massa em Pó (Saco)', 'Massa em Balde');

    INSERT INTO materials (name, unit, price_cost, quantity, min_quantity) VALUES
    ('Placa ST', 'Unid', 40.00, 50, 10),
    ('Placa RU', 'Unid', 57.00, 20, 5),
    ('Guia 48', 'Unid', 18.50, 100, 20),
    ('Montante 48', 'Unid', 22.50, 100, 20),
    ('Tabica', 'Unid', 19.00, 80, 15),
    ('Perfil F530', 'Unid', 16.50, 120, 25),
    ('Massa em Pó (Saco)', 'Saco', 80.00, 30, 5),
    ('Massa em Balde', 'Balde', 78.00, 15, 3);

    -- 3. Limpeza e Inserção de Obras (Projects) - Adicionado client_id e title
    DELETE FROM projects WHERE client_id = v_client_id;

    INSERT INTO projects (client_id, title, description, status, total_value, start_date) VALUES
    (v_client_id, 'Obra Fabricio Serrania', 'Fabricio Serrania', 'Concluído', 26548.20, '2025-10-01'),
    (v_client_id, 'Obra Farcorp', 'Farcorp', 'Concluído', 25379.32, '2025-10-01'),
    (v_client_id, 'Obra Daniel Rosa', 'Daniel Rosa', 'Concluído', 3000.00, '2025-10-01'),
    (v_client_id, 'Obra Alberto Panorâmico', 'Alberto Panorâmico', 'Concluído', 2327.00, '2025-10-01'),
    (v_client_id, 'Obra Thiago Palhocinha', 'Thiago Palhocinha', 'Concluído', 2944.68, '2025-11-03'),
    (v_client_id, 'Obra Nelly Rosa', 'Nelly Rosa', 'Concluído', 2879.24, '2025-11-05'),
    (v_client_id, 'Obra Daniel Rosa II', 'Daniel Rosa II', 'Concluído', 4790.00, '2025-11-10'),
    (v_client_id, 'Obra Fanconp PVC B', 'Fanconp Ferraz (PVC Bloco B)', 'Concluído', 6424.00, '2025-11-14'),
    (v_client_id, 'Obra Leandro Paulo', 'Leandro Paulo Lopes', 'Concluído', 7655.00, '2025-11-17'),
    (v_client_id, 'Obra Junior Rosa', 'Junior Rosa', 'Concluído', 17576.00, '2025-11-17'),
    (v_client_id, 'Obra Fanconp Drywall C', 'Fanconp Ferraz (Drywall Bloco C)', 'Concluído', 24714.76, '2025-11-21'),
    (v_client_id, 'Obra Foxcorp', 'Foxcorp', 'Concluído', 33472.36, '2025-12-01'),
    (v_client_id, 'Obra Cledis Pedra Branca', 'Cledis Pedra Branca', 'Concluído', 15200.00, '2025-12-01'),
    (v_client_id, 'Obra Júlio Rosa', 'Júlio Rosa', 'Concluído', 8600.00, '2025-12-01'),
    (v_client_id, 'Obra Leide Panorâmico', 'Leide Panorâmico', 'Concluído', 7358.00, '2025-12-01'),
    (v_client_id, 'Obra Ricardo Rosa', 'Ricardo Rosa', 'Concluído', 6975.00, '2025-12-01'),
    (v_client_id, 'Obra Mausa Imbituba', 'Mausa Imbituba', 'Concluído', 3930.00, '2025-12-01'),
    (v_client_id, 'Obra Nati Penha', 'Nati Penha', 'Concluído', 15776.00, '2026-01-05'),
    (v_client_id, 'Obra Fincorp Bloco C', 'Fincorp Bloco C', 'Concluído', 47626.44, '2026-01-16'),
    (v_client_id, 'Obra Jaime Canto', 'Jaime Canto', 'Concluído', 8113.00, '2026-01-15'),
    (v_client_id, 'Obra Jaime Castro', 'Jaime Castro', 'Concluído', 17226.00, '2026-02-01'),
    (v_client_id, 'Obra Fancorp Bloco L', 'Fancorp Bloco L', 'Concluído', 12084.00, '2026-02-01');

    -- 4. Limpeza e Inserção de Transações (Fluxo de Caixa)
    -- Limpamos apenas categorias que estamos importando para evitar duplicatas em retentativas
    DELETE FROM transactions WHERE description LIKE '%(Histórico PDF)%';

    INSERT INTO transactions (type, amount, date, category, description, status) VALUES
    ('Receita', 26548.20, '2025-10-15', 'Obra', 'Recebimento Fabricio Serrania (Histórico PDF)', 'Pago'),
    ('Receita', 25379.32, '2025-10-20', 'Obra', 'Recebimento Farcorp (Histórico PDF)', 'Pago'),
    ('Despesa', 21420.00, '2025-10-31', 'Mão de Obra', 'Folha de Pagamento Outubro 25 (Histórico PDF)', 'Pago'),
    ('Receita', 24714.76, '2025-11-21', 'Obra', 'Recebimento Fanconp Drywall C (Histórico PDF)', 'Pago'),
    ('Despesa', 15248.00, '2025-11-30', 'Mão de Obra', 'Folha de Pagamento Novembro 25 (Histórico PDF)', 'Pago'),
    ('Receita', 33472.36, '2025-12-20', 'Obra', 'Recebimento Foxcorp Dezembro (Histórico PDF)', 'Pago'),
    ('Despesa', 26978.00, '2025-12-31', 'Mão de Obra', 'Folha de Pagamento Dezembro 25 (Histórico PDF)', 'Pago'),
    ('Despesa', 19610.04, '2025-12-31', 'Material', 'Compra Materiais Dezembro 25 (Histórico PDF)', 'Pago'),
    ('Receita', 47626.44, '2026-01-30', 'Obra', 'Recebimento Fincorp Bloco C (Histórico PDF)', 'Pago'),
    ('Despesa', 19287.00, '2026-01-31', 'Mão de Obra', 'Folha de Pagamento Janeiro 26 (Histórico PDF)', 'Pago'),
    ('Despesa', 28329.64, '2026-01-31', 'Material', 'Compra Materiais Janeiro 26 - Espaço Smart (Histórico PDF)', 'Pago'),
    ('Despesa', 4985.70, '2025-12-31', 'Veículo', 'Gastos Totais Veículos (Uno/Strada) Dez25 (Histórico PDF)', 'Pago'),
    ('Despesa', 2891.43, '2026-01-31', 'Veículo', 'Gastos Totais Veículos Jan26 (Histórico PDF)', 'Pago');

END $$;
