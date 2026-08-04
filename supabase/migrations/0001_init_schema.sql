-- =========================================================
-- 0001_init_schema.sql
-- Schéma initial : categories, invoices, subscriptions, transactions
-- Toutes les tables ont RLS activée avec des policies restreintes
-- à auth.uid() = user_id (mono-utilisateur, mais on le fait quand même).
-- =========================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------
-- helper partagé : maintient updated_at à jour sur chaque UPDATE
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- categories (table éditable, pas un enum figé)
-- ---------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  color        text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index categories_user_name_uniq on public.categories (user_id, lower(name));
create index categories_user_id_idx on public.categories(user_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- invoices (factures + devis, table unique avec discriminant doc_type)
-- créée avant `transactions` et `subscriptions` pour les FK
-- ---------------------------------------------------------
create table public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  doc_type              text not null check (doc_type in ('facture', 'devis')),
  direction             text not null check (direction in ('received', 'sent')),
  status                text not null default 'pending_review'
                          check (status in ('pending_review', 'confirmed', 'archived', 'converted')),

  file_path             text not null,   -- chemin Storage : {user_id}/{uuid}.pdf
  file_name             text not null,

  -- extraction brute (jamais modifiée par l'utilisateur)
  extracted_amount      numeric(12,2),
  extracted_date        date,
  extracted_party_name  text,
  extraction_confidence text check (extraction_confidence in ('high', 'low', 'failed')),

  -- champs validés (corrigés manuellement si besoin)
  amount                numeric(12,2),
  issued_date           date,
  party_name            text,
  category_id           uuid references public.categories(id),

  -- conversion devis -> facture : DEUX lignes liées (historique préservé)
  converted_from_devis_id uuid references public.invoices(id) on delete set null,
  converted_at             timestamptz,   -- posé sur la ligne DEVIS au moment de la conversion

  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint invoices_confirmed_requires_fields
    check (status <> 'confirmed' or (amount is not null and issued_date is not null))
);

-- une facture ne peut résulter que d'un seul devis
create unique index invoices_converted_from_devis_uniq
  on public.invoices(converted_from_devis_id)
  where converted_from_devis_id is not null;

create index invoices_user_status_idx      on public.invoices(user_id, status);
create index invoices_user_doc_type_idx    on public.invoices(user_id, doc_type);
create index invoices_user_issued_date_idx on public.invoices(user_id, issued_date);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;
create policy "invoices_select_own" on public.invoices for select using (auth.uid() = user_id);
create policy "invoices_insert_own" on public.invoices for insert with check (auth.uid() = user_id);
create policy "invoices_update_own" on public.invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "invoices_delete_own" on public.invoices for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- subscriptions (abonnements récurrents)
-- créée avant `transactions` pour la FK subscription_id
-- ---------------------------------------------------------
create table public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users(id) on delete cascade,

  name                      text not null,
  amount                    numeric(12,2) not null check (amount > 0),
  frequency                 text not null check (frequency in ('monthly', 'annual')),
  next_billing_date         date not null,   -- ancre, avancée par le cron après génération
  category_id               uuid references public.categories(id),
  is_active                 boolean not null default true,

  -- coût mensualisé, recalculé automatiquement par Postgres
  monthly_equivalent_amount numeric(12,2) generated always as (
    case when frequency = 'monthly' then amount else round(amount / 12, 2) end
  ) stored,

  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index subscriptions_user_next_billing_idx
  on public.subscriptions(user_id, next_billing_date)
  where is_active;

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_delete_own" on public.subscriptions for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- transactions
-- ---------------------------------------------------------
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,

  type         text not null check (type in ('expense', 'income')),
  amount       numeric(12,2) not null check (amount > 0),  -- toujours positif, `type` porte le signe
  occurred_on  date not null,                              -- DATE simple, pas timestamptz (évite les décalages de fuseau)
  label        text not null,
  notes        text,

  category_id  uuid references public.categories(id),      -- empêche de supprimer une catégorie utilisée

  -- origine : manuelle, générée par un abonnement, issue d'une facture, ou future synchro bancaire
  source          text not null default 'manual'
                    check (source in ('manual', 'subscription', 'invoice', 'bank_sync')),
  external_id     text,                                     -- id fournisseur (Bridge/Powens), plus tard
  invoice_id      uuid references public.invoices(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint transactions_invoice_id_uniq unique (invoice_id)  -- 1 transaction max par facture
);

create index transactions_user_occurred_on_idx on public.transactions(user_id, occurred_on desc);
create index transactions_user_category_idx    on public.transactions(user_id, category_id);
create index transactions_user_source_idx      on public.transactions(user_id, source);

-- idempotence future synchro bancaire : jamais deux fois la même transaction fournisseur
create unique index transactions_user_source_external_id_uniq
  on public.transactions(user_id, source, external_id)
  where external_id is not null;

-- idempotence cron abonnements : jamais deux transactions pour le même abonnement + même jour
create unique index transactions_subscription_billing_uniq
  on public.transactions(subscription_id, occurred_on)
  where subscription_id is not null;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- garde-fou : une transaction ne peut être liée qu'à une FACTURE, jamais à un devis
-- (le devis ne doit impacter le solde qu'une fois transformé en facture)
create or replace function public.check_transaction_invoice_is_facture()
returns trigger as $$
begin
  if new.invoice_id is not null then
    if not exists (
      select 1 from public.invoices
      where id = new.invoice_id and doc_type = 'facture'
    ) then
      raise exception 'transactions.invoice_id doit référencer une facture (doc_type = ''facture''), pas un devis';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
-- pas de security definer : le SELECT ci-dessus reste filtré par la RLS de `invoices`,
-- donc un invoice_id appartenant à un autre utilisateur est aussi rejeté (ligne invisible).

create trigger transactions_invoice_must_be_facture
  before insert or update of invoice_id on public.transactions
  for each row execute function public.check_transaction_invoice_is_facture();

alter table public.transactions enable row level security;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);
