-- Migration: Add entry_value and ensure all management fields exist
-- Created at: 2026-03-11 09:31:00

alter table if exists public.projects
  add column if not exists entry_value numeric(14, 2) not null default 0 check (entry_value >= 0);

-- Ensure management fields from previous migration also exist (safety check)
alter table if exists public.projects
  add column if not exists service text not null default '',
  add column if not exists execution_time text,
  add column if not exists material_cost numeric(14, 2) not null default 0 check (material_cost >= 0),
  add column if not exists vehicle_cost numeric(14, 2) not null default 0 check (vehicle_cost >= 0),
  add column if not exists labor_cost numeric(14, 2) not null default 0 check (labor_cost >= 0),
  add column if not exists tax_cost numeric(14, 2) not null default 0 check (tax_cost >= 0),
  add column if not exists invoice_sent boolean not null default false;
