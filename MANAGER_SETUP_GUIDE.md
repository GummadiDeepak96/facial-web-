# Manager Portal Setup Guide

## Overview
The Manager Portal allows department managers to login and view attendance reports for only their department employees.

## Step 1: Create Managers Table

Run the SQL file to create the managers table:

```bash
mysql -u root -p employee_management < backend/database/managers.sql
```

Or manually execute the SQL in MySQL Workbench.

This creates:
- `managers` table with department relationship
- 3 sample managers (IT, HR, Finance departments)

## Step 2: Sample Manager Credentials

After running the SQL, you can login with these credentials:

### IT Department Manager
- **Email**: john.manager@company.com
- **Password**: manager123
- **Department**: IT

### HR Department Manager
- **Email**: sarah.manager@company.com
- **Password**: manager123
- **Department**: HR

### Finance Department Manager
- **Email**: mike.manager@company.com
- **Password**: manager123
- **Department**: Finance

## Step 3: Access Manager Portal

1. Start backend server:
   ```bash
   cd backend
   node server.js
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Go to `http://localhost:3000`

4. Click **"Manager Login"** or navigate to `/manager/login`

5. Login with any of the credentials above

## Manager Features

### Dashboard Overview
- Total employees in department
- Present/Absent/Late statistics for today
- Today's attendance records for department employees

### Employees Tab
- View all employees in your department
- See employee details (name, email, mobile, role)

### Reports Tab
- Attendance reports with date range filter
- View attendance history for department employees
- Export-ready data format

## Important Notes

1. **Department Restriction**: Managers can ONLY see employees from their own department
2. **Read-Only Access**: Managers cannot add/edit/delete employees (admin function)
3. **Attendance Reports**: Managers can view detailed attendance reports for their team
4. **Security**: Each manager is authenticated with JWT tokens

## API Endpoints

Manager routes (requires manager authentication):
- `GET /api/manager/dashboard/stats` - Dashboard statistics
- `GET /api/manager/attendance/report?startDate=X&endDate=Y` - Attendance report
- `GET /api/manager/employees` - List department employees
- `GET /api/manager/employees/:id` - Employee details
- `GET /api/manager/employees/:id/attendance` - Employee attendance history

## Troubleshooting

### "Invalid credentials"
- Verify the managers table exists
- Check password is bcrypt hashed
- Run: `SELECT * FROM managers;` to verify data

### "No employees showing"
- Ensure employees exist in the same department
- Check `employees.department_id` matches `managers.department_id`

### "Attendance data not showing"
- Verify attendance table exists and has data
- Check attendance records are linked to employees in manager's department

## Adding New Managers

To add a new manager:

```sql
-- First, hash the password using Node.js
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('password123', 10, (e,h) => console.log(h))"

-- Then insert the manager
INSERT INTO managers (name, email, password, mobile, department_id, statusflag)
VALUES (
  'Manager Name',
  'manager@company.com',
  '$2a$10$...your-hashed-password-here...',
  '1234567890',
  (SELECT id FROM departments WHERE departmentname = 'IT'),
  1
);
```

## Security Features

- ✅ JWT token-based authentication
- ✅ Department-level access control
- ✅ Password hashing with bcrypt
- ✅ Protected routes requiring manager authentication
- ✅ Cannot access other departments' data
