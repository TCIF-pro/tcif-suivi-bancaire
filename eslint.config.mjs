import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Tout champ mot de passe passe par <ChampMotDePasse> (src/components), qui
  // gère l'œil pour afficher / masquer et ses précautions sur téléphone. Un
  // `type="password"` écrit ailleurs ferait un champ sans ces protections :
  // le lint le refuse, et un futur champ oublié fait échouer `npm run lint`.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ChampMotDePasse.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='type'][value.value='password']",
          message:
            "Utilise <ChampMotDePasse> (src/components/ChampMotDePasse.tsx) au lieu d'un input type=\"password\".",
        },
        {
          selector: "JSXAttribute[name.name='type'] > JSXExpressionContainer > Literal[value='password']",
          message:
            "Utilise <ChampMotDePasse> (src/components/ChampMotDePasse.tsx) au lieu d'un input type=\"password\".",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
