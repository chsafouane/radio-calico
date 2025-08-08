const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const net = require('net');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection configuration
const dbConfig = {
  user: process.env.POSTGRES_USER || 'radiocalico_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'radiocalico',
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Utility function to validate and parse IP address
function parseAndValidateIP(req) {
  // Get IP from various sources
  let rawIP = req.ip || 
              req.connection?.remoteAddress || 
              req.socket?.remoteAddress ||
              req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
              req.headers['x-real-ip'];
  
  if (!rawIP) {
    return null;
  }
  
  // Clean IPv6 mapped IPv4 addresses (::ffff:192.168.1.1 -> 192.168.1.1)
  if (rawIP.startsWith('::ffff:')) {
    rawIP = rawIP.substring(7);
  }
  
  // Validate IP address format
  if (net.isIP(rawIP)) {
    return rawIP;
  }
  
  return null;
}

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS song_ratings (
        id SERIAL PRIMARY KEY,
        song_id VARCHAR(255) NOT NULL,
        user_fingerprint VARCHAR(500) NOT NULL,
        user_ip INET,
        rating INTEGER CHECK(rating IN (1, -1)) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(song_id, user_fingerprint)
      )
    `);
    
    // Create indexes for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_song_ratings_fingerprint ON song_ratings(user_fingerprint)');
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Initialize database on startup
initializeDatabase();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/users', async (req, res) => {
  const { username, email } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [username, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount > 0) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Song rating endpoints
app.post('/ratings', async (req, res) => {
  const { songId, rating, userFingerprint } = req.body;
  const userIp = parseAndValidateIP(req);
  
  if (!songId || !rating || (rating !== 1 && rating !== -1) || !userFingerprint) {
    return res.status(400).json({ error: 'Valid songId, rating (1 or -1), and userFingerprint are required' });
  }

  try {
    await pool.query(
      `INSERT INTO song_ratings (song_id, user_fingerprint, user_ip, rating) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (song_id, user_fingerprint) 
       DO UPDATE SET rating = $4, created_at = CURRENT_TIMESTAMP`,
      [songId, userFingerprint, userIp, rating]
    );
    res.status(201).json({ message: 'Rating saved successfully' });
  } catch (error) {
    console.error('Error saving rating:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/ratings/:songId', async (req, res) => {
  const { songId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down
       FROM song_ratings WHERE song_id = $1`,
      [songId]
    );
    const counts = result.rows[0] || { thumbs_up: 0, thumbs_down: 0 };
    // Convert BigInt to Number for JSON serialization
    res.json({
      thumbs_up: Number(counts.thumbs_up),
      thumbs_down: Number(counts.thumbs_down)
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/ratings/:songId/user/:fingerprint', async (req, res) => {
  const { songId, fingerprint } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT rating FROM song_ratings WHERE song_id = $1 AND user_fingerprint = $2',
      [songId, fingerprint]
    );
    res.json({ userRating: result.rows.length > 0 ? result.rows[0].rating : null });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint for production monitoring
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.listen(port, () => {
  console.log(`RadioCalico server running at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await pool.end();
    console.log('Database pool closed.');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  try {
    await pool.end();
    console.log('Database pool closed.');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
  process.exit(0);
});