# Quick Start Guide - Running the Application

## Prerequisites

Make sure you have installed:
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Backend server running on port 8080

## Step 1: Start the Backend Server

```bash
cd "e:\deepak git final fc\facial-web-\backend"
node server.js
```

You should see something like:
```
✅ Server running on port 8080
✅ Connected to database
```

## Step 2: Start the Frontend Server

Open a new terminal and run:

```bash
cd "e:\deepak git final fc\facial-web-\frontend"
npm start
```

The browser should automatically open to `http://localhost:3000`

If not, manually open the URL in your browser.

## Step 3: Test the Login Page

### Home Page
You should see:
- Header with "Employee Management System"
- Single "Login" button in top-right
- Hero section with description
- Feature cards below

### Click the Login Button
You should see the unified login form with:
- **LOGIN AS** section with three radio options:
  - ○ EMPLOYEE (default)
  - ○ MANAGER
  - ○ ADMIN
- Email Address field
- Password field
- Login button
- Forgot Password? link

### Test with Employee Credentials

If you have an employee account, test it:

1. Select "EMPLOYEE" (already selected by default)
2. Enter email address
3. Enter password
4. Click "Login"
5. Should redirect to `/employee/dashboard`

### Test with Manager Credentials

1. Select "MANAGER"
2. Enter email address
3. Enter password
4. Click "Login"
5. Should redirect to `/manager/dashboard`

### Test with Admin Credentials

1. Select "ADMIN"
2. Enter email address
3. Enter password
4. Click "Login"
5. Should redirect to `/admin/dashboard`

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, React will ask:
```
Would you like to run the app on another port instead? (Y/n)
```

Type `Y` and it will run on port 3001, 3002, etc.

### Backend Not Responding

If you see API errors:
1. Check if backend is running on port 8080
2. Check `backend/.env` for correct database connection
3. Check browser console for detailed error messages

### CSS Not Loaded

If the page looks unstyled:
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + F5)
3. Check that `Login.css` was updated correctly

### Radio Buttons Not Switching

If role selection doesn't work:
1. Check browser console for JavaScript errors
2. Verify that `onChange` handlers are in the component
3. Check that the state is updating (use React DevTools)

## File Locations for Reference

| Component | Path |
|-----------|------|
| Home Page | `frontend/src/components/HomePage.js` |
| Login Form | `frontend/src/components/auth/Login.js` |
| Login Styles | `frontend/src/components/auth/Login.css` |
| API Service | `frontend/src/services/api.js` |
| Router | `frontend/src/App.js` |

## Backend API Endpoints

The login component calls these endpoints:

```
POST /api/auth/employee/login
POST /api/auth/manager/login
POST /api/auth/admin/login
```

Each expects:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "user": { /* user object */ },
  "token": "jwt_token_here"
}
```

## Common Test Credentials

Here are some test accounts you might have set up:

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@test.com | test123 |
| Manager | manager@test.com | test123 |
| Admin | admin@test.com | test123 |

*Check your database for actual credentials*

## Navigation After Login

After successful login:

- **Employee** → `/employee/dashboard`
- **Manager** → `/manager/dashboard`
- **Admin** → `/admin/dashboard`

## Logging Out

The logout functionality should be in each dashboard's navigation menu.

## Debugging Tips

1. **Open DevTools**: Press `F12` in browser
2. **Check Console Tab**: Look for JavaScript errors
3. **Check Network Tab**: See actual API calls
4. **Check Application Tab**: View stored tokens in sessionStorage
5. **Use React DevTools Extension**: See component state and props

## Performance Tips

- If login is slow, check backend server speed
- Clear browser cache if seeing old versions
- Use incognito mode to avoid cache issues
- Monitor network tab to see API response times

## Next Steps

1. ✅ Test login with all three roles
2. ✅ Verify dashboards load correctly
3. ✅ Test forgot password functionality
4. ✅ Test error handling with wrong credentials
5. Deploy to production when ready

---

**Questions or Issues?**

Check the detailed guides:
- `UNIFIED_LOGIN_CHANGES.md` - What was changed
- `LOGIN_IMPLEMENTATION_GUIDE.md` - How it works

