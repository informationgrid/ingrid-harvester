import tseslint from "typescript-eslint";
import angular from "angular-eslint";

export default tseslint.config(
  {
    ignores: ["projects/**/*"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        project: ["tsconfig.json", "e2e/tsconfig.json"],
        createDefaultProgram: true,
      },
    },
    rules: {
      "@typescript-eslint/explicit-member-accessibility": [
        "off",
        {
          accessibility: "explicit",
        },
      ],
      "arrow-parens": ["off", "always"],
      "import/order": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
    ],
    rules: {},
  }
);
