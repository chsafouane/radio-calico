module.exports = {
  // Test environment setup
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'server.js',
    'public/script.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },
  
  // Different configurations for different test types
  projects: [
    {
      displayName: 'Backend Tests',
      testMatch: ['**/tests/backend/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend-setup.js']
    },
    {
      displayName: 'Frontend Unit Tests',
      testMatch: ['**/tests/frontend/unit/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend-setup.js']
    },
    {
      displayName: 'Frontend Integration Tests',
      testMatch: ['**/tests/frontend/integration/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend-setup.js']
    }
  ],
  
  // Module name mapping for frontend assets
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/public/$1'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  
  // Transform configuration (if needed for ES modules)
  transform: {},
  
  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Timeout configuration
  testTimeout: 10000,
  
  // Verbose output
  verbose: true
};