<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GessoManager Pro

Sistema de gestão para obras de gesso com módulos de obras, clientes, estoque, financeiro, veículos e relatórios.

## Rodar localmente

Pré-requisito: Node.js.

1. Instale dependências:
   `npm install`
2. Configure `.env.local`:
   `VITE_SUPABASE_URL=...`
   `VITE_SUPABASE_ANON_KEY=...`
3. Rode as migrações SQL no Supabase usando `db_schema.sql`.
4. Inicie:
   `npm run dev`

## Observação

Se as variáveis do Supabase não estiverem definidas, a aplicação usa fallback de dados locais em memória (`services/mockData.ts`) para desenvolvimento rápido.
