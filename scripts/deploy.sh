#!/bin/bash

# Nutrina Deployment Script
# This script can be run manually on the VM for deployment and setup

set -e  # Exit on any error

echo "🚀 Nutrina Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the nutrina project root."
    exit 1
fi

# Function to pull latest changes
pull_changes() {
    print_status "Pulling latest changes from repository..."
    git pull origin main
    print_success "Repository updated successfully"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install --production
    print_success "Dependencies installed successfully"
}

# Function to build application
build_application() {
    print_status "Building application..."
    if npm run build --if-present; then
        print_success "Build completed successfully"
    else
        print_warning "No build script found or build failed, continuing..."
    fi
}

# Function to setup environment variables
setup_environment() {
    print_status "Checking environment configuration..."
    
    if [ -f .env ]; then
        print_success ".env file found, keeping existing configuration"
    else
        print_warning ".env file not found, creating from template..."
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from template"
            print_warning "Please update .env file with your actual values before starting the application"
        else
            print_error "No env.example found, please create .env file manually"
            exit 1
        fi
    fi
}

# Function to restart application
restart_application() {
    print_status "Restarting application with PM2..."
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
        exit 1
    fi
    
    # Restart or start the application
    if pm2 list | grep -q "nutrina"; then
        pm2 restart nutrina
        print_success "Application restarted successfully"
    else
        pm2 start npm --name "nutrina" -- start
        print_success "Application started successfully"
    fi
    
    # Save PM2 configuration
    pm2 save
    print_success "PM2 configuration saved"
}

# Function to reload nginx
reload_nginx() {
    print_status "Checking nginx configuration..."
    if sudo nginx -t; then
        sudo nginx -s reload
        print_success "Nginx reloaded successfully"
    else
        print_warning "Nginx configuration test failed, skipping reload"
    fi
}

# Function to show status
show_status() {
    print_status "Deployment completed! Current status:"
    echo ""
    pm2 status
    echo ""
    print_status "Application logs:"
    pm2 logs nutrina --lines 10
}

# Main deployment function
main() {
    print_status "Starting deployment process..."
    
    setup_git_auth
    pull_changes
    install_dependencies
    build_application
    setup_environment
    restart_application
    reload_nginx
    show_status
    
    print_success "Deployment completed successfully! 🎉"
}

# Check if script is run with arguments
if [ "$1" = "setup" ]; then
    print_status "Running setup only..."
    setup_git_auth
    setup_environment
    print_success "Setup completed!"
elif [ "$1" = "pull" ]; then
    print_status "Running pull only..."
    setup_git_auth
    pull_changes
    print_success "Pull completed!"
elif [ "$1" = "restart" ]; then
    print_status "Running restart only..."
    restart_application
    reload_nginx
    show_status
    print_success "Restart completed!"
else
    # Run full deployment
    main
fi 