// Demo test to show the testing framework working
describe('RadioCalico Testing Framework Demo', () => {
  test('should demonstrate basic testing capabilities', () => {
    expect(2 + 2).toBe(4);
    expect('hello').toBeTruthy();
    expect([1, 2, 3]).toHaveLength(3);
  });

  test('should demonstrate async testing', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });

  test('should demonstrate custom matchers', () => {
    // These custom matchers were defined in our setup
    expect('test123').toBeValidSongId();
    expect('a'.repeat(64)).toBeValidFingerprint();
    expect(1).toBeValidRating();
    expect(-1).toBeValidRating();
  });

  test('should demonstrate test utilities', () => {
    const testSongId = global.testUtils.generateTestSongId('Demo Song', 'Demo Artist');
    const testFingerprint = global.testUtils.generateTestFingerprint();
    
    expect(testSongId).toBeValidSongId();
    expect(testFingerprint).toBeTruthy();
    expect(typeof testFingerprint).toBe('string');
  });

  test('should demonstrate mock functionality', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});