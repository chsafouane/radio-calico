# RadioCalico 🎵

A modern live radio streaming web application with real-time song rating functionality. RadioCalico provides a seamless listening experience with interactive features that let users rate tracks as they play.

![RadioCalico Logo](RadioCalicoLogoTM.png)

## ✨ Features

- **Live HLS Streaming** - High-quality audio streaming using HLS.js
- **Real-time Metadata** - Automatic track information and album art updates
- **Song Rating System** - Thumbs up/down rating with anonymous user fingerprinting
- **Responsive Design** - Beautiful interface that works on all devices
- **User Management** - Registration and user tracking system
- **Track History** - View previously played songs
- **Volume Controls** - Intuitive audio controls with mute functionality

## 🚀 Quick Start

### Prerequisites

- Node.js (v12 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/chsafouane/radio-calico.git
cd radio-calico
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

### Development

For development with auto-restart:
```bash
npm run dev
```

## 🐳 Docker Deployment

RadioCalico includes Docker support for both development and production environments.

### Production Deployment

**Using Docker Compose (Recommended):**
```bash
# Build and start the production container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

**Using Docker directly:**
```bash
# Build the production image
docker build -t radiocalico:prod .

# Run the production container
docker run -d -p 3000:3000 --name radiocalico \
  -v radiocalico_data:/app/data \
  radiocalico:prod
```

### Development with Docker

**Using Docker Compose:**
```bash
# Build and start the development container
docker-compose -f docker-compose.dev.yml up

# For background execution
docker-compose -f docker-compose.dev.yml up -d
```

**Using Docker directly:**
```bash
# Build the development image
docker build -f Dockerfile.dev -t radiocalico:dev .

# Run the development container with hot reload
docker run -p 3000:3000 -p 9229:9229 \
  -v $(pwd):/app \
  -v /app/node_modules \
  radiocalico:dev
```

### Docker Features

- **Production**: Optimized Alpine Linux image with security hardening
- **Development**: Full development environment with debugging support
- **Persistent Data**: Database stored in Docker volumes
- **Health Checks**: Built-in container health monitoring
- **Security**: Non-root user execution in production

## 🏗️ Architecture

### Backend (Express.js)
- **Server**: Express.js serving static files and REST API
- **Database**: SQLite with user management and rating system
- **Port**: 3000 (configurable)

### Frontend
- **Audio Streaming**: HLS.js integration for live radio
- **Metadata**: Real-time track information fetching
- **Fingerprinting**: Anonymous user identification for ratings
- **Responsive UI**: CSS Grid layout with mobile optimization

### External Services
- **Stream URL**: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`
- **CDN**: CloudFront for metadata and album art delivery
- **Fonts**: Google Fonts (Montserrat, Open Sans)

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Song Ratings Table
```sql
CREATE TABLE song_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    user_fingerprint TEXT NOT NULL,
    user_ip TEXT,
    rating INTEGER NOT NULL, -- 1 for thumbs up, -1 for thumbs down
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Design System

RadioCalico follows a cohesive design system with:

- **Colors**: Mint green, forest green, teal, and calico orange accents
- **Typography**: Montserrat for headings, Open Sans for body text  
- **Layout**: 12-column responsive grid system
- **Components**: Consistent button styles, form elements, and audio controls

See `RadioCalico_Style_Guide.txt` for complete design specifications.

## 📡 API Endpoints

### Users
- `GET /users` - Get all users
- `POST /users` - Create new user
- `GET /users/:id` - Get user by ID
- `DELETE /users/:id` - Delete user

### Ratings
- `POST /ratings` - Submit song rating
- `GET /ratings/:songId` - Get ratings for specific song
- `GET /ratings/:songId/user/:fingerprint` - Get user's rating for song

## 🛠️ Technologies Used

### Backend
- **Express.js** - Web framework
- **SQLite3** - Database
- **Body-parser** - Request parsing
- **CORS** - Cross-origin resource sharing

### Frontend
- **HLS.js** - HTTP Live Streaming
- **Vanilla JavaScript** - No framework dependencies
- **CSS Grid** - Layout system
- **Canvas/WebGL** - User fingerprinting

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Stream Configuration
The live stream URL can be modified in `script.js`:
```javascript
const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
```

## 📱 Responsive Breakpoints

- **Large screens**: 1200px+
- **Desktop**: 1024px - 1199px  
- **Tablet**: 768px - 1023px
- **Mobile**: < 768px

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🎵 About RadioCalico

RadioCalico is designed to create an engaging radio listening experience that combines the simplicity of traditional radio with modern web technologies and interactive features. The platform focuses on user engagement through real-time ratings while maintaining privacy through anonymous fingerprinting.

---

**Live Stream**: [Listen Now](https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8)  
**Repository**: [GitHub](https://github.com/chsafouane/radio-calico)