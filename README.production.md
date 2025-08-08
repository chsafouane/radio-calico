# RadioCalico Production Deployment

This document describes the production deployment setup for RadioCalico using PostgreSQL and nginx.

## Architecture

The production setup uses a multi-container Docker architecture:

- **nginx**: Web server and reverse proxy (port 80/443)
- **Node.js**: Application server (internal port 3000)
- **PostgreSQL**: Database server (internal port 5432)

## Quick Start

1. **Clone and navigate to the repository**:
   ```bash
   git clone <repository-url>
   cd radiocalico
   ```

2. **Configure environment**:
   ```bash
   cp .env.production .env
   # Edit .env and set a secure POSTGRES_PASSWORD
   ```

3. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access the application**:
   - Web interface: http://localhost
   - Health check: http://localhost/health

## Manual Deployment

### Prerequisites

- Docker and Docker Compose
- At least 1GB RAM and 2GB disk space

### Step-by-Step

1. **Build and start services**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Check service status**:
   ```bash
   docker-compose -f docker-compose.production.yml ps
   ```

3. **View logs**:
   ```bash
   docker-compose -f docker-compose.production.yml logs -f
   ```

## Database Migration

If migrating from an existing SQLite database:

1. **Place your `database.db` file in the project root**
2. **Run the migration service**:
   ```bash
   docker-compose -f docker-compose.production.yml up migration
   ```

The migration will automatically transfer all users and song ratings to PostgreSQL.

## Configuration

### Environment Variables

Key environment variables in `.env`:

```env
POSTGRES_PASSWORD=your_secure_password_here
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_DB=radiocalico
POSTGRES_USER=radiocalico_user
```

### nginx Configuration

The nginx configuration (`nginx/nginx.conf`) includes:

- Static file serving with caching
- API reverse proxy to Node.js
- Rate limiting
- Security headers
- Health checks

### PostgreSQL Configuration

The PostgreSQL setup includes:

- Optimized configuration for moderate workloads
- Connection pooling
- Performance monitoring extensions
- Automated initialization

## Management

### Start/Stop Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services
docker-compose -f docker-compose.production.yml down

# Restart specific service
docker-compose -f docker-compose.production.yml restart app
```

### Database Management

```bash
# Connect to PostgreSQL
docker-compose -f docker-compose.production.yml exec postgres psql -U radiocalico_user -d radiocalico

# Backup database
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U radiocalico_user radiocalico > backup.sql

# Restore database
docker-compose -f docker-compose.production.yml exec -T postgres psql -U radiocalico_user -d radiocalico < backup.sql
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f app
docker-compose -f docker-compose.production.yml logs -f nginx
docker-compose -f docker-compose.production.yml logs -f postgres
```

## Monitoring

### Health Checks

The application includes built-in health checks:

- **Application**: `GET /health` - Returns database connectivity status
- **nginx**: HTTP 200 response check
- **PostgreSQL**: `pg_isready` command

### Performance Monitoring

PostgreSQL is configured with `pg_stat_statements` for query performance monitoring:

```sql
-- View slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

## Security

### Production Security Checklist

- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up firewall rules
- [ ] Enable log monitoring
- [ ] Regular security updates
- [ ] Database backups

### SSL/HTTPS Setup

To enable HTTPS:

1. **Obtain SSL certificates**
2. **Uncomment HTTPS server block** in `nginx/nginx.conf`
3. **Mount certificates** in `docker-compose.production.yml`:
   ```yaml
   volumes:
     - ./ssl:/etc/nginx/ssl:ro
   ```

## Troubleshooting

### Common Issues

1. **PostgreSQL won't start**:
   ```bash
   # Check logs
   docker-compose -f docker-compose.production.yml logs postgres
   
   # Reset data (WARNING: destroys data)
   docker-compose -f docker-compose.production.yml down -v
   ```

2. **Application can't connect to database**:
   ```bash
   # Check network connectivity
   docker-compose -f docker-compose.production.yml exec app ping postgres
   
   # Verify environment variables
   docker-compose -f docker-compose.production.yml exec app env | grep POSTGRES
   ```

3. **nginx serving 502 errors**:
   ```bash
   # Check if app is running
   docker-compose -f docker-compose.production.yml ps app
   
   # Test direct app connection
   docker-compose -f docker-compose.production.yml exec app curl http://localhost:3000/health
   ```

### Performance Issues

1. **Slow database queries**:
   ```sql
   -- Check active connections
   SELECT * FROM pg_stat_activity;
   
   -- View query performance
   SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;
   ```

2. **High memory usage**:
   ```bash
   # Check container resource usage
   docker stats
   
   # Adjust PostgreSQL memory settings in docker-compose.production.yml
   ```

## Scaling

For higher traffic, consider:

1. **Horizontal scaling**: Multiple app containers behind nginx
2. **Database optimization**: Connection pooling, read replicas
3. **CDN**: For static assets
4. **Load balancing**: nginx upstream configuration

## Backup Strategy

Recommended backup approach:

```bash
# Daily database backup
0 2 * * * docker-compose -f /path/to/docker-compose.production.yml exec postgres pg_dump -U radiocalico_user radiocalico | gzip > /backup/radiocalico-$(date +%Y%m%d).sql.gz

# Keep last 30 days
find /backup -name "radiocalico-*.sql.gz" -mtime +30 -delete
```