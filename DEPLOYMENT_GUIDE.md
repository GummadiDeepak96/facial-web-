# Production Deployment Configuration Guide

## Overview
This guide explains how to configure the application for different environments (development, staging, production) **without modifying the source code**.

---

## Backend Configuration

### 1. Environment Variables (.env file)

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Then edit `.env` with your production values:

```dotenv
# Server Configuration
PORT=8080
NODE_ENV=production

# Database Configuration
DB_HOST=your-production-db-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=employee_management

# JWT Configuration
JWT_SECRET=your-long-secure-secret-key-change-this
JWT_EXPIRES_IN=24h

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourcompany.com
```

### 2. Environment Variables to Update for Production:

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `PORT` | `8080` | `8080` or `80` |
| `DB_HOST` | `localhost` | `your-db-server.com` |
| `DB_USER` | `root` | `db_user` |
| `DB_PASSWORD` | empty | Strong password |
| `JWT_SECRET` | `fallback_secret` | Long random string |
| `EMAIL_USER` | `dev@example.com` | `noreply@company.com` |

### 3. Running Backend in Production:

```bash
# Install dependencies
npm install

# Run with PM2 (recommended for production)
npm install -g pm2
pm2 start server.js --name "facial-api"
pm2 save
pm2 startup
```

---

## Frontend Configuration

### 1. Environment Variables (.env.local or .env.production)

Create `.env.local` for development or `.env.production` for production:

**Development (.env.local):**
```
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_ENV=development
REACT_APP_LOGGING_ENABLED=true
```

**Production (.env.production):**
```
REACT_APP_API_BASE_URL=https://api.yourcompany.com/api
REACT_APP_ENV=production
REACT_APP_LOGGING_ENABLED=false
```

### 2. Building for Production:

```bash
# Install dependencies
npm install

# Create production build
npm run build

# The optimized build will be in the 'build/' directory
```

### 3. Deploying Production Build:

**Option A: Using a web server (Nginx/Apache)**
```bash
# Copy the build folder to your server
scp -r build/* user@yourserver:/var/www/html/

# Or in Nginx config:
location / {
  root /var/www/html;
  try_files $uri /index.html;
}
```

**Option B: Using Node.js + express-static**
```javascript
const express = require('express');
const app = express();
app.use(express.static('build'));
app.listen(3000);
```

---

## Database Configuration

### Production Database Setup:

1. **Create database:**
```sql
CREATE DATABASE employee_management;
USE employee_management;
```

2. **Import schema:**
```bash
mysql -u root -p employee_management < schema.sql
```

3. **Update connection string in `.env`:**
```
DB_HOST=your-production-db-host
DB_USER=db_user
DB_PASSWORD=secure_password
DB_NAME=employee_management
```

---

## Email Configuration (Production)

### Gmail Setup (Recommended):

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@company.com
```

### Custom Email Server:
```
EMAIL_HOST=smtp.your-domain.com
EMAIL_PORT=587
EMAIL_USER=noreply@your-domain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@your-domain.com
```

---

## Quick Deployment Checklist

### Backend:
- [ ] Copy `.env.example` to `.env`
- [ ] Update all variables in `.env` for production
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=8080` (or your production port)
- [ ] Update database credentials
- [ ] Update JWT_SECRET with a strong random string
- [ ] Update email credentials
- [ ] Test database connection
- [ ] Run `npm install` and start server

### Frontend:
- [ ] Create `.env.production` with production API URL
- [ ] Build with `npm run build`
- [ ] Test the build locally: `npm install -g serve && serve -s build`
- [ ] Deploy `build/` folder to your web server
- [ ] Test all API endpoints from production
- [ ] Verify email notifications work

---

## Verification Steps

### Backend Health Check:
```bash
curl http://localhost:8080/api/admin/dashboard/stats
```

### Frontend Build Verification:
```bash
# Check if build folder exists
ls -la build/

# Test locally
serve -s build
# Visit http://localhost:3000
```

---

## Troubleshooting

### 404 API Errors:
- Check `.env` `PORT` matches frontend `REACT_APP_API_BASE_URL`
- Verify backend is running: `ps aux | grep node`
- Check firewall rules allow connection

### Email Not Sending:
- Verify credentials in `.env`
- Check Gmail App Passwords (2FA required)
- Review email logs in backend console

### Database Connection Errors:
- Test MySQL connection: `mysql -h host -u user -p`
- Verify DB_HOST, DB_USER, DB_PASSWORD in `.env`
- Check MySQL service is running

---

## Environment Variables Reference

### Backend (.env)
```
PORT                    # Server port (default: 8080)
NODE_ENV               # development | production
DB_HOST                # Database host
DB_USER                # Database username
DB_PASSWORD            # Database password
DB_NAME                # Database name
JWT_SECRET             # Secret key for JWT tokens
JWT_EXPIRES_IN         # Token expiration (default: 24h)
EMAIL_HOST             # SMTP server host
EMAIL_PORT             # SMTP server port
EMAIL_USER             # Email account username
EMAIL_PASSWORD         # Email account password
EMAIL_FROM             # From address for emails
```

### Frontend (.env.production / .env.local)
```
REACT_APP_API_BASE_URL           # Backend API URL
REACT_APP_ENV                    # environment name
REACT_APP_FEATURE_FACE_RECOGNITION   # Enable/disable feature
REACT_APP_FEATURE_PDF_EXPORT         # Enable/disable feature
REACT_APP_FEATURE_EXCEL_EXPORT       # Enable/disable feature
REACT_APP_FEATURE_NOTIFICATIONS      # Enable/disable feature
REACT_APP_LOGGING_ENABLED           # Enable/disable logging
REACT_APP_LOG_LEVEL                 # Log level (debug|info|warn|error)
```

---

## Security Notes for Production

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong passwords** for database and email
3. **Change JWT_SECRET** to a long random string
4. **Enable HTTPS** in production
5. **Use environment-specific secrets** for each environment
6. **Rotate credentials regularly**
7. **Monitor logs** for suspicious activity
8. **Keep dependencies updated** - Run `npm audit` regularly

---

## Support

For issues or questions, check the logs:

**Backend logs:**
```bash
tail -f nohup.out
# or if using PM2:
pm2 logs
```

**Frontend errors:**
- Check browser console (F12 → Console tab)
- Check Network tab for failed API calls
- Check `.env` variables are set correctly
