import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test files
    "**/__tests__/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "e2e/**",
    "firestore.test.ts",
    // Scripts (use different Node.js patterns)
    "src/scripts/**",
  ]),
  // Rule overrides for gradual adoption
  {
    rules: {
      // Downgrade no-explicit-any to warning (gradual TypeScript adoption)
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars are warnings, not errors
      "@typescript-eslint/no-unused-vars": "warn",
      // Downgrade unescaped entities to warning (common in educational content)
      "react/no-unescaped-entities": "warn",
      // Downgrade module variable assignment to warning (will be fixed incrementally)
      "@next/next/no-assign-module-variable": "warn",
      // Downgrade require imports to warning for existing code
      "@typescript-eslint/no-require-imports": "warn",
      // Downgrade prefer-const to warning
      "prefer-const": "warn",
      // Downgrade React hooks rules to warning (pre-existing issues)
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Disable all new React Compiler/Hooks rules (not ready for adoption)
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/component-hook-factories": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
    },
  },
]);

export default eslintConfig;
