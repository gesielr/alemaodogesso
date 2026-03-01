-- Tabela para armazenar os PDFs dos orçamentos
CREATE TABLE IF NOT EXISTS public.project_quote_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    file_content text NOT NULL, -- Conteúdo em formato Base64
    created_at timestamptz DEFAULT now()
);

-- Habilitar RLS (opcional, mantendo padrão das outras tabelas)
ALTER TABLE public.project_quote_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for project_quote_documents" ON public.project_quote_documents
    FOR ALL USING (true) WITH CHECK (true);
