-- =========================================================
-- 0004_user_settings.sql
-- Réglages mono-ligne par utilisateur : solde de départ + date de
-- référence (pour la projection de trésorerie) et préférence de thème
-- (en base plutôt qu'un cookie, pour se synchroniser entre appareils).
-- =========================================================

create table public.user_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  starting_balance      numeric(12,2) not null default 0,
  starting_balance_date date not null default current_date,
  theme                 text not null default 'light' check (theme in ('light', 'dark')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at(); -- helper défini dans 0001

alter table public.user_settings enable row level security;
create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- pas de policy delete : la ligne de réglages ne doit jamais disparaître tant que le compte existe

-- seed automatique pour un futur compte (même pattern que 0002_seed_categories.sql)
create or replace function public.handle_new_user_seed_settings()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_seed_settings();

-- backfill : le compte existe déjà (créé avant cette migration), donc le trigger
-- ci-dessus ne se déclenche pas rétroactivement pour lui. On crée directement
-- sa ligne de réglages (solde 0, date du jour, thème clair par défaut).
insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
