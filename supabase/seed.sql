begin;

insert into public.clients (id, name, phone, email, address, document, observations, active)
values
  ('10000000-0000-0000-0000-000000000001', 'Construtora Horizonte', '(11) 99888-1001', 'contato@horizonte.com', 'Av. Brasil, 500 - São Paulo/SP', '12.345.678/0001-90', 'Cliente corporativo com obras recorrentes.', true),
  ('10000000-0000-0000-0000-000000000002', 'Maria Oliveira', '(11) 97777-2222', 'maria@email.com', 'Alameda Santos, 500 - São Paulo/SP', '321.654.987-00', 'Prefere contato por WhatsApp.', true),
  ('10000000-0000-0000-0000-000000000003', 'João Souza', '(11) 96666-3333', 'joao@email.com', 'Rua das Flores, 123 - São Paulo/SP', '123.456.789-00', 'Solicita detalhamento de orçamento.', true)
on conflict (id) do update
set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  address = excluded.address,
  document = excluded.document,
  observations = excluded.observations,
  active = excluded.active;

insert into public.suppliers (id, name, phone, email, document, address, notes, active)
values
  ('20000000-0000-0000-0000-000000000001', 'Gesso Forte', '(11) 4000-1000', 'vendas@gessoforte.com', '45.123.777/0001-10', 'Rua Industrial, 900 - Guarulhos/SP', 'Fornecedor principal de placas.', true),
  ('20000000-0000-0000-0000-000000000002', 'Metal Aço', '(11) 4000-2000', 'contato@metalaco.com', '98.222.333/0001-20', 'Av. Metais, 210 - Osasco/SP', 'Perfis e estruturas.', true)
on conflict (id) do update
set
  name = excluded.name,
  phone = excluded.phone,
  email = excluded.email,
  document = excluded.document,
  address = excluded.address,
  notes = excluded.notes,
  active = excluded.active;

insert into public.employees (id, name, role, cost_per_hour, phone, active, notes)
values
  ('30000000-0000-0000-0000-000000000001', 'Carlos Silva', 'Gesseiro', 45.00, '(11) 98888-1111', true, 'Especialista em forro e sanca.'),
  ('30000000-0000-0000-0000-000000000002', 'Pedro Martins', 'Ajudante', 28.00, '(11) 97777-1111', true, 'Apoio em montagem e acabamento.')
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  cost_per_hour = excluded.cost_per_hour,
  phone = excluded.phone,
  active = excluded.active,
  notes = excluded.notes;

insert into public.materials (id, name, unit, price_cost, quantity, min_quantity, supplier_id, notes)
values
  ('40000000-0000-0000-0000-000000000001', 'Placa de Gesso ST 120x180', 'un', 29.90, 430, 100, '20000000-0000-0000-0000-000000000001', 'Material de alto giro.'),
  ('40000000-0000-0000-0000-000000000002', 'Placa RU 120x180', 'un', 37.50, 70, 50, '20000000-0000-0000-0000-000000000001', null),
  ('40000000-0000-0000-0000-000000000003', 'Perfil Montante 70mm', 'barra', 18.00, 180, 60, '20000000-0000-0000-0000-000000000002', null),
  ('40000000-0000-0000-0000-000000000004', 'Massa para Junta 20kg', 'sc', 47.00, 12, 20, '20000000-0000-0000-0000-000000000001', 'Abaixo do estoque mínimo.'),
  ('40000000-0000-0000-0000-000000000005', 'Parafuso GN 25', 'cx', 31.50, 45, 15, '20000000-0000-0000-0000-000000000002', null)
on conflict (id) do update
set
  name = excluded.name,
  unit = excluded.unit,
  price_cost = excluded.price_cost,
  quantity = excluded.quantity,
  min_quantity = excluded.min_quantity,
  supplier_id = excluded.supplier_id,
  notes = excluded.notes;

insert into public.vehicles (id, model, plate, current_km, last_maintenance, status, notes)
values
  ('50000000-0000-0000-0000-000000000001', 'Fiat Strada 1.4', 'ABC1A23', 154200, '2026-01-10', 'Ativo'::public.vehicle_status, null),
  ('50000000-0000-0000-0000-000000000002', 'VW Saveiro', 'XYZ9B87', 99100, '2025-12-20', 'Ativo'::public.vehicle_status, null),
  ('50000000-0000-0000-0000-000000000003', 'Ford Cargo 816', 'DEF5C67', 211300, '2025-11-01', 'Manutenção'::public.vehicle_status, 'Aguardando troca de embreagem.')
on conflict (id) do update
set
  model = excluded.model,
  plate = excluded.plate,
  current_km = excluded.current_km,
  last_maintenance = excluded.last_maintenance,
  status = excluded.status,
  notes = excluded.notes;

insert into public.projects (id, client_id, title, description, status, start_date, end_date, total_value, address)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Forro Edifício Horizon - 15º Andar', 'Execução de forro modular com iluminação embutida.', 'Em Andamento'::public.project_status, '2026-02-01', null, 28500.00, 'Av. Brasil, 500 - São Paulo/SP'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sanca Aberta Sala de Jantar', 'Orçamento para sanca com fita LED.', 'Orçamento'::public.project_status, null, null, 4200.00, 'Alameda Santos, 500 - São Paulo/SP'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Divisória Drywall Escritório', 'Divisória com isolamento acústico.', 'Concluído'::public.project_status, '2026-01-06', '2026-01-14', 9600.00, 'Rua das Flores, 123 - São Paulo/SP')
on conflict (id) do update
set
  client_id = excluded.client_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  total_value = excluded.total_value,
  address = excluded.address;

insert into public.project_costs (id, project_id, type, description, amount, date, material_id, employee_id, vehicle_id)
values
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'MATERIAL'::public.project_cost_type, 'Placas ST e perfis', 6900.00, '2026-02-02', '40000000-0000-0000-0000-000000000001', null, null),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'LABOR'::public.project_cost_type, 'Equipe de instalação', 5200.00, '2026-02-06', null, '30000000-0000-0000-0000-000000000001', null),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'VEHICLE'::public.project_cost_type, 'Transporte de material', 650.00, '2026-02-07', null, null, '50000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000003', 'MATERIAL'::public.project_cost_type, 'Materiais da divisória', 2300.00, '2026-01-07', '40000000-0000-0000-0000-000000000003', null, null),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', 'LABOR'::public.project_cost_type, 'Mão de obra', 1800.00, '2026-01-10', null, '30000000-0000-0000-0000-000000000002', null)
on conflict (id) do update
set
  project_id = excluded.project_id,
  type = excluded.type,
  description = excluded.description,
  amount = excluded.amount,
  date = excluded.date,
  material_id = excluded.material_id,
  employee_id = excluded.employee_id,
  vehicle_id = excluded.vehicle_id;

insert into public.transactions (id, description, amount, paid_amount, type, category, date, status, project_id, vehicle_id)
values
  ('80000000-0000-0000-0000-000000000001', 'Adiantamento Obra Horizon', 12000.00, 12000.00, 'Receita'::public.transaction_type, 'Recebimento Obra', '2026-02-01', 'Pago'::public.transaction_status, '60000000-0000-0000-0000-000000000001', null),
  ('80000000-0000-0000-0000-000000000002', 'Compra Material Gesso Forte', 2800.00, 2800.00, 'Despesa'::public.transaction_type, 'Material', '2026-02-02', 'Pago'::public.transaction_status, '60000000-0000-0000-0000-000000000001', null),
  ('80000000-0000-0000-0000-000000000003', 'Parcela 2 Obra Horizon', 8000.00, 0.00, 'Receita'::public.transaction_type, 'Recebimento Obra', '2026-02-15', 'Pendente'::public.transaction_status, '60000000-0000-0000-0000-000000000001', null),
  ('80000000-0000-0000-0000-000000000004', 'Equipe externa de apoio', 2200.00, 0.00, 'Despesa'::public.transaction_type, 'Mão de Obra', '2026-02-08', 'Pendente'::public.transaction_status, '60000000-0000-0000-0000-000000000001', null),
  ('80000000-0000-0000-0000-000000000005', 'Combustível Strada', 650.00, 650.00, 'Despesa'::public.transaction_type, 'Combustível', '2026-02-07', 'Pago'::public.transaction_status, null, '50000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000006', 'Recebimento Obra João Souza', 9600.00, 9600.00, 'Receita'::public.transaction_type, 'Recebimento Obra', '2026-01-15', 'Pago'::public.transaction_status, '60000000-0000-0000-0000-000000000003', null),
  ('80000000-0000-0000-0000-000000000007', 'Manutenção Ford Cargo', 1200.00, 1200.00, 'Despesa'::public.transaction_type, 'Manutenção', '2026-01-28', 'Pago'::public.transaction_status, null, '50000000-0000-0000-0000-000000000003'),
  ('80000000-0000-0000-0000-000000000008', 'Despesa administrativa mensal', 900.00, 0.00, 'Despesa'::public.transaction_type, 'Administrativo', '2026-02-12', 'Pendente'::public.transaction_status, null, null)
on conflict (id) do update
set
  description = excluded.description,
  amount = excluded.amount,
  paid_amount = excluded.paid_amount,
  type = excluded.type,
  category = excluded.category,
  date = excluded.date,
  status = excluded.status,
  project_id = excluded.project_id,
  vehicle_id = excluded.vehicle_id;

insert into public.transaction_settlements (id, transaction_id, amount, settlement_date, notes)
values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', 3000.00, '2026-02-16', 'Recebimento parcial da segunda parcela.'),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000004', 1200.00, '2026-02-09', 'Pagamento parcial equipe externa.'),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000008', 400.00, '2026-02-13', 'Pagamento parcial administrativo.')
on conflict (id) do update
set
  transaction_id = excluded.transaction_id,
  amount = excluded.amount,
  settlement_date = excluded.settlement_date,
  notes = excluded.notes;

insert into public.vehicle_maintenance_logs (id, vehicle_id, maintenance_date, description, cost, km, next_maintenance_date, next_maintenance_km)
values
  ('a0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '2026-01-10', 'Troca de óleo e filtros', 450.00, 153800, '2026-04-10', 158000),
  ('a0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '2026-01-28', 'Reparo de embreagem', 1200.00, 211000, null, null)
on conflict (id) do update
set
  vehicle_id = excluded.vehicle_id,
  maintenance_date = excluded.maintenance_date,
  description = excluded.description,
  cost = excluded.cost,
  km = excluded.km,
  next_maintenance_date = excluded.next_maintenance_date,
  next_maintenance_km = excluded.next_maintenance_km;

insert into public.report_exports (id, report_name, period_start, period_end, file_url, file_format, generated_at, notes)
values
  ('b0000000-0000-0000-0000-000000000001', 'Fluxo de Caixa Mensal', '2026-02-01', '2026-02-16', null, 'pdf', now(), 'Seed de exemplo para histórico de exportações.')
on conflict (id) do update
set
  report_name = excluded.report_name,
  period_start = excluded.period_start,
  period_end = excluded.period_end,
  file_url = excluded.file_url,
  file_format = excluded.file_format,
  generated_at = excluded.generated_at,
  notes = excluded.notes;

commit;
