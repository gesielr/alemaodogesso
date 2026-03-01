-- ==============================================================================
-- SCRIPT DE CONSOLIDAÇÃO - GESSO MANAGER PRO
-- Execute este script no SQL Editor do Supabase para corrigir erros de tabela.
-- ==============================================================================

-- 1. Garantir que a tabela project_service_items tenha todas as colunas necessárias
DO $$ 
BEGIN
    -- Adicionar coluna amount se não existir (base)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_service_items' AND column_name = 'amount') THEN
        ALTER TABLE public.project_service_items ADD COLUMN amount numeric(14, 2) DEFAULT 0;
    END IF;

    -- Adicionar coluna quantity se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_service_items' AND column_name = 'quantity') THEN
        ALTER TABLE public.project_service_items ADD COLUMN quantity numeric(14, 2) DEFAULT 1;
    END IF;

    -- Adicionar coluna unit_value se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_service_items' AND column_name = 'unit_value') THEN
        ALTER TABLE public.project_service_items ADD COLUMN unit_value numeric(14, 2) DEFAULT 0;
    END IF;

    -- Adicionar coluna total_value se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_service_items' AND column_name = 'total_value') THEN
        ALTER TABLE public.project_service_items ADD COLUMN total_value numeric(14, 2) DEFAULT 0;
    END IF;

    -- Garantir tipo UUID para project_id e id
    -- (Geralmente já são, mas reforçamos)
END $$;

-- 2. Tabela para armazenar os PDFs dos orçamentos (Persistência)
CREATE TABLE IF NOT EXISTS public.project_quote_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_content text NOT NULL, -- Conteúdo em formato Base64
    created_at timestamptz DEFAULT now()
);

-- 3. Habilitar RLS e criar políticas de acesso aberto (Desenvolvimento)
ALTER TABLE public.project_quote_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_quote_documents' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON public.project_quote_documents FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_service_items' AND policyname = 'Allow all access') THEN
        CREATE POLICY "Allow all access" ON public.project_service_items FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 4. Garantir que a tabela projects tenha o campo total_value
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'total_value') THEN
        ALTER TABLE public.projects ADD COLUMN total_value numeric(14, 2) DEFAULT 0;
    END IF;
END $$;
