module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary', 'text', 'lcov'],
  verbose: true,
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.m?jsx?$': 'ts-jest',
    '^.+\\.(hbs|md|css|yaml)$': '<rootDir>/tests/fileTransformer.cjs',
  },
  transformIgnorePatterns: ['node_modules/(?!(marked|github-markdown-css)/)'],
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
