-- Função para sincronizar custos de projeto com transações financeiras
create or replace function public.sync_project_cost_to_transaction()
returns trigger as $$
declare
    v_category text;
    v_type public.transaction_type := 'Despesa';
    v_transaction_id uuid;
begin
    -- Define a categoria com base no tipo de custo
    v_category := case 
        when new.type = 'MATERIAL' then 'Material'
        when new.type = 'LABOR' then 'Mão de Obra'
        when new.type = 'VEHICLE' then 'Combustível'
        else 'Outros'
    end;

    -- Tenta encontrar uma transação existente vinculada a este custo
    select id into v_transaction_id 
    from public.transactions 
    where description like '%' || new.id || '%' 
       or (description = new.description and project_id = new.project_id and amount = new.amount and date = new.date)
    limit 1;

    if (tg_op = 'INSERT') then
        insert into public.transactions (
            description,
            amount,
            paid_amount,
            type,
            category,
            date,
            status,
            project_id,
            notes
        ) values (
            new.description || ' (Ref: ' || new.id || ')',
            new.amount,
            new.amount, -- Por padrão, custos de obra são considerados pagos no ato do lançamento
            v_type,
            v_category,
            new.date,
            'Pago',
            new.project_id,
            'Sincronização automática de custo de obra.'
        );
    elsif (tg_op = 'UPDATE') then
        update public.transactions set
            description = new.description || ' (Ref: ' || new.id || ')',
            amount = new.amount,
            paid_amount = new.amount,
            category = v_category,
            date = new.date,
            project_id = new.project_id
        where id = v_transaction_id;
    elsif (tg_op = 'DELETE') then
        delete from public.transactions where id = v_transaction_id;
    end if;

    return null;
end;
$$ language plpgsql;

-- Trigger para sincronização
drop trigger if exists trg_sync_project_costs on public.project_costs;
create trigger trg_sync_project_costs
after insert or update or delete on public.project_costs
for each row execute function public.sync_project_cost_to_transaction();
