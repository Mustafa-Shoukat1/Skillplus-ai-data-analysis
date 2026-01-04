#!/bin/bash
#
# Deployment script for SkillsPulse AI Data Analysis Platform
#
# Usage:
#   ./scripts/deploy.sh [environment]
#
# Environments:
#   - development (default)
#   - staging
#   - production
#

set -e  # Exit on error
set -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT="${1:-development}"
PROJECT_NAME="skillspulse"
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" == "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

log_info "Deploying SkillsPulse in ${ENVIRONMENT} mode..."

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Check environment variables
check_env_vars() {
    log_info "Checking environment variables..."
    
    local required_vars=("SECRET_KEY" "ANTHROPIC_API_KEY")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_info "Please set these variables or create a .env file"
        exit 1
    fi
    
    log_info "Environment variables check passed"
}

# Pull latest changes (for production)
pull_latest() {
    if [ "$ENVIRONMENT" == "production" ]; then
        log_info "Pulling latest changes..."
        git pull origin main
    fi
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" build --no-cache
    else
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    fi
    
    log_info "Docker images built successfully"
}

# Stop existing containers
stop_containers() {
    log_info "Stopping existing containers..."
    
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" down --remove-orphans
    else
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    fi
    
    log_info "Containers stopped"
}

# Start containers
start_containers() {
    log_info "Starting containers..."
    
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    log_info "Containers started"
}

# Wait for services to be healthy
wait_for_health() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            log_info "Backend is healthy"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "Waiting for backend... (attempt $attempt/$max_attempts)"
        sleep 5
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Backend failed to become healthy"
        exit 1
    fi
}

# Run database migrations (if applicable)
run_migrations() {
    log_info "Running database migrations..."
    # Add migration commands here if using Alembic
    # docker compose exec backend alembic upgrade head
    log_info "Migrations complete (no migrations needed for SQLite)"
}

# Print deployment summary
print_summary() {
    log_info "Deployment complete!"
    echo ""
    echo "========================================="
    echo "  SkillsPulse Deployment Summary"
    echo "========================================="
    echo "  Environment: $ENVIRONMENT"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs:    http://localhost:8000/docs"
    echo "========================================="
    echo ""
}

# Cleanup on failure
cleanup_on_failure() {
    log_error "Deployment failed, cleaning up..."
    stop_containers
}

# Set trap for cleanup
trap cleanup_on_failure ERR

# Main deployment flow
main() {
    check_prerequisites
    
    if [ "$ENVIRONMENT" == "production" ]; then
        check_env_vars
        pull_latest
    fi
    
    stop_containers
    build_images
    start_containers
    wait_for_health
    run_migrations
    print_summary
}

# Run main function
main
