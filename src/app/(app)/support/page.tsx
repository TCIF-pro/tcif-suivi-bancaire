import { createClient } from "@/lib/supabase/server";
import { LONGUEUR_MAX_MESSAGE, LONGUEUR_MAX_SUJET } from "./limites";
import { SupportForm } from "./SupportForm";

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Contacter le support
      </h1>

      <section className="max-w-xl rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <p className="mb-5 text-sm text-muted">
          Une question, un bug, une idée ? Écris-nous : la réponse arrivera par
          email.
        </p>
        <SupportForm
          email={user?.email ?? ""}
          longueurMaxSujet={LONGUEUR_MAX_SUJET}
          longueurMaxMessage={LONGUEUR_MAX_MESSAGE}
        />
      </section>
    </div>
  );
}
