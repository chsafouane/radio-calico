# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start server**: `npm start &` or `npm run dev` - Starts Express.js server on port 3000
- **Run in background**: Use background execution if restarting server (`npm start &`)
- **No tests configured**: The test script currently returns an error
- **Server assumes already running**: Don't restart unless necessary

## Architecture Overview

RadioCalico is a live radio streaming web application with song rating functionality. The architecture consists of:

### Backend (server.js)
- **Express.js server** serving static files from `public/` directory
- **SQLite database** (`database.db`) with two main tables:
  - `users` - User registration data (id, username, email, created_at)
  - `song_ratings` - Track ratings with fingerprinting (song_id, user_fingerprint, user_ip, rating, created_at)
- **REST API endpoints**:
  - User management: GET/POST `/users`, GET/DELETE `/users/:id`
  - Rating system: POST `/ratings`, GET `/ratings/:songId`, GET `/ratings/:songId/user/:fingerprint`

### Frontend Architecture
- **Single-page application** with HTML5 audio streaming
- **HLS.js integration** for live stream playback (`https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`)
- **Real-time metadata fetching** every 30 seconds from CloudFront endpoint
- **User fingerprinting** for anonymous rating system (canvas, WebGL, audio context, screen properties)
- **Responsive design** with CSS Grid layout (large album art + track details)

### Key Frontend Components (script.js)
- **Audio player** with HLS streaming support
- **Metadata system** fetching track info, album art, and previous tracks
- **Rating system** with thumbs up/down using generated user fingerprints
- **Album art loading** with fallback placeholder
- **Volume controls** and play/pause functionality

### Styling (style.css)
- **Brand colors** defined as CSS custom properties (mint, forest green, teal, calico orange)
- **Typography** using Montserrat (headings) and Open Sans (body)
- **Grid layout** with 400px album art and flexible track details
- **Responsive breakpoints** at 1024px, 768px, and 480px

### External Dependencies
- **HLS.js** for HTTP Live Streaming support
- **Google Fonts** (Montserrat, Open Sans)
- **CloudFront CDN** for stream, metadata, and album art

## Database Schema

```sql
users: id (PK), username (UNIQUE), email (UNIQUE), created_at
song_ratings: id (PK), song_id, user_fingerprint, user_ip, rating (1/-1), created_at
```

## Brand Guidelines
The project includes a comprehensive style guide (`RadioCalico_Style_Guide.txt`) with:
- Color palette (hex values for mint, forest green, teal, calico orange, etc.)
- Typography specifications (Montserrat for headings, Open Sans for body)
- UI component specifications (buttons, forms, audio controls)
- Layout guidelines (12-column grid, spacing multipliers)