# RadioCalico Testing Framework

This document outlines the comprehensive testing strategy for the RadioCalico live streaming application, covering both backend APIs and frontend functionality.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## 🧪 Testing Structure

```
tests/
├── backend/               # Backend API and database tests
│   ├── api/              # API endpoint tests
│   ├── database/         # Database operation tests
│   └── utils/            # Backend utility function tests
├── frontend/             # Frontend functionality tests
│   ├── unit/             # Individual function tests
│   ├── integration/      # Component integration tests
│   └── e2e/              # End-to-end browser tests
├── fixtures/             # Test data and mock responses
└── setup/                # Test configuration and helpers
    ├── test-setup.js     # Global test configuration
    ├── backend-setup.js  # Backend-specific setup
    └── frontend-setup.js # Frontend-specific setup
```

## 📋 Available Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run test:backend` | Run only backend tests |
| `npm run test:frontend` | Run only frontend tests |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:verbose` | Run tests with detailed output |

## 🔧 Backend Testing

### API Endpoints Testing
Tests cover all REST API endpoints:

- **User Management**
  - `GET /users` - List all users
  - `POST /users` - Create new user
  - `GET /users/:id` - Get user by ID
  - `DELETE /users/:id` - Delete user

- **Rating System**
  - `POST /ratings` - Submit song rating
  - `GET /ratings/:songId` - Get song rating counts
  - `GET /ratings/:songId/user/:fingerprint` - Get user's rating

### Database Testing
- Uses in-memory SQLite database for isolation
- Tests CRUD operations and constraints
- Validates data integrity and error handling

### Example Backend Test
```javascript
describe('Rating API', () => {
  test('should save thumbs up rating', async () => {
    const response = await request(app)
      .post('/ratings')
      .send({
        songId: 'test_song',
        rating: 1,
        userFingerprint: 'test_fingerprint'
      })
      .expect(201);

    expect(response.body.message).toBe('Rating saved successfully');
  });
});
```

## 🎨 Frontend Testing

### Unit Tests
Tests individual JavaScript functions:

- **User Fingerprinting**
  - `generateFingerprint()` - Browser fingerprint creation
  - `generateSongId()` - Song ID generation from metadata
  
- **Audio Controls**
  - Play/pause functionality
  - Volume controls
  - Time formatting

- **Rating System**
  - Rating submission logic
  - UI state management
  - API interaction

### Integration Tests
Tests component interactions:

- Rating system with API calls
- Metadata fetching and display
- Player controls with audio events

### End-to-End Tests
Tests complete user workflows in a real browser:

- Full rating workflow
- Audio playback controls
- Metadata updates

### Example Frontend Test
```javascript
describe('generateFingerprint', () => {
  test('should generate consistent fingerprint', () => {
    const fp1 = generateFingerprint();
    const fp2 = generateFingerprint();
    
    expect(fp1).toBe(fp2);
    expect(fp1).toBeValidFingerprint();
  });
});
```

## 🛠️ Testing Tools & Frameworks

### Core Testing Stack
- **Jest** - Primary testing framework
- **Supertest** - HTTP endpoint testing
- **JSDOM** - DOM manipulation testing
- **Testing Library** - User-centric testing utilities

### Mock & Utilities
- **SQLite :memory:** - In-memory database for tests
- **Canvas/WebGL mocks** - Browser API mocking
- **HLS.js mocks** - Audio streaming mocks
- **Fetch mocks** - HTTP request mocking

## 📊 Code Coverage

The framework is configured to maintain high code coverage standards:

- **Branches**: 80% minimum
- **Functions**: 80% minimum  
- **Lines**: 80% minimum
- **Statements**: 80% minimum

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🔧 Test Configuration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'Backend Tests',
      testMatch: ['**/tests/backend/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'Frontend Tests',
      testMatch: ['**/tests/frontend/**/*.test.js'],
      testEnvironment: 'jsdom'
    }
  ]
};
```

### Custom Matchers
The framework includes custom Jest matchers:

- `toBeValidSongId()` - Validates song ID format
- `toBeValidFingerprint()` - Validates 64-char fingerprint
- `toBeValidRating()` - Validates rating is 1 or -1

## 🧩 Test Data & Fixtures

Test fixtures provide consistent data:

```javascript
// tests/fixtures/sample-metadata.json
{
  "artist": "The Rolling Stones",
  "title": "Paint It Black",
  "album": "Aftermath"
}
```

## 🚦 Continuous Integration

The testing framework is designed for CI/CD integration:

```bash
# In CI environment
npm ci
npm run test:coverage
```

## 📝 Writing New Tests

### Backend Test Template
```javascript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  });

  test('should do something', async () => {
    // Arrange
    const testData = {};
    
    // Act
    const response = await request(app)
      .post('/endpoint')
      .send(testData);
    
    // Assert
    expect(response.status).toBe(200);
  });
});
```

### Frontend Test Template
```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup DOM
    global.domUtils.loadMainHTML();
  });

  test('should handle user interaction', () => {
    // Arrange
    const button = document.getElementById('testButton');
    
    // Act
    button.click();
    
    // Assert
    expect(button.classList).toContain('active');
  });
});
```

## 🔍 Debugging Tests

### Verbose Output
```bash
npm run test:verbose
```

### Debug Single Test
```bash
npx jest tests/backend/api/ratings.test.js --verbose
```

### Watch Mode for Development
```bash
npm run test:watch
```

## 🎯 Testing Best Practices

1. **Test Isolation** - Each test should be independent
2. **Clear Naming** - Use descriptive test names
3. **Arrange-Act-Assert** - Follow AAA pattern
4. **Mock External Dependencies** - Use mocks for APIs, databases
5. **Test Edge Cases** - Include error scenarios and edge cases
6. **Consistent Data** - Use fixtures for predictable test data

## 📈 Performance Testing

For performance testing of the audio streaming and rating system:

```javascript
test('should handle multiple concurrent ratings', async () => {
  const promises = Array.from({ length: 100 }, (_, i) =>
    request(app)
      .post('/ratings')
      .send({
        songId: 'performance_test',
        rating: i % 2 === 0 ? 1 : -1,
        userFingerprint: `user_${i}`
      })
  );
  
  const responses = await Promise.all(promises);
  responses.forEach(res => expect(res.status).toBe(201));
});
```

## 🚀 Future Enhancements

Potential testing improvements:

- **Visual Regression Testing** - Screenshot comparison
- **Load Testing** - API performance under load  
- **Accessibility Testing** - Screen reader compatibility
- **Cross-browser Testing** - Multiple browser automation
- **Security Testing** - SQL injection, XSS prevention

---

For questions or contributions to the testing framework, please refer to the main project documentation.