-- =========================================================
-- 0029_emails_abonnement.sql
-- Emails « abonnement confirmé » et « abonnement résilié », envoyés depuis le
-- webhook GoCardless (V3, phase 3).
--
-- GoCardless peut renvoyer un même événement plusieurs fois. Ces colonnes
-- retiennent POUR QUEL abonnement GoCardless (identifiant SB...) chaque email
-- est déjà parti : le webhook les remplit en une seule requête conditionnelle
-- avant d'envoyer, donc un renvoi, même simultané, ne produit jamais de
-- deuxième email. Un nouvel abonnement (nouvel identifiant) aura les siens.
--
-- Additive : deux colonnes, rien de supprimé ni de renommé. Rejouable.
-- =========================================================

alter table public.abonnements
  add column if not exists email_confirmation_pour text,
  add column if not exists email_resiliation_pour text;
