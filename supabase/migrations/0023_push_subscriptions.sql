-- =========================================================
-- 0023_push_subscriptions.sql
-- Notifications push : un appareil abonné par ligne (iPhone avec l'app
-- installée sur l'écran d'accueil, navigateur d'ordinateur...).
--
-- `endpoint` : l'adresse du service de push (Apple, Google, Mozilla) propre à
-- cet appareil ; `p256dh` et `auth` : les clés qui chiffrent le contenu de la
-- notification pour lui seul. Un appareil n'appartient qu'à un compte à la
-- fois (endpoint unique) : s'il change de compte, sa ligne change de
-- propriétaire (côté serveur, avec la clé service_role).
--
-- Additive : une table ajoutée, rien d'autre ne change.
-- =========================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  -- Libellé lisible (« iPhone », « Mac »...), pour s'y retrouver.
  appareil    text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- RLS : chacun ne voit et ne gère que ses propres appareils.
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id and not public.est_compte_demo());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
-- Pas de policy update : une ligne ne se modifie pas, elle se remplace.
