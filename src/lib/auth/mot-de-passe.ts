import "server-only";
import { randomInt } from "node:crypto";

// Sans 0/O, 1/l/I : le mot de passe provisoire est destiné à être recopié à la
// main ou dicté, les caractères ambigus y feraient perdre du temps.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/**
 * Mot de passe provisoire, au format « Xxxx-xxxx-xxxx-xxxx ».
 *
 * 16 caractères tirés parmi 54 : environ 92 bits d'entropie, hors de portée
 * d'une attaque par essais. `randomInt` vient du module `crypto` — un
 * générateur cryptographique, là où `Math.random()` est prévisible.
 */
export function genererMotDePasseProvisoire(): string {
  const groupes = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""),
  );
  return groupes.join("-");
}

export { LONGUEUR_MIN_MOT_DE_PASSE } from "./longueur-mot-de-passe";
