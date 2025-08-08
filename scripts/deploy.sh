#!/bin/bash

# Production deployment script for RadioCalico
# This script helps deploy the application with PostgreSQL and nginx

set -e  # Exit on any error

echo "🚀 Starting RadioCalico production deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is available"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

print_status "Docker Compose is available"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.production template..."
    cp .env.production .env
    print_warning "Please edit .env file and set a secure POSTGRES_PASSWORD"
    echo "Example: POSTGRES_PASSWORD=$(openssl rand -base64 32)"
    read -p "Press Enter to continue after updating .env file..."
fi

# Validate environment file
if grep -q "changeme_in_production" .env; then
    print_error "Please update POSTGRES_PASSWORD in .env file before deploying"
    exit 1
fi

print_status "Environment configuration validated"

# Build and start services
print_status "Building and starting services..."

# Use docker-compose or docker compose based on availability
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD -f docker-compose.production.yml down 2>/dev/null || true
$COMPOSE_CMD -f docker-compose.production.yml build --no-cache

print_status "Starting PostgreSQL database..."
$COMPOSE_CMD -f docker-compose.production.yml up -d postgres

# Wait for PostgreSQL to be healthy
print_status "Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if $COMPOSE_CMD -f docker-compose.production.yml exec -T postgres pg_isready -U radiocalico_user -d radiocalico &>/dev/null; then
        break
    fi
    sleep 1
    counter=$((counter + 1))
    echo -n "."
done

if [ $counter -eq $timeout ]; then
    print_error "PostgreSQL failed to start within $timeout seconds"
    exit 1
fi

print_status "PostgreSQL is ready"

# Run migration if SQLite database exists
if [ -f database.db ]; then
    print_status "Found SQLite database. Running migration to PostgreSQL..."
    $COMPOSE_CMD -f docker-compose.production.yml up migration
    print_status "Migration completed"
fi

# Start application and nginx
print_status "Starting application and nginx..."
$COMPOSE_CMD -f docker-compose.production.yml up -d app nginx

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
if $COMPOSE_CMD -f docker-compose.production.yml ps | grep -q "unhealthy"; then
    print_error "Some services are unhealthy. Check logs:"
    $COMPOSE_CMD -f docker-compose.production.yml logs --tail=20
    exit 1
fi

print_status "All services are running and healthy"

# Display deployment information
echo ""
echo "🎉 RadioCalico has been deployed successfully!"
echo ""
echo "Services:"
echo "• Web Server: http://localhost (nginx)"
echo "• API Health Check: http://localhost/health"
echo "• PostgreSQL: localhost:5432"
echo ""
echo "Management commands:"
echo "• View logs: $COMPOSE_CMD -f docker-compose.production.yml logs -f"
echo "• Stop services: $COMPOSE_CMD -f docker-compose.production.yml down"
echo "• Restart services: $COMPOSE_CMD -f docker-compose.production.yml restart"
echo "• View status: $COMPOSE_CMD -f docker-compose.production.yml ps"
echo ""

# Optional: Run health check
if command -v curl &> /dev/null; then
    if curl -s http://localhost/health | grep -q "ok"; then
        print_status "Health check passed"
    else
        print_warning "Health check failed - services may still be starting"
    fi
fi