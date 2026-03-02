module.exports = {
  extends: ['stylelint-config-standard'],
  rules: {
    // Tailwind v4 documentation uses string import syntax: @import "tailwindcss";
    'import-notation': null,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'config', 'variants', 'responsive', 'screen'],
      },
    ],
  },
};
