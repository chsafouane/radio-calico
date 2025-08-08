const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// More robust database path logic that handles containerized environments
const dbPath = process.env.DATABASE_PATH || 
  (process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'data', 'database.db')
    : path.join(__dirname, 'database.db'));
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  
  db.run(`CREATE TABLE IF NOT EXISTS song_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    user_fingerprint TEXT NOT NULL,
    user_ip TEXT,
    rating INTEGER CHECK(rating IN (1, -1)) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, user_fingerprint)
  )`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/users', (req, res) => {
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/users', (req, res) => {
  const { username, email } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }

  db.run("INSERT INTO users (username, email) VALUES (?, ?)", [username, email], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(201).json({ 
      id: this.lastID,
      username: username,
      email: email 
    });
  });
});

app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes > 0) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// Song rating endpoints
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

app.listen(port, () => {
  console.log(`RadioCalico server running at http://localhost:${port}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});