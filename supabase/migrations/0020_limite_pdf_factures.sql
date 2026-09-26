-- =========================================================
-- 0020_limite_pdf_factures.sql
-- Le stockage des factures n'accepte que des PDF de 10 Mo maximum.
--
-- Depuis cette version, le PDF part directement du téléphone vers Supabase
-- Storage, sans passer par Vercel (qui refuse tout envoi de plus de 4,5 Mo).
-- La page vérifie déjà la taille et le type avant l'envoi, mais une page se
-- contourne : c'est le stockage lui-même qui doit faire respecter la règle.
--
-- Seuls les réglages du bucket changent. Les fichiers déjà stockés ne sont
-- ni vérifiés ni touchés, et restent lisibles.
--
-- Rejouable sans risque : réappliquer les mêmes valeurs ne fait rien.
-- =========================================================

update storage.buckets
set file_size_limit    = 10 * 1024 * 1024,   -- 10 Mo, en octets
    allowed_mime_types = array['application/pdf']
where id = 'invoices';
