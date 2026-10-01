-- =========================================================
-- 0028_accent_vert_neon.sql
-- Nouvelle couleur d'accentuation « Vert néon » (identifiant `neon`).
--
-- Élargit la contrainte CHECK posée par 0005 : les 5 valeurs existantes
-- restent valables, `neon` s'ajoute. Aucune donnée modifiée.
--
-- À appliquer AVANT de pousser le code : sans elle, choisir « Vert néon »
-- dans Réglages serait refusé par la base (le choix resterait inchangé).
-- Rejouable.
-- =========================================================

alter table public.user_settings
  drop constraint if exists user_settings_accent_color_check;

alter table public.user_settings
  add constraint user_settings_accent_color_check
  check (accent_color in ('brass', 'gold', 'terracotta', 'slate', 'olive', 'neon'));
