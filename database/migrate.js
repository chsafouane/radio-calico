const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Migration script to transfer data from SQLite to PostgreSQL
 * Run with: node database/migrate.js
 */

// Database configurations
const pgConfig = {
  user: process.env.POSTGRES_USER || 'radiocalico_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'radiocalico',
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT || 5432,
};

const sqliteDbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database.db');

async function migrateData() {
  const pgClient = new Pool(pgConfig);
  
  try {
    // Check if SQLite database exists
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('No SQLite database found at:', sqliteDbPath);
      console.log('Starting with empty PostgreSQL database...');
      await pgClient.end();
      return;
    }

    const sqliteDb = new sqlite3.Database(sqliteDbPath);
    
    console.log('Starting migration from SQLite to PostgreSQL...');
    
    // Migrate users table
    console.log('Migrating users...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM users", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const user of users) {
      await pgClient.query(
        'INSERT INTO users (id, username, email, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
        [user.id, user.username, user.email, user.created_at]
      );
    }
    console.log(`Migrated ${users.length} users`);
    
    // Migrate song_ratings table
    console.log('Migrating song ratings...');
    const ratings = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM song_ratings", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    for (const rating of ratings) {
      await pgClient.query(
        'INSERT INTO song_ratings (id, song_id, user_fingerprint, user_ip, rating, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (song_id, user_fingerprint) DO NOTHING',
        [rating.id, rating.song_id, rating.user_fingerprint, rating.user_ip, rating.rating, rating.created_at]
      );
    }
    console.log(`Migrated ${ratings.length} song ratings`);
    
    // Update sequences to match the migrated data
    if (users.length > 0) {
      const maxUserId = Math.max(...users.map(u => u.id));
      await pgClient.query(`SELECT setval('users_id_seq', $1)`, [maxUserId]);
    }
    
    if (ratings.length > 0) {
      const maxRatingId = Math.max(...ratings.map(r => r.id));
      await pgClient.query(`SELECT setval('song_ratings_id_seq', $1)`, [maxRatingId]);
    }
    
    console.log('Migration completed successfully!');
    
    // Close connections
    sqliteDb.close();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };