-- =========================================================
-- 0013_dashboard_cards.sql
--
-- Choisir les blocs affichés sur le tableau de bord.
--
-- Trois interrupteurs, tous à `true` par défaut : personne ne perd un bloc
-- qu'il voyait avant. Les cartes des comptes ne sont volontairement PAS
-- masquables — c'est le cœur de la page, un tableau de bord sans solde
-- n'aurait plus d'objet.
--
-- Des colonnes booléennes plutôt qu'une liste en JSON : chaque réglage est
-- alors typé, contraint et lisible directement dans le Table Editor. Ajouter
-- un bloc plus tard demandera une colonne de plus, ce qui reste trivial.
--
-- Migration ADDITIVE : trois colonnes avec valeur par défaut, rien d'autre.
-- =========================================================

alter table public.user_settings
  add column if not exists show_month_stats boolean not null default true;

alter table public.user_settings
  add column if not exists show_category_chart boolean not null default true;

alter table public.user_settings
  add column if not exists show_upcoming boolean not null default true;
