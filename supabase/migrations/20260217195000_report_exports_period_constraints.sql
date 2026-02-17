-- Report exports: allow custom date ranges safely.
alter table public.report_exports
  add column if not exists period_start date,
  add column if not exists period_end date;

alter table public.report_exports
  drop constraint if exists report_exports_period_valid_range;

alter table public.report_exports
  add constraint report_exports_period_valid_range
  check (
    period_start is null
    or period_end is null
    or period_end >= period_start
  );

create index if not exists idx_report_exports_generated_at
  on public.report_exports (generated_at desc);

create index if not exists idx_report_exports_period
  on public.report_exports (period_start, period_end);
