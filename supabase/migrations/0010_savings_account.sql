-- =========================================================
-- 0010_savings_account.sql
--
-- L'épargne devient un vrai compte, à côté de Pro et Perso.
--
-- Une transaction de type 'savings' (migration 0009) devient un VIREMENT
-- entre deux comptes : elle quitte `account_id` et rejoint
-- `transfer_account_id`. Une seule règle couvre les deux sens — mettre de
-- l'argent de côté, ou en reprendre :
--
--   solde d'un compte = solde de départ
--                     + ce qui arrive (revenus, virements reçus)
--                     − ce qui part   (dépenses, virements émis)
--
-- Migration ADDITIVE : que des colonnes avec valeur par défaut et des
-- insertions conditionnelles. Rien n'est supprimé ni renommé, elle peut
-- s'appliquer telle quelle sur la base de production.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Nature du compte
--
-- 'checking' pour un compte courant (Pro, Perso) : il peut tomber à zéro,
-- il a donc une trésorerie prévisionnelle.
-- 'savings' pour un livret : il ne se vide pas tout seul, pas de prévision.
-- ---------------------------------------------------------
alter table public.accounts
  add column if not exists kind text not null default 'checking';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_kind_check'
  ) then
    alter table public.accounts
      add constraint accounts_kind_check check (kind in ('checking', 'savings'));
  end if;
end $$;

-- ---------------------------------------------------------
-- 2. Compte d'arrivée d'un virement
--
-- Renseigné uniquement sur les transactions de type 'savings'. Pas de
-- `on delete cascade` : supprimer un compte encore destinataire de virements
-- doit échouer plutôt que d'effacer silencieusement l'historique.
-- ---------------------------------------------------------
alter table public.transactions
  add column if not exists transfer_account_id uuid references public.accounts(id);

create index if not exists transactions_transfer_account_idx
  on public.transactions(transfer_account_id)
  where transfer_account_id is not null;

-- Un abonnement marqué « épargne » a besoin de savoir où atterrir, sinon la
-- tâche planifiée génère un virement sans destination.
alter table public.subscriptions
  add column if not exists transfer_account_id uuid references public.accounts(id);

-- ---------------------------------------------------------
-- 3. Un compte « Épargne » par utilisateur
--
-- Même principe que la migration 0007, qui avait créé Pro et Perso. Le
-- `where not exists` rend la migration rejouable et respecte un compte
-- d'épargne que l'utilisateur aurait déjà créé lui-même.
--
-- Solde de départ à 0 : c'est à l'utilisateur de saisir dans les Réglages ce
-- qui se trouvait déjà sur son livret avant qu'il utilise l'app.
-- ---------------------------------------------------------
insert into public.accounts (user_id, name, kind, starting_balance, starting_balance_date)
select u.id, 'Épargne', 'savings', 0, current_date
from auth.users u
where not exists (
  select 1 from public.accounts a
  where a.user_id = u.id and a.kind = 'savings'
);

-- ---------------------------------------------------------
-- 4. Rattrapage des virements d'épargne déjà saisis
--
-- Les transactions 'savings' créées avant cette migration n'ont pas de
-- compte d'arrivée : l'argent quittait le compte courant sans être recrédité
-- nulle part. On les rattache au compte d'épargne de leur propriétaire.
-- ---------------------------------------------------------
update public.transactions t
set transfer_account_id = (
  select a.id from public.accounts a
  where a.user_id = t.user_id and a.kind = 'savings'
  order by a.created_at asc
  limit 1
)
where t.type = 'savings' and t.transfer_account_id is null;

-- Même rattrapage pour les abonnements déjà marqués « épargne ».
update public.subscriptions s
set transfer_account_id = (
  select a.id from public.accounts a
  where a.user_id = s.user_id and a.kind = 'savings'
  order by a.created_at asc
  limit 1
)
where s.is_savings and s.transfer_account_id is null;
