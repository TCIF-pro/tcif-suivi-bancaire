-- =========================================================
-- 0005_accent_color.sql
-- Couleur d'accentuation personnalisable (4 choix + laiton par défaut),
-- stockée dans user_settings comme le thème clair/sombre.
-- =========================================================

alter table public.user_settings
  add column accent_color text not null default 'brass'
    check (accent_color in ('brass', 'gold', 'terracotta', 'slate', 'olive'));
