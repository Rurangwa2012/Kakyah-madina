-- Kak Yah Madina — run this in Supabase SQL Editor (once).
-- Dashboard → SQL → New query → paste → Run.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Staff',
  email text not null default '',
  role text not null default 'cashier' check (role in ('owner', 'cashier')),
  inventory_access boolean not null default true,
  active boolean not null default true,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Rice',
  price_halalas integer not null default 0,
  image_url text not null default '',
  available boolean not null default true,
  sold_out boolean not null default false,
  archived boolean not null default false,
  is_extra boolean not null default false,
  sort_order integer not null default 100,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  type text not null default 'student',
  lines jsonb not null default '[]'::jsonb,
  subtotal_halalas integer not null default 0,
  discount_halalas integer not null default 0,
  total_halalas integer not null default 0,
  payment_method text not null default 'cash',
  status text not null default 'completed',
  cashier_id uuid,
  cashier_name text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  date_key text not null
);

create table if not exists public.group_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  type text not null default 'group',
  group_name text not null default '',
  contact_number text not null default '',
  location text not null default '',
  food_description text not null default '',
  quantity integer not null default 1,
  fulfillment text not null default 'pickup',
  pickup_time bigint not null default (extract(epoch from now()) * 1000)::bigint,
  payment_status text not null default 'not_paid',
  status text not null default 'pending',
  total_halalas integer not null default 0,
  lines jsonb not null default '[]'::jsonb,
  cashier_id uuid,
  cashier_name text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  date_key text not null
);

alter table public.group_orders add column if not exists lines jsonb not null default '[]'::jsonb;

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric not null default 0,
  unit text not null default 'kg',
  min_stock numeric not null default 0,
  status text not null default 'good',
  cost_halalas integer not null default 0,
  last_updated bigint not null default (extract(epoch from now()) * 1000)::bigint,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid,
  item_name text not null default '',
  type text not null,
  quantity numeric not null default 0,
  unit text not null default '',
  previous_quantity numeric not null default 0,
  new_quantity numeric not null default 0,
  note text not null default '',
  created_by uuid,
  created_by_name text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.buffet_tracking (
  id text primary key,
  date_key text not null,
  food text not null,
  prepared numeric not null default 0,
  sold numeric not null default 0,
  waste numeric not null default 0,
  remaining numeric not null default 0,
  created_by uuid,
  created_by_name text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null default '',
  amount_halalas integer not null default 0,
  payment_method text not null default 'cash',
  date_key text not null,
  created_by uuid,
  created_by_name text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  message text not null default '',
  actor_id uuid,
  actor_name text not null default '',
  actor_role text not null default 'cashier',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  meta jsonb
);

create table if not exists public.daily_summaries (
  id text primary key,
  date text not null unique,
  total_sales_halalas integer not null default 0,
  student_sales_halalas integer not null default 0,
  group_sales_halalas integer not null default 0,
  cash_sales_halalas integer not null default 0,
  card_sales_halalas integer not null default 0,
  mobile_sales_halalas integer not null default 0,
  order_count integer not null default 0,
  student_order_count integer not null default 0,
  group_order_count integer not null default 0,
  expenses_halalas integer not null default 0,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.settings (
  id text primary key,
  restaurant_name text not null default 'Kak Yah Madina',
  currency text not null default 'SAR',
  receipt_footer text not null default 'Thank You',
  student_order_prefix text not null default 'S',
  group_order_prefix text not null default 'U',
  payment_methods jsonb not null default '["cash","card"]'::jsonb,
  low_stock_alert boolean not null default true,
  printer jsonb not null default '{"type":"browser","paper_width_mm":80}'::jsonb,
  owner_approval_required boolean not null default false,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.counters (
  id text primary key,
  value bigint not null default 0,
  prefix text not null default 'S',
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  kind text not null default 'student',
  html text not null,
  storage_path text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

insert into public.settings (id) values ('restaurant') on conflict (id) do nothing;
insert into public.counters (id, prefix) values ('student_orders', 'S'), ('group_orders', 'U') on conflict (id) do nothing;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'owner'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.has_inventory_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_owner() or exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'cashier' and inventory_access = true
  );
$$;

create or replace function public.next_order_number(p_id text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  insert into public.counters (id, value, prefix, updated_at)
  values (p_id, 1, p_prefix, (extract(epoch from now()) * 1000)::bigint)
  on conflict (id) do update
    set value = public.counters.value + 1,
        prefix = excluded.prefix,
        updated_at = excluded.updated_at
  returning value into n;
  return p_prefix || '-' || lpad(n::text, 4, '0');
end;
$$;

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
  p_expenses integer default 0
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
    order_count, student_order_count, group_order_count, expenses_halalas, updated_at
  ) values (
    p_date, p_date, p_total_sales, p_student_sales, p_group_sales,
    p_cash, p_card, p_mobile, p_order_count, p_student_orders, p_group_orders, p_expenses,
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (id) do update set
    total_sales_halalas = d.total_sales_halalas + excluded.total_sales_halalas,
    student_sales_halalas = d.student_sales_halalas + excluded.student_sales_halalas,
    group_sales_halalas = d.group_sales_halalas + excluded.group_sales_halalas,
    cash_sales_halalas = d.cash_sales_halalas + excluded.cash_sales_halalas,
    card_sales_halalas = d.card_sales_halalas + excluded.card_sales_halalas,
    mobile_sales_halalas = d.mobile_sales_halalas + excluded.mobile_sales_halalas,
    order_count = d.order_count + excluded.order_count,
    student_order_count = d.student_order_count + excluded.student_order_count,
    group_order_count = d.group_order_count + excluded.group_order_count,
    expenses_halalas = d.expenses_halalas + excluded.expenses_halalas,
    updated_at = excluded.updated_at;
end;
$$;

alter table public.profiles enable row level security;
alter table public.menu enable row level security;
alter table public.orders enable row level security;
alter table public.group_orders enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.buffet_tracking enable row level security;
alter table public.expenses enable row level security;
alter table public.audit_logs enable row level security;
alter table public.daily_summaries enable row level security;
alter table public.settings enable row level security;
alter table public.counters enable row level security;
alter table public.receipts enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_owner());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_owner());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_owner() or id = auth.uid())
  with check (public.is_owner() or id = auth.uid());

drop policy if exists menu_select on public.menu;
create policy menu_select on public.menu for select to authenticated using (public.is_staff());
drop policy if exists menu_write on public.menu;
create policy menu_write on public.menu for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated using (public.is_staff());
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated with check (public.is_staff());
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists group_select on public.group_orders;
create policy group_select on public.group_orders for select to authenticated using (public.is_staff());
drop policy if exists group_insert on public.group_orders;
create policy group_insert on public.group_orders for insert to authenticated with check (public.is_staff());
drop policy if exists group_update on public.group_orders;
create policy group_update on public.group_orders for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists inv_select on public.inventory;
create policy inv_select on public.inventory for select to authenticated using (public.is_staff());
drop policy if exists inv_insert on public.inventory;
create policy inv_insert on public.inventory for insert to authenticated with check (public.is_owner());
drop policy if exists inv_update on public.inventory;
create policy inv_update on public.inventory for update to authenticated
  using (public.has_inventory_access()) with check (public.has_inventory_access());

drop policy if exists moves_select on public.stock_movements;
create policy moves_select on public.stock_movements for select to authenticated using (public.is_staff());
drop policy if exists moves_insert on public.stock_movements;
create policy moves_insert on public.stock_movements for insert to authenticated with check (public.has_inventory_access());

drop policy if exists buffet_all on public.buffet_tracking;
create policy buffet_all on public.buffet_tracking for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select to authenticated using (public.is_owner());
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert to authenticated with check (public.is_staff());

drop policy if exists summary_select on public.daily_summaries;
create policy summary_select on public.daily_summaries for select to authenticated using (public.is_owner());
drop policy if exists summary_write on public.daily_summaries;
create policy summary_write on public.daily_summaries for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select to authenticated using (public.is_staff());
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists counters_all on public.counters;
create policy counters_all on public.counters for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists receipts_table_select on public.receipts;
create policy receipts_table_select on public.receipts for select to authenticated using (public.is_staff());
drop policy if exists receipts_table_write on public.receipts;
create policy receipts_table_write on public.receipts for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant execute on function public.next_order_number(text, text) to authenticated, service_role;
grant execute on function public.bump_daily_summary(text, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, inventory_access, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'staff'), '@', 1), 'Staff'),
    coalesce(new.email, ''),
    case when exists (select 1 from public.profiles where role = 'owner') then 'cashier' else 'owner' end,
    true,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, name, email, role, inventory_access, active)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(coalesce(u.email, 'owner'), '@', 1), 'Owner'),
  coalesce(u.email, ''),
  'owner',
  true,
  true
from auth.users u
where not exists (select 1 from public.profiles p where p.role = 'owner')
order by u.created_at
limit 1
on conflict (id) do update
  set role = 'owner', active = true, email = excluded.email, updated_at = (extract(epoch from now()) * 1000)::bigint;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','menu','orders','group_orders','inventory','stock_movements',
    'buffet_tracking','expenses','audit_logs','daily_summaries','settings','receipts'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('menu', 'menu', true), ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists menu_images_read on storage.objects;
create policy menu_images_read on storage.objects for select using (bucket_id = 'menu');
drop policy if exists menu_images_write on storage.objects;
create policy menu_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_owner());
drop policy if exists menu_images_update on storage.objects;
create policy menu_images_update on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_owner());

drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_staff());
drop policy if exists receipts_write on storage.objects;
create policy receipts_write on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_staff());
drop policy if exists receipts_update on storage.objects;
create policy receipts_update on storage.objects for update to authenticated
  using (bucket_id = 'receipts' and public.is_staff());
