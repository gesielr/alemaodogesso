-- ===========================================================
-- GessoManager Pro - Supabase Schema
-- ===========================================================
-- This script creates all core tables used by the system:
-- clients, projects, inventory, finance, vehicles, employees,
-- costs, reports and supporting relations.
--
-- Safe to run on an empty database.
-- ===========================================================

create extension if not exists pgcrypto with schema public;

-- -----------------------------------------------------------
-- ENUM TYPES
-- -----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum (
      'Orçamento',
      'Aprovado',
      'Em Andamento',
      'Concluído',
      'Cancelado'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type public.transaction_type as enum ('Receita', 'Despesa');
  end if;

  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type public.transaction_status as enum ('Pendente', 'Parcial', 'Pago');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum (
      'Pix',
      'Boleto',
      'Crédito',
      'Débito',
      'Dinheiro',
      'Transferência'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'vehicle_status') then
    create type public.vehicle_status as enum ('Ativo', 'Manutenção');
  end if;

  if not exists (select 1 from pg_type where typname = 'project_cost_type') then
    create type public.project_cost_type as enum ('MATERIAL', 'LABOR', 'VEHICLE');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_movement_type') then
    create type public.inventory_movement_type as enum ('Entrada', 'Saída', 'Ajuste');
  end if;
end;
$$;

-- -----------------------------------------------------------
-- BASE TABLES
-- -----------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  document text not null default '',
  observations text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  document text not null default '',
  address text not null default '',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  cost_per_hour numeric(12, 2) not null default 0 check (cost_per_hour >= 0),
  phone text not null default '',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  price_cost numeric(12, 2) not null default 0 check (price_cost >= 0),
  quantity numeric(14, 3) not null default 0 check (quantity >= 0),
  min_quantity numeric(14, 3) not null default 0 check (min_quantity >= 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, unit)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  plate text not null unique,
  current_km integer not null default 0 check (current_km >= 0),
  last_maintenance date,
  status public.vehicle_status not null default 'Ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null,
  description text,
  service text not null default '',
  execution_time text,
  status public.project_status not null default 'Orçamento',
  start_date date,
  end_date date,
  total_value numeric(14, 2) not null default 0 check (total_value >= 0),
  address text not null default '',
  material_cost numeric(14, 2) not null default 0 check (material_cost >= 0),
  vehicle_cost numeric(14, 2) not null default 0 check (vehicle_cost >= 0),
  labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  tax_cost numeric(14, 2) not null default 0 check (tax_cost >= 0),
  invoice_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_dates_check check (
    end_date is null
    or start_date is null
    or end_date >= start_date
  )
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  type public.transaction_type not null,
  category text not null default 'Outros',
  date date not null default current_date,
  status public.transaction_status not null default 'Pendente',
  project_id uuid references public.projects(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  payment_method public.payment_method,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_paid_lte_amount check (paid_amount <= amount + 0.01)
);

create table if not exists public.transaction_settlements (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  settlement_date date not null default current_date,
  payment_method public.payment_method,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type public.project_cost_type not null,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  date date not null default current_date,
  material_id uuid references public.materials(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity numeric(14, 3) not null,
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  project_id uuid references public.projects(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  movement_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint inventory_movements_quantity_check check (
    (movement_type in ('Entrada', 'Saída') and quantity > 0)
    or (movement_type = 'Ajuste' and quantity <> 0)
  )
);

create table if not exists public.vehicle_usage_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  driver_name text not null default '',
  km_start integer not null check (km_start >= 0),
  km_end integer check (km_end is null or km_end >= km_start),
  start_at timestamptz not null default now(),
  end_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  maintenance_date date not null default current_date,
  description text not null,
  cost numeric(14, 2) not null default 0 check (cost >= 0),
  km integer check (km is null or km >= 0),
  next_maintenance_date date,
  next_maintenance_km integer check (next_maintenance_km is null or next_maintenance_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_name text not null,
  period_start date,
  period_end date,
  file_url text,
  file_format text not null default 'pdf',
  generated_at timestamptz not null default now(),
  notes text
);

-- -----------------------------------------------------------
-- COMMON FUNCTIONS / TRIGGERS
-- -----------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists trg_suppliers_updated_at on public.suppliers;
create trigger trg_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_vehicle_usage_logs_updated_at on public.vehicle_usage_logs;
create trigger trg_vehicle_usage_logs_updated_at
before update on public.vehicle_usage_logs
for each row execute function public.set_updated_at();

drop trigger if exists trg_vehicle_maintenance_logs_updated_at on public.vehicle_maintenance_logs;
create trigger trg_vehicle_maintenance_logs_updated_at
before update on public.vehicle_maintenance_logs
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------
-- TRANSACTION CONSISTENCY
-- -----------------------------------------------------------
create or replace function public.normalize_transaction_values()
returns trigger
language plpgsql
as $$
begin
  if new.paid_amount is null then
    new.paid_amount = 0;
  end if;

  if new.status = 'Pago' then
    new.paid_amount = new.amount;
  end if;

  if new.paid_amount < 0 then
    raise exception 'paid_amount não pode ser negativo';
  end if;

  if new.paid_amount > new.amount then
    new.paid_amount = new.amount;
  end if;

  if new.paid_amount >= new.amount then
    new.paid_amount = new.amount;
    new.status = 'Pago';
  elsif new.paid_amount > 0 then
    new.status = 'Parcial';
  else
    new.paid_amount = 0;
    new.status = 'Pendente';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_normalize on public.transactions;
create trigger trg_transactions_normalize
before insert or update on public.transactions
for each row execute function public.normalize_transaction_values();

create or replace function public.validate_transaction_settlement()
returns trigger
language plpgsql
as $$
declare
  transaction_total numeric(14, 2);
  already_settled numeric(14, 2);
begin
  select amount
  into transaction_total
  from public.transactions
  where id = new.transaction_id
  for update;

  if transaction_total is null then
    raise exception 'Transação % não encontrada', new.transaction_id;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(amount), 0)
    into already_settled
    from public.transaction_settlements
    where transaction_id = new.transaction_id
      and id <> old.id;
  else
    select coalesce(sum(amount), 0)
    into already_settled
    from public.transaction_settlements
    where transaction_id = new.transaction_id;
  end if;

  if already_settled + new.amount > transaction_total + 0.01 then
    raise exception 'Baixa excede o valor total da transação';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_transaction_settlement on public.transaction_settlements;
create trigger trg_validate_transaction_settlement
before insert or update on public.transaction_settlements
for each row execute function public.validate_transaction_settlement();

create or replace function public.refresh_transaction_settlement_totals()
returns trigger
language plpgsql
as $$
declare
  target_transaction_id uuid;
  total_settled numeric(14, 2);
begin
  target_transaction_id = case
    when tg_op = 'DELETE' then old.transaction_id
    else new.transaction_id
  end;

  select coalesce(sum(amount), 0)
  into total_settled
  from public.transaction_settlements
  where transaction_id = target_transaction_id;

  update public.transactions
  set paid_amount = least(total_settled, amount),
      status = case
        when total_settled <= 0 then 'Pendente'::public.transaction_status
        when total_settled >= amount - 0.01 then 'Pago'::public.transaction_status
        else 'Parcial'::public.transaction_status
      end
  where id = target_transaction_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_transaction_settlement_totals on public.transaction_settlements;
create trigger trg_refresh_transaction_settlement_totals
after insert or update or delete on public.transaction_settlements
for each row execute function public.refresh_transaction_settlement_totals();

-- -----------------------------------------------------------
-- INVENTORY CONSISTENCY
-- -----------------------------------------------------------
create or replace function public.inventory_delta(
  p_movement_type public.inventory_movement_type,
  p_quantity numeric
)
returns numeric
language sql
immutable
as $$
  select case
    when p_movement_type = 'Entrada' then p_quantity
    when p_movement_type = 'Saída' then -p_quantity
    else p_quantity
  end;
$$;

create or replace function public.adjust_material_quantity(
  p_material_id uuid,
  p_delta numeric
)
returns void
language plpgsql
as $$
declare
  new_quantity numeric(14, 3);
begin
  update public.materials
  set quantity = quantity + p_delta
  where id = p_material_id
  returning quantity into new_quantity;

  if new_quantity is null then
    raise exception 'Material % não encontrado', p_material_id;
  end if;

  if new_quantity < 0 then
    raise exception 'Estoque insuficiente para material %', p_material_id;
  end if;
end;
$$;

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
as $$
declare
  old_delta numeric;
  new_delta numeric;
begin
  if tg_op = 'INSERT' then
    new_delta = public.inventory_delta(new.movement_type, new.quantity);
    perform public.adjust_material_quantity(new.material_id, new_delta);
    return new;
  end if;

  if tg_op = 'DELETE' then
    old_delta = public.inventory_delta(old.movement_type, old.quantity);
    perform public.adjust_material_quantity(old.material_id, -old_delta);
    return old;
  end if;

  old_delta = public.inventory_delta(old.movement_type, old.quantity);
  new_delta = public.inventory_delta(new.movement_type, new.quantity);

  if new.material_id = old.material_id then
    perform public.adjust_material_quantity(new.material_id, new_delta - old_delta);
  else
    perform public.adjust_material_quantity(old.material_id, -old_delta);
    perform public.adjust_material_quantity(new.material_id, new_delta);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_inventory_movement on public.inventory_movements;
create trigger trg_apply_inventory_movement
after insert or update or delete on public.inventory_movements
for each row execute function public.apply_inventory_movement();

-- -----------------------------------------------------------
-- VIEWS / REPORT HELPERS
-- -----------------------------------------------------------
create or replace view public.vw_project_financial_summary as
select
  p.id,
  p.client_id,
  c.name as client_name,
  p.title,
  p.description,
  p.service,
  p.execution_time,
  p.status,
  p.start_date,
  p.end_date,
  p.address,
  p.total_value,
  p.material_cost,
  p.vehicle_cost,
  p.labor_cost,
  p.tax_cost,
  p.invoice_sent,
  (
    coalesce(sum(pc.amount), 0)
    + coalesce(p.material_cost, 0)
    + coalesce(p.vehicle_cost, 0)
    + coalesce(p.labor_cost, 0)
    + coalesce(p.tax_cost, 0)
  )::numeric(14, 2) as total_cost,
  (
    p.total_value
    - (
      coalesce(sum(pc.amount), 0)
      + coalesce(p.material_cost, 0)
      + coalesce(p.vehicle_cost, 0)
      + coalesce(p.labor_cost, 0)
      + coalesce(p.tax_cost, 0)
    )
  )::numeric(14, 2) as profit_margin
from public.projects p
left join public.clients c on c.id = p.client_id
left join public.project_costs pc on pc.project_id = p.id
group by p.id, c.name;

create or replace function public.get_dashboard_stats(
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  revenue numeric(14, 2),
  expenses numeric(14, 2),
  net_profit numeric(14, 2),
  active_projects bigint,
  low_stock_items bigint
)
language sql
stable
as $$
  with filtered_transactions as (
    select *
    from public.transactions t
    where (p_start_date is null or t.date >= p_start_date)
      and (p_end_date is null or t.date <= p_end_date)
  ),
  finance as (
    select
      coalesce(sum(case when type = 'Receita' then paid_amount else 0 end), 0) as revenue,
      coalesce(sum(case when type = 'Despesa' then paid_amount else 0 end), 0) as expenses
    from filtered_transactions
  )
  select
    f.revenue::numeric(14, 2),
    f.expenses::numeric(14, 2),
    (f.revenue - f.expenses)::numeric(14, 2),
    (select count(*) from public.projects where status = 'Em Andamento') as active_projects,
    (select count(*) from public.materials where quantity <= min_quantity) as low_stock_items
  from finance f;
$$;

create or replace view public.vw_dashboard_stats as
select * from public.get_dashboard_stats(null, null);

-- -----------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------
create index if not exists idx_clients_name on public.clients(name);
create index if not exists idx_clients_document on public.clients(document);

create index if not exists idx_materials_name on public.materials(name);
create index if not exists idx_materials_quantity on public.materials(quantity, min_quantity);

create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_start_date on public.projects(start_date);

create index if not exists idx_project_costs_project on public.project_costs(project_id);
create index if not exists idx_project_costs_date on public.project_costs(date);

create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_date on public.transactions(date);
create index if not exists idx_transactions_project on public.transactions(project_id);
create index if not exists idx_transactions_vehicle on public.transactions(vehicle_id);

create index if not exists idx_transaction_settlements_transaction on public.transaction_settlements(transaction_id);
create index if not exists idx_transaction_settlements_date on public.transaction_settlements(settlement_date);

create index if not exists idx_inventory_movements_material on public.inventory_movements(material_id);
create index if not exists idx_inventory_movements_date on public.inventory_movements(movement_date);

create index if not exists idx_vehicle_usage_logs_vehicle on public.vehicle_usage_logs(vehicle_id);
create index if not exists idx_vehicle_maintenance_logs_vehicle on public.vehicle_maintenance_logs(vehicle_id);

-- -----------------------------------------------------------
-- RLS (OPEN FOR DEVELOPMENT)
-- -----------------------------------------------------------
-- WARNING:
-- Policies below allow full access for anon/authenticated roles.
-- Use stricter policies before going to production.

alter table public.clients enable row level security;
alter table public.suppliers enable row level security;
alter table public.employees enable row level security;
alter table public.materials enable row level security;
alter table public.vehicles enable row level security;
alter table public.projects enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_settlements enable row level security;
alter table public.project_costs enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.vehicle_usage_logs enable row level security;
alter table public.vehicle_maintenance_logs enable row level security;
alter table public.report_exports enable row level security;

drop policy if exists clients_full_access on public.clients;
create policy clients_full_access on public.clients
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists suppliers_full_access on public.suppliers;
create policy suppliers_full_access on public.suppliers
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists employees_full_access on public.employees;
create policy employees_full_access on public.employees
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists materials_full_access on public.materials;
create policy materials_full_access on public.materials
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists vehicles_full_access on public.vehicles;
create policy vehicles_full_access on public.vehicles
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists projects_full_access on public.projects;
create policy projects_full_access on public.projects
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists transactions_full_access on public.transactions;
create policy transactions_full_access on public.transactions
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists transaction_settlements_full_access on public.transaction_settlements;
create policy transaction_settlements_full_access on public.transaction_settlements
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists project_costs_full_access on public.project_costs;
create policy project_costs_full_access on public.project_costs
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists inventory_movements_full_access on public.inventory_movements;
create policy inventory_movements_full_access on public.inventory_movements
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists vehicle_usage_logs_full_access on public.vehicle_usage_logs;
create policy vehicle_usage_logs_full_access on public.vehicle_usage_logs
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists vehicle_maintenance_logs_full_access on public.vehicle_maintenance_logs;
create policy vehicle_maintenance_logs_full_access on public.vehicle_maintenance_logs
for all to anon, authenticated
using (true)
with check (true);

drop policy if exists report_exports_full_access on public.report_exports;
create policy report_exports_full_access on public.report_exports
for all to anon, authenticated
using (true)
with check (true);
