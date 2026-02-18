-- Add service-item table for project budgets and sale price for materials.

alter table if exists public.materials
  add column if not exists price_sale numeric(12, 2) not null default 0 check (price_sale >= 0);

create table if not exists public.project_service_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  code text not null default '',
  description text not null default '',
  amount numeric(14, 2) not null default 0 check (amount >= 0),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_project_service_items_updated_at on public.project_service_items;
create trigger trg_project_service_items_updated_at
before update on public.project_service_items
for each row execute function public.set_updated_at();

create index if not exists idx_project_service_items_project on public.project_service_items(project_id);
create index if not exists idx_project_service_items_order on public.project_service_items(project_id, order_index);

alter table public.project_service_items enable row level security;

drop policy if exists project_service_items_full_access on public.project_service_items;
create policy project_service_items_full_access on public.project_service_items
for all to anon, authenticated
using (true)
with check (true);
