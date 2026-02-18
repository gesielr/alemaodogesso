-- Add management fields to projects and refresh financial summary view

alter table if exists public.projects
  add column if not exists service text not null default '',
  add column if not exists execution_time text,
  add column if not exists material_cost numeric(14, 2) not null default 0 check (material_cost >= 0),
  add column if not exists vehicle_cost numeric(14, 2) not null default 0 check (vehicle_cost >= 0),
  add column if not exists labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  add column if not exists tax_cost numeric(14, 2) not null default 0 check (tax_cost >= 0),
  add column if not exists invoice_sent boolean not null default false;

create or replace view public.vw_project_financial_summary as
select
  p.id,
  p.client_id,
  c.name as client_name,
  p.title,
  p.status,
  p.start_date,
  p.end_date,
  p.address,
  p.total_value,
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
  )::numeric(14, 2) as profit_margin,
  p.description,
  p.service,
  p.execution_time,
  p.material_cost,
  p.vehicle_cost,
  p.labor_cost,
  p.tax_cost,
  p.invoice_sent
from public.projects p
left join public.clients c on c.id = p.client_id
left join public.project_costs pc on pc.project_id = p.id
group by p.id, c.name;
