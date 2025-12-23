# Backend Configuration Reference

## backend/config.js

This file reads environment variables and provides configuration to the entire backend application.

```javascript
require('dotenv').config();
const mysql = require('mysql2');

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Database Configuration
  DB_CONFIG: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'realtime',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  
  // File Upload Configuration
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads/',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '5MB',
  
  // Email Configuration
  EMAIL_CONFIG: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'tpcchandicapped@gmail.com',
      pass: 'iowh xcma tlth hdfx'
    }
  },
  EMAIL_FROM: 'tpcchandicapped@gmail.com'
};
```

## How to Use

### In Backend Code
```javascript
const config = require('../config');

// Access configuration values
const port = config.PORT;
const dbConfig = config.DB_CONFIG;
const jwtSecret = config.JWT_SECRET;
```

### Environment Variables (.env file)
```dotenv
PORT=8080
NODE_ENV=production
JWT_SECRET=your_secret_key
DB_HOST=your-database-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=employee_management
```

## Key Configuration Options

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Server port | 5000 |
| `NODE_ENV` | Environment (development/production) | development |
| `JWT_SECRET` | JWT signing secret | fallback_secret |
| `JWT_EXPIRES_IN` | Token expiration | 24h |
| `DB_HOST` | Database host | localhost |
| `DB_USER` | Database user | root |
| `DB_PASSWORD` | Database password | (empty) |
| `DB_NAME` | Database name | realtime |
| `UPLOAD_PATH` | File upload directory | uploads/ |
| `MAX_FILE_SIZE` | Max upload size | 5MB |

## Important Notes

1. **Always use environment variables** for sensitive data (passwords, secrets)
2. **Never commit .env file** to version control
3. **Change JWT_SECRET in production** to a strong random string
4. **Update database credentials** for your environment
5. **Email credentials** can be updated in the EMAIL_CONFIG object or via environment variables

---

## Frontend Configuration Reference

## frontend/src/config/environment.js

This file provides centralized configuration for the React frontend application.

```javascript
const getBaseURL = () => {
  // Check environment variables first (highest priority)
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }

  // Fallback to localhost for development
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  return isDevelopment ? 'http://localhost:8080/api' : '/api';
};

export const config = {
  // API Configuration
  API: {
    BASE_URL: getBaseURL(),
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
  },

  // Application Environment
  ENV: process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development',

  // Feature Flags
  FEATURES: {
    FACE_RECOGNITION: process.env.REACT_APP_FEATURE_FACE_RECOGNITION !== 'false',
    PDF_EXPORT: process.env.REACT_APP_FEATURE_PDF_EXPORT !== 'false',
    EXCEL_EXPORT: process.env.REACT_APP_FEATURE_EXCEL_EXPORT !== 'false',
    NOTIFICATIONS: process.env.REACT_APP_FEATURE_NOTIFICATIONS !== 'false',
  },

  // UI Configuration
  UI: {
    ITEMS_PER_PAGE: 10,
    TOAST_DURATION: 3000,
    ANIMATION_DURATION: 300,
  },

  // Session Configuration
  SESSION: {
    TOKEN_KEY: 'token',
    USER_KEY: 'user',
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },

  // Logging
  LOGGING: {
    ENABLED: process.env.REACT_APP_LOGGING_ENABLED === 'true',
    LEVEL: process.env.REACT_APP_LOG_LEVEL || 'info',
  },
};

export default config;
```

### How to Use in Frontend Components

```javascript
import config from '../config/environment';

// Use configuration
const apiBaseUrl = config.API.BASE_URL;
const features = config.FEATURES;
const environment = config.ENV;

// Example API call
const response = await fetch(`${config.API.BASE_URL}/endpoint`);
```

### Frontend Environment Variables

```
REACT_APP_API_BASE_URL=http://localhost:8080/api  (Development)
REACT_APP_API_BASE_URL=/api                        (Production)
REACT_APP_ENV=development
REACT_APP_FEATURE_FACE_RECOGNITION=true
REACT_APP_FEATURE_PDF_EXPORT=true
REACT_APP_FEATURE_EXCEL_EXPORT=true
REACT_APP_FEATURE_NOTIFICATIONS=true
REACT_APP_LOGGING_ENABLED=false
REACT_APP_LOG_LEVEL=info
```

---

## Summary of Changes Made

### Frontend Files Updated

All hardcoded `http://localhost:8080/api` URLs replaced with `/api`:

1. **ManagerDashboard.js** (3 replacements)
   - Line 207: `/api/php/attendance-report-all`
   - Line 315: `/api/php/attendance-report-all/download`
   - Line 329: `/api/php/attendance-report/download`

2. **AttendanceView.js** (1 replacement)
   - Line 37: `/api/employee/attendance`

3. **ChangePasswordView.js** (1 replacement)
   - Line 47: `/api/auth/employee/change-password`

### Why `/api` Instead of Full URL?

✅ **Benefits:**
- Works in both development and production
- Proxy configuration in development can redirect to backend
- Production server can serve both frontend and API from same domain
- Cleaner and simpler code
- Automatically uses the same domain as frontend

✅ **Example:**
- Development: `http://localhost:3000/api` → proxied to `http://localhost:8080/api`
- Production: `https://yourdomain.com/api` → proxied to backend API

---

## Configuration Setup for Different Environments

### Development
```
Frontend: http://localhost:3000
Backend:  http://localhost:8080
API URLs: /api (proxied to backend)
```

### Production
```
Frontend: https://yourdomain.com
Backend:  https://yourdomain.com (or separate domain)
API URLs: /api (or https://api.yourdomain.com/api)
```

---

## Important: Backend config.js Usage

The backend `config.js` file is used throughout the backend to:

1. **Read environment variables** from .env file
2. **Provide sensible defaults** for development
3. **Centralize configuration** in one place
4. **Ensure consistency** across the application

### Usage in Backend Files

```javascript
// In backend routes, middleware, services:
const config = require('../config');

// Database connection
const pool = mysql.createPool(config.DB_CONFIG);

// JWT operations
const token = jwt.sign(payload, config.JWT_SECRET, {
  expiresIn: config.JWT_EXPIRES_IN
});

// Email operations
const transporter = nodemailer.createTransport(config.EMAIL_CONFIG);
```

All backend files that need configuration access it through this centralized `config.js` file.
