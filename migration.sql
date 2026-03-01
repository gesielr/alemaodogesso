-- Adiciona campo worker_name para custos de mão de obra manuais
ALTER TABLE public.project_costs ADD COLUMN IF NOT EXISTS worker_name text;

-- Garante que o status padrão seja 'Orçamento'
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'Orçamento';

-- Adiciona campos extras se necessário em project_service_items
-- Por enquanto a tabela já tem: description, amount, order_index.
-- O usuário pediu "prazo" na tela de orçamento, mas geralmente refere-se ao prazo da obra toda.
-- Se ele quiser prazo por item, precisaríamos adicionar execution_days.
-- Vou adicionar unit_value e quantity para permitir detalhamento maior.
ALTER TABLE public.project_service_items ADD COLUMN IF NOT EXISTS quantity numeric(14, 2) DEFAULT 1;
ALTER TABLE public.project_service_items ADD COLUMN IF NOT EXISTS unit_value numeric(14, 2) DEFAULT 0;
ALTER TABLE public.project_service_items ADD COLUMN IF NOT EXISTS total_value numeric(14, 2) DEFAULT 0;

-- Atualizar RLS para as novas colunas (já deve estar aberto por 'project_service_items_full_access')
