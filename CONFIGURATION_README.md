# Configuration Files Summary

## Files Overview

### Backend Configuration Files

1. **`.env.example`** - Template for environment variables
   - Location: `backend/.env.example`
   - Purpose: Shows all available environment variables
   - Usage: Copy to `.env` and update values

2. **`.env`** (NOT in git - create locally)
   - Location: `backend/.env`
   - Purpose: Actual environment variables for your environment
   - Usage: Update this file for different environments

3. **`config.js`** - Reads from `.env` file
   - Location: `backend/config.js`
   - Purpose: Central configuration that reads .env variables
   - Note: No changes needed for different environments

### Frontend Configuration Files

1. **`.env.example`** - Template for environment variables
   - Location: `frontend/.env.example`
   - Purpose: Shows all available environment variables
   - Usage: Copy to `.env.local` (development) or `.env.production`

2. **`.env.local`** or **`.env.production`** (NOT in git - create locally)
   - Location: `frontend/.env.local` or `frontend/.env.production`
   - Purpose: Environment variables for your environment
   - Usage: Create based on your environment

3. **`config/environment.js`** - Reads from environment variables
   - Location: `frontend/src/config/environment.js`
   - Purpose: Central configuration that exports config object
   - Note: No changes needed for different environments

4. **`services/api.js`** - Uses config file
   - Location: `frontend/src/services/api.js`
   - Purpose: API service that uses config for BASE_URL and timeout
   - Note: No changes needed for different environments

---

## Deployment Workflow

### For Development:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with development values
npm install
npm start

# Frontend
cd frontend
cp .env.example .env.local
# .env.local already has correct development values
npm install
npm start
```

### For Production:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with PRODUCTION values
npm install
npm run build  # if applicable
pm2 start server.js

# Frontend
cd frontend
# Create .env.production with production API URL
REACT_APP_API_BASE_URL=https://api.yourcompany.com/api npm run build
# Deploy build/ folder to web server
```

---

## What to Change for Production

### Backend (.env file):

```diff
- PORT=8080
+ PORT=8080                          # or your server port

- NODE_ENV=development
+ NODE_ENV=production

- DB_HOST=localhost
+ DB_HOST=your-production-db.com

- DB_USER=root
+ DB_USER=prod_user

- DB_PASSWORD=
+ DB_PASSWORD=YourSecurePassword123

- JWT_SECRET=your_jwt_secret_here
+ JWT_SECRET=VeryLongRandomSecretString_ChangeThis_ASAP

- EMAIL_USER=you@example.com
+ EMAIL_USER=noreply@yourcompany.com

- EMAIL_PASS=app-password
+ EMAIL_PASS=YourAppPassword123
```

### Frontend (.env.production file):

```diff
- REACT_APP_API_BASE_URL=http://localhost:8080/api
+ REACT_APP_API_BASE_URL=https://api.yourcompany.com/api

- REACT_APP_ENV=development
+ REACT_APP_ENV=production

- REACT_APP_LOGGING_ENABLED=true
+ REACT_APP_LOGGING_ENABLED=false
```

---

## No Code Changes Needed

✅ **You do NOT need to modify any of these files for production:**

- `backend/server.js`
- `backend/routes/*.js`
- `backend/auth.js`
- `backend/database.js`
- `frontend/src/services/api.js`
- `frontend/src/components/**/*`
- Any other JavaScript files

**All configuration is handled through environment variables** - Just update the `.env` files!

---

## Environment Variables

### Backend

| Variable | Default | Production | Required |
|----------|---------|------------|----------|
| PORT | 8080 | 8080 | ✓ |
| NODE_ENV | development | production | ✓ |
| DB_HOST | localhost | your-db-host | ✓ |
| DB_USER | root | db-user | ✓ |
| DB_PASSWORD | (empty) | password | ✓ |
| DB_NAME | realtime | employee_management | ✓ |
| JWT_SECRET | fallback_secret | strong-random-key | ✓ |
| EMAIL_USER | dev@example | prod@company | ✓ |
| EMAIL_PASSWORD | - | app-password | ✓ |

### Frontend

| Variable | Default | Production | Required |
|----------|---------|------------|----------|
| REACT_APP_API_BASE_URL | http://localhost:8080/api | https://api.domain.com/api | ✓ |
| REACT_APP_ENV | development | production | ✓ |
| REACT_APP_LOGGING_ENABLED | false | false | ✗ |

---

## Quick Commands

```bash
# Backend - Set up for production
cd backend
cp .env.example .env
nano .env  # Update values
npm install
npm start

# Frontend - Build for production
cd frontend
# Edit .env.production with production API URL
npm install
npm run build
# Deploy 'build' folder to web server
```

---

## Verification

After updating configuration files, verify everything works:

```bash
# Backend API test
curl http://your-server:8080/api/admin/dashboard/stats

# Frontend health check
# Visit https://yourdomain.com
# Open DevTools (F12) → Network tab
# Check API calls go to correct URL
# Check no 404 errors
```

---

## Support Files

- **DEPLOYMENT_GUIDE.md** - Complete deployment guide with detailed instructions
- **backend/.env.example** - Backend environment template
- **frontend/.env.example** - Frontend environment template
- **frontend/src/config/environment.js** - Frontend configuration object
- **backend/config.js** - Backend configuration object
