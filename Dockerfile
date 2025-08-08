# Production Dockerfile for RadioCalico
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S radiocalico -u 1001

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY server.js ./
COPY public ./public
COPY CLAUDE.md ./

# Create database directory and set permissions
RUN mkdir -p /app/data && \
    chown -R radiocalico:nodejs /app

# Switch to non-root user
USER radiocalico

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, timeout: 2000 }; \
    const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "server.js"]