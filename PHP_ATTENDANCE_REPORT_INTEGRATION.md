# PHP Biometric Attendance (removed from backend)

## Overview
The project previously included backend endpoints that proxied PHP/realtime DB attendance data into the Node.js app. Those backend `/api/php/*` endpoints have been removed. To fetch biometric attendance you should now:

- Call your realtime PHP API (for example the device's `realtime/get_persons.php` or `realtime/attendance_summary` endpoints) directly from the frontend (CORS permitting), or
- Proxy the realtime PHP endpoints through a new backend route you control (if you need server-side auth, aggregation, or to avoid CORS).

This document below describes the expected shapes and guidance if you want to reintroduce the backend proxy later.

### 2. API Service Updates (`frontend/src/services/api.js`)

Added new API endpoints:

```javascript
// Manager API - Added PHP attendance report
export const managerAPI = {
  // ... existing methods
  getPhpAttendanceReport: (params) => api.get('/php/attendance-report', { params }),
};

// New PHP Attendance API
export const phpAttendanceAPI = {
  getAttendanceReport: (params) => api.get('/php/attendance-report', { params }),
  getEmployeeAttendance: (biometricId, params) => api.get(`/php/employee/${biometricId}`, { params }),
  getAllAttendance: () => api.get('/php/attendance'),
};
```

## Frontend Changes

### 1. Admin - AttendanceReport.js

**Changes:**
- Modified `handleShowReport()` to fetch from PHP database
- Validates employee has a biometric_id before fetching
- Fetches data from `/api/php/attendance-report` endpoint
- Updated table display to show PHP database fields:
  - Date, Day, Status, Check In, Check Out
  - Total Hours, Late (min), Early Going (min), Overtime (min)
  - Shift Name

**Usage:**
1. Admin selects department (optional)
2. Admin selects role (optional)
3. Admin selects employee (required - must have biometric_id)
4. Admin selects report type (daily/monthly/custom)
5. Admin clicks "Show Report"
6. System displays biometric attendance data from PHP system

### 2. Manager - ManagerDashboard.js

**Changes:**
- Modified `handleShowReport()` in Reports section
- Fetches attendance based on selected employee's biometric_id
- Updated report display to show PHP fields
- Added report header showing:
  - Employee Name, Biometric ID
  - Department, Role
  - Total Records count

**Table Columns:**
- Date, Day, Status
- Check In, Check Out, Total Hours
- Late (min), Early (min), Overtime (min)
- Shift

### 3. Employee - AttendanceView.js

**Changes:**
- Modified `fetchAttendance()` to use PHP database
- Fetches attendance using employee's biometric_id from sessionStorage
- Updated table display to show:
  - Date, Day, Status
  - Check In, Check Out, Total Hours
  - Late (min), Shift

**Statistics:**
- Calculates from PHP data:
  - Total Days
  - Present Days (status = 'P')
  - Absent Days (status = 'A')
  - Late Days (late_minutes > 0)

## Database Schema

### PHP Database (`realtime`)
Table: `attendance_summary`

Key Fields:
- `biometric_id` - Links to employees.biometric_id
- `employee_id` - Optional link to main database
- `date` - Attendance date
- `day` - Day of week
- `status` - P (Present), A (Absent), L (Leave), etc.
- `check_in` - Check-in time
- `check_out` - Check-out time
- `total_hours` - Total working hours
- `late_minutes` - Minutes late
- `early_going_minutes` - Early departure minutes
- `overtime_minutes` - Overtime minutes
- `shift_name` - Shift name

### Main Database (`employee_management`)
Table: `employees`

Key Field:
- `biometric_id` - 10-digit unique identifier linking to PHP system

## How It Works

### Admin Flow:
1. Admin opens Attendance Report page
2. Selects filters (department, role, employee)
3. **Employee MUST have biometric_id assigned**
4. System fetches data from PHP `realtime` database
5. Displays attendance records with biometric data

### Manager Flow:
1. Manager opens Reports tab
2. Selects employee from department
3. Selects report type and date range
4. System validates employee has biometric_id
5. Fetches from PHP database using biometric_id
6. Displays comprehensive attendance report

### Employee Flow:
1. Employee logs in and views Attendance
2. System automatically gets biometric_id from session
3. Fetches attendance data from PHP database
4. Displays personal attendance history
5. Shows statistics (present, absent, late days)

## Important Notes

### Prerequisites:
1. **Employee must have biometric_id assigned** in main database
2. **PHP database connection must be active** (realtime DB)
3. **Biometric device must push data** to PHP system
4. **Data must exist in attendance_summary table**

### Error Handling:
- Validates biometric_id exists before fetching
- Shows error toast if employee has no biometric_id
- Handles empty results gracefully
- Shows "No records found" if no data available

### Data Flow:
```
Biometric Device → PHP System (realtime DB) → Node.js Backend → React Frontend
```

### Security:
- Uses read-only connection to PHP database (node_reader user)
- No write operations to PHP database
- Authentication required for all endpoints
- Session-based access control

## Testing Checklist

- [ ] Admin can view attendance report for employee with biometric_id
- [ ] Manager can view attendance report for department employees
- [ ] Employee can view personal attendance history
- [ ] Reports filter by date correctly (daily/monthly/custom)
- [ ] Statistics calculate correctly
- [ ] Error handling works for missing biometric_id
- [ ] Empty results display properly
- [ ] Table scrolls horizontally on mobile devices
- [ ] Status badges display with correct colors

## Database Connection Status

**Main Database:** `employee_management` (Read/Write)
- Used for: Employee management, departments, roles, shifts

**PHP Database:** `realtime` (Read-Only)
- Used for: Biometric attendance data
- Connection: `phpDbConnection.js`
- User: `node_reader`

## Next Steps

1. **Test with real biometric data** - Ensure device is pushing to PHP system
2. **Verify data accuracy** - Compare with PHP system reports
3. **Add PDF export** - Implement PDF download for PHP reports
4. **Add more filters** - Consider adding shift, status filters
5. **Performance optimization** - Add caching if needed for large datasets

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/php/attendance` | GET | Get all attendance (50 records) | Yes |
| `/api/php/attendance-report` | GET | Get filtered attendance report | Yes |
| `/api/php/employee/:biometricId` | GET | Get employee attendance by biometric ID | Yes |

## Troubleshooting

### No data showing in reports:
1. Check if employee has biometric_id in employees table
2. Verify data exists in realtime.attendance_summary
3. Check PHP database connection status
4. Verify biometric_id matches between systems

### "Employee does not have a biometric ID assigned":
- Update employee record in Admin → Employee Management
- Add 10-digit biometric_id to employee profile

### Empty attendance records:
- Ensure biometric device is configured to push data
- Check PHP system is receiving punches
- Verify attendance_summary table has data

---

**Integration Complete! ✅**

The system now seamlessly integrates PHP biometric attendance data into all three user roles (Admin, Manager, Employee) with proper filtering, validation, and error handling.
