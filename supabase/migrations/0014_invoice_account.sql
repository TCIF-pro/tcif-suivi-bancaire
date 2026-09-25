-- =========================================================
-- 0014_invoice_account.sql
--
-- Une facture mémorise le compte sur lequel elle est réglée.
--
-- Jusqu'ici, confirmer une facture créait une transaction SANS compte. Elle
-- comptait donc dans la vue « Tous » du tableau de bord mais disparaissait dès
-- qu'on filtrait sur Pro ou Perso : Pro + Perso ne faisait plus Tous.
--
-- Le compte est stocké sur la facture elle-même, et pas seulement sur la
-- transaction créée : c'est la facture qui fait foi, et chaque nouvel
-- enregistrement resynchronise la transaction liée — compte compris.
--
-- Migration ADDITIVE : une colonne facultative. Aucune donnée existante n'est
-- modifiée : pour une facture déjà confirmée, il suffit de l'ouvrir et de
-- l'enregistrer avec un compte choisi, la transaction suit.
-- =========================================================

alter table public.invoices
  add column if not exists account_id uuid references public.accounts(id);
