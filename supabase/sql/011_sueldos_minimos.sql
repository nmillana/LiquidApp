create extension if not exists pgcrypto;

create table if not exists public.sueldos_minimos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vigente_desde date not null,
  monto integer not null check (monto > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vigente_desde)
);

create index if not exists sueldos_minimos_user_vigencia_idx
  on public.sueldos_minimos (user_id, vigente_desde desc);

alter table public.sueldos_minimos enable row level security;

drop policy if exists "Users can read their minimum wages" on public.sueldos_minimos;
create policy "Users can read their minimum wages"
  on public.sueldos_minimos
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their minimum wages" on public.sueldos_minimos;
create policy "Users can insert their minimum wages"
  on public.sueldos_minimos
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their minimum wages" on public.sueldos_minimos;
create policy "Users can update their minimum wages"
  on public.sueldos_minimos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their minimum wages" on public.sueldos_minimos;
create policy "Users can delete their minimum wages"
  on public.sueldos_minimos
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_sueldos_minimos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sueldos_minimos_updated_at on public.sueldos_minimos;
create trigger set_sueldos_minimos_updated_at
before update on public.sueldos_minimos
for each row execute function public.set_sueldos_minimos_updated_at();
