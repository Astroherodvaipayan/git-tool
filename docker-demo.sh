#!/bin/bash

# GitHub Repository Analyzer - Docker Demo Script
# This script demonstrates how to run the application in a Docker container

echo "=== GitHub Repository Analyzer - Docker Demo ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Docker is available
echo -e "${YELLOW}Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version 2>/dev/null)
    echo -e "${GREEN}✓ Docker is installed: $DOCKER_VERSION${NC}"
else
    echo -e "${RED}✗ Docker is not available. Please install Docker.${NC}"
    echo -e "${BLUE}Visit: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Check if Docker daemon is running
echo -e "${YELLOW}Checking Docker daemon...${NC}"
if docker info &> /dev/null; then
    echo -e "${GREEN}✓ Docker daemon is running${NC}"
else
    echo -e "${RED}✗ Docker daemon is not running. Please start Docker.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Docker is ready! Proceeding with demo...${NC}"
echo ""

# Check for environment file
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ Environment file found${NC}"
else
    echo -e "${YELLOW}! No .env.local file found. Creating a basic one...${NC}"
    cat > .env.local << EOF
# GitHub Repository Analyzer Environment Configuration
# Add your GitHub Personal Access Token for higher rate limits
GITHUB_PAT=

# Docker configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
EOF
    echo -e "${GREEN}✓ Created .env.local file. You can add your GitHub PAT later.${NC}"
fi

echo ""
echo -e "${CYAN}=== Demo Options ===${NC}"
echo "1. Build and run with Docker Compose (Recommended)"
echo "2. Build and run with Docker commands"
echo "3. Run development mode with hot-reloading"
echo "4. Show project structure"
echo "5. Exit"
echo ""

read -p "Select option (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${CYAN}=== Building and running with Docker Compose ===${NC}"
        echo -e "${YELLOW}Building the application...${NC}"
        docker-compose build
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo -e "${YELLOW}Starting the application...${NC}"
            docker-compose up -d
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Application started successfully!${NC}"
                echo ""
                echo -e "${CYAN}=== Access Information ===${NC}"
                echo -e "${BLUE}Application: http://localhost:3000${NC}"
                echo -e "${BLUE}Health Check: http://localhost:3000/api/health${NC}"
                echo ""
                echo -e "${CYAN}=== Management Commands ===${NC}"
                echo "View logs: docker-compose logs -f"
                echo "Stop app: docker-compose down"
                echo "Restart: docker-compose restart"
            else
                echo -e "${RED}✗ Failed to start application${NC}"
            fi
        else
            echo -e "${RED}✗ Build failed${NC}"
        fi
        ;;
        
    2)
        echo ""
        echo -e "${CYAN}=== Building and running with Docker commands ===${NC}"
        echo -e "${YELLOW}Building the Docker image...${NC}"
        docker build -t github-repo-analyzer .
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo -e "${YELLOW}Running the container...${NC}"
            docker run -d --name github-repo-analyzer -p 3000:3000 --env-file .env.local --restart unless-stopped github-repo-analyzer
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Container started successfully!${NC}"
                echo ""
                echo -e "${CYAN}=== Access Information ===${NC}"
                echo -e "${BLUE}Application: http://localhost:3000${NC}"
                echo -e "${BLUE}Health Check: http://localhost:3000/api/health${NC}"
                echo ""
                echo -e "${CYAN}=== Management Commands ===${NC}"
                echo "View logs: docker logs -f github-repo-analyzer"
                echo "Stop container: docker stop github-repo-analyzer"
                echo "Remove container: docker rm github-repo-analyzer"
            else
                echo -e "${RED}✗ Failed to start container${NC}"
            fi
        else
            echo -e "${RED}✗ Build failed${NC}"
        fi
        ;;
        
    3)
        echo ""
        echo -e "${CYAN}=== Running development mode ===${NC}"
        echo -e "${YELLOW}Building development image...${NC}"
        docker-compose --profile development build github-repo-analyzer-dev
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Build successful!${NC}"
            echo -e "${YELLOW}Starting development server...${NC}"
            docker-compose --profile development up -d github-repo-analyzer-dev
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Development server started!${NC}"
                echo ""
                echo -e "${CYAN}=== Access Information ===${NC}"
                echo -e "${BLUE}Development App: http://localhost:3001${NC}"
                echo -e "${GREEN}Hot-reloading enabled${NC}"
                echo ""
                echo -e "${CYAN}=== Management Commands ===${NC}"
                echo "View logs: docker-compose logs -f github-repo-analyzer-dev"
                echo "Stop dev server: docker-compose --profile development down"
            else
                echo -e "${RED}✗ Failed to start development server${NC}"
            fi
        else
            echo -e "${RED}✗ Build failed${NC}"
        fi
        ;;
        
    4)
        echo ""
        echo -e "${CYAN}=== Project Structure ===${NC}"
        echo -e "${YELLOW}Docker files created:${NC}"
        for file in Docker* docker-compose* .dockerignore .env.local; do
            if [ -f "$file" ]; then
                echo -e "  ${GREEN}✓ $file${NC}"
            fi
        done
        echo ""
        echo -e "${YELLOW}Application structure:${NC}"
        echo -e "  ${GREEN}✓ Next.js 14 application${NC}"
        echo -e "  ${GREEN}✓ GitHub API integration${NC}"
        echo -e "  ${GREEN}✓ Real-time repository analytics${NC}"
        echo -e "  ${GREEN}✓ Interactive visualizations${NC}"
        echo -e "  ${GREEN}✓ Health check endpoint${NC}"
        ;;
        
    5)
        echo -e "${YELLOW}Exiting demo...${NC}"
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid option selected.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}=== Demo Complete ===${NC}"
echo -e "${BLUE}For more information, see DOCKER.md${NC}"
echo "" 