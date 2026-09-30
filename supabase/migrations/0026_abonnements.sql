-- =========================================================
-- 0026_abonnements.sql
-- Abonnement payant TCIF par prélèvement SEPA via GoCardless (V3, phase 3).
--
-- Une ligne par utilisateur abonné (ou l'ayant été), créée quand GoCardless
-- confirme la signature du mandat, puis tenue à jour par le webhook :
-- - actif     : abonnement en place, dernier prélèvement passé (ou pas encore
--               de prélèvement : personne ne paie avant le 1er décembre 2026) ;
-- - en_retard : le dernier prélèvement a échoué ;
-- - annule    : abonnement résilié, ou mandat annulé / expiré côté banque.
--
-- L'utilisateur peut LIRE sa ligne, jamais l'écrire : seul le serveur (clé
-- service_role, webhook et actions) la modifie. Sinon n'importe qui pourrait
-- se déclarer « actif » lui-même.
--
-- L'accès gratuit à vie (Tom et son père) n'est PAS ici : c'est le marqueur
-- `gratuit_a_vie` des app_metadata de Supabase Auth, indépendant de
-- GoCardless (voir src/lib/auth/roles.ts).
--
-- Additive : une table, rien de modifié ailleurs. Rejouable sans risque.
-- =========================================================

create table if not exists public.abonnements (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  statut           text not null check (statut in ('actif', 'en_retard', 'annule')),
  gc_customer      text,
  gc_mandate       text,
  gc_subscription  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists abonnements_gc_mandate on public.abonnements (gc_mandate);
create index if not exists abonnements_gc_subscription on public.abonnements (gc_subscription);

drop trigger if exists abonnements_set_updated_at on public.abonnements;
create trigger abonnements_set_updated_at
  before update on public.abonnements
  for each row execute function public.set_updated_at(); -- helper défini dans 0001

alter table public.abonnements enable row level security;

drop policy if exists "abonnements_select_own" on public.abonnements;
create policy "abonnements_select_own" on public.abonnements
  for select using (auth.uid() = user_id);
-- Pas de policy insert / update / delete : écriture réservée à service_role.
