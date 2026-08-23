-- ============================================================
-- FinTrack — Phase 6: automatic generation of recurring transactions
-- ============================================================
-- A recurring_rule is NOT a transaction; it *generates* transactions. This
-- function, run daily by pg_cron, materialises every due occurrence and
-- advances next_occurrence — so subscriptions are recorded hands-off.

create or replace function public.generate_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r        recurring_rules%rowtype;
  v_rate   numeric;
  v_upd    timestamptz;
  v_next   date;
  created  integer := 0;
begin
  for r in select * from recurring_rules loop
    v_next := r.next_occurrence;

    -- Catch up every occurrence due on or before today (and within end_date).
    while v_next <= current_date and (r.end_date is null or v_next <= r.end_date) loop
      select rate_to_eur, updated_at into v_rate, v_upd
        from exchange_rates where currency = r.currency;
      exit when v_rate is null;  -- currency without a rate → skip this rule

      insert into transactions (
        workspace_id, category_id, amount, currency, amount_eur,
        rate_approximate, type, label, date, recurring_rule_id
      ) values (
        r.workspace_id, r.category_id, r.amount, r.currency,
        round(r.amount * v_rate, 2),
        (v_upd < now() - interval '48 hours'),
        r.type, r.label, v_next, r.id
      );
      created := created + 1;

      v_next := (case r.frequency
        when 'daily'   then v_next + interval '1 day'
        when 'weekly'  then v_next + interval '1 week'
        when 'monthly' then v_next + interval '1 month'
        when 'yearly'  then v_next + interval '1 year'
      end)::date;
    end loop;

    if v_next <> r.next_occurrence then
      update recurring_rules set next_occurrence = v_next where id = r.id;
    end if;
  end loop;

  return created;
end;
$$;

-- Daily at 05:00 UTC. Pure DB function → pg_cron calls it directly (no pg_net).
select cron.schedule(
  'generate-recurring-transactions',
  '0 5 * * *',
  $$ select public.generate_due_recurring_transactions(); $$
);
