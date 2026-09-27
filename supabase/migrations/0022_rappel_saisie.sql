-- =========================================================
-- 0022_rappel_saisie.sql
-- Email de rappel quand quelqu'un n'a rien saisi à la main depuis 7 jours
-- (tâche planifiée du matin, /api/cron/quotidien).
--
-- 1. rappel_saisie : l'interrupteur, dans Réglages → Alertes. Activé par
--    défaut, y compris pour les comptes existants.
-- 2. rappel_saisie_dernier_le : date du dernier rappel envoyé.
-- 3. rappel_saisie_nombre : rappels envoyés depuis la dernière saisie. Au
--    bout de 3 sans réaction, on arrête. Remis à 0 dès qu'une nouvelle
--    opération est saisie.
--
-- Additive : trois colonnes ajoutées, rien de supprimé ni de renommé.
-- Rejouable sans risque (`if not exists`).
-- =========================================================

alter table public.user_settings
  add column if not exists rappel_saisie boolean not null default true,
  add column if not exists rappel_saisie_dernier_le date,
  add column if not exists rappel_saisie_nombre smallint not null default 0;
