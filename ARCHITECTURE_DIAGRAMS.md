# System Architecture Diagrams

## 1. Configuration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION REQUEST                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   api.js        │
                    │   (API calls)   │
                    └────────┬────────┘
                             │
                    ┌────────▼──────────────┐
                    │  config/             │
                    │  environment.js      │
                    │  (Get BASE_URL)      │
                    └────────┬─────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼─────┐            ┌────────▼────────┐
        │ .env file │  OR        │ Environment     │
        │ variables │            │ variables       │
        └───────────┘            └─────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  BASE_URL returned         │
              │  (localhost or production) │
              └───────────────────────────┘
```

---

## 2. Development vs Production Flow

```
╔════════════════════════════════════════════════════════════════╗
║                     DEVELOPMENT FLOW                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  .env.local or .env                                           ║
║  (REACT_APP_API_BASE_URL=http://localhost:8080/api)           ║
║           ↓                                                    ║
║  environment.js reads .env                                    ║
║           ↓                                                    ║
║  api.js uses: http://localhost:8080/api                       ║
║           ↓                                                    ║
║  Requests go to localhost                                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════╗
║                    PRODUCTION FLOW                             ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  .env.production or build env variable                        ║
║  (REACT_APP_API_BASE_URL=https://api.company.com/api)        ║
║           ↓                                                    ║
║  environment.js reads .env                                    ║
║           ↓                                                    ║
║  npm run build (production build created)                     ║
║           ↓                                                    ║
║  api.js uses: https://api.company.com/api                    ║
║           ↓                                                    ║
║  Requests go to production API                                ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 3. File Structure & Data Flow

```
PRODUCTION ENVIRONMENT
│
├─ backend/
│  ├─ .env (NOT IN GIT) ← UPDATE THIS
│  │  └─ DB_HOST=prod-db.com
│  │  └─ DB_USER=prod_user
│  │  └─ DB_PASSWORD=***
│  │  └─ JWT_SECRET=***
│  │  └─ NODE_ENV=production
│  │
│  ├─ config.js (reads .env)
│  │  └─ Provides DB_CONFIG, JWT_SECRET, etc.
│  │
│  └─ server.js (uses config.js)
│     └─ Runs on port 8080 with prod settings
│
├─ frontend/
│  ├─ .env.production (NOT IN GIT) ← UPDATE THIS
│  │  └─ REACT_APP_API_BASE_URL=https://api.com/api
│  │  └─ REACT_APP_ENV=production
│  │
│  ├─ npm run build
│  │  └─ Compiles with .env.production values
│  │
│  ├─ src/config/environment.js (reads .env)
│  │  └─ Provides BASE_URL, feature flags
│  │
│  ├─ src/services/api.js (uses config)
│  │  └─ Makes requests to https://api.com/api
│  │
│  └─ build/ (production build)
│     └─ Deployed to web server
```

---

## 4. Configuration Inheritance Chain

```
┌─────────────────────────────────────────┐
│   .env file                             │
│   (Physical file - NOT in git)          │
│   - DB_HOST=prod-db.com                 │
│   - REACT_APP_API_BASE_URL=https://...  │
│   - JWT_SECRET=***                      │
└────────────────┬────────────────────────┘
                 │
                 ▼ (dotenv library reads)
┌─────────────────────────────────────────┐
│   process.env                           │
│   (Node.js runtime environment)         │
│   - process.env.DB_HOST                 │
│   - process.env.REACT_APP_API_BASE_URL  │
│   - process.env.JWT_SECRET              │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌─────────────────────┐
│ config.js    │  │ environment.js      │
│ (Backend)    │  │ (Frontend)          │
│              │  │                     │
│ Exports:     │  │ Exports:            │
│ - DB_CONFIG  │  │ - API.BASE_URL      │
│ - JWT_SECRET │  │ - FEATURES          │
└──────┬───────┘  └──────┬──────────────┘
       │                 │
       ▼                 ▼
   server.js         api.js
   (Backend)       (Frontend)
   
   Uses DB_CONFIG  Uses BASE_URL
   Uses JWT_SECRET Uses FEATURES
```

---

## 5. Multi-Environment Deployment

```
SAME SOURCE CODE
        │
    ┌───┴───────────────────────────┐
    │                               │
    ▼                               ▼
DEVELOPMENT                    PRODUCTION
│                              │
├─ .env                        ├─ .env
│  localhost:8080              │  api.company.com
│  local_db                     │  prod_db.company.com
│                              │
├─ npm start                   ├─ npm install
│  Dev server                  │  npm run build
│                              │  npm start (with PM2)
│                              │
└─ Application works           └─ Application works
   with dev API URL               with prod API URL
   WITHOUT CHANGING CODE         WITHOUT CHANGING CODE!
```

---

## 6. Deployment Process

```
Start
  │
  ├─ Create .env files
  │  ├─ backend/.env (from .env.example)
  │  └─ frontend/.env.production (new file)
  │
  ├─ Edit .env with production values
  │  ├─ DB_HOST, DB_USER, DB_PASSWORD
  │  ├─ JWT_SECRET (strong random string)
  │  ├─ EMAIL_USER, EMAIL_PASSWORD
  │  └─ REACT_APP_API_BASE_URL
  │
  ├─ Install dependencies
  │  ├─ backend: npm install
  │  └─ frontend: npm install
  │
  ├─ Build
  │  └─ frontend: npm run build
  │     (Embeds .env.production values into build/)
  │
  ├─ Deploy
  │  ├─ Backend: Copy .env to server, npm start
  │  └─ Frontend: Copy build/ to web server
  │
  ├─ Verify
  │  ├─ Check API endpoint
  │  ├─ Check browser console
  │  ├─ Check Network tab
  │  └─ Test functionality
  │
  └─ Success! 🎉
```

---

## 7. Configuration Precedence

```
For Frontend (REACT_APP_* variables):
┌──────────────────────────────┐
│ Environment Variable (Highest)│ ← npm start REACT_APP_VAR=value
└──────────────────────────────┘
                  │ (if not set)
┌──────────────────────────────┐
│ .env.production              │ ← During npm run build
└──────────────────────────────┘
                  │ (if not set)
┌──────────────────────────────┐
│ .env.local                   │ ← During development
└──────────────────────────────┘
                  │ (if not set)
┌──────────────────────────────┐
│ Hardcoded defaults in JS     │ ← In environment.js
└──────────────────────────────┘

For Backend (NODE_VAR variables):
┌──────────────────────────────┐
│ Shell Environment Variable   │ ← export VAR=value
└──────────────────────────────┘
                  │ (if not set)
┌──────────────────────────────┐
│ .env file                    │ ← dotenv loads this
└──────────────────────────────┘
                  │ (if not set)
┌──────────────────────────────┐
│ config.js defaults           │ ← || 'fallback'
└──────────────────────────────┘
```

---

## 8. Security - What Goes Where

```
┌────────────────────────────────────┐
│ VERSION CONTROL (Git)              │
│ ✅ Source code                    │
│ ✅ .env.example (template)        │
│ ✅ config.js (reads .env)         │
│ ❌ .env (NEVER!)                  │
│ ❌ .env.production (NEVER!)       │
│ ❌ secrets                        │
└────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   CODE REVIEW        DEPLOYMENT
   (Safe)            (Secure)
   Source code       .env files
   only              via secure method
```

---

## 9. Request Journey - Before & After

```
BEFORE (Hardcoded URL):
Request → api.js → const BASE_URL = 'localhost:8080' → API call
                   ❌ Hardcoded, can't change for production

AFTER (Dynamic URL):
Request → api.js → config.API.BASE_URL → .env file → API call
                                          ✅ Can change by editing .env
```

---

## 10. Environment Variable Override Priority

```
Development (npm start):
Environment Variable > .env.local > .env > defaults

Production (npm run build):
Environment Variable > .env.production > defaults

Note: Build-time variables are embedded in the final build
      Runtime variables are not used in static frontend
```

---

## 11. Complete System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        APPLICATION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend                          Backend                  │
│  ─────────                         ──────────               │
│                                                             │
│  ┌──────────────┐                ┌──────────────┐          │
│  │ React App   │                │ Express      │          │
│  │ (Browser)   │────────────────▶│ Server       │          │
│  │             │                │              │          │
│  └──────┬───────┘                └────┬─────────┘          │
│         │                             │                    │
│         │ Uses:                       │ Uses:              │
│         │                             │                    │
│    ┌────▼──────┐                 ┌───▼────────┐           │
│    │ config.js │                 │ config.js  │           │
│    │ (env.js)  │                 │            │           │
│    └────┬──────┘                 └───┬────────┘           │
│         │                             │                    │
│    ┌────▼──────────┐            ┌────▼────────────┐       │
│    │.env.production│            │ .env            │       │
│    │or .env.local  │            │ (dotenv)        │       │
│    └───────────────┘            └─────────────────┘       │
│                                                             │
│  REACT_APP_API_BASE_URL=https://... | DB_HOST=localhost   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

These diagrams show:
1. ✅ How configuration flows through the system
2. ✅ Different behavior in dev vs production
3. ✅ File structure and relationships
4. ✅ Configuration inheritance chain
5. ✅ Multi-environment support with same code
6. ✅ Complete deployment process
7. ✅ Precedence and override rules
8. ✅ Security boundaries
9. ✅ Request journey through the system
10. ✅ Complete system architecture

All with **no code changes needed for different environments!**
