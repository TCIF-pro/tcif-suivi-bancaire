import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Assemble des classes Tailwind en résolvant les conflits (la dernière gagne) :
// l'utilitaire standard des composants shadcn/ui (src/components/ui).
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
