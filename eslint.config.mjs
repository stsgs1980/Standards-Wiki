import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

import noUnicodePolicy from "./eslint-rules/no-unicode-policy.js";
import antiMonolith from "./eslint-rules/anti-monolith.js";

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  files: ["**/*.{ts,tsx,js,jsx}"],
  plugins: {
    "no-unicode-policy": noUnicodePolicy,
    "anti-monolith": antiMonolith,
  },
  rules: {
    // STD-DOC-003 No-Unicode Policy v2.3
    // [C] Critical - production code
    "no-unicode-policy/no-emoji": "error",
    "no-unicode-policy/no-unicode-graphics": "error",

    // ZAI-ARCH-002 Anti-Monolith v1.0
    // [C] Critical - file size
    "anti-monolith/max-file-lines": ["error", {
      max: 250,
      exclude: [
        "next\\.config",
        "tailwind\\.config",
        "postcss\\.config",
        "eslint-rules/",
      ],
    }],
    // [W] Warning - component size
    "anti-monolith/max-component-lines": ["warn", { max: 200 }],
    // [W] Warning - useState count per component
    "anti-monolith/max-use-state": ["warn", { max: 2 }],
    // [I] Info - function length
    "anti-monolith/max-function-lines": ["warn", { max: 50 }],
    // STD-DOC-003 section 10.3: enable no-irregular-whitespace
    "no-irregular-whitespace": "error",

    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // React rules
    // STD-TEMPLATE-001: disable set-state-in-effect — standard Next.js hydration
    // pattern (useEffect + setMounted) is canonical and intentional;
    // React compiler is off, so this rule produces false positives.
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",
  },
}, {
  // MD/MDX files: ignored globally (no MDX parser installed).
  // STD-DOC-003 unicode policy is enforced on production code (.ts/.tsx/.js/.jsx) only.
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills/**", "download/**", "tool-results/**", "eslint-rules/**", "upload/**", "agent-ctx/**", "scripts/**", "standards/**", "**/*.md", "**/*.mdx"]
}];

export default eslintConfig;
