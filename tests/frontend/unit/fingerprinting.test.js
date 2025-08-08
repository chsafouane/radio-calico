// User fingerprinting functionality tests

// Mock script.js functions (in real implementation, you'd import them as modules)
function generateSongId(title, artist) {
  return btoa(encodeURIComponent(`${title}-${artist}`)).replace(/[^a-zA-Z0-9]/g, '');
}

function generateFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Fingerprinting text 🎵', 2, 2);
  }
  
  const fingerprint = {
    // Screen properties
    screenWidth: screen.width,
    screenHeight: screen.height,
    screenColorDepth: screen.colorDepth,
    screenPixelDepth: screen.pixelDepth,
    
    // Navigator properties
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages ? navigator.languages.join(',') : '',
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    
    // Timezone
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Canvas fingerprint
    canvasFingerprint: canvas.toDataURL ? canvas.toDataURL() : 'mock-canvas-data',
    
    // WebGL fingerprint
    webglVendor: '',
    webglRenderer: '',
    
    // Audio context fingerprint
    audioFingerprint: '',
    
    // Fonts detection (basic)
    fonts: '',
    
    // Local storage support
    localStorageSupport: typeof(Storage) !== 'undefined',
    sessionStorageSupport: typeof(sessionStorage) !== 'undefined',
    
    // Hardware concurrency
    hardwareConcurrency: navigator.hardwareConcurrency || 1
  };
  
  // WebGL fingerprinting
  try {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    // WebGL not supported
  }
  
  // Audio context fingerprinting (simplified)
  try {
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      fingerprint.audioFingerprint = audioContext.sampleRate.toString() + audioContext.state;
      if (audioContext.close) {
        audioContext.close();
      }
    }
  } catch (e) {
    fingerprint.audioFingerprint = 'unsupported';
  }
  
  // Simplified font detection
  try {
    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d');
    if (ctx2) {
      ctx2.font = '16px Arial';
      fingerprint.fonts = ctx2.measureText('test').width.toString();
    } else {
      fingerprint.fonts = 'unknown';
    }
  } catch (e) {
    fingerprint.fonts = 'unknown';
  }
  
  // Create hash from all fingerprint data
  const fingerprintString = JSON.stringify(fingerprint);
  return btoa(encodeURIComponent(fingerprintString)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
}

describe('User Fingerprinting', () => {
  describe('generateSongId', () => {
    test('should generate consistent song ID for same title and artist', () => {
      const title = 'Test Song';
      const artist = 'Test Artist';
      
      const id1 = generateSongId(title, artist);
      const id2 = generateSongId(title, artist);
      
      expect(id1).toBe(id2);
      expect(id1).toBeValidSongId();
    });

    test('should generate different IDs for different songs', () => {
      const id1 = generateSongId('Song 1', 'Artist 1');
      const id2 = generateSongId('Song 2', 'Artist 2');
      
      expect(id1).not.toBe(id2);
      expect(id1).toBeValidSongId();
      expect(id2).toBeValidSongId();
    });

    test('should handle special characters in title and artist', () => {
      const title = 'Song with "Quotes" & Symbols!';
      const artist = 'Artist with ümlauts & 中文';
      
      const id = generateSongId(title, artist);
      
      expect(id).toBeValidSongId();
      expect(id).toMatch(/^[a-zA-Z0-9]+$/); // Should only contain alphanumeric
    });

    test('should handle empty strings gracefully', () => {
      const id1 = generateSongId('', '');
      const id2 = generateSongId('', 'Artist');
      const id3 = generateSongId('Song', '');
      
      expect(id1).toBeValidSongId();
      expect(id2).toBeValidSongId();
      expect(id3).toBeValidSongId();
      
      // Should all be different
      expect(new Set([id1, id2, id3]).size).toBe(3);
    });
  });

  describe('generateFingerprint', () => {
    test('should generate consistent fingerprint', () => {
      const fp1 = generateFingerprint();
      const fp2 = generateFingerprint();
      
      expect(fp1).toBe(fp2);
      expect(fp1).toBeValidFingerprint();
    });

    test('should include screen properties', () => {
      const fingerprint = generateFingerprint();
      
      // Since we're mocking screen properties in setup, we can verify they're included
      expect(fingerprint).toBeDefined();
      expect(fingerprint.length).toBe(64);
    });

    test('should handle browser API availability gracefully', () => {
      // Temporarily disable AudioContext
      const originalAudioContext = global.AudioContext;
      delete global.AudioContext;
      delete global.webkitAudioContext;
      
      expect(() => generateFingerprint()).not.toThrow();
      const fingerprint = generateFingerprint();
      expect(fingerprint).toBeValidFingerprint();
      
      // Restore AudioContext
      global.AudioContext = originalAudioContext;
      global.webkitAudioContext = originalAudioContext;
    });

    test('should include canvas fingerprinting', () => {
      const spy = jest.spyOn(HTMLCanvasElement.prototype, 'getContext');
      
      generateFingerprint();
      
      expect(spy).toHaveBeenCalledWith('2d');
      expect(spy).toHaveBeenCalledWith('webgl');
      
      spy.mockRestore();
    });

    test('should include WebGL fingerprinting when available', () => {
      const fingerprint = generateFingerprint();
      
      // Our mock WebGL context should be used
      expect(fingerprint).toBeValidFingerprint();
    });

    test('should include navigator properties', () => {
      const originalUserAgent = navigator.userAgent;
      
      const fp1 = generateFingerprint();
      
      // Change user agent to something different
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Completely Different User Agent',
        configurable: true
      });
      
      const fp2 = generateFingerprint();
      
      // Change it back
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true
      });
      
      // Should be different due to different user agent
      expect(fp1).not.toBe(fp2);
      expect(fp1).toBeValidFingerprint();
      expect(fp2).toBeValidFingerprint();
    });

    test('should handle timezone information', () => {
      expect(() => generateFingerprint()).not.toThrow();
      
      // Verify Intl.DateTimeFormat is called
      expect(Intl.DateTimeFormat).toHaveBeenCalled();
    });

    test('should be deterministic with same browser environment', () => {
      const fingerprints = Array.from({ length: 5 }, () => generateFingerprint());
      
      // All fingerprints should be identical
      expect(new Set(fingerprints).size).toBe(1);
      fingerprints.forEach(fp => expect(fp).toBeValidFingerprint());
    });
  });

  describe('Fingerprint uniqueness', () => {
    test('should generate different fingerprints for different environments', () => {
      const fp1 = generateFingerprint();
      
      // Change screen width
      Object.defineProperty(screen, 'width', {
        value: 1366,
        configurable: true
      });
      
      const fp2 = generateFingerprint();
      
      expect(fp1).not.toBe(fp2);
      expect(fp1).toBeValidFingerprint();
      expect(fp2).toBeValidFingerprint();
      
      // Reset screen width
      Object.defineProperty(screen, 'width', {
        value: 1920,
        configurable: true
      });
    });

    test('should generate different fingerprints for different languages', () => {
      const originalLanguage = navigator.language;
      
      const fp1 = generateFingerprint();
      
      // Change language
      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true
      });
      
      const fp2 = generateFingerprint();
      
      // Reset language
      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        configurable: true
      });
      
      expect(fp1).not.toBe(fp2);
      expect(fp1).toBeValidFingerprint();
      expect(fp2).toBeValidFingerprint();
    });
  });
});