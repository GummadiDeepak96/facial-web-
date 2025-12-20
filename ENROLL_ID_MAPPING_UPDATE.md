# Enroll ID Mapping Update

## Overview
Updated the system to use `enroll_id` from the PHP `attendance_summary` table to match with `employeeid` from the `employees` table, instead of using `biometric_id`.

## Database Schema Mapping

### PHP Database (`realtime`)
Table: `attendance_summary`
- **`enroll_id`** - Matches employee ID from main database
- `id` - Primary key
- `date` - Attendance date  
- `day` - Day of week
- `status` - P (Present), A (Absent), etc.
- `first_in` - First check-in time
- `last_out` - Last check-out time
- `shift_start` - Shift start time
- `late_status` - "Late" or empty/null

### Main Database (`employee_management`)
Table: `employees`
- **`employeeid`** - Primary key, matches `enroll_id` in attendance_summary
- `name` - Employee name
- `email` - Employee email
- `department_id` - Department reference
- `role_id` - Role reference

## Backend Changes

### 1. `backend/routes/phpAttendance.js`
**Changed:**
- `biometricId` parameter → `enrollId` parameter
- Query filter: `biometric_id = ?` → `enroll_id = ?`
- Uses `employeeId` to match `enroll_id`

**Endpoints Updated:**
```javascript
// Get attendance report
GET /api/php/attendance-report?employeeId=123&reportType=daily&date=2024-11-06

// Get employee attendance
GET /api/php/employee/:enrollId?month=11&year=2024
```

**Statistics Calculation:**
- `late_days` now uses `late_status = 'Late'` instead of `late_minutes > 0`

### 2. `backend/routes/manager.js`
**Changed:**
- Fetches `employeeid` from department employees
- Queries using `enroll_id IN (employeeIds)`
- Joins: `a.enroll_id = e.employeeid`
- Field mappings:
  - `first_in` → clock_in_time
  - `last_out` → clock_out_time
  - `late_status` → time_status

### 3. `backend/routes/admin.js`
**Changed:**
- Fetches all `employeeid` values
- Queries using `enroll_id IN (employeeIds)`
- Joins: `a.enroll_id = e.employeeid`
- Same field mappings as manager route

## Frontend Changes

### 1. `AttendanceView.js` (Employee)
**Changed:**
- Uses `userData.employeeid` instead of `userData.biometric_id`
- API call: `/api/php/employee/${userData.employeeid}`
- Table columns updated:
  - `check_in` → `first_in`
  - `check_out` → `last_out`
  - `late_minutes` → `late_status`
  - `shift_name` → `shift_start`

### 2. `ManagerDashboard.js`
**Changed:**
- Uses `employee.employeeid` instead of `employee.biometric_id`
- Removed biometric_id validation
- Report header displays `Employee ID` instead of `Biometric ID`
- Table columns:
  - `check_in` → `first_in`
  - `check_out` → `last_out`
  - `total_hours`, `late_minutes`, `early_going_minutes`, `overtime_minutes` → removed
  - `late_status` → added
  - `shift_start` → added

**New Table Structure:**
| Date | Day | Status | First In | Last Out | Late Status | Shift Start |
|------|-----|--------|----------|----------|-------------|-------------|

### 3. `AttendanceReport.js` (Admin)
**Changed:**
- Uses `employee.employeeid` instead of `employee.biometric_id`
- Removed biometric_id validation
- Report metadata displays `Employee ID` instead of `Biometric ID`
- Same table structure as Manager dashboard

## Field Mapping Reference

| Old Field (Expected) | New Field (Actual) | Description |
|---------------------|-------------------|-------------|
| `biometric_id` | `enroll_id` | Employee identifier |
| `check_in` | `first_in` | First check-in time |
| `check_out` | `last_out` | Last check-out time |
| `late_minutes` | `late_status` | Late indicator (text) |
| `shift_name` | `shift_start` | Shift information |
| `total_hours` | N/A | Not in table |
| `early_going_minutes` | N/A | Not in table |
| `overtime_minutes` | N/A | Not in table |

## Data Flow

### Employee Attendance View:
```
1. Get employeeid from sessionStorage
2. Call /api/php/employee/:enrollId
3. Backend queries: WHERE enroll_id = employeeid
4. Returns attendance records with first_in, last_out, late_status
5. Display in table with proper formatting
```

### Manager/Admin Reports:
```
1. Select employee from dropdown
2. Get employee.employeeid
3. Call /api/php/attendance-report?employeeId=123
4. Backend queries: WHERE enroll_id = 123
5. Returns filtered attendance records
6. Display with employee details
```

### Dashboard Statistics:
```
1. Get all employeeids in department (Manager) or all active (Admin)
2. Query: WHERE enroll_id IN (employeeIds)
3. Count present: status = 'P'
4. Count late: late_status = 'Late'
5. Calculate absent: total - present
6. Display in stat cards
```

## Testing Checklist

- [ ] Employee can view attendance with employeeid
- [ ] Manager dashboard shows correct attendance counts
- [ ] Admin dashboard shows correct attendance counts
- [ ] Manager reports filter by employeeid correctly
- [ ] Admin reports filter by employeeid correctly
- [ ] Table displays first_in, last_out, late_status correctly
- [ ] Status badges show Present/Absent correctly
- [ ] Late status displays as "Late" or "On Time"
- [ ] No more "biometric_id required" errors
- [ ] All employees can see their attendance

## SQL Query Examples

### Get employee attendance:
```sql
SELECT * FROM attendance_summary 
WHERE enroll_id = 123 
  AND MONTH(date) = 11 
  AND YEAR(date) = 2024
ORDER BY date DESC;
```

### Get today's present count:
```sql
SELECT COUNT(*) as count 
FROM attendance_summary
WHERE DATE(date) = '2024-11-06' 
  AND status = 'P' 
  AND enroll_id IN (1, 2, 3, 4, 5);
```

### Get late employees:
```sql
SELECT COUNT(*) as count 
FROM attendance_summary
WHERE DATE(date) = '2024-11-06' 
  AND late_status = 'Late' 
  AND enroll_id IN (1, 2, 3, 4, 5);
```

## Important Notes

1. **No biometric_id needed**: System now works with just `employeeid`
2. **Late detection**: Changed from numeric `late_minutes` to text `late_status`
3. **Field names**: Frontend now uses actual PHP database field names
4. **Time fields**: Uses `first_in` and `last_out` instead of single check-in/out
5. **Shift info**: Uses `shift_start` time instead of shift name

## Benefits

✅ **Simpler**: No need to maintain biometric_id mapping
✅ **Direct**: Employee ID directly matches enroll_id
✅ **Accurate**: Uses actual database field names
✅ **Complete**: All employees have employeeid, no missing IDs
✅ **Consistent**: Same ID used across both databases

---

**All changes deployed!** 🚀

Please restart your backend server for changes to take effect.
