-- Kak Yah Madina production POS hardening (additive).
-- Run in Supabase SQL Editor after backup. Safe to re-run.

create extension if not exists "pgcrypto";

-- Existing tables: extra columns
alter table public.orders add column if not exists shift_id uuid;
alter table public.orders add column if not exists terminal_id text not null default 'POS-01';
alter table public.orders add column if not exists vat_amount_halalas integer not null default 0;
alter table public.orders add column if not exists vat_rate_basis_points integer not null default 0;
alter table public.orders add column if not exists subtotal_ex_vat_halalas integer not null default 0;
alter table public.orders add column if not exists total_inc_vat_halalas integer not null default 0;
alter table public.orders add column if not exists discount_reason text not null default '';
alter table public.orders add column if not exists discount_approved_by uuid;
alter table public.orders add column if not exists invoice_uuid uuid;
alter table public.orders add column if not exists zatca_status text not null default 'not_required';
alter table public.orders add column if not exists qr_payload text not null default '';
alter table public.orders add column if not exists issued_at timestamptz;
alter table public.orders add column if not exists idempotency_key text;

alter table public.group_orders add column if not exists deposit_halalas integer not null default 0;
alter table public.group_orders add column if not exists balance_halalas integer not null default 0;
alter table public.group_orders add column if not exists shift_id uuid;
alter table public.group_orders add column if not exists terminal_id text not null default 'POS-01';

alter table public.inventory add column if not exists reorder_level numeric not null default 0;

alter table public.settings add column if not exists vat_enabled boolean not null default true;
alter table public.settings add column if not exists vat_rate_basis_points integer not null default 1500;
alter table public.settings add column if not exists vat_inclusive boolean not null default true;
alter table public.settings add column if not exists vat_registration_number text not null default '';
alter table public.settings add column if not exists seller_legal_name_ar text not null default 'كاك ياه ناسي كندر';
alter table public.settings add column if not exists seller_legal_name_en text not null default 'Kak Yah Nasi Kandar';
alter table public.settings add column if not exists address_ar text not null default '';
alter table public.settings add column if not exists address_en text not null default '';
alter table public.settings add column if not exists require_open_shift boolean not null default true;
alter table public.settings add column if not exists lock_minutes integer not null default 10;
alter table public.settings add column if not exists cashier_max_discount_halalas integer not null default 0;
alter table public.settings add column if not exists default_terminal_id text not null default 'POS-01';

alter table public.daily_summaries add column if not exists mada_sales_halalas integer not null default 0;
alter table public.daily_summaries add column if not exists apple_pay_sales_halalas integer not null default 0;
alter table public.daily_summaries add column if not exists refunds_halalas integer not null default 0;
alter table public.daily_summaries add column if not exists discounts_halalas integer not null default 0;

create unique index if not exists orders_order_number_uidx on public.orders (order_number);
create unique index if not exists orders_idempotency_uidx on public.orders (idempotency_key) where idempotency_key is not null;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_shift_id_idx on public.orders (shift_id);
create index if not exists group_orders_pickup_idx on public.group_orders (pickup_time);
create index if not exists stock_movements_item_idx on public.stock_movements (inventory_id, created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create table if not exists public.terminals (
  id text primary key,
  name text not null default 'POS-01',
  printer_type text not null default 'browser',
  active boolean not null default true
);
insert into public.terminals (id, name) values ('POS-01', 'POS-01') on conflict (id) do nothing;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles (id),
  cashier_name text not null default '',
  terminal_id text not null default 'POS-01',
  opened_at bigint not null,
  opening_cash_halalas integer not null default 0 check (opening_cash_halalas >= 0),
  closed_at bigint,
  expected_cash_halalas integer,
  actual_cash_halalas integer,
  cash_difference_halalas integer,
  status text not null default 'open' check (status in ('open', 'closed', 'reviewed')),
  closing_note text not null default '',
  approved_by uuid,
  created_at bigint not null
);
create index if not exists shifts_cashier_opened_idx on public.shifts (cashier_id, opened_at desc);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  amount_halalas integer not null check (amount_halalas > 0),
  type text not null check (type in ('cash_in', 'cash_out')),
  reason text not null default '',
  created_by uuid,
  created_by_name text not null default '',
  created_at bigint not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id),
  group_order_id uuid references public.group_orders (id),
  amount_halalas integer not null check (amount_halalas >= 0),
  payment_method text not null check (payment_method in ('cash', 'mada', 'card', 'apple_pay', 'mobile', 'other')),
  provider text not null default '',
  transaction_reference text not null default '',
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  terminal_id text not null default 'POS-01',
  cashier_id uuid,
  created_at bigint not null
);
create index if not exists payments_order_idx on public.payments (order_id);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  original_order_id uuid not null references public.orders (id),
  refund_number text not null unique,
  amount_halalas integer not null check (amount_halalas > 0),
  reason_code text not null default 'other',
  reason_note text not null default '',
  requested_by uuid,
  approved_by uuid,
  payment_method text not null default 'cash',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at bigint not null
);

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory (id),
  system_quantity numeric not null,
  counted_quantity numeric not null,
  difference numeric not null,
  reason text not null default 'other',
  created_by uuid,
  approved_by uuid,
  created_at bigint not null
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  phone text not null default '',
  notes text not null default '',
  active boolean not null default true
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  supplier_id uuid references public.suppliers (id),
  date_key text not null,
  subtotal_halalas integer not null default 0,
  vat_halalas integer not null default 0,
  total_halalas integer not null default 0,
  payment_status text not null default 'unpaid',
  created_by uuid,
  created_at bigint not null
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  inventory_id uuid references public.inventory (id),
  quantity numeric not null,
  unit_cost_halalas integer not null default 0,
  total_halalas integer not null default 0
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references public.menu (id),
  name text not null default ''
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  inventory_id uuid references public.inventory (id),
  quantity numeric not null default 0
);

create or replace function public.now_ms()
returns bigint
language sql
stable
as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

create or replace function public.vat_split(p_net integer, p_enabled boolean, p_inclusive boolean, p_bps integer)
returns table (ex_vat integer, vat integer, total integer)
language plpgsql
immutable
as $$
begin
  if not p_enabled or p_bps <= 0 then
    return query select p_net, 0, p_net;
    return;
  end if;
  if p_inclusive then
    return query select
      p_net - round(p_net::numeric * p_bps / (10000 + p_bps))::integer,
      round(p_net::numeric * p_bps / (10000 + p_bps))::integer,
      p_net;
  else
    return query select
      p_net,
      round(p_net::numeric * p_bps / 10000)::integer,
      p_net + round(p_net::numeric * p_bps / 10000)::integer;
  end if;
end;
$$;

drop function if exists public.bump_daily_summary(text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer);

create or replace function public.bump_daily_summary(
  p_date text,
  p_total_sales integer default 0,
  p_student_sales integer default 0,
  p_group_sales integer default 0,
  p_cash integer default 0,
  p_card integer default 0,
  p_mobile integer default 0,
  p_order_count integer default 0,
  p_student_orders integer default 0,
  p_group_orders integer default 0,
  p_expenses integer default 0,
  p_mada integer default 0,
  p_apple integer default 0,
  p_refunds integer default 0,
  p_discounts integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.daily_summaries as d (
    id, date, total_sales_halalas, student_sales_halalas, group_sales_halalas,
    cash_sales_halalas, card_sales_halalas, mobile_sales_halalas,
    mada_sales_halalas, apple_pay_sales_halalas, refunds_halalas, discounts_halalas,
    order_count, student_order_count, group_order_count, expenses_halalas, updated_at
  ) values (
    p_date, p_date, p_total_sales, p_student_sales, p_group_sales,
    p_cash, p_card, p_mobile, p_mada, p_apple, p_refunds, p_discounts,
    p_order_count, p_student_orders, p_group_orders, p_expenses, public.now_ms()
  )
  on conflict (id) do update set
    total_sales_halalas = d.total_sales_halalas + excluded.total_sales_halalas,
    student_sales_halalas = d.student_sales_halalas + excluded.student_sales_halalas,
    group_sales_halalas = d.group_sales_halalas + excluded.group_sales_halalas,
    cash_sales_halalas = d.cash_sales_halalas + excluded.cash_sales_halalas,
    card_sales_halalas = d.card_sales_halalas + excluded.card_sales_halalas,
    mobile_sales_halalas = d.mobile_sales_halalas + excluded.mobile_sales_halalas,
    mada_sales_halalas = d.mada_sales_halalas + excluded.mada_sales_halalas,
    apple_pay_sales_halalas = d.apple_pay_sales_halalas + excluded.apple_pay_sales_halalas,
    refunds_halalas = d.refunds_halalas + excluded.refunds_halalas,
    discounts_halalas = d.discounts_halalas + excluded.discounts_halalas,
    order_count = d.order_count + excluded.order_count,
    student_order_count = d.student_order_count + excluded.student_order_count,
    group_order_count = d.group_order_count + excluded.group_order_count,
    expenses_halalas = d.expenses_halalas + excluded.expenses_halalas,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.current_open_shift(p_cashier uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.shifts
  where cashier_id = p_cashier and status = 'open'
  order by opened_at desc
  limit 1;
$$;

create or replace function public.open_shift(p_opening_cash_halalas integer, p_terminal_id text default 'POS-01')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  nm text;
  sid uuid;
begin
  if uid is null or not public.is_staff() then
    raise exception 'Not signed in';
  end if;
  if public.current_open_shift(uid) is not null then
    raise exception 'A shift is already open';
  end if;
  if p_opening_cash_halalas < 0 then
    raise exception 'Opening cash cannot be negative';
  end if;
  select name into nm from public.profiles where id = uid;
  insert into public.shifts (cashier_id, cashier_name, terminal_id, opened_at, opening_cash_halalas, status, created_at)
  values (uid, coalesce(nm, 'Staff'), coalesce(nullif(p_terminal_id, ''), 'POS-01'), public.now_ms(), p_opening_cash_halalas, 'open', public.now_ms())
  returning id into sid;
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at, meta)
  values ('SHIFT_OPENED', coalesce(nm, '') || ' opened shift', uid, coalesce(nm, ''),
    (select role from public.profiles where id = uid), public.now_ms(), jsonb_build_object('shift_id', sid::text));
  return sid;
end;
$$;

create or replace function public.record_cash_movement(p_type text, p_amount_halalas integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  nm text;
  mid uuid;
begin
  if not public.is_staff() then raise exception 'Not signed in'; end if;
  sid := public.current_open_shift(uid);
  if sid is null then raise exception 'Open a shift first'; end if;
  if p_type not in ('cash_in', 'cash_out') then raise exception 'Invalid cash movement'; end if;
  if p_amount_halalas <= 0 then raise exception 'Amount must be positive'; end if;
  select name into nm from public.profiles where id = uid;
  insert into public.cash_movements (shift_id, amount_halalas, type, reason, created_by, created_by_name, created_at)
  values (sid, p_amount_halalas, p_type, coalesce(p_reason, ''), uid, coalesce(nm, ''), public.now_ms())
  returning id into mid;
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at)
  values ('CASH_MOVEMENT', coalesce(nm, '') || ' ' || p_type || ' ' || p_amount_halalas::text, uid, coalesce(nm, ''),
    (select role from public.profiles where id = uid), public.now_ms());
  return mid;
end;
$$;

create or replace function public.close_shift(p_actual_cash_halalas integer, p_note text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  s public.shifts%rowtype;
  cash_sales integer := 0;
  cash_in integer := 0;
  cash_out integer := 0;
  cash_refunds integer := 0;
  expected integer;
  diff integer;
  nm text;
begin
  if not public.is_staff() then raise exception 'Not signed in'; end if;
  sid := public.current_open_shift(uid);
  if sid is null then raise exception 'No open shift'; end if;
  select * into s from public.shifts where id = sid for update;
  select coalesce(sum(p.amount_halalas), 0) into cash_sales
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.shift_id = sid and p.payment_method = 'cash' and p.status = 'completed';
  select coalesce(sum(amount_halalas) filter (where type = 'cash_in'), 0),
         coalesce(sum(amount_halalas) filter (where type = 'cash_out'), 0)
    into cash_in, cash_out
  from public.cash_movements where shift_id = sid;
  select coalesce(sum(r.amount_halalas), 0) into cash_refunds
  from public.refunds r
  join public.orders o on o.id = r.original_order_id
  where o.shift_id = sid and r.status = 'approved' and r.payment_method = 'cash';
  expected := s.opening_cash_halalas + cash_sales + cash_in - cash_refunds - cash_out;
  diff := p_actual_cash_halalas - expected;
  if diff <> 0 and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'A note is required when cash does not match';
  end if;
  update public.shifts set
    closed_at = public.now_ms(),
    expected_cash_halalas = expected,
    actual_cash_halalas = p_actual_cash_halalas,
    cash_difference_halalas = diff,
    status = 'closed',
    closing_note = coalesce(p_note, '')
  where id = sid;
  select name into nm from public.profiles where id = uid;
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at, meta)
  values ('SHIFT_CLOSED', coalesce(nm, '') || ' closed shift', uid, coalesce(nm, ''),
    (select role from public.profiles where id = uid), public.now_ms(),
    jsonb_build_object('expected', expected, 'actual', p_actual_cash_halalas, 'difference', diff));
  return sid;
end;
$$;

create or replace function public.finalize_sale(
  p_items jsonb,
  p_payments jsonb,
  p_discount_halalas integer default 0,
  p_idempotency_key text default null,
  p_terminal_id text default 'POS-01',
  p_discount_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  st public.settings%rowtype;
  sid uuid;
  item jsonb;
  menu_row public.menu%rowtype;
  qty integer;
  lines jsonb := '[]'::jsonb;
  subtotal integer := 0;
  discount integer := 0;
  net integer;
  split record;
  pay jsonb;
  paid integer := 0;
  method text;
  amt integer;
  order_id uuid;
  order_no text;
  existing uuid;
  p_cash integer := 0;
  p_card integer := 0;
  p_mada integer := 0;
  p_apple integer := 0;
  p_mobile integer := 0;
  nowms bigint := public.now_ms();
  datekey text := to_char((now() at time zone 'Asia/Riyadh'), 'YYYY-MM-DD');
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into prof from public.profiles where id = uid and active = true;
  if prof.id is null then raise exception 'Staff profile required'; end if;
  select * into st from public.settings where id = 'restaurant';
  if st.require_open_shift and prof.role = 'cashier' then
    sid := public.current_open_shift(uid);
    if sid is null then raise exception 'Open a shift before selling'; end if;
  else
    sid := public.current_open_shift(uid);
  end if;

  if p_idempotency_key is not null and length(p_idempotency_key) > 8 then
    select id into existing from public.orders where idempotency_key = p_idempotency_key;
    if existing is not null then
      return (select to_jsonb(o) from public.orders o where o.id = existing);
    end if;
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Add at least one menu item';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    qty := greatest(0, coalesce((item->>'quantity')::integer, 0));
    if qty < 1 then raise exception 'Quantity must be at least 1'; end if;
    select * into menu_row from public.menu where id = (item->>'menu_id')::uuid and archived = false;
    if menu_row.id is null then raise exception 'Unknown menu item'; end if;
    if menu_row.available is not true or menu_row.sold_out is true then
      raise exception '% is not available', menu_row.name;
    end if;
    subtotal := subtotal + (menu_row.price_halalas * qty);
    lines := lines || jsonb_build_array(jsonb_build_object(
      'menu_id', menu_row.id,
      'name', menu_row.name,
      'quantity', qty,
      'unit_price_halalas', menu_row.price_halalas,
      'total_halalas', menu_row.price_halalas * qty
    ));
  end loop;

  discount := greatest(0, coalesce(p_discount_halalas, 0));
  if discount > subtotal then raise exception 'Discount cannot exceed subtotal'; end if;
  if prof.role <> 'owner' and discount > coalesce(st.cashier_max_discount_halalas, 0) then
    raise exception 'Discount requires owner approval';
  end if;
  net := subtotal - discount;
  select * into split from public.vat_split(net, st.vat_enabled, st.vat_inclusive, st.vat_rate_basis_points);

  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) < 1 then
    raise exception 'Add a payment';
  end if;
  for pay in select * from jsonb_array_elements(p_payments)
  loop
    method := coalesce(pay->>'method', '');
    amt := coalesce((pay->>'amount_halalas')::integer, 0);
    if method not in ('cash', 'mada', 'card', 'apple_pay', 'mobile', 'other') then
      raise exception 'Unsupported payment method';
    end if;
    if amt < 0 then raise exception 'Invalid payment amount'; end if;
    paid := paid + amt;
    if method = 'cash' then p_cash := p_cash + amt;
    elsif method = 'card' then p_card := p_card + amt;
    elsif method = 'mada' then p_mada := p_mada + amt;
    elsif method = 'apple_pay' then p_apple := p_apple + amt;
    else p_mobile := p_mobile + amt;
    end if;
  end loop;
  if paid <> split.total then
    raise exception 'Payments must equal the official total';
  end if;

  order_no := public.next_order_number('student_orders', coalesce(st.student_order_prefix, 'S'));
  insert into public.orders (
    order_number, type, lines, subtotal_halalas, discount_halalas, total_halalas,
    payment_method, status, cashier_id, cashier_name, created_at, updated_at, date_key,
    shift_id, terminal_id, vat_amount_halalas, vat_rate_basis_points,
    subtotal_ex_vat_halalas, total_inc_vat_halalas, discount_reason,
    zatca_status, issued_at, idempotency_key, invoice_uuid
  ) values (
    order_no, 'student', lines, subtotal, discount, split.total,
    coalesce(p_payments->0->>'method', 'cash'), 'completed', uid, prof.name, nowms, nowms, datekey,
    sid, coalesce(nullif(p_terminal_id, ''), st.default_terminal_id, 'POS-01'),
    split.vat, case when st.vat_enabled then st.vat_rate_basis_points else 0 end,
    split.ex_vat, split.total, coalesce(p_discount_reason, ''),
    'not_required', now(), nullif(p_idempotency_key, ''), gen_random_uuid()
  ) returning id into order_id;

  for pay in select * from jsonb_array_elements(p_payments)
  loop
    insert into public.payments (
      order_id, amount_halalas, payment_method, provider, transaction_reference, status, terminal_id, cashier_id, created_at
    ) values (
      order_id,
      (pay->>'amount_halalas')::integer,
      pay->>'method',
      coalesce(pay->>'provider', ''),
      coalesce(pay->>'transaction_reference', ''),
      'completed',
      coalesce(nullif(p_terminal_id, ''), 'POS-01'),
      uid,
      nowms
    );
  end loop;

  perform public.bump_daily_summary(
    datekey, split.total, split.total, 0, p_cash, p_card, p_mobile, 1, 1, 0, 0, p_mada, p_apple, 0, discount
  );
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at, meta)
  values ('ORDER_CREATED', prof.name || ' created ' || order_no, uid, prof.name, prof.role, nowms,
    jsonb_build_object('order_number', order_no, 'total', split.total));

  return (select to_jsonb(o) from public.orders o where o.id = order_id);
end;
$$;

create or replace function public.record_stock_change(
  p_inventory_id uuid,
  p_type text,
  p_quantity numeric,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item public.inventory%rowtype;
  prev numeric;
  nextq numeric;
  delta numeric;
  mapped text;
  mid uuid;
  nm text;
  actor_role text;
begin
  if not public.has_inventory_access() then raise exception 'No inventory access'; end if;
  mapped := case p_type
    when 'receive' then 'stock_in'
    when 'use' then 'stock_out'
    when 'purchase' then 'stock_in'
    when 'count_adjustment' then 'correction'
    else p_type
  end;
  if mapped not in ('stock_in', 'stock_out', 'waste', 'correction', 'buffet_use') then
    raise exception 'Invalid stock movement';
  end if;
  select * into item from public.inventory where id = p_inventory_id for update;
  if item.id is null then raise exception 'Unknown stock item'; end if;
  prev := item.quantity;
  if mapped = 'correction' then
    nextq := greatest(0, p_quantity);
  elsif mapped = 'stock_in' then
    nextq := prev + abs(p_quantity);
  else
    nextq := greatest(0, prev - abs(p_quantity));
  end if;
  update public.inventory set
    quantity = nextq,
    status = case when nextq <= 0 then 'out' when nextq <= min_stock then 'low' else 'good' end,
    last_updated = public.now_ms()
  where id = p_inventory_id;
  select name, role into nm, actor_role from public.profiles where id = uid;
  insert into public.stock_movements (
    inventory_id, item_name, type, quantity, unit, previous_quantity, new_quantity, note, created_by, created_by_name, created_at
  ) values (
    p_inventory_id, item.name, mapped, abs(p_quantity), item.unit, prev, nextq, coalesce(p_note, ''), uid, coalesce(nm, ''), public.now_ms()
  ) returning id into mid;
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at)
  values (
    case when mapped = 'waste' then 'WASTE_RECORDED' when mapped = 'stock_in' then 'STOCK_ADDED' else 'STOCK_UPDATED' end,
    coalesce(nm, '') || ' stock ' || mapped || ' ' || item.name, uid, coalesce(nm, ''), actor_role, public.now_ms()
  );
  return mid;
end;
$$;

create or replace function public.approve_refund(p_refund_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.refunds%rowtype;
  ord public.orders%rowtype;
  nm text;
begin
  if not public.is_owner() then raise exception 'Owner approval required'; end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception 'Unknown refund'; end if;
  if r.status = 'approved' then return; end if;
  select * into ord from public.orders where id = r.original_order_id for update;
  update public.refunds set status = 'approved', approved_by = uid where id = r.id;
  update public.orders set
    status = case when r.amount_halalas >= ord.total_halalas then 'refunded' else 'partially_refunded' end,
    updated_at = public.now_ms()
  where id = ord.id;
  perform public.bump_daily_summary(ord.date_key, -r.amount_halalas, -r.amount_halalas, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, r.amount_halalas, 0);
  select name into nm from public.profiles where id = uid;
  insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at, meta)
  values ('REFUND_APPROVED', coalesce(nm, '') || ' approved ' || r.refund_number, uid, coalesce(nm, ''), 'owner', public.now_ms(),
    jsonb_build_object('order_number', ord.order_number, 'amount', r.amount_halalas));
end;
$$;

-- Recreate create_refund after approve_refund exists (PostgreSQL needs approve_refund first)
-- already ordered approve after create which calls approve - fix by creating approve first.
-- This file defined create_refund before approve_refund. Recreate create_refund now.

create or replace function public.create_refund(
  p_order_id uuid,
  p_amount_halalas integer,
  p_reason_code text,
  p_reason_note text,
  p_payment_method text default 'cash'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ord public.orders%rowtype;
  rid uuid;
  rno text;
  nm text;
  role text;
  auto boolean;
begin
  if not public.is_staff() then raise exception 'Not signed in'; end if;
  select * into ord from public.orders where id = p_order_id;
  if ord.id is null then raise exception 'Unknown order'; end if;
  if ord.status not in ('completed', 'partially_refunded') then raise exception 'Order cannot be refunded'; end if;
  if p_amount_halalas <= 0 or p_amount_halalas > ord.total_halalas then raise exception 'Invalid refund amount'; end if;
  rno := 'R-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  select name, role into nm, role from public.profiles where id = uid;
  auto := public.is_owner();
  insert into public.refunds (
    original_order_id, refund_number, amount_halalas, reason_code, reason_note, requested_by, payment_method, status, created_at
  ) values (
    p_order_id, rno, p_amount_halalas, coalesce(p_reason_code, 'other'), coalesce(p_reason_note, ''), uid,
    coalesce(p_payment_method, 'cash'), case when auto then 'approved' else 'pending' end, public.now_ms()
  ) returning id into rid;
  if auto then
    perform public.approve_refund(rid);
  else
    insert into public.audit_logs (action, message, actor_id, actor_name, actor_role, created_at)
    values ('REFUND_REQUESTED', coalesce(nm, '') || ' requested refund ' || rno, uid, coalesce(nm, ''), role, public.now_ms());
  end if;
  return rid;
end;
$$;

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit logs cannot be changed';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update before update or delete on public.audit_logs
for each row execute function public.prevent_audit_mutation();

alter table public.shifts enable row level security;
alter table public.cash_movements enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.stock_counts enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.terminals enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts for select to authenticated
  using (public.is_owner() or cashier_id = auth.uid());
drop policy if exists shifts_insert on public.shifts;
create policy shifts_insert on public.shifts for insert to authenticated with check (false);
drop policy if exists shifts_update on public.shifts;
create policy shifts_update on public.shifts for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists cash_select on public.cash_movements;
create policy cash_select on public.cash_movements for select to authenticated
  using (public.is_owner() or exists (select 1 from public.shifts s where s.id = shift_id and s.cashier_id = auth.uid()));
drop policy if exists cash_write on public.cash_movements;
create policy cash_write on public.cash_movements for insert to authenticated with check (false);

drop policy if exists pay_select on public.payments;
create policy pay_select on public.payments for select to authenticated using (public.is_staff());
drop policy if exists pay_insert on public.payments;
create policy pay_insert on public.payments for insert to authenticated with check (false);

drop policy if exists refund_select on public.refunds;
create policy refund_select on public.refunds for select to authenticated using (public.is_staff());
drop policy if exists refund_write on public.refunds;
create policy refund_write on public.refunds for all to authenticated using (false) with check (false);

drop policy if exists counts_select on public.stock_counts;
create policy counts_select on public.stock_counts for select to authenticated using (public.has_inventory_access());
drop policy if exists counts_insert on public.stock_counts;
create policy counts_insert on public.stock_counts for insert to authenticated with check (public.has_inventory_access());

drop policy if exists supp_owner on public.suppliers;
create policy supp_owner on public.suppliers for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists purch_owner on public.purchases;
create policy purch_owner on public.purchases for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists purch_items_owner on public.purchase_items;
create policy purch_items_owner on public.purchase_items for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists term_select on public.terminals;
create policy term_select on public.terminals for select to authenticated using (public.is_staff());
drop policy if exists term_write on public.terminals;
create policy term_write on public.terminals for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists recipe_owner on public.recipes;
create policy recipe_owner on public.recipes for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists recipe_ing_owner on public.recipe_ingredients;
create policy recipe_ing_owner on public.recipe_ingredients for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- Cashiers must not update paid order money fields via client
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated with check (false);
drop policy if exists moves_insert on public.stock_movements;
create policy moves_insert on public.stock_movements for insert to authenticated with check (false);
drop policy if exists inv_update on public.inventory;
create policy inv_update on public.inventory for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant execute on function public.open_shift(integer, text) to authenticated;
grant execute on function public.close_shift(integer, text) to authenticated;
grant execute on function public.record_cash_movement(text, integer, text) to authenticated;
grant execute on function public.finalize_sale(jsonb, jsonb, integer, text, text, text) to authenticated;
grant execute on function public.record_stock_change(uuid, text, numeric, text) to authenticated;
grant execute on function public.create_refund(uuid, integer, text, text, text) to authenticated;
grant execute on function public.approve_refund(uuid) to authenticated;
grant execute on function public.current_open_shift(uuid) to authenticated;
grant execute on function public.bump_daily_summary(text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer) to authenticated, service_role;
grant execute on function public.next_order_number(text, text) to authenticated, service_role;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, authenticated, service_role;
grant select on all tables in schema public to anon;
