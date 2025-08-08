// Global test setup
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 0; // Use random available port for testing

// Extend Jest matchers
expect.extend({
  toBeValidSongId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      message: () => `expected ${received} to be a valid song ID`,
      pass
    };
  },
  
  toBeValidFingerprint(received) {
    const pass = typeof received === 'string' && received.length === 64;
    return {
      message: () => `expected ${received} to be a valid 64-character fingerprint`,
      pass
    };
  },
  
  toBeValidRating(received) {
    const pass = received === 1 || received === -1;
    return {
      message: () => `expected ${received} to be either 1 or -1`,
      pass
    };
  }
});

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateTestFingerprint: () => {
    return 'test_fingerprint_' + Math.random().toString(36).substring(2, 15);
  },
  
  generateTestSongId: (title = 'Test Song', artist = 'Test Artist') => {
    return Buffer.from(`${title}-${artist}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }
};

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.TEST_VERBOSE ? originalConsole.log : jest.fn(),
  debug: process.env.TEST_VERBOSE ? originalConsole.debug : jest.fn(),
  info: process.env.TEST_VERBOSE ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Cleanup after tests
afterAll(async () => {
  // Restore original console
  global.console = originalConsole;
});