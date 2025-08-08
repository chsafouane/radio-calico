-- PostgreSQL database initialization script for RadioCalico
-- This script sets up the production database schema

-- Create database (run separately by DBA or Docker entrypoint)
-- CREATE DATABASE radiocalico;
-- CREATE USER radiocalico_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE radiocalico TO radiocalico_user;

-- Connect to radiocalico database before running the following:

-- Enable UUID extension for better primary keys (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Song ratings table
CREATE TABLE IF NOT EXISTS song_ratings (
    id SERIAL PRIMARY KEY,
    song_id VARCHAR(255) NOT NULL,
    user_fingerprint VARCHAR(500) NOT NULL,
    user_ip INET,
    rating INTEGER CHECK(rating IN (1, -1)) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(song_id, user_fingerprint)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_song_ratings_song_id ON song_ratings(song_id);
CREATE INDEX IF NOT EXISTS idx_song_ratings_fingerprint ON song_ratings(user_fingerprint);
CREATE INDEX IF NOT EXISTS idx_song_ratings_created_at ON song_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add some constraints and comments for better database documentation
COMMENT ON TABLE users IS 'Registered users of the RadioCalico application';
COMMENT ON TABLE song_ratings IS 'User ratings for songs with fingerprint-based anonymous tracking';
COMMENT ON COLUMN song_ratings.rating IS 'Song rating: 1 for thumbs up, -1 for thumbs down';
COMMENT ON COLUMN song_ratings.user_fingerprint IS 'Browser fingerprint for anonymous user tracking';
COMMENT ON COLUMN song_ratings.user_ip IS 'User IP address for additional tracking (stored as INET type)';