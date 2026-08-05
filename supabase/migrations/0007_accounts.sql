-- =========================================================
-- 0007_accounts.sql
-- Comptes (Pro / Perso) : dimension transversale sur transactions et
-- abonnements, chacun avec son propre solde de départ.
-- =========================================================

create table public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  starting_balance      numeric(12,2) not null default 0,
  starting_balance_date date not null default current_date,
  is_archived           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index accounts_user_name_uniq on public.accounts (user_id, lower(name));
create index accounts_user_id_idx on public.accounts(user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
create policy "accounts_select_own" on public.accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- pas de policy delete : archiver plutôt que supprimer, même logique que categories

-- seed pour un futur compte (même pattern que 0002_seed_categories.sql)
create or replace function public.handle_new_user_seed_accounts()
returns trigger as $$
begin
  insert into public.accounts (user_id, name) values
    (new.id, 'Pro'),
    (new.id, 'Perso');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created_accounts
  after insert on auth.users
  for each row execute function public.handle_new_user_seed_accounts();

-- backfill pour le compte existant : Perso reprend le solde global actuel de
-- user_settings, Pro démarre à 0€ aujourd'hui (à corriger dans Réglages).
insert into public.accounts (user_id, name, starting_balance, starting_balance_date)
select user_id, 'Perso', starting_balance, starting_balance_date from public.user_settings;

insert into public.accounts (user_id, name)
select user_id, 'Pro' from public.user_settings;

-- transactions : compte NULLABLE (comme category_id) — la confirmation d'une
-- facture crée une transaction sans compte assigné (les factures ne sont pas
-- concernées par cette fonctionnalité). L'obligation de choisir un compte
-- n'existe que côté formulaire de saisie manuelle ; une transaction issue
-- d'une facture reste "Non assigné" jusqu'à correction manuelle.
alter table public.transactions
  add column account_id uuid references public.accounts(id);

-- subscriptions : compte obligatoire (aucun chemin de code ne crée un
-- abonnement hors formulaire), backfill des lignes existantes sur "Perso".
alter table public.subscriptions
  add column account_id uuid references public.accounts(id);

update public.subscriptions s
set account_id = a.id
from public.accounts a
where a.user_id = s.user_id and a.name = 'Perso' and s.account_id is null;

alter table public.subscriptions
  alter column account_id set not null;

-- user_settings.starting_balance / starting_balance_date deviennent
-- obsolètes (remplacés par accounts.starting_balance), laissés en base sans
-- suppression — la page Réglages arrête juste de les afficher/utiliser.
