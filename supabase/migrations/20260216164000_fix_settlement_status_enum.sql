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
