# Sauvegardes de la base de PROD

Chaque nuit, `.github/workflows/sauvegarde.yml` copie la base de prod
(schémas `public` et `auth`), la chiffre et la garde **30 jours** dans GitHub :
onglet **Actions**, workflow **Sauvegarde**, une exécution par nuit, fichier
`sauvegarde-AAAA-MM-JJ` en bas de chaque exécution.

Non couverts : les PDF des factures (Supabase Storage).

En cas d'échec, GitHub envoie un email. Une sauvegarde à la demande : Actions,
Sauvegarde, **Run workflow**.

## Restaurer (avec Claude, jamais dans la précipitation)

Toujours d'abord sur la base de **TEST**, pour vérifier le contenu, avant de
toucher à la prod.

1. Télécharger la sauvegarde voulue :
   `gh run download <id-de-l-execution> -n sauvegarde-AAAA-MM-JJ`
2. La déchiffrer (demande `SAUVEGARDE_MOT_DE_PASSE`) :
   `gpg --output base.dump --decrypt base.dump.gpg`
3. Voir ce qu'elle contient : `pg_restore --list base.dump`
4. Restaurer, de préférence seulement les tables utiles (`--table=...`,
   `--data-only`) plutôt que toute la base :
   `pg_restore --dbname "<adresse Session pooler>" --no-owner --no-privileges --data-only --table=transactions base.dump`

Une restauration complète remplace tout ce qui a été saisi depuis la
sauvegarde : à réserver à une vraie catastrophe.
