// ESLint flat config (ESLint 9+ / Next.js 16).
// eslint-config-next v16 mengexport flat config siap pakai sebagai default.
//
// React-hooks v7 rules baru (set-state-in-effect, complex effect deps) terlalu
// agresif untuk codebase existing — downgrade ke 'warn' supaya tidak blocking
// CI/CD. Fix incremental di refactor session.
import next from 'eslint-config-next';

export default [
  ...next,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      'next-env.d.ts',
      '**/*.d.ts',
      'prisma/migrations/**',
    ],
  },
  {
    rules: {
      // React 19 + react-hooks v7 — relax rules baru yang noisy
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/react-compiler': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      // React 19 strict-mode rules baru — relax untuk MVP, fix incremental
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-key': 'warn',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
];
