-- =========================================================
-- 0021_alerte_tresorerie.sql
-- Alerte par email quand un compte courant passe à 10 jours de trésorerie
-- ou moins (tâche planifiée du matin, /api/cron/quotidien).
--
-- 1. user_settings.alerte_tresorerie : l'interrupteur, dans Réglages.
--    Activé par défaut, y compris pour les comptes existants.
-- 2. accounts.alerte_tresorerie_envoyee_le : date de la dernière alerte pour
--    ce compte. Tant qu'elle est renseignée, on ne renvoie pas d'alerte (un
--    seul email par passage sous le seuil) ; elle est remise à vide quand le
--    compte repasse au-dessus, ce qui réarme l'alerte.
--
-- Additive : deux colonnes ajoutées, rien de supprimé ni de renommé.
-- Rejouable sans risque (`if not exists`).
-- =========================================================

alter table public.user_settings
  add column if not exists alerte_tresorerie boolean not null default true;

alter table public.accounts
  add column if not exists alerte_tresorerie_envoyee_le date;
