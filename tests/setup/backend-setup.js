// Backend test setup
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Global test database setup
let testDb;

beforeAll(async () => {
  // Create in-memory test database
  testDb = new sqlite3.Database(':memory:');
  
  return new Promise((resolve, reject) => {
    testDb.serialize(() => {
      // Create tables
      testDb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) reject(err);
      });
      
      testDb.run(`CREATE TABLE IF NOT EXISTS song_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id TEXT NOT NULL,
        user_fingerprint TEXT NOT NULL,
        user_ip TEXT,
        rating INTEGER CHECK(rating IN (1, -1)) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(song_id, user_fingerprint)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});

afterAll(async () => {
  return new Promise((resolve) => {
    if (testDb) {
      testDb.close((err) => {
        if (err) console.error('Error closing test database:', err);
        resolve();
      });
    } else {
      resolve();
    }
  });
});

beforeEach(async () => {
  // Clear tables before each test
  return new Promise((resolve, reject) => {
    testDb.serialize(() => {
      testDb.run('DELETE FROM song_ratings', (err) => {
        if (err) reject(err);
      });
      testDb.run('DELETE FROM users', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});

// Make test database available globally
global.testDb = testDb;

// Database helper functions for tests
global.dbHelpers = {
  // Insert test user
  insertUser: (username, email) => {
    return new Promise((resolve, reject) => {
      testDb.run(
        'INSERT INTO users (username, email) VALUES (?, ?)',
        [username, email],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, username, email });
        }
      );
    });
  },
  
  // Insert test rating
  insertRating: (songId, userFingerprint, userIp, rating) => {
    return new Promise((resolve, reject) => {
      testDb.run(
        'INSERT INTO song_ratings (song_id, user_fingerprint, user_ip, rating) VALUES (?, ?, ?, ?)',
        [songId, userFingerprint, userIp, rating],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },
  
  // Get user by ID
  getUser: (id) => {
    return new Promise((resolve, reject) => {
      testDb.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  // Get rating counts for song
  getRatingCounts: (songId) => {
    return new Promise((resolve, reject) => {
      testDb.get(`
        SELECT 
          COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
          COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down
        FROM song_ratings WHERE song_id = ?
      `, [songId], (err, row) => {
        if (err) reject(err);
        else resolve(row || { thumbs_up: 0, thumbs_down: 0 });
      });
    });
  },
  
  // Get user rating for song
  getUserRating: (songId, userFingerprint) => {
    return new Promise((resolve, reject) => {
      testDb.get(
        'SELECT rating FROM song_ratings WHERE song_id = ? AND user_fingerprint = ?',
        [songId, userFingerprint],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.rating : null);
        }
      );
    });
  }
};