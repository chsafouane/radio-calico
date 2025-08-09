# RadioCalico Makefile
# Comprehensive build and deployment automation

# Variables
DOCKER_COMPOSE_DEV := docker-compose.yml
DOCKER_COMPOSE_PROD := docker-compose.production.yml
NODE_VERSION := $(shell node --version 2>/dev/null || echo "not-installed")
NPM_VERSION := $(shell npm --version 2>/dev/null || echo "not-installed")
DOCKER_VERSION := $(shell docker --version 2>/dev/null || echo "not-installed")

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

.PHONY: help install dev prod test clean build deploy status logs health check-deps lint

# Default target
help: ## Show this help message
	@echo "$(GREEN)RadioCalico - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Environment Information:$(NC)"
	@echo "  Node.js: $(NODE_VERSION)"
	@echo "  npm: $(NPM_VERSION)"
	@echo "  Docker: $(DOCKER_VERSION)"

# =============================================================================
# Development Commands
# =============================================================================

install: ## Install npm dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

dev: ## Start development server (SQLite)
	@echo "$(GREEN)Starting development server...$(NC)"
	npm run dev

dev-postgres: ## Start development server with PostgreSQL
	@echo "$(GREEN)Starting development server with PostgreSQL...$(NC)"
	npm run start:postgres

# =============================================================================
# Docker Commands  
# =============================================================================

docker-dev: ## Start development environment with Docker
	@echo "$(GREEN)Starting development Docker environment...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_DEV) up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "Access the app at: http://localhost:3000"

docker-dev-logs: ## View development Docker logs
	docker-compose -f $(DOCKER_COMPOSE_DEV) logs -f

docker-dev-stop: ## Stop development Docker environment
	@echo "$(YELLOW)Stopping development Docker environment...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_DEV) down

# =============================================================================
# Production Commands
# =============================================================================

prod: deploy ## Alias for deploy

deploy: check-env security-config ## Deploy production environment
	@echo "$(GREEN)Deploying production environment...$(NC)"
	@echo "$(YELLOW)Running pre-deployment security check...$(NC)"
	@make security-secrets || { echo "$(RED)Security check failed - deployment aborted$(NC)"; exit 1; }
	./scripts/deploy.sh

deploy-manual: check-env ## Manual production deployment
	@echo "$(GREEN)Starting manual production deployment...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) down 2>/dev/null || true
	docker-compose -f $(DOCKER_COMPOSE_PROD) build --no-cache
	docker-compose -f $(DOCKER_COMPOSE_PROD) up -d postgres
	@echo "$(YELLOW)Waiting for PostgreSQL to be ready...$(NC)"
	@timeout 60 bash -c 'until docker-compose -f $(DOCKER_COMPOSE_PROD) exec postgres pg_isready -U radiocalico_user -d radiocalico; do sleep 1; done'
	docker-compose -f $(DOCKER_COMPOSE_PROD) up -d app nginx
	@echo "$(GREEN)Production environment deployed!$(NC)"
	@make status

prod-logs: ## View production logs
	docker-compose -f $(DOCKER_COMPOSE_PROD) logs -f

prod-stop: ## Stop production environment
	@echo "$(YELLOW)Stopping production environment...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) down

prod-restart: ## Restart production services
	@echo "$(YELLOW)Restarting production services...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) restart

# =============================================================================
# Database Commands
# =============================================================================

db-migrate: ## Run database migration from SQLite to PostgreSQL
	@echo "$(GREEN)Running database migration...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) up migration
	@echo "$(GREEN)Migration completed!$(NC)"

db-backup: ## Backup production PostgreSQL database
	@echo "$(GREEN)Creating database backup...$(NC)"
	mkdir -p backups
	docker-compose -f $(DOCKER_COMPOSE_PROD) exec postgres pg_dump -U radiocalico_user radiocalico | gzip > backups/radiocalico-$(shell date +%Y%m%d-%H%M%S).sql.gz
	@echo "$(GREEN)Database backed up to backups/ directory$(NC)"

db-restore: ## Restore database from backup (requires BACKUP_FILE variable)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Error: Please specify BACKUP_FILE variable$(NC)"; \
		echo "Usage: make db-restore BACKUP_FILE=backups/radiocalico-20250809-010000.sql.gz"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(BACKUP_FILE)...$(NC)"
	gunzip -c $(BACKUP_FILE) | docker-compose -f $(DOCKER_COMPOSE_PROD) exec -T postgres psql -U radiocalico_user -d radiocalico
	@echo "$(GREEN)Database restored successfully!$(NC)"

db-shell: ## Connect to production PostgreSQL shell
	docker-compose -f $(DOCKER_COMPOSE_PROD) exec postgres psql -U radiocalico_user -d radiocalico

db-reset: ## Reset production database (WARNING: DESTRUCTIVE)
	@echo "$(RED)WARNING: This will destroy all data in the production database!$(NC)"
	@read -p "Are you sure? [y/N]: " confirm && [ "$$confirm" = "y" ]
	docker-compose -f $(DOCKER_COMPOSE_PROD) down -v
	docker-compose -f $(DOCKER_COMPOSE_PROD) up -d postgres
	@echo "$(GREEN)Database reset completed!$(NC)"

# =============================================================================
# Testing Commands
# =============================================================================

test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	npm test

test-backend: ## Run backend tests only
	npm run test:backend

test-frontend: ## Run frontend tests only  
	npm run test:frontend

test-coverage: ## Run tests with coverage report
	npm run test:coverage

test-watch: ## Run tests in watch mode
	npm run test:watch

# =============================================================================
# Build and Quality Commands
# =============================================================================

build: ## Build production Docker images
	@echo "$(GREEN)Building production Docker images...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) build --no-cache

lint: ## Run code linting (if configured)
	@echo "$(GREEN)Running code linting...$(NC)"
	@if [ -f .eslintrc.js ] || [ -f .eslintrc.json ]; then \
		npx eslint . --ext .js; \
	else \
		echo "$(YELLOW)No ESLint configuration found, skipping...$(NC)"; \
	fi

format: ## Format code (if prettier is configured)
	@if [ -f .prettierrc ] || [ -f prettier.config.js ]; then \
		npx prettier --write .; \
	else \
		echo "$(YELLOW)No Prettier configuration found, skipping...$(NC)"; \
	fi

# =============================================================================
# Security Commands
# =============================================================================

security: ## Run comprehensive security checks
	@echo "$(GREEN)Running comprehensive security checks...$(NC)"
	./scripts/security-check.sh

security-deps: ## Check for dependency vulnerabilities
	@echo "$(GREEN)Checking dependency vulnerabilities...$(NC)"
	npm audit --audit-level high

security-docker: ## Run Docker security scans
	@echo "$(GREEN)Running Docker security scans...$(NC)"
	./scripts/docker-security-scan.sh

security-secrets: ## Check for exposed secrets and credentials
	@echo "$(GREEN)Scanning for exposed secrets...$(NC)"
	@echo "Checking for hardcoded credentials..."
	@! grep -r -i -E "(password|secret|key|token|api_key)\s*[=:]\s*['\"][^'\"]{8,}['\"]" \
		--include="*.js" --include="*.json" --exclude-dir=node_modules . || \
		{ echo "$(RED)Potential hardcoded secrets found!$(NC)"; exit 1; }
	@echo "$(GREEN)No obvious hardcoded secrets found$(NC)"

security-config: ## Validate security configuration
	@echo "$(GREEN)Validating security configuration...$(NC)"
	@echo "Checking .env file security..."
	@if [ -f .env ]; then \
		if grep -q "your_secure_password_here\|changeme\|password123" .env; then \
			echo "$(RED)Weak passwords found in .env file$(NC)"; exit 1; \
		else \
			echo "$(GREEN).env file appears secure$(NC)"; \
		fi; \
	else \
		echo "$(YELLOW).env file not found$(NC)"; \
	fi
	@echo "Checking nginx security headers..."
	@if [ -f nginx/nginx.conf ]; then \
		if grep -q "X-Frame-Options\|X-Content-Type-Options\|X-XSS-Protection" nginx/nginx.conf; then \
			echo "$(GREEN)nginx security headers configured$(NC)"; \
		else \
			echo "$(RED)nginx missing security headers$(NC)"; exit 1; \
		fi; \
	fi

security-fix: ## Attempt to fix known security issues
	@echo "$(GREEN)Attempting to fix security issues...$(NC)"
	npm audit fix --force
	@echo "$(YELLOW)Review changes and test thoroughly after auto-fixes$(NC)"

security-report: ## Generate detailed security report
	@echo "$(GREEN)Generating security report...$(NC)"
	@mkdir -p reports
	@echo "# RadioCalico Security Report" > reports/security-report.md
	@echo "Generated: $(shell date)" >> reports/security-report.md
	@echo "" >> reports/security-report.md
	@echo "## Dependency Vulnerabilities" >> reports/security-report.md
	@npm audit --json 2>/dev/null | jq -r '.vulnerabilities | keys[]' >> reports/security-report.md 2>/dev/null || echo "No npm vulnerabilities found" >> reports/security-report.md
	@echo "" >> reports/security-report.md
	@echo "## Configuration Security" >> reports/security-report.md
	@./scripts/security-check.sh >> reports/security-report.md 2>/dev/null || echo "Security check script not available" >> reports/security-report.md
	@echo "$(GREEN)Security report generated: reports/security-report.md$(NC)"

# =============================================================================
# Monitoring and Status Commands
# =============================================================================

status: ## Show status of all services
	@echo "$(GREEN)Service Status:$(NC)"
	@if [ -f $(DOCKER_COMPOSE_PROD) ]; then \
		docker-compose -f $(DOCKER_COMPOSE_PROD) ps; \
	else \
		echo "$(YELLOW)Production compose file not found$(NC)"; \
	fi

health: ## Check health of all services
	@echo "$(GREEN)Health Checks:$(NC)"
	@echo -n "Application: "
	@curl -s http://localhost/health >/dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "Web Server: "
	@curl -s -o /dev/null -w "%{http_code}" http://localhost >/dev/null && echo "$(GREEN)✓ Accessible$(NC)" || echo "$(RED)✗ Not accessible$(NC)"

logs: prod-logs ## Alias for prod-logs

logs-app: ## View application logs only
	docker-compose -f $(DOCKER_COMPOSE_PROD) logs -f app

logs-nginx: ## View nginx logs only
	docker-compose -f $(DOCKER_COMPOSE_PROD) logs -f nginx

logs-postgres: ## View PostgreSQL logs only
	docker-compose -f $(DOCKER_COMPOSE_PROD) logs -f postgres

# =============================================================================
# Utility Commands
# =============================================================================

clean: ## Clean up Docker resources and temporary files
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	docker system prune -f
	@echo "$(YELLOW)Cleaning up node_modules...$(NC)"
	rm -rf node_modules
	@echo "$(YELLOW)Cleaning up coverage reports...$(NC)"
	rm -rf coverage
	@echo "$(GREEN)Cleanup completed!$(NC)"

clean-all: ## Deep clean - remove all Docker images and volumes
	@echo "$(RED)WARNING: This will remove all Docker images and volumes!$(NC)"
	@read -p "Are you sure? [y/N]: " confirm && [ "$$confirm" = "y" ]
	docker-compose -f $(DOCKER_COMPOSE_PROD) down -v --rmi all
	docker-compose -f $(DOCKER_COMPOSE_DEV) down -v --rmi all 2>/dev/null || true
	docker system prune -a -f --volumes

setup-env: ## Create .env file from template
	@if [ ! -f .env ]; then \
		echo "$(GREEN)Creating .env file from template...$(NC)"; \
		cp .env.production .env; \
		echo "$(YELLOW)Please edit .env file and set POSTGRES_PASSWORD$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists$(NC)"; \
	fi

check-env: ## Check if required environment variables are set
	@if [ ! -f .env ]; then \
		echo "$(RED)Error: .env file not found$(NC)"; \
		echo "Run 'make setup-env' to create one"; \
		exit 1; \
	fi
	@if grep -q "your_secure_password_here" .env 2>/dev/null; then \
		echo "$(RED)Error: Please set POSTGRES_PASSWORD in .env file$(NC)"; \
		exit 1; \
	fi

check-deps: ## Check if required dependencies are installed
	@echo "$(GREEN)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is not installed$(NC)"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)Docker is not installed$(NC)"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "$(RED)Docker is not running$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "$(RED)Docker Compose is not available$(NC)"; exit 1; }
	@echo "$(GREEN)All dependencies are available!$(NC)"

# =============================================================================
# Development Shortcuts
# =============================================================================

start: dev ## Alias for dev

stop: prod-stop ## Stop all services

restart: prod-restart ## Restart production services

update: ## Update dependencies and rebuild
	@echo "$(GREEN)Updating dependencies...$(NC)"
	npm update
	@echo "$(GREEN)Rebuilding containers...$(NC)"
	docker-compose -f $(DOCKER_COMPOSE_PROD) build --no-cache

# =============================================================================
# CI/CD Commands
# =============================================================================

ci-test: ## Run tests suitable for CI environment
	npm ci
	npm run test:coverage

ci-build: ## Build for CI environment
	docker-compose -f $(DOCKER_COMPOSE_PROD) build

ci-security: ## Run security checks for CI/CD pipeline
	@echo "$(GREEN)Running CI security checks...$(NC)"
	npm audit --audit-level high
	@echo "Checking for secrets..."
	@! grep -r -i -E "(password|secret|key|token|api_key)\s*[=:]\s*['\"][^'\"]{8,}['\"]" \
		--include="*.js" --include="*.json" --exclude-dir=node_modules . || exit 1
	./scripts/security-check.sh

# =============================================================================
# Quick Start Commands
# =============================================================================

quickstart: check-deps setup-env install ## Complete setup for new developers
	@echo "$(GREEN)🎉 RadioCalico setup completed!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "1. Edit .env file and set POSTGRES_PASSWORD"
	@echo "2. Run 'make security' to check security configuration"
	@echo "3. Run 'make deploy' for production or 'make dev' for development"
	@echo "4. Access the app at http://localhost"

info: ## Show project information
	@echo "$(GREEN)RadioCalico - Live Radio Streaming Application$(NC)"
	@echo ""
	@echo "Architecture:"
	@echo "  • Frontend: HTML5 Audio with HLS.js streaming"
	@echo "  • Backend: Node.js with Express"
	@echo "  • Database: PostgreSQL (production) / SQLite (development)"
	@echo "  • Web Server: nginx (production reverse proxy)"
	@echo ""
	@echo "Key Features:"
	@echo "  • Live radio streaming with metadata"
	@echo "  • Anonymous song rating system"
	@echo "  • User management"
	@echo "  • Real-time track information"
	@echo ""
	@echo "For help: make help"