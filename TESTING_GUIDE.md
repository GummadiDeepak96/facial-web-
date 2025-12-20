# Quick Testing Guide - PHP Attendance Reports

## Test the Integration

### 1. Test Backend Endpoints (via Browser or Postman)

#### Note about PHP attendance endpoints:

The project no longer exposes `/api/php/*` endpoints from the backend. Attendance data from the biometric device should be accessed directly from your realtime PHP API (for example the device's `realtime/get_persons.php` or an equivalent endpoint) or you can proxy those realtime endpoints through your own backend route.

If you previously used `/api/php/attendance`, call your realtime PHP DB endpoint directly (adjust host/port as needed).

#### Test Employee Attendance:
```
GET http://localhost:5000/api/php/employee/1234567890?month=11&year=2024
```
Replace `1234567890` with actual biometric_id from your database

**Expected:**
```json
{
  "success": true,
  "count": 22,
  "attendance": [...],
  "statistics": {
    "total_days": 22,
    "present_days": 20,
    "absent_days": 2,
    "late_days": 3
  }
}
```

#### Test Filtered Report:
```
GET http://localhost:5000/api/php/attendance-report?biometricId=1234567890&reportType=daily&date=2024-11-06
```

---

## 2. Test Admin Dashboard

### Steps:
1. Login as Admin
2. Navigate to **Attendance Report** page
3. Select Department (optional)
4. Select Role (optional)
5. **Select Employee** (MUST have biometric_id)
6. Select Report Type:
   - **Daily**: Choose specific date
   - **Monthly**: Choose month
   - **Custom**: Choose date range
7. Click **"Show Report"**

### Expected Results:
✅ Report displays with:
- Employee Name
- Biometric ID
- Department & Role
- Attendance records with dates
- Check in/out times
- Total hours, late minutes, etc.

### Common Issues:
❌ **"Employee does not have a biometric ID assigned"**
- Solution: Add biometric_id to employee in Employee Management

❌ **No records showing**
- Check: Employee exists in PHP attendance_summary table
- Check: Date range matches available data

---

## 3. Test Manager Dashboard

### Steps:
1. Login as Manager
2. Go to **Reports** tab
3. Select Report Type (Daily/Monthly/Custom)
4. Choose Date/Month/Date Range
5. Select Role (optional)
6. **Select Employee** from department
7. Click **"Show Report"**

### Expected Results:
✅ Report header shows:
- Employee Name, Biometric ID
- Department, Role
- Total Records count

✅ Table displays:
- Date, Day, Status
- Check In, Check Out, Total Hours
- Late, Early, Overtime (in minutes)
- Shift Name

---

## 4. Test Employee Dashboard

### Steps:
1. Login as Employee (must have biometric_id assigned)
2. Go to **Attendance** tab
3. Select Month from dropdown
4. Select Year from dropdown

### Expected Results:
✅ Statistics cards show:
- Total Days
- Present Days
- Absent Days
- Late Days

✅ Table displays:
- Date, Day
- Status (Present/Absent with icons)
- Check In, Check Out
- Total Hours
- Late minutes
- Shift Name

### Common Issues:
❌ **No data showing**
- Employee must have biometric_id in employees table
- Check sessionStorage has user data with biometric_id
- Verify PHP database has records for this biometric_id

---

## 5. Database Verification

### Check Employee has Biometric ID:
```sql
-- In employee_management database
SELECT employeeid, name, biometric_id 
FROM employees 
WHERE biometric_id IS NOT NULL;
```

### Check PHP Attendance Data:
```sql
-- In realtime database
SELECT * FROM attendance_summary 
WHERE biometric_id = '1234567890' 
ORDER BY date DESC 
LIMIT 10;
```

### Check Data Linkage:
```sql
-- Verify employees with attendance data
SELECT 
    e.employeeid,
    e.name,
    e.biometric_id,
    COUNT(a.id) as attendance_count
FROM employee_management.employees e
LEFT JOIN realtime.attendance_summary a ON e.biometric_id = a.biometric_id
WHERE e.biometric_id IS NOT NULL
GROUP BY e.employeeid;
```

---

## 6. Sample Test Data

If you need test data, you can insert sample records:

```sql
-- Insert test attendance in PHP database (realtime)
INSERT INTO attendance_summary 
(biometric_id, employee_id, date, day, status, check_in, check_out, total_hours, late_minutes, shift_name)
VALUES 
('1234567890', 1, '2024-11-06', 'Wednesday', 'P', '09:15:00', '18:30:00', '9:15', 15, 'General Shift'),
('1234567890', 1, '2024-11-05', 'Tuesday', 'P', '09:00:00', '18:00:00', '9:00', 0, 'General Shift'),
('1234567890', 1, '2024-11-04', 'Monday', 'P', '09:30:00', '18:15:00', '8:45', 30, 'General Shift');
```

---

## 7. Browser Console Testing

### Test API Call from Browser Console:
```javascript
// Open browser console (F12) while logged in
fetch('http://localhost:5000/api/php/attendance-report?biometricId=1234567890&reportType=daily&date=2024-11-06', {
  headers: {
    'Authorization': 'Bearer ' + sessionStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 8. Error Scenarios to Test

### Scenario 1: Employee without Biometric ID
- Select employee with NULL biometric_id
- Expected: Error toast "Employee does not have a biometric ID assigned"

### Scenario 2: Invalid Date Range
- Set start date after end date in custom range
- Expected: Warning toast "Start date cannot be after end date"

### Scenario 3: No Employee Selected
- Click "Show Report" without selecting employee
- Expected: Warning toast "Please select an employee to view the report"

### Scenario 4: No Data Available
- Select valid employee and date with no attendance data
- Expected: "No attendance records found" in table

---

## 9. Performance Testing

### Test with Large Dataset:
1. Select monthly report for employee with many records
2. Check loading time (should show "Loading report..." spinner)
3. Verify table renders smoothly
4. Test horizontal scroll on mobile devices

---

## 10. Cross-Browser Testing

Test on:
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if on Mac)

---

## Success Criteria

✅ All three roles (Admin, Manager, Employee) can view attendance reports
✅ Reports filter correctly by date range
✅ Employee validation works (biometric_id check)
✅ Empty states display properly
✅ Error messages are clear and helpful
✅ Statistics calculate correctly
✅ Table scrolls on mobile devices
✅ Status badges display with appropriate colors

---

## Quick Troubleshooting Commands

### Check Backend Logs:
```bash
# In backend terminal, watch for errors
```

### Check PHP Database Connection:
```bash
cd backend
node -e "const {phpDb} = require('./database/phpDbConnection'); setTimeout(() => console.log('Connected!'), 2000);"
```

### Verify Route Registration:
```bash
# In backend/server.js, check for:
# app.use('/api/php', phpAttendanceRoutes)
```

---

**Happy Testing! 🚀**

If you encounter any issues, check:
1. Backend server is running (port 5000)
2. Frontend is running (port 3000)
3. PHP database connection is active
4. Employee has valid biometric_id
5. Data exists in attendance_summary table
