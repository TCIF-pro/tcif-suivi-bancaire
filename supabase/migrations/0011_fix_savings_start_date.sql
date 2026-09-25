-- =========================================================
-- 0011_fix_savings_start_date.sql
--
-- Corrige un défaut de la migration 0010.
--
-- 0010 créait le compte « Épargne » avec une date de référence fixée au jour
-- de son exécution, puis rattachait à ce compte les virements d'épargne déjà
-- saisis. Mais un solde ne compte que les transactions POSTÉRIEURES à la date
-- de référence : les virements antérieurs étaient donc rattachés au compte
-- sans jamais entrer dans son solde, qui restait à zéro.
--
-- Cette migration recule la date de référence d'un compte d'épargne juste
-- avant son plus ancien mouvement, quand il en existe un qu'elle excluait.
--
-- Rejouable : sans mouvement antérieur, elle ne change rien.
-- =========================================================

with mouvements as (
  -- Un virement touche DEUX comptes : celui qu'il quitte et celui qu'il
  -- rejoint. Les deux sens comptent, sinon un retrait de livret antérieur à
  -- la date de référence resterait invisible à son tour.
  select t.transfer_account_id as compte_id, t.occurred_on
  from public.transactions t
  where t.type = 'savings' and t.transfer_account_id is not null

  union all

  select t.account_id as compte_id, t.occurred_on
  from public.transactions t
  where t.type = 'savings' and t.account_id is not null
),
premiers as (
  select compte_id, min(occurred_on) as premier
  from mouvements
  group by compte_id
)
update public.accounts a
-- « − 1 » sur une date donne bien une date en PostgreSQL. La veille, et non
-- le jour même : le calcul du solde ne retient que les transactions
-- STRICTEMENT postérieures à la date de référence.
set starting_balance_date = premiers.premier - 1
from premiers
where a.id = premiers.compte_id
  and a.kind = 'savings'
  and a.starting_balance_date >= premiers.premier;
