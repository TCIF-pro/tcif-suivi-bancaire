-- =========================================================
-- 0030_fin_acces.sql
-- Abonnement obligatoire (V3) : après une résiliation, l'accès reste ouvert
-- jusqu'à la fin de la période déjà payée.
--
-- acces_jusqu_au : dernier jour d'accès après la résiliation (veille de la
-- prochaine échéance du dernier prélèvement passé). Vide si rien n'a encore
-- été prélevé (avant le 1er décembre 2026, par exemple) : l'accès s'arrête
-- alors tout de suite, la personne peut se réabonner à 0 €.
--
-- À appliquer AVANT de pousser le code : le layout de l'app lit cette
-- colonne pour décider d'afficher l'écran « Choisis ton abonnement ».
-- Additive : une colonne, rien de supprimé ni de renommé. Rejouable.
-- =========================================================

alter table public.abonnements
  add column if not exists acces_jusqu_au date;
