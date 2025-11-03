// @ts-check
// Using @nam088/nestjs-eslint library for clean and maintainable configuration
import { createNestJSConfig } from '@nam088/nestjs-eslint';

export default createNestJSConfig({
  tsconfigRootDir: import.meta.dirname,
  project: ['./tsconfig.json', './tsconfig.spec.json'],

  // Custom perfectionist configuration
  perfectionist: {
    enabled: true,
    type: 'recommended-natural', // or 'recommended-natural', 'recommended-line-length', 'recommended-custom'
    partitionByComment: false, // Enable comment-based partitioning
  },

  // Additional ignore patterns for this project
  ignores: [
    'dist/**',
    'build/**',
    'coverage/**',
    '*.min.js',
    'node_modules/**',
    '**/*.spec.ts',
    '**/*.test.ts',
  ],

  // Custom project-specific rules
  rules: {
    // Allow console.log in development
    'no-console': 'warn',

    // Turn off strict any-related rules
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-enum-comparison': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',

    // Turn off other strict rules
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/require-await': 'off',
    'no-async-promise-executor': 'off',
    'no-case-declarations': 'off',
    'security/detect-object-injection': 'off',

    // Adjust complexity limits for development
    'complexity': ['warn', 15],
    'max-lines': ['warn', 800],
    'max-lines-per-function': ['warn', 150],

  // Relax JSDoc requirements for development
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/require-param': 'off',
  'jsdoc/require-returns': 'off',
  'lodash/prefer-lodash-method': 'off',

  // Relax rules for test files
  '@typescript-eslint/unbound-method': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  'max-nested-callbacks': 'off',
  'security/detect-non-literal-regexp': 'off',
},

  // Custom import groups for this project
  importGroups: {
    groups: [
      // Built-in Node.js modules
      'builtin',

      // External packages (npm packages)
      'external',

      // Internal modules with specific patterns
      'internal',

      // Parent directory imports
      'parent',

      // Sibling directory imports
      'sibling',

      // Index files
      'index',

      // Type imports
      'type',

      // Unknown imports
      'unknown',
    ],
    pathGroups: [
      // NestJS core modules (highest priority)
      {
        pattern: '@nestjs/core',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/common',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/config',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/typeorm',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/jwt',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/passport',
        group: 'external',
        position: 'before',
      },
      {
        pattern: '@nestjs/swagger',
        group: 'external',
        position: 'before',
      },

      // Database and ORM related
      {
        pattern: '@prisma/client',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'typeorm',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'prisma',
        group: 'external',
        position: 'before',
      },

      // Validation and transformation
      {
        pattern: 'class-validator',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'class-transformer',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'zod',
        group: 'external',
        position: 'before',
      },

      // Testing libraries
      {
        pattern: '@nestjs/testing',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'jest',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'supertest',
        group: 'external',
        position: 'before',
      },

      // Utility libraries
      {
        pattern: 'lodash',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'moment',
        group: 'external',
        position: 'before',
      },
      {
        pattern: 'dayjs',
        group: 'external',
        position: 'before',
      },

      // Company-specific internal modules
      {
        pattern: '@ecom/**',
        group: 'internal',
        position: 'before',
      },
      {
        pattern: '@company/**',
        group: 'internal',
        position: 'before',
      },
      {
        pattern: '@shared/**',
        group: 'internal',
        position: 'before',
      },

      // Project-specific internal modules
      {
        pattern: '@/*',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: '~/',
        group: 'internal',
        position: 'after',
      },

      // Relative imports for specific directories
      {
        pattern: './**/dto/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/entities/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/services/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/controllers/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/guards/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/decorators/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/enums/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/interfaces/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/types/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/utils/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/constants/**',
        group: 'internal',
        position: 'after',
      },
      {
        pattern: './**/config/**',
        group: 'internal',
        position: 'after',
      },

      // Type imports (should come after regular imports)
      {
        pattern: '**/*.types',
        group: 'type',
        position: 'after',
      },
      {
        pattern: '**/*.interface',
        group: 'type',
        position: 'after',
      },
      {
        pattern: '**/*.enum',
        group: 'type',
        position: 'after',
      },
    ],
  },
});

