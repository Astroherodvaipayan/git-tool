# GitHub Repository Analyzer - Docker Demo Script
# This script demonstrates how to run the application in a Docker container

Write-Host "=== GitHub Repository Analyzer - Docker Demo ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker is not available. Please install Docker Desktop and ensure it's running." -ForegroundColor Red
        Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Blue
        exit 1
    }
} catch {
    Write-Host "✗ Docker is not available. Please install Docker Desktop and ensure it's running." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Blue
    exit 1
}

# Check if Docker daemon is running
Write-Host "Checking Docker daemon..." -ForegroundColor Yellow
try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker daemon is running" -ForegroundColor Green
    } else {
        Write-Host "✗ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
        Write-Host "Attempting to start Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -NoNewWindow
        Write-Host "Please wait for Docker Desktop to start, then run this script again." -ForegroundColor Blue
        exit 1
    }
} catch {
    Write-Host "✗ Docker daemon is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Docker is ready! Proceeding with demo..." -ForegroundColor Green
Write-Host ""

# Check for environment file
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✓ Environment file found" -ForegroundColor Green
} else {
    Write-Host "! No .env.local file found. Creating a basic one..." -ForegroundColor Yellow
    @"
# GitHub Repository Analyzer Environment Configuration
# Add your GitHub Personal Access Token for higher rate limits
GITHUB_PAT=

# Docker configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✓ Created .env.local file. You can add your GitHub PAT later." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Demo Options ===" -ForegroundColor Cyan
Write-Host "1. Build and run with Docker Compose (Recommended)" -ForegroundColor White
Write-Host "2. Build and run with Docker commands" -ForegroundColor White
Write-Host "3. Run development mode with hot-reloading" -ForegroundColor White
Write-Host "4. Show project structure" -ForegroundColor White
Write-Host "5. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Select option (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "=== Building and running with Docker Compose ===" -ForegroundColor Cyan
        Write-Host "Building the application..." -ForegroundColor Yellow
        docker-compose build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Build successful!" -ForegroundColor Green
            Write-Host "Starting the application..." -ForegroundColor Yellow
            docker-compose up -d
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Application started successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "=== Access Information ===" -ForegroundColor Cyan
                Write-Host "Application: http://localhost:3000" -ForegroundColor Blue
                Write-Host "Health Check: http://localhost:3000/api/health" -ForegroundColor Blue
                Write-Host ""
                Write-Host "=== Management Commands ===" -ForegroundColor Cyan
                Write-Host "View logs: docker-compose logs -f" -ForegroundColor White
                Write-Host "Stop app: docker-compose down" -ForegroundColor White
                Write-Host "Restart: docker-compose restart" -ForegroundColor White
            } else {
                Write-Host "✗ Failed to start application" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Build failed" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "=== Building and running with Docker commands ===" -ForegroundColor Cyan
        Write-Host "Building the Docker image..." -ForegroundColor Yellow
        docker build -t github-repo-analyzer .
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Build successful!" -ForegroundColor Green
            Write-Host "Running the container..." -ForegroundColor Yellow
            docker run -d --name github-repo-analyzer -p 3000:3000 --env-file .env.local --restart unless-stopped github-repo-analyzer
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Container started successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "=== Access Information ===" -ForegroundColor Cyan
                Write-Host "Application: http://localhost:3000" -ForegroundColor Blue
                Write-Host "Health Check: http://localhost:3000/api/health" -ForegroundColor Blue
                Write-Host ""
                Write-Host "=== Management Commands ===" -ForegroundColor Cyan
                Write-Host "View logs: docker logs -f github-repo-analyzer" -ForegroundColor White
                Write-Host "Stop container: docker stop github-repo-analyzer" -ForegroundColor White
                Write-Host "Remove container: docker rm github-repo-analyzer" -ForegroundColor White
            } else {
                Write-Host "✗ Failed to start container" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Build failed" -ForegroundColor Red
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "=== Running development mode ===" -ForegroundColor Cyan
        Write-Host "Building development image..." -ForegroundColor Yellow
        docker-compose --profile development build github-repo-analyzer-dev
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Build successful!" -ForegroundColor Green
            Write-Host "Starting development server..." -ForegroundColor Yellow
            docker-compose --profile development up -d github-repo-analyzer-dev
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Development server started!" -ForegroundColor Green
                Write-Host ""
                Write-Host "=== Access Information ===" -ForegroundColor Cyan
                Write-Host "Development App: http://localhost:3001" -ForegroundColor Blue
                Write-Host "Hot-reloading enabled" -ForegroundColor Green
                Write-Host ""
                Write-Host "=== Management Commands ===" -ForegroundColor Cyan
                Write-Host "View logs: docker-compose logs -f github-repo-analyzer-dev" -ForegroundColor White
                Write-Host "Stop dev server: docker-compose --profile development down" -ForegroundColor White
            } else {
                Write-Host "✗ Failed to start development server" -ForegroundColor Red
            }
        } else {
            Write-Host "✗ Build failed" -ForegroundColor Red
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "=== Project Structure ===" -ForegroundColor Cyan
        Write-Host "Docker files created:" -ForegroundColor Yellow
        Get-ChildItem -Path "." -Filter "Docker*" | ForEach-Object { Write-Host "  ✓ $($_.Name)" -ForegroundColor Green }
        Get-ChildItem -Path "." -Filter "docker-compose*" | ForEach-Object { Write-Host "  ✓ $($_.Name)" -ForegroundColor Green }
        if (Test-Path ".dockerignore") { Write-Host "  ✓ .dockerignore" -ForegroundColor Green }
        if (Test-Path ".env.local") { Write-Host "  ✓ .env.local" -ForegroundColor Green }
        Write-Host ""
        Write-Host "Application structure:" -ForegroundColor Yellow
        Write-Host "  ✓ Next.js 14 application" -ForegroundColor Green
        Write-Host "  ✓ GitHub API integration" -ForegroundColor Green
        Write-Host "  ✓ Real-time repository analytics" -ForegroundColor Green
        Write-Host "  ✓ Interactive visualizations" -ForegroundColor Green
        Write-Host "  ✓ Health check endpoint" -ForegroundColor Green
    }
    
    "5" {
        Write-Host "Exiting demo..." -ForegroundColor Yellow
        exit 0
    }
    
    default {
        Write-Host "Invalid option selected." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Demo Complete ===" -ForegroundColor Cyan
Write-Host "For more information, see DOCKER.md" -ForegroundColor Blue
Write-Host "" 