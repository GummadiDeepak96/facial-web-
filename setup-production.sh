#!/bin/bash
# Production Deployment Setup Script
# Usage: bash setup-production.sh

echo "=========================================="
echo "Production Configuration Setup"
echo "=========================================="

# Check if .env files exist
echo ""
echo "Checking configuration files..."

# Backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found"
    echo "Creating from .env.example..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo "   ⚠️  IMPORTANT: Edit backend/.env with your production values"
else
    echo "✅ backend/.env exists"
fi

# Frontend
if [ ! -f "frontend/.env.production" ]; then
    echo "⚠️  frontend/.env.production not found"
    echo "Creating template..."
    cat > frontend/.env.production << EOF
# Frontend Production Configuration
REACT_APP_API_BASE_URL=https://your-api-domain.com/api
REACT_APP_ENV=production
REACT_APP_LOGGING_ENABLED=false
EOF
    echo "✅ Created frontend/.env.production"
    echo "   ⚠️  IMPORTANT: Edit frontend/.env.production with your API URL"
else
    echo "✅ frontend/.env.production exists"
fi

echo ""
echo "=========================================="
echo "Configuration Files Ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit backend/.env with your production values:"
echo "   - DB_HOST, DB_USER, DB_PASSWORD"
echo "   - JWT_SECRET (strong random string)"
echo "   - EMAIL_USER, EMAIL_PASSWORD"
echo "   - NODE_ENV=production"
echo ""
echo "2. Edit frontend/.env.production:"
echo "   - REACT_APP_API_BASE_URL=your-production-api-url"
echo ""
echo "3. Install dependencies and build:"
echo "   cd backend && npm install"
echo "   cd frontend && npm install && npm run build"
echo ""
echo "4. Start the backend:"
echo "   cd backend && npm start"
echo ""
echo "5. Deploy the frontend build/ folder to your web server"
echo ""
echo "=========================================="
