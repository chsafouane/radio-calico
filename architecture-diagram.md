# RadioCalico Architecture Diagram

## System Architecture Overview

```mermaid
graph TB
    %% External Services
    subgraph "External CDN & Services"
        CF[CloudFront CDN<br/>Live Stream & Metadata]
        GFONTS[Google Fonts<br/>Montserrat & Open Sans]
        HLSCDN[jsdelivr CDN<br/>HLS.js v1.5.13]
    end

    %% Client Browser
    subgraph "Client Browser"
        subgraph "Frontend Application"
            HTML[index.html<br/>📱 Responsive Layout]
            CSS[style.css<br/>🎨 Brand Styling]
            JS[script.js<br/>⚡ Optimized Performance]
        end
        
        subgraph "Browser Storage"
            LS[localStorage<br/>🔐 Fingerprint Cache<br/>⏱️ 24h Expiration]
        end
        
        subgraph "Media Player"
            AUDIO[HTML5 Audio Element]
            HLS[HLS.js Player<br/>📺 Live Streaming]
        end
    end

    %% Backend Server
    subgraph "RadioCalico Server"
        subgraph "Express.js Application"
            SERVER[server.js<br/>🚀 Node.js + Express]
            STATIC[Static File Server<br/>📁 /public]
        end
        
        subgraph "API Endpoints"
            USERS_API[👥 Users API<br/>GET/POST/DELETE]
            RATINGS_API[⭐ Ratings API<br/>Song Rating System]
        end
        
        subgraph "Database"
            SQLITE[(SQLite Database<br/>🗄️ users + song_ratings)]
        end
    end

    %% Data Flow Connections
    CF -->|🎵 Live Stream<br/>metadatav2.json<br/>cover.jpg| HLS
    CF -->|📊 Metadata API| JS
    GFONTS -->|🔤 Font Files| CSS
    HLSCDN -->|📦 HLS.js Library| JS
    
    HTML --> CSS
    HTML --> JS
    JS --> AUDIO
    JS --> HLS
    JS --> LS
    
    JS -->|🔍 User Fingerprint<br/>Rating Requests| RATINGS_API
    JS -->|👤 User Management| USERS_API
    
    USERS_API --> SQLITE
    RATINGS_API --> SQLITE
    
    SERVER --> STATIC
    STATIC --> HTML

    %% Styling
    classDef external fill:#e1f5fe,stroke:#01579b,color:#000
    classDef frontend fill:#f3e5f5,stroke:#4a148c,color:#000
    classDef backend fill:#e8f5e8,stroke:#1b5e20,color:#000
    classDef database fill:#fff3e0,stroke:#e65100,color:#000
    classDef storage fill:#fce4ec,stroke:#880e4f,color:#000

    class CF,GFONTS,HLSCDN external
    class HTML,CSS,JS,AUDIO,HLS frontend
    class SERVER,STATIC,USERS_API,RATINGS_API backend
    class SQLITE database
    class LS storage
```

## Component Data Flow

```mermaid
sequenceDiagram
    participant User as 👤 User Browser
    participant App as 📱 Frontend App
    participant Server as 🚀 Express Server
    participant DB as 🗄️ SQLite Database
    participant CDN as ☁️ CloudFront CDN

    Note over User,CDN: Initial Page Load & Setup
    User->>App: Visit RadioCalico
    App->>Server: GET /
    Server->>App: index.html + assets
    App->>CDN: Load Google Fonts
    App->>CDN: Load HLS.js v1.5.13
    
    Note over User,CDN: Audio Stream Setup
    App->>CDN: GET live.m3u8
    CDN->>App: HLS Stream Manifest
    App->>User: Display Player Interface
    
    Note over User,CDN: Metadata & Content Updates
    loop Every 30 seconds
        App->>CDN: GET metadatav2.json
        CDN->>App: Current Track Info
        App->>CDN: GET cover.jpg (cached)
        App->>User: Update Now Playing
    end
    
    Note over User,DB: User Interaction & Rating
    User->>App: Rate Song (👍/👎)
    App->>App: Check localStorage for fingerprint
    alt Fingerprint cached
        App->>App: Use cached fingerprint
    else Generate new fingerprint
        App->>App: Generate fingerprint (Canvas, WebGL, etc.)
        App->>App: Cache in localStorage (24h)
    end
    
    App->>Server: POST /ratings {songId, rating, fingerprint}
    Server->>DB: INSERT/UPDATE song_rating
    DB->>Server: Rating saved
    Server->>App: Success response
    App->>User: Update rating display
```

## Performance Optimizations Flow

```mermaid
graph LR
    subgraph "Performance Optimizations"
        subgraph "Resource Loading"
            PRECONNECT[🔗 Preconnect Hints<br/>fonts.googleapis.com<br/>fonts.gstatic.com<br/>CloudFront CDN]
            DNSPREFETCH[🌐 DNS Prefetch<br/>jsdelivr CDN]
            SRI[🔒 Subresource Integrity<br/>HLS.js hash verification]
        end
        
        subgraph "Caching Strategy"
            FP_CACHE[💾 Fingerprint Cache<br/>24h localStorage<br/>Avoids expensive regeneration]
            IMG_CACHE[🖼️ Optimized Images<br/>ETag-based caching<br/>Lazy loading]
        end
        
        subgraph "Rendering Performance"
            GPU[⚡ GPU Acceleration<br/>transform: translateZ(0)]
            CONTAIN[📦 CSS Containment<br/>layout style paint]
            FONT_SWAP[🔤 Font Display Swap<br/>Fallback fonts]
        end
    end

    PRECONNECT -->|Faster Connection| CF
    DNSPREFETCH -->|Reduced Latency| HLSCDN
    SRI -->|Secure Loading| JS
    FP_CACHE -->|Instant Load| JS
    IMG_CACHE -->|Better Caching| CF
    GPU -->|Smooth Rendering| CSS
    CONTAIN -->|Optimized Layout| CSS
    FONT_SWAP -->|Better UX| GFONTS
```

## Technology Stack

```mermaid
mindmap
  root)RadioCalico Tech Stack(
    Frontend
      HTML5
        Semantic Structure
        Responsive Design
      CSS3
        Custom Properties
        Grid Layout
        Performance Optimizations
      JavaScript ES6+
        HLS.js Integration
        User Fingerprinting
        Performance Caching
      
    Backend
      Node.js
        Express.js Framework
        Static File Serving
      SQLite Database
        Users Table
        Song Ratings Table
      REST API
        User Management
        Rating System
        
    External Services
      CloudFront CDN
        Live Stream (HLS)
        Metadata API
        Album Art
      Google Fonts
        Montserrat
        Open Sans
      jsdelivr CDN
        HLS.js Library
        
    Performance
      Resource Hints
        Preconnect
        DNS Prefetch
      Caching
        localStorage
        Browser Cache
      Optimization
        Lazy Loading
        GPU Acceleration
```