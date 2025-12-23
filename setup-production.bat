@echo off
REM Production Deployment Setup Script for Windows
REM Usage: setup-production.bat

echo ==========================================
echo Production Configuration Setup
echo ==========================================
echo.

REM Check if .env files exist
echo Checking configuration files...
echo.

REM Backend
if not exist "backend\.env" (
    echo ^^! backend\.env not found
    echo Creating from .env.example...
    copy backend\.env.example backend\.env
    echo ✓ Created backend\.env
    echo    ^^! IMPORTANT: Edit backend\.env with your production values
) else (
    echo ✓ backend\.env exists
)

REM Frontend
if not exist "frontend\.env.production" (
    echo ^^! frontend\.env.production not found
    echo Creating template...
    
    (
        echo # Frontend Production Configuration
        echo REACT_APP_API_BASE_URL=https://your-api-domain.com/api
        echo REACT_APP_ENV=production
        echo REACT_APP_LOGGING_ENABLED=false
    ) > frontend\.env.production
    
    echo ✓ Created frontend\.env.production
    echo    ^^! IMPORTANT: Edit frontend\.env.production with your API URL
) else (
    echo ✓ frontend\.env.production exists
)

echo.
echo ==========================================
echo Configuration Files Ready!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Edit backend\.env with your production values:
echo    - DB_HOST, DB_USER, DB_PASSWORD
echo    - JWT_SECRET ^(strong random string^)
echo    - EMAIL_USER, EMAIL_PASSWORD
echo    - NODE_ENV=production
echo.
echo 2. Edit frontend\.env.production:
echo    - REACT_APP_API_BASE_URL=your-production-api-url
echo.
echo 3. Install dependencies and build:
echo    cd backend ^&^& npm install
echo    cd frontend ^&^& npm install ^&^& npm run build
echo.
echo 4. Start the backend:
echo    cd backend ^&^& npm start
echo.
echo 5. Deploy the frontend build\ folder to your web server
echo.
echo ==========================================
echo.
pause
