-- =========================================================
-- 0027_impayes.sql
-- Gestion des impayés de l'abonnement GoCardless (V3, phase 3).
--
-- - impaye_depuis : jour du PREMIER impayé (prélèvement échoué ou mandat
--   devenu invalide). Le délai de grâce de 7 jours part de là, et une
--   relance qui échoue à nouveau ne le remet pas à zéro. Vidé dès qu'un
--   paiement passe ou qu'un nouveau mandat est signé.
-- - gc_paiement_impaye : le paiement échoué, que le bouton « Relancer le
--   prélèvement » demande à GoCardless de retenter.
-- - rappel_impaye_envoye_le : l'email « accès suspendu dans 2 jours » est
--   parti, pour ne pas l'envoyer deux fois.
--
-- La suspension de l'accès elle-même n'est pas ici : c'est le marqueur
-- `acces_suspendu` des app_metadata de Supabase Auth, lu par le proxy.
--
-- Additive : trois colonnes, rien de supprimé ni de renommé. Rejouable.
-- =========================================================

alter table public.abonnements
  add column if not exists impaye_depuis date,
  add column if not exists gc_paiement_impaye text,
  add column if not exists rappel_impaye_envoye_le timestamptz;
