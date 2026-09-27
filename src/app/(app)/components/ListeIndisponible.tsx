// Affiché à la place d'une liste quand la requête qui la remplit a échoué.
//
// Sans lui, une requête en erreur donnait une liste vide, que la page
// présentait comme « Aucun abonnement pour l'instant » : un faux état, qui
// laisse croire que les données ont disparu. C'est arrivé sur Abonnements et
// Transactions après la migration 0010.
export function ListeIndisponible({ quoi }: { quoi: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
    >
      {/* Phrase écrite d'un seul tenant : coupée par un retour à la ligne après
          {quoi}, l'espace qui suit disparaissait (« abonnementsn'a »). */}
      {`La liste ${quoi} n'a pas pu être chargée. Tes données ne sont pas perdues : recharge la page, et préviens-moi si ça se reproduit.`}
    </p>
  );
}
