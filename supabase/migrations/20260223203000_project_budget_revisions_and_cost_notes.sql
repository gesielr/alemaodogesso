alter table public.project_costs
add column if not exists notes text;

create table if not exists public.project_budget_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  previous_value numeric(14, 2) not null check (previous_value >= 0),
  new_value numeric(14, 2) not null check (new_value >= 0),
  reason text not null default '',
  changed_at timestamptz not null default now()
);

create index if not exists idx_project_budget_revisions_project_id
  on public.project_budget_revisions(project_id);

create index if not exists idx_project_budget_revisions_changed_at
  on public.project_budget_revisions(changed_at desc);

alter table public.project_budget_revisions enable row level security;

drop policy if exists project_budget_revisions_full_access on public.project_budget_revisions;
create policy project_budget_revisions_full_access on public.project_budget_revisions
for all to anon, authenticated
using (true)
with check (true);
