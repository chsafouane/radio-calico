// Rating API endpoint tests
const request = require('supertest');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

// Note: In a real implementation, you'd extract the server logic into modules
// For now, this demonstrates the testing approach

describe('Rating API Endpoints', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    // Create Express app with test database
    app = express();
    app.use(express.json());
    
    // Use the global test database from setup
    const db = global.testDb;
    
    // Rating endpoints (extracted from server.js for testing)
    app.post('/ratings', (req, res) => {
      const { songId, rating, userFingerprint } = req.body;
      const userIp = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
      
      if (!songId || !rating || (rating !== 1 && rating !== -1) || !userFingerprint) {
        return res.status(400).json({ error: 'Valid songId, rating (1 or -1), and userFingerprint are required' });
      }

      db.run("INSERT OR REPLACE INTO song_ratings (song_id, user_fingerprint, user_ip, rating) VALUES (?, ?, ?, ?)", 
        [songId, userFingerprint, userIp, rating], function(err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(201).json({ message: 'Rating saved successfully' });
      });
    });

    app.get('/ratings/:songId', (req, res) => {
      const { songId } = req.params;
      
      db.all(`SELECT 
        COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down
        FROM song_ratings WHERE song_id = ?`, [songId], (err, rows) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        const result = rows[0] || { thumbs_up: 0, thumbs_down: 0 };
        res.json(result);
      });
    });

    app.get('/ratings/:songId/user/:fingerprint', (req, res) => {
      const { songId, fingerprint } = req.params;
      
      db.get("SELECT rating FROM song_ratings WHERE song_id = ? AND user_fingerprint = ?", 
        [songId, fingerprint], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ userRating: row ? row.rating : null });
      });
    });
  });

  describe('POST /ratings', () => {
    test('should successfully save a thumbs up rating', async () => {
      const ratingData = {
        songId: 'test_song_123',
        rating: 1,
        userFingerprint: 'test_fingerprint_abc'
      };

      const response = await request(app)
        .post('/ratings')
        .send(ratingData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Rating saved successfully'
      });

      // Verify rating was saved in database
      const savedRating = await global.dbHelpers.getUserRating(
        ratingData.songId, 
        ratingData.userFingerprint
      );
      expect(savedRating).toBe(1);
    });

    test('should successfully save a thumbs down rating', async () => {
      const ratingData = {
        songId: 'test_song_456',
        rating: -1,
        userFingerprint: 'test_fingerprint_def'
      };

      const response = await request(app)
        .post('/ratings')
        .send(ratingData)
        .expect(201);

      expect(response.body.message).toBe('Rating saved successfully');

      // Verify rating was saved in database
      const savedRating = await global.dbHelpers.getUserRating(
        ratingData.songId, 
        ratingData.userFingerprint
      );
      expect(savedRating).toBe(-1);
    });

    test('should replace existing rating for same user and song', async () => {
      const songId = 'test_song_replace';
      const fingerprint = 'test_fingerprint_replace';

      // First rating: thumbs up
      await request(app)
        .post('/ratings')
        .send({ songId, rating: 1, userFingerprint: fingerprint })
        .expect(201);

      // Second rating: thumbs down (should replace first)
      await request(app)
        .post('/ratings')
        .send({ songId, rating: -1, userFingerprint: fingerprint })
        .expect(201);

      // Verify only the latest rating exists
      const finalRating = await global.dbHelpers.getUserRating(songId, fingerprint);
      expect(finalRating).toBe(-1);

      // Check that there's only one rating total
      const counts = await global.dbHelpers.getRatingCounts(songId);
      expect(counts.thumbs_up).toBe(0);
      expect(counts.thumbs_down).toBe(1);
    });

    test('should reject invalid rating values', async () => {
      const testCases = [
        { rating: 0, description: 'zero rating' },
        { rating: 2, description: 'rating greater than 1' },
        { rating: -2, description: 'rating less than -1' },
        { rating: 'invalid', description: 'string rating' },
        { rating: null, description: 'null rating' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/ratings')
          .send({
            songId: 'test_song',
            rating: testCase.rating,
            userFingerprint: 'test_fingerprint'
          })
          .expect(400);

        expect(response.body.error).toContain('Valid songId, rating (1 or -1), and userFingerprint are required');
      }
    });

    test('should reject missing required fields', async () => {
      const testCases = [
        { songId: 'test', rating: 1 }, // Missing userFingerprint
        { rating: 1, userFingerprint: 'test' }, // Missing songId
        { songId: 'test', userFingerprint: 'test' }, // Missing rating
        {} // Missing all fields
      ];

      for (const testCase of testCases) {
        await request(app)
          .post('/ratings')
          .send(testCase)
          .expect(400);
      }
    });
  });

  describe('GET /ratings/:songId', () => {
    beforeEach(async () => {
      // Set up test data
      const songId = 'test_song_counts';
      await global.dbHelpers.insertRating(songId, 'user1', '127.0.0.1', 1);
      await global.dbHelpers.insertRating(songId, 'user2', '127.0.0.1', 1);
      await global.dbHelpers.insertRating(songId, 'user3', '127.0.0.1', -1);
    });

    test('should return correct rating counts', async () => {
      const response = await request(app)
        .get('/ratings/test_song_counts')
        .expect(200);

      expect(response.body).toEqual({
        thumbs_up: 2,
        thumbs_down: 1
      });
    });

    test('should return zero counts for song with no ratings', async () => {
      const response = await request(app)
        .get('/ratings/nonexistent_song')
        .expect(200);

      expect(response.body).toEqual({
        thumbs_up: 0,
        thumbs_down: 0
      });
    });
  });

  describe('GET /ratings/:songId/user/:fingerprint', () => {
    beforeEach(async () => {
      await global.dbHelpers.insertRating('test_song_user', 'user_thumbs_up', '127.0.0.1', 1);
      await global.dbHelpers.insertRating('test_song_user', 'user_thumbs_down', '127.0.0.1', -1);
    });

    test('should return user thumbs up rating', async () => {
      const response = await request(app)
        .get('/ratings/test_song_user/user/user_thumbs_up')
        .expect(200);

      expect(response.body).toEqual({
        userRating: 1
      });
    });

    test('should return user thumbs down rating', async () => {
      const response = await request(app)
        .get('/ratings/test_song_user/user/user_thumbs_down')
        .expect(200);

      expect(response.body).toEqual({
        userRating: -1
      });
    });

    test('should return null for user with no rating', async () => {
      const response = await request(app)
        .get('/ratings/test_song_user/user/user_no_rating')
        .expect(200);

      expect(response.body).toEqual({
        userRating: null
      });
    });
  });
});