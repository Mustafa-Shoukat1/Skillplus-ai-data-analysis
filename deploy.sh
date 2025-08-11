```bash#!/bin/bash

```print_step "Deployment script completed"deploy_application# Build and deploy the applicationprint_step "Starting deployment script"# Main script execution}    print_step "Application build and deployment completed"        fi        print_error "Containers failed to start properly"    else        sleep 30        sudo docker-compose restart        print_status "Restarting containers to ensure fresh state..."        # Restart containers to ensure environment variables are loaded        " 2>/dev/null || print_warning "Database initialization attempted with fallback"    print('Basic database created')    conn.close()    conn.execute('CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)')    conn = sqlite3.connect('/app/data/database.db')    os.makedirs('/app/data', exist_ok=True)    import os    import sqlite3    # Try alternative initialization    print(f'Database initialization error: {e}')except Exception as e:    print('Database initialized successfully')    init_db()    from api.core.database import init_dbtry:        sudo docker-compose exec -T api-service python -c "        print_status "Initializing database with correct schema..."        # Initialize database with proper schema    if sudo docker-compose ps | grep -q "Up"; then    # Check if containers are running before attempting database operations        sleep 60    print_status "Waiting for services to be healthy..."    # Wait for services to be healthy    sudo docker-compose up -d    print_status "Starting the application..."    # Start the application        sudo docker-compose build --no-cache    print_status "Building Docker images..."    # Build the images        sudo rm -f ./data/*.db* ./database/*.db* || true    print_status "Resetting database to fix schema issues..."    # Remove old database files to force schema recreation        sudo docker system prune -f    sudo docker-compose down --remove-orphans    print_status "Cleaning up existing containers and images..."    # Clean up any existing containers and images        chmod 755 data database logs    mkdir -p data database logs    print_status "Creating necessary directories..."    # Create necessary directories        cd "$PROJECT_DIR"        print_step "Building and deploying the application..."deploy_application() {# Build and deploy with Docker}    echo -e "${YELLOW_COLOR}[WARNING] $1${RESET_COLOR}"print_warning() {# Print warning message}    echo -e "${RED_COLOR}[ERROR] $1${RESET_COLOR}"print_error() {# Print error message}    echo -e "${YELLOW_COLOR}[STATUS] $1${RESET_COLOR}"print_status() {# Print status message}    echo -e "${GREEN_COLOR}[STEP] $1...${RESET_COLOR}"print_step() {# Print step messagePROJECT_DIR="/home/mrqadeer/projects/email-spam-classifier"# Project directoryRED_COLOR="\033[31m"YELLOW_COLOR="\033[33m"GREEN_COLOR="\033[32m"RESET_COLOR="\033[0m"# Define colors for output#!/bin/bash
# Email Spam Classifier - Complete Deployment Script
# This script handles the complete deployment with Docker and auto-startup

set -e  # Exit on any error
PROJECT_DIR="/home/apple/ai-data-analysis"
SERVICE_NAME="skill-pulse"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to check if running as root for certain operations
check_sudo() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root. Run as regular user."
        exit 1
    fi
}

# Stop any existing services
stop_existing_services() {
    print_step "Stopping any existing services..."
    
    # Stop existing Docker containers
    if docker ps -q &> /dev/null; then
        print_status "Stopping existing Docker containers..."
        cd "$PROJECT_DIR"
        docker compose down 2>/dev/null || true
    fi
    
    print_status "Existing services stopped."
}

# Build and deploy with Docker
deploy_application() {
    print_step "Building and deploying the application..."
    
    cd "$PROJECT_DIR"
    
    # Clean up any existing containers and images
    print_status "Cleaning up existing containers and images..."
    sudo docker compose down

    sudo docker compose build

    # Start the application
    print_status "Starting the application..."
    sudo docker compose up -d

    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 60
    
    # Restart containers to ensure environment variables are loaded
    print_status "Restarting containers to ensure fresh state..."
    sudo docker compose restart
    sleep 30
    
    # Configure nginx
    print_status "Configuring nginx..."
    
    # Remove any existing configurations that might conflict
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo rm -f /etc/nginx/sites-enabled/skill-pulse
    sudo rm -f /etc/nginx/sites-available/skill-pulse
    
    # Copy and enable new configuration
    sudo cp "$PROJECT_DIR/nginx/nginx.conf" /etc/nginx/sites-available/skill-pulse
    sudo ln -sf /etc/nginx/sites-available/skill-pulse /etc/nginx/sites-enabled/skill-pulse
    
    # Test nginx configuration
    if sudo nginx -t; then
        print_status "Nginx configuration is valid"
        sudo systemctl restart nginx
        sudo systemctl enable nginx
    else
        print_error "Nginx configuration test failed"
        exit 1
    fi
    
    # Check if services are running
    if sudo docker compose ps | grep -q "Up"; then
        print_status "Application deployed successfully!"
    else
        print_error "Some services failed to start. Check logs with: docker compose logs"
        exit 1
    fi
}

# Setup auto-startup service
setup_auto_startup() {
    print_step "Setting up auto-startup service..."
    
    # Copy service file to systemd directory
    sudo cp "$PROJECT_DIR/$SERVICE_NAME.service" "/etc/systemd/system/"
    
    # Reload systemd daemon
    sudo systemctl daemon-reload
    
    # Enable the service
    sudo systemctl enable "$SERVICE_NAME.service"
    
    print_status "Auto-startup service configured successfully."
    print_warning "Note: The service is enabled but not started to avoid conflicts with current running containers."
}

# Test the deployment
test_deployment() {
    print_step "Testing the deployment..."
    
    # Test both IP and domain
    DOMAIN="skill-pulse.io"
    IP="104.154.216.61"
    
    # Test domain frontend
    print_status "Testing frontend at http://$DOMAIN/"
    if curl -f -s -H "Host: $DOMAIN" "http://$IP/" > /dev/null; then
        print_status "✓ Domain frontend is accessible"
    else
        print_warning "✗ Domain frontend test failed"
    fi
    
    # Test IP frontend  
    print_status "Testing frontend at http://$IP/"
    if curl -f -s "http://$IP/" > /dev/null; then
        print_status "✓ IP frontend is accessible"
    else
        print_warning "✗ IP frontend test failed"
    fi
    
    # Test API
    print_status "Testing API health endpoint"
    if curl -f -s "http://$IP/health" > /dev/null; then
        print_status "✓ API health check passed"
    else
        print_warning "✗ API health check failed"
    fi
}

# Show deployment status
show_deployment_info() {
    DOMAIN="skill-pulse.io"
    IP="104.154.216.61"
    
    echo ""
    echo "=========================================="
    echo "🚀 DEPLOYMENT COMPLETED SUCCESSFULLY! 🚀"
    echo "=========================================="
    echo ""
    echo "🌐 Domain URL: http://$DOMAIN/"
    echo "🔗 IP Access: http://$IP/"
    echo "📚 API Documentation: http://$DOMAIN/docs"
    echo "🔧 API Health Check: http://$DOMAIN/health"
    echo ""
    echo "⚠️  IMPORTANT: DNS Configuration Required"
    echo "   Make sure your domain $DOMAIN points to $IP"
    echo "   Add an A record: $DOMAIN -> $IP"
    echo "   Add an A record: www.$DOMAIN -> $IP"
    echo ""
    echo "🔄 Auto-startup: ENABLED"
    echo "   Your application will automatically start when the machine boots."
    echo ""
    echo "📊 Management Commands:"
    echo "   • sudo docker compose ps (show running containers)"
    echo "   • sudo docker compose logs -f (follow logs)"
    echo "   • sudo docker compose restart (restart all services)"
    echo ""
    echo "=========================================="
}

# Main deployment process
main() {
    echo ""
    echo "🚀 SkillPulse - Docker Deployment"
    echo "=============================================="
    echo ""
    
    check_sudo
    stop_existing_services
    deploy_application
    setup_auto_startup
    test_deployment
    show_deployment_info
    
    echo ""
    print_status "Deployment completed! Your application is now running and will auto-start on boot."
    print_warning "Remember to configure DNS: skill-pulse.io -> 104.154.216.61"
}

# Run main function
main "$@"
```