#!/bin/bash

# RadioCalico Security Check Script
# Comprehensive security validation for the application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
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

# Header
echo -e "${BLUE}🔒 RadioCalico Security Check${NC}"
echo "==============================="
echo ""

# 1. Dependency Vulnerability Checks
echo -e "${BLUE}📦 Dependency Security Checks${NC}"
echo "--------------------------------"
((TOTAL_CHECKS++))

if check_command npm; then
    echo "Running npm audit..."
    if npm audit --audit-level high; then
        print_status "No high-severity vulnerabilities found in npm dependencies"
    else
        print_error "High-severity vulnerabilities found in npm dependencies"
        echo "Run 'npm audit fix' to resolve issues"
    fi
else
    print_warning "npm not available - skipping dependency audit"
fi

# 2. Environment Security Checks
echo ""
echo -e "${BLUE}🔧 Environment Configuration Security${NC}"
echo "----------------------------------------"

# Check .env file security
((TOTAL_CHECKS++))
if [ -f .env ]; then
    if grep -q "your_secure_password_here\|changeme\|password123\|admin\|test" .env; then
        print_error ".env contains default/weak passwords"
    else
        print_status ".env does not contain obvious weak passwords"
    fi
    
    # Check file permissions
    ENV_PERMS=$(stat -f "%A" .env 2>/dev/null || stat -c "%a" .env 2>/dev/null)
    if [ "$ENV_PERMS" = "600" ] || [ "$ENV_PERMS" = "400" ]; then
        print_status ".env file has secure permissions ($ENV_PERMS)"
    else
        print_warning ".env file permissions are $ENV_PERMS (recommend 600)"
    fi
else
    print_warning ".env file not found"
fi

# Check for secrets in git
((TOTAL_CHECKS++))
echo "Checking for potential secrets in git history..."
if git log --all --full-history -- .env .env.production 2>/dev/null | grep -q "commit"; then
    print_error "Environment files may be tracked in git history"
    echo "  Consider using git filter-branch or BFG to remove secrets"
else
    print_status "No environment files found in git history"
fi

# 3. Docker Security Checks
echo ""
echo -e "${BLUE}🐳 Docker Security Checks${NC}"
echo "----------------------------"

if check_command docker; then
    # Check if running as non-root in containers
    ((TOTAL_CHECKS++))
    if grep -q "USER" Dockerfile* 2>/dev/null; then
        print_status "Dockerfiles use non-root users"
    else
        print_error "Dockerfiles may be running as root user"
    fi
    
    # Check for hardcoded secrets in Dockerfiles
    ((TOTAL_CHECKS++))
    if grep -i -E "(password|secret|key|token).*=" Dockerfile* 2>/dev/null; then
        print_error "Potential hardcoded secrets found in Dockerfiles"
    else
        print_status "No obvious hardcoded secrets in Dockerfiles"
    fi
    
    # Check Docker image security if images exist
    ((TOTAL_CHECKS++))
    if docker images radiocalico* --format "table {{.Repository}}" 2>/dev/null | grep -q radiocalico; then
        print_info "Checking Docker images for vulnerabilities..."
        
        # Use Docker Scout if available
        if check_command docker && docker scout --help &>/dev/null; then
            echo "Running Docker Scout security scan..."
            if docker scout cves radiocalico-app:latest 2>/dev/null; then
                print_status "Docker Scout scan completed"
            else
                print_warning "Docker Scout scan failed or found issues"
            fi
        else
            print_warning "Docker Scout not available - consider installing for image vulnerability scanning"
        fi
    else
        print_info "No RadioCalico Docker images found to scan"
    fi
else
    print_warning "Docker not available - skipping container security checks"
fi

# 4. Configuration Security Checks
echo ""
echo -e "${BLUE}⚙️  Configuration Security${NC}"
echo "----------------------------"

# Check nginx configuration
((TOTAL_CHECKS++))
if [ -f nginx/nginx.conf ]; then
    # Check for security headers
    if grep -q "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection" nginx/nginx.conf; then
        print_status "nginx configured with security headers"
    else
        print_error "nginx missing important security headers"
    fi
    
    # Check for SSL configuration
    if grep -q "ssl_" nginx/nginx.conf; then
        print_status "nginx has SSL configuration"
    else
        print_warning "nginx SSL not configured (consider for production)"
    fi
    
    # Check for rate limiting
    if grep -q "limit_req" nginx/nginx.conf; then
        print_status "nginx configured with rate limiting"
    else
        print_warning "nginx rate limiting not configured"
    fi
else
    print_warning "nginx configuration not found"
fi

# Check database configuration
((TOTAL_CHECKS++))
if [ -f server-postgres.js ]; then
    # Check for SQL injection protection (parameterized queries)
    if grep -q '\$[0-9]' server-postgres.js; then
        print_status "Database queries use parameterized statements"
    else
        print_warning "Database queries may not be using parameterized statements"
    fi
    
    # Check for connection limits
    if grep -q "max.*[0-9]" server-postgres.js; then
        print_status "Database connection pooling configured"
    else
        print_warning "Database connection limits not explicitly set"
    fi
else
    print_warning "PostgreSQL server configuration not found"
fi

# 5. File Permission Checks
echo ""
echo -e "${BLUE}📁 File Permission Security${NC}"
echo "--------------------------------"

((TOTAL_CHECKS++))
# Check for overly permissive files (using POSIX compliant syntax)
RISKY_FILES=$(find . -type f -perm /o+w 2>/dev/null | grep -v node_modules | head -10)
if [ -z "$RISKY_FILES" ]; then
    print_status "No world-writable files found"
else
    print_warning "Found world-writable files:"
    echo "$RISKY_FILES" | sed 's/^/    /'
fi

# Check script permissions
((TOTAL_CHECKS++))
if [ -x scripts/deploy.sh ] && [ -x scripts/security-check.sh ]; then
    print_status "Shell scripts have execute permissions"
else
    print_warning "Some shell scripts may lack execute permissions"
fi

# 6. Network Security Checks
echo ""
echo -e "${BLUE}🌐 Network Security${NC}"
echo "---------------------"

# Check for exposed services
((TOTAL_CHECKS++))
if check_command docker-compose || check_command docker; then
    print_info "Checking exposed ports in Docker configuration..."
    
    EXPOSED_PORTS=$(grep -r "ports:" docker-compose*.yml 2>/dev/null | grep -o '[0-9]*:[0-9]*' || echo "")
    if [ -n "$EXPOSED_PORTS" ]; then
        print_info "Exposed ports found:"
        echo "$EXPOSED_PORTS" | sed 's/^/    /'
        
        # Check if database port is exposed
        if echo "$EXPOSED_PORTS" | grep -q "5432:5432"; then
            print_error "PostgreSQL port 5432 is exposed - security risk!"
        else
            print_status "Database port not directly exposed"
        fi
    fi
fi

# 7. Code Security Checks
echo ""
echo -e "${BLUE}💻 Code Security Analysis${NC}"
echo "----------------------------"

# Check for hardcoded credentials
((TOTAL_CHECKS++))
POTENTIAL_SECRETS=$(grep -r -i -E "(password|secret|key|token|api_key)\s*[=:]\s*['\"][^'\"]{8,}['\"]" --include="*.js" --include="*.json" --exclude-dir=node_modules . 2>/dev/null | grep -v ".env" | head -5)
if [ -z "$POTENTIAL_SECRETS" ]; then
    print_status "No obvious hardcoded secrets found in source code"
else
    print_error "Potential hardcoded secrets found:"
    echo "$POTENTIAL_SECRETS" | sed 's/^/    /'
fi

# Check for eval() usage
((TOTAL_CHECKS++))
if grep -r "eval(" --include="*.js" --exclude-dir=node_modules . 2>/dev/null; then
    print_error "eval() usage found - potential security risk"
else
    print_status "No eval() usage found"
fi

# Check for console.log with sensitive data patterns
((TOTAL_CHECKS++))
CONSOLE_LOGS=$(grep -r "console.log.*\(password\|token\|secret\)" --include="*.js" --exclude-dir=node_modules . 2>/dev/null)
if [ -z "$CONSOLE_LOGS" ]; then
    print_status "No sensitive data in console.log statements"
else
    print_warning "Potential sensitive data in console.log:"
    echo "$CONSOLE_LOGS" | sed 's/^/    /'
fi

# 8. HTTPS and TLS Checks
echo ""
echo -e "${BLUE}🔐 HTTPS/TLS Configuration${NC}"
echo "--------------------------------"

((TOTAL_CHECKS++))
if curl -s -I http://localhost 2>/dev/null | grep -q "HTTP/"; then
    if curl -s -I https://localhost 2>/dev/null | grep -q "HTTP/"; then
        print_status "Both HTTP and HTTPS endpoints responding"
        
        # Check for HSTS headers
        if curl -s -I https://localhost 2>/dev/null | grep -i "strict-transport-security"; then
            print_status "HSTS headers configured"
        else
            print_warning "HSTS headers not found (recommend for production)"
        fi
    else
        print_warning "HTTPS not configured - HTTP only"
    fi
else
    print_info "Application not currently running - skipping HTTPS checks"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Security Check Summary${NC}"
echo "=========================="
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

# Security recommendations
if [ $FAILED_CHECKS -gt 0 ] || [ $WARNINGS -gt 3 ]; then
    echo -e "${YELLOW}🔧 Security Recommendations:${NC}"
    echo "1. Review and fix all failed security checks"
    echo "2. Set secure passwords in .env file"
    echo "3. Configure HTTPS/SSL for production"
    echo "4. Regular dependency updates: npm audit fix"
    echo "5. Use secrets management for production"
    echo "6. Enable all nginx security headers"
    echo "7. Regular security scans and updates"
    echo ""
fi

# Exit codes
if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}❌ Security check failed with $FAILED_CHECKS critical issues${NC}"
    exit 1
elif [ $WARNINGS -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Security check passed with warnings - review recommended${NC}"
    exit 2
else
    echo -e "${GREEN}✅ Security check passed successfully!${NC}"
    exit 0
fi