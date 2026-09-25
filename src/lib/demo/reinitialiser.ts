import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { estDemo } from "@/lib/auth/roles";
import { todayDateString } from "@/lib/dates";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { genererDonneesDemo, type CleCategorie, type CleCompte } from "./donnees";
import { genererPdf } from "./pdf";

// Adresse du compte démo. Aucune boîte mail n'existe sur notif.tcif-pro.fr :
// aucun email ne peut partir vers ce compte ni en revenir.
export const EMAIL_DEMO = "demo@notif.tcif-pro.fr";

type Admin = ReturnType<typeof createAdminClient>;

async function chercherCompteDemo(admin: Admin): Promise<User | null> {
  // Reconnu à son rôle, pas à son adresse : un visiteur pourrait tenter de
  // changer l'adresse du compte via l'API, jamais son rôle.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Liste des comptes illisible : ${error.message}`);
    const demo = data.users.find((u) => estDemo(u));
    if (demo) return demo;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Renvoie le compte démo, en le créant s'il n'existe pas encore.
 *
 * Son mot de passe est tiré au hasard et jeté aussitôt : personne ne le
 * connaît, pas même l'administrateur. On entre dans la démo sans mot de passe
 * (voir `entrerDansLaDemo`), donc un visiteur qui le changerait via l'API
 * n'empêcherait personne d'y entrer.
 */
export async function trouverOuCreerCompteDemo(): Promise<{ user: User; cree: boolean }> {
  const admin = createAdminClient();
  const existant = await chercherCompteDemo(admin);

  if (existant) {
    // Adresse modifiée par un visiteur ? On la remet.
    if (existant.email !== EMAIL_DEMO) {
      await admin.auth.admin.updateUserById(existant.id, { email: EMAIL_DEMO, email_confirm: true });
    }
    return { user: existant, cree: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL_DEMO,
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    app_metadata: { role: "demo" },
  });
  if (error || !data.user) throw new Error(`Création du compte démo impossible : ${error?.message}`);
  return { user: data.user, cree: true };
}

// Effacement dans l'ordre imposé par les clés étrangères : d'abord ce qui
// pointe vers les autres (transactions), en dernier ce vers quoi tout pointe
// (comptes).
const TABLES_A_VIDER = [
  "transactions",
  "invoices",
  "subscriptions",
  "quick_labels",
  "categories",
  "accounts",
  "support_messages",
] as const;

/**
 * Remet le compte démo dans son état de départ : efface TOUT ce qui lui
 * appartient — données et fichiers —, puis recrée le jeu fictif.
 *
 * Avec la clé service_role : la RLS est contournée, mais les déclencheurs de
 * la migration 0015 s'appliquent toujours — chaque ligne créée ne peut pointer
 * que vers des lignes du compte démo.
 */
export async function reinitialiserDemo(): Promise<{ userId: string; transactions: number }> {
  const admin = createAdminClient();
  const { user } = await trouverOuCreerCompteDemo();
  const id = user.id;
  const donnees = genererDonneesDemo(todayDateString());

  // Une étape qui échoue arrête tout, avec son nom dans le message : la tâche
  // planifiée le renvoie tel quel, et on sait où chercher.
  const verifier = (resultat: { error: { message: string } | null }, etape: string) => {
    if (resultat.error) throw new Error(`${etape} : ${resultat.error.message}`);
  };
  // Même chose, pour une écriture dont on a besoin des lignes créées.
  const lignes = <T>(resultat: { data: T | null; error: { message: string } | null }, etape: string): T => {
    verifier(resultat, etape);
    if (!resultat.data) throw new Error(`${etape} : aucune ligne renvoyée`);
    return resultat.data;
  };

  // --- 1. Tout effacer ---
  for (const table of TABLES_A_VIDER) {
    verifier(await admin.from(table).delete().eq("user_id", id), `effacement de ${table}`);
  }

  const { data: fichiers } = await admin.storage.from("invoices").list(id, { limit: 1000 });
  if (fichiers?.length) {
    await admin.storage.from("invoices").remove(fichiers.map((f) => `${id}/${f.name}`));
  }

  // --- 2. Recréer, en retenant les identifiants attribués par la base ---
  const comptes = lignes(
    await admin
      .from("accounts")
      .insert(
        donnees.comptes.map((c) => ({
          user_id: id,
          name: c.name,
          kind: c.kind,
          starting_balance: c.starting_balance,
          starting_balance_date: c.starting_balance_date,
        })),
      )
      .select("id, name"),
    "création des comptes",
  );
  const idCompte = (cle: CleCompte) =>
    comptes.find((c) => c.name === donnees.comptes.find((d) => d.cle === cle)!.name)!.id as string;

  const categories = lignes(
    await admin
      .from("categories")
      .insert(donnees.categories.map((c) => ({ user_id: id, name: c.name })))
      .select("id, name"),
    "création des catégories",
  );
  const idCategorie = (cle: CleCategorie | null) =>
    cle === null
      ? null
      : (categories.find((c) => c.name === donnees.categories.find((d) => d.cle === cle)!.name)!.id as string);

  verifier(
    await admin.from("quick_labels").insert(
      donnees.libelles.map((l) => ({
        user_id: id,
        label: l.label,
        type: l.type,
        category_id: idCategorie(l.categorie),
        position: l.position,
      })),
    ),
    "création des libellés rapides",
  );

  const abonnements = lignes(
    await admin
      .from("subscriptions")
      .insert(
        donnees.abonnements.map((a) => ({
          user_id: id,
          name: a.name,
          amount: a.amount,
          frequency: a.frequency,
          next_billing_date: a.next_billing_date,
          account_id: idCompte(a.compte),
          category_id: idCategorie(a.categorie),
          is_active: true,
          is_savings: Boolean(a.epargneVers),
          transfer_account_id: a.epargneVers ? idCompte(a.epargneVers) : null,
        })),
      )
      .select("id, name"),
    "création des abonnements",
  );
  const idAbonnement = (cle: string) =>
    abonnements.find((a) => a.name === donnees.abonnements.find((d) => d.cle === cle)!.name)!.id as string;

  // --- 3. La facture d'exemple et son PDF, entièrement fictifs ---
  const f = donnees.facture;
  const idFacture = crypto.randomUUID();
  const cheminPdf = `${id}/${idFacture}.pdf`;
  const pdf = genererPdf([
    { texte: "Studio démo", gras: true, taille: 18 },
    { texte: "Création de sites vitrines", taille: 10 },
    { texte: `FACTURE N° ${f.numero}`, gras: true, taille: 14, avant: 28 },
    { texte: `Date : ${formatDateLong(f.issued_date)}`, avant: 6 },
    { texte: `Client : ${f.party_name}` },
    { texte: "Désignation", gras: true, avant: 22 },
    { texte: "Refonte du site vitrine (5 pages)", avant: 4 },
    { texte: "Hébergement et nom de domaine, 1 an" },
    { texte: `Total HT : ${formatCurrency(f.amount / 1.2)}`, avant: 22 },
    { texte: `TVA 20 % : ${formatCurrency(f.amount - f.amount / 1.2)}` },
    { texte: `Total TTC : ${formatCurrency(f.amount)}`, gras: true, avant: 4 },
    { texte: "Document fictif du compte de démonstration TCIF.", taille: 9, avant: 40 },
  ]);
  const envoi = await admin.storage
    .from("invoices")
    .upload(cheminPdf, pdf, { contentType: "application/pdf", upsert: true });
  if (envoi.error) throw new Error(`dépôt du PDF de démo : ${envoi.error.message}`);

  verifier(
    await admin.from("invoices").insert({
      id: idFacture,
      user_id: id,
      doc_type: "facture",
      direction: "sent",
      status: "confirmed",
      file_path: cheminPdf,
      file_name: `facture-${f.numero}.pdf`,
      extracted_amount: f.amount,
      extracted_date: f.issued_date,
      extracted_party_name: f.party_name,
      extraction_confidence: "high",
      amount: f.amount,
      issued_date: f.issued_date,
      party_name: f.party_name,
      category_id: idCategorie(f.categorie),
      account_id: idCompte(f.compte),
    }),
    "création de la facture",
  );

  // --- 4. L'historique ---
  verifier(
    await admin.from("transactions").insert(
      donnees.transactions.map((t) => ({
        user_id: id,
        type: t.type,
        amount: t.amount,
        occurred_on: t.occurred_on,
        label: t.label,
        account_id: idCompte(t.compte),
        category_id: idCategorie(t.categorie),
        transfer_account_id: t.virementVers ? idCompte(t.virementVers) : null,
        source: t.lieeALaFacture ? "invoice" : t.abonnement ? "subscription" : "manual",
        invoice_id: t.lieeALaFacture ? idFacture : null,
        subscription_id: t.abonnement ? idAbonnement(t.abonnement) : null,
      })),
    ),
    "création des transactions",
  );

  // --- 5. Réglages : apparence et tableau de bord par défaut ---
  verifier(
    await admin
      .from("user_settings")
      .update({
        theme: "dark",
        accent_color: "brass",
        upcoming_horizon_days: 7,
        show_month_stats: true,
        show_category_chart: true,
        show_upcoming: true,
      })
      .eq("user_id", id),
    "remise à zéro des réglages",
  );

  return { userId: id, transactions: donnees.transactions.length };
}
