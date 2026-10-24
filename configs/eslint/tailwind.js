import tailwindcss from 'eslint-plugin-tailwindcss'

// Append after baseConfig or reactConfig. cssConfigPath is the Tailwind CSS v4
// entry file (the one with `@import 'tailwindcss'`), absolute or relative to the
// working directory.
export const tailwindConfig = ({ cssConfigPath }) => [
  {
    ...tailwindcss.configs.recommended,
    settings: {
      tailwindcss: { cssConfigPath },
    },
    rules: {
      ...tailwindcss.configs.recommended.rules,
      // Class order is left to prettier-plugin-tailwindcss; two sorters fight each other
      'tailwindcss/classnames-order': 'off',
    },
  },
]
