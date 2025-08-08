#!/bin/bash

# Docker Security Scanner for RadioCalico
# Scans Docker images and containers for security vulnerabilities

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

echo -e "${BLUE}🐳 Docker Security Scanner${NC}"
echo "=========================="
echo ""

# Check if Docker is available
if ! check_command docker; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

print_status "Docker is available and running"
echo ""

# Get list of RadioCalico images
IMAGES=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep -E "(radiocalico|postgres)" | grep -v "REPOSITORY" || echo "")

if [ -z "$IMAGES" ]; then
    print_warning "No RadioCalico or related Docker images found"
    print_info "Run 'make build' to create images first"
    exit 0
fi

print_info "Found images to scan:"
echo "$IMAGES" | sed 's/^/  /'
echo ""

# Function to scan individual image
scan_image() {
    local IMAGE=$1
    echo -e "${BLUE}Scanning image: $IMAGE${NC}"
    echo "$(printf '=%.0s' {1..50})"
    
    # 1. Check for known vulnerabilities with Docker Scout (if available)
    if docker scout --help &>/dev/null 2>&1; then
        print_info "Running Docker Scout vulnerability scan..."
        if docker scout cves "$IMAGE" --format sarif --output "/tmp/scout-$IMAGE.sarif" 2>/dev/null; then
            VULNERABILITIES=$(cat "/tmp/scout-$IMAGE.sarif" 2>/dev/null | jq -r '.runs[0].results | length' 2>/dev/null || echo "0")
            if [ "$VULNERABILITIES" -eq 0 ]; then
                print_status "No vulnerabilities found by Docker Scout"
            else
                print_warning "Found $VULNERABILITIES vulnerabilities"
            fi
            rm -f "/tmp/scout-$IMAGE.sarif"
        else
            print_warning "Docker Scout scan failed or not available for this image"
        fi
    else
        print_warning "Docker Scout not available - install with: docker scout install"
    fi
    
    # 2. Check image configuration
    print_info "Checking image configuration..."
    
    # Check if running as root
    USER_INFO=$(docker inspect "$IMAGE" --format '{{.Config.User}}' 2>/dev/null || echo "")
    if [ -z "$USER_INFO" ] || [ "$USER_INFO" = "root" ] || [ "$USER_INFO" = "0" ]; then
        print_error "Image runs as root user - security risk"
    else
        print_status "Image runs as non-root user: $USER_INFO"
    fi
    
    # Check exposed ports
    EXPOSED_PORTS=$(docker inspect "$IMAGE" --format '{{range $p, $conf := .Config.ExposedPorts}}{{$p}} {{end}}' 2>/dev/null || echo "")
    if [ -n "$EXPOSED_PORTS" ]; then
        print_info "Exposed ports: $EXPOSED_PORTS"
        # Check for risky ports
        if echo "$EXPOSED_PORTS" | grep -qE "(22/tcp|3389/tcp|5432/tcp|3306/tcp)"; then
            print_warning "Potentially risky ports exposed (SSH, RDP, or database ports)"
        fi
    fi
    
    # Check for secrets in environment variables
    ENV_VARS=$(docker inspect "$IMAGE" --format '{{range .Config.Env}}{{.}} {{end}}' 2>/dev/null || echo "")
    if echo "$ENV_VARS" | grep -qiE "(password|secret|key|token)="; then
        print_error "Potential secrets found in environment variables"
    else
        print_status "No obvious secrets in environment variables"
    fi
    
    # 3. Check image layers for sensitive files
    print_info "Checking image layers..."
    
    # Create temporary container to inspect filesystem
    CONTAINER_ID=$(docker create "$IMAGE" 2>/dev/null || echo "")
    if [ -n "$CONTAINER_ID" ]; then
        # Check for common sensitive files
        SENSITIVE_FILES=$(docker exec "$CONTAINER_ID" find / -name "*.key" -o -name "*.pem" -o -name "*password*" -o -name "*secret*" 2>/dev/null | head -10 || echo "")
        if [ -n "$SENSITIVE_FILES" ]; then
            print_warning "Potential sensitive files found:"
            echo "$SENSITIVE_FILES" | sed 's/^/    /'
        else
            print_status "No obvious sensitive files found"
        fi
        
        # Check file permissions
        WORLD_WRITABLE=$(docker exec "$CONTAINER_ID" find / -type f -perm +o+w 2>/dev/null | grep -v "/proc\|/dev\|/sys" | head -5 || echo "")
        if [ -n "$WORLD_WRITABLE" ]; then
            print_warning "World-writable files found:"
            echo "$WORLD_WRITABLE" | sed 's/^/    /'
        else
            print_status "No world-writable files found"
        fi
        
        docker rm "$CONTAINER_ID" >/dev/null 2>&1
    fi
    
    # 4. Check image size and layers
    SIZE=$(docker inspect "$IMAGE" --format '{{.Size}}' 2>/dev/null || echo "0")
    SIZE_MB=$((SIZE / 1024 / 1024))
    if [ "$SIZE_MB" -gt 1000 ]; then
        print_warning "Large image size: ${SIZE_MB}MB - consider optimization"
    else
        print_status "Image size is reasonable: ${SIZE_MB}MB"
    fi
    
    # Check number of layers
    LAYERS=$(docker history "$IMAGE" --format "table {{.ID}}" | wc -l)
    if [ "$LAYERS" -gt 20 ]; then
        print_warning "Many layers ($LAYERS) - consider consolidating"
    else
        print_status "Reasonable number of layers: $LAYERS"
    fi
    
    echo ""
}

# Scan each image
echo "$IMAGES" | while IFS= read -r IMAGE; do
    if [ -n "$IMAGE" ]; then
        scan_image "$IMAGE"
    fi
done

# Additional Docker security checks
echo -e "${BLUE}🔧 Docker Configuration Security${NC}"
echo "=================================="

# Check Docker daemon configuration
print_info "Checking Docker daemon security..."

# Check if Docker socket is secure
if [ -S /var/run/docker.sock ]; then
    DOCKER_PERMS=$(stat -f "%A" /var/run/docker.sock 2>/dev/null || stat -c "%a" /var/run/docker.sock 2>/dev/null || echo "unknown")
    if [ "$DOCKER_PERMS" = "660" ]; then
        print_status "Docker socket has secure permissions"
    else
        print_warning "Docker socket permissions: $DOCKER_PERMS (recommend 660)"
    fi
fi

# Check for Docker Compose security
if [ -f docker-compose.production.yml ]; then
    print_info "Checking Docker Compose configuration..."
    
    # Check for privileged containers
    if grep -q "privileged.*true" docker-compose.production.yml; then
        print_error "Privileged containers found in compose file"
    else
        print_status "No privileged containers in compose file"
    fi
    
    # Check for host network mode
    if grep -q "network_mode.*host" docker-compose.production.yml; then
        print_warning "Host network mode found - review necessity"
    else
        print_status "No host network mode usage"
    fi
    
    # Check for volume mounts
    HOST_VOLUMES=$(grep -E "^\s*-\s*/[^:]+:" docker-compose.production.yml | head -5)
    if [ -n "$HOST_VOLUMES" ]; then
        print_warning "Host filesystem volumes mounted:"
        echo "$HOST_VOLUMES" | sed 's/^/    /'
    else
        print_status "No host filesystem volumes mounted"
    fi
fi

# Check running containers security
echo ""
print_info "Checking running containers..."
RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}" | grep radiocalico | grep -v "NAMES" || echo "")

if [ -n "$RUNNING_CONTAINERS" ]; then
    echo "$RUNNING_CONTAINERS" | while IFS= read -r CONTAINER; do
        if [ -n "$CONTAINER" ]; then
            print_info "Checking container: $CONTAINER"
            
            # Check if running as root
            CONTAINER_USER=$(docker exec "$CONTAINER" whoami 2>/dev/null || echo "unknown")
            if [ "$CONTAINER_USER" = "root" ]; then
                print_error "Container $CONTAINER is running as root"
            else
                print_status "Container $CONTAINER running as: $CONTAINER_USER"
            fi
            
            # Check capabilities
            CAPABILITIES=$(docker inspect "$CONTAINER" --format '{{range .HostConfig.CapAdd}}{{.}} {{end}}' 2>/dev/null || echo "")
            if [ -n "$CAPABILITIES" ]; then
                print_warning "Additional capabilities: $CAPABILITIES"
            fi
        fi
    done
else
    print_info "No RadioCalico containers currently running"
fi

echo ""
print_status "Docker security scan completed!"

# Recommendations
echo ""
echo -e "${YELLOW}🔧 Docker Security Recommendations:${NC}"
echo "1. Keep Docker and images updated regularly"
echo "2. Use official base images when possible"
echo "3. Run containers as non-root users"
echo "4. Minimize exposed ports"
echo "5. Use Docker secrets for sensitive data"
echo "6. Regular vulnerability scanning"
echo "7. Enable Docker Content Trust for image signing"
echo "8. Use read-only containers when possible"