# Employee Login Troubleshooting Guide

## Problem: Temporary Password from Email Not Working

When an admin creates an employee and the system sends a temporary password via email, the employee cannot login directly. This is **BY DESIGN** in most cases.

### Why This Happens

1. **New employees default to `pending` status** (statusflag = 0)
2. **Login requires active status** (statusflag = 1 or status = 'active')
3. **The intended flow is: Reset Password First → Then Login**

### The Correct Flow

#### For NEW Employees (Pending Status):
```
1. Admin creates employee → Email sent with temp password
2. Employee clicks "Reset Password" link in email
3. Employee enters:
   - Email
   - Temporary password (from email)
   - New password
4. System activates account and sets new password
5. Employee can now login with new password
```

#### For ACTIVE Employees (Password Reset):
```
1. Admin/Employee requests password reset
2. Email sent with temp password
3. Employee can login DIRECTLY with temp password
4. OR use Reset Password flow to set new password
```

## Quick Diagnostic & Fix

### Step 1: Check Employee Status

Run this diagnostic script:

```powershell
cd 'C:\Users\dell\OneDrive\Documents\AVNIYA\FC\backend'
node fix-employee-login.js employee@example.com
```

This will show you:
- ✅ Does the employee exist?
- ✅ Is there a password set?
- ✅ Is the account active?
- ✅ What's preventing login?

### Step 2: Auto-Fix (Activate Account)

If the diagnostic shows the account is not active, run:

```powershell
node fix-employee-login.js employee@example.com --fix
```

This will:
- Set `statusflag = 1`
- Set `status = 'active'` (if column exists)
- Allow immediate login with the temporary password

### Step 3: Set/Verify Password

If you need to manually set or change a password:

```powershell
node fix-employee-password.js employee@example.com NewPassword123!
```

This will:
- Hash the password with bcrypt (10 rounds)
- Update the database
- Verify the hash works
- Tell you if the account needs activation

## Manual SQL Fix

If you prefer running SQL directly:

### Check Employee Status
```sql
SELECT 
  email, 
  name, 
  password IS NOT NULL AS has_password,
  CHAR_LENGTH(password) AS password_length,
  statusflag,
  status
FROM employees 
WHERE email = 'employee@example.com';
```

### Activate Employee
```sql
UPDATE employees 
SET statusflag = 1, status = 'active' 
WHERE email = 'employee@example.com';
```

### Check if Password Column Exists
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'employees' 
  AND column_name = 'password';
```

## Common Issues & Solutions

### Issue 1: "Invalid credentials" Error
**Cause:** Password hash doesn't match, or account is inactive  
**Fix:** 
1. Run diagnostic: `node fix-employee-login.js email@example.com`
2. Check if password is set and account is active
3. Use `--fix` flag or set password manually

### Issue 2: Employee Gets Email But Can't Login
**Cause:** Account is in `pending` status (default for new employees)  
**Fix:**
```powershell
# Option A: Activate account so temp password works
node fix-employee-login.js employee@example.com --fix

# Option B: Employee uses Reset Password flow (intended design)
# Employee goes to: http://localhost:3000/employee/reset-password
```

### Issue 3: No Password in Database
**Cause:** `employees` table doesn't have `password` column, or password wasn't generated  
**Fix:**
```sql
-- Add password column if missing
ALTER TABLE employees 
ADD COLUMN password VARCHAR(255) NULL;

-- Then set password
node fix-employee-password.js employee@example.com TempPass123!
```

### Issue 4: Bcrypt Hash Not Matching
**Cause:** Password was stored as plain text instead of bcrypt hash  
**Fix:**
```powershell
# Re-hash the password properly
node fix-employee-password.js employee@example.com CorrectPassword123
```

## Testing Login

### Via Browser
1. Go to: http://localhost:3000/employee/login
2. Enter:
   - Email: employee@example.com
   - Password: (the temp password or new password you set)
3. Click "Login"

### Via curl (PowerShell)
```powershell
$body = @{
    email = "employee@example.com"
    password = "TempPassword123"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:5000/api/auth/employee/login' `
  -Method POST `
  -Body $body `
  -ContentType 'application/json'
```

## Understanding the Login Flow

### Employee Login Requirements (backend/routes/auth.js):
```javascript
// 1. Email exists in employees table
// 2. statusflag = 1 (active account)
// 3. Password matches (bcrypt compare)
```

### What Happens During Login:
1. Backend finds employee by email
2. Checks `statusflag = 1` (or `status = 'active'`)
3. Compares entered password with hashed password using bcrypt
4. If all pass → generates JWT token and returns user data
5. If any fail → returns "Invalid credentials"

## Admin Panel - Proper Employee Creation Flow

When creating a new employee via admin panel:

### Current Behavior:
1. Admin fills form → clicks "Send Password"
2. System generates temp password
3. System hashes password with bcrypt
4. Saves employee with `statusflag = 0` (pending)
5. Sends email with temp password

### Recommended Admin Actions After Creating Employee:
1. Create employee via admin panel
2. Go to employee list
3. Find the employee → Edit
4. Change status to "Active"
5. Now employee can login with temp password OR use reset password flow

## Automation Recommendations

### Option 1: Auto-Activate on Create
Modify `backend/routes/admin.js` POST endpoint to set `statusflag = 1` by default for new employees.

### Option 2: Email Template Clarification
Update email template to explain:
- "Your account is pending approval"
- "Once activated by admin, use this password to login"
- "Or click Reset Password link to set your own password"

### Option 3: Activation Endpoint
Add an admin endpoint to bulk-activate employees:
```
POST /api/admin/employees/:id/activate
```

## Support Scripts Location

All scripts are in: `C:\Users\dell\OneDrive\Documents\AVNIYA\FC\backend\`

- `fix-employee-login.js` - Diagnose and fix login issues
- `fix-employee-password.js` - Set/update employee password
- `fix-admin-password.js` - Set/update admin password

## Need More Help?

Run any script without arguments to see usage instructions:
```powershell
node fix-employee-login.js
node fix-employee-password.js
```
