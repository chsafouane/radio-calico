// Frontend test setup with JSDOM
const fs = require('fs');
const path = require('path');

// Mock browser APIs that aren't available in JSDOM
global.HTMLMediaElement.prototype.load = jest.fn();
global.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
global.HTMLMediaElement.prototype.pause = jest.fn();

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: {
    MANIFEST_PARSED: 'manifestParsed',
    ERROR: 'hlsError',
    MEDIA_ATTACHED: 'mediaAttached'
  }
};

global.Hls.prototype = {
  constructor: global.Hls,
  loadSource: jest.fn(),
  attachMedia: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn()
};

// Mock Canvas and WebGL for fingerprinting
const mockCanvas2DContext = {
  textBaseline: 'top',
  font: '14px Arial',
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 }))
};

const mockWebGLContext = {
  getExtension: jest.fn(() => ({
    UNMASKED_VENDOR_WEBGL: 37445,
    UNMASKED_RENDERER_WEBGL: 37446
  })),
  getParameter: jest.fn((param) => {
    if (param === 37445) return 'Test Vendor';
    if (param === 37446) return 'Test Renderer';
    return null;
  })
};

global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
  if (type === '2d') {
    return mockCanvas2DContext;
  } else if (type === 'webgl' || type === 'experimental-webgl') {
    return mockWebGLContext;
  }
  return null;
});

// Mock toDataURL separately
global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,test');

// Mock Audio Context for fingerprinting
global.AudioContext = jest.fn(() => ({
  sampleRate: 44100,
  state: 'running',
  close: jest.fn()
}));
global.webkitAudioContext = global.AudioContext;

// Mock navigator properties
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Test User Agent',
  configurable: true
});

Object.defineProperty(global.navigator, 'language', {
  value: 'en-US',
  configurable: true
});

Object.defineProperty(global.navigator, 'languages', {
  value: ['en-US', 'en'],
  configurable: true
});

Object.defineProperty(global.navigator, 'platform', {
  value: 'Test Platform',
  configurable: true
});

Object.defineProperty(global.navigator, 'cookieEnabled', {
  value: true,
  configurable: true
});

Object.defineProperty(global.navigator, 'doNotTrack', {
  value: null,
  configurable: true
});

Object.defineProperty(global.navigator, 'maxTouchPoints', {
  value: 0,
  configurable: true
});

Object.defineProperty(global.navigator, 'hardwareConcurrency', {
  value: 4,
  configurable: true
});

// Mock screen properties
Object.defineProperty(global.screen, 'width', {
  value: 1920,
  configurable: true
});

Object.defineProperty(global.screen, 'height', {
  value: 1080,
  configurable: true
});

Object.defineProperty(global.screen, 'colorDepth', {
  value: 24,
  configurable: true
});

Object.defineProperty(global.screen, 'pixelDepth', {
  value: 24,
  configurable: true
});

// Mock Intl.DateTimeFormat
global.Intl = {
  DateTimeFormat: jest.fn(() => ({
    resolvedOptions: () => ({ timeZone: 'America/New_York' })
  }))
};

// Mock Date for consistent timezone testing
const originalDate = Date;
global.Date = class extends originalDate {
  getTimezoneOffset() {
    return -300; // EST offset in minutes
  }
};

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage
});

// Mock fetch for API calls
global.fetch = jest.fn();

// DOM utilities for testing
global.domUtils = {
  // Load HTML content for testing
  loadHTML: (htmlContent) => {
    document.body.innerHTML = htmlContent;
  },
  
  // Load the main HTML structure
  loadMainHTML: () => {
    const htmlPath = path.join(__dirname, '../../public/index.html');
    if (fs.existsSync(htmlPath)) {
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      document.documentElement.innerHTML = htmlContent;
    }
  },
  
  // Create mock audio element
  createMockAudio: () => {
    const audio = document.createElement('audio');
    audio.id = 'radioPlayer';
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.duration = NaN; // Live stream
    return audio;
  },
  
  // Create mock rating buttons
  createRatingButtons: () => {
    const thumbsUp = document.createElement('button');
    thumbsUp.id = 'thumbsUp';
    
    const thumbsDown = document.createElement('button');
    thumbsDown.id = 'thumbsDown';
    
    const thumbsUpCount = document.createElement('span');
    thumbsUpCount.id = 'thumbsUpCount';
    thumbsUpCount.textContent = '0';
    
    const thumbsDownCount = document.createElement('span');
    thumbsDownCount.id = 'thumbsDownCount';
    thumbsDownCount.textContent = '0';
    
    const ratingStatus = document.createElement('div');
    ratingStatus.id = 'ratingStatus';
    
    return {
      thumbsUp,
      thumbsDown,
      thumbsUpCount,
      thumbsDownCount,
      ratingStatus
    };
  }
};

// Add custom Jest matchers
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

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});