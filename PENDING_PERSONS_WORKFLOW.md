# Pending Persons Approval Workflow - FIXED

## Issues Fixed:
1. ✅ **Admin Login** - Works correctly, uses `admins` table
2. ✅ **Status Column Error** - Fixed to use `status` instead of `statusflag`
3. ✅ **Pending Persons Endpoints** - Added two new endpoints

## New Endpoints Added:

### 1. GET /api/admin/pending-persons
**Purpose**: Get list of persons who registered via mobile but are not yet approved as employees

**Response**:
```json
[
  {
    "id": 147260,
    "name": "sanjay",
    "image_path": "uploads/faces/1734364123_sanjay.jpg",
    "registered_latitude": 17.385,
    "registered_longitude": 78.486,
    "created_at": 1734364123000
  }
]
```

### 2. POST /api/admin/approve-person/:personId
**Purpose**: Approve a person and create employee record with department, role, shift

**Body**:
```json
{
  "email": "sanjay@company.com",
  "department": "IT",
  "role": "Developer",
  "shift": "Morning"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Person approved and employee created",
  "employeeId": 123,
  "credentials": {
    "email": "sanjay@company.com",
    "password": "Generated123"
  }
}
```

## Complete Workflow:

### Step 1: Mobile Face Registration
- Mobile app uploads face to `/api/faces/upload`
- Creates record in `person` table with face embedding
- Person gets ID (e.g., 147260)

### Step 2: Admin Sees Pending List
- Admin logs in successfully
- Calls `/api/admin/pending-persons`
- Sees list of people who registered but aren't employees yet
- Shows: name, photo, registration location, date

### Step 3: Admin Approves Person
- Admin selects person from list
- Fills in: email, department, role, shift
- Calls `/api/admin/approve-person/:personId`
- System creates employee record linked to person_id
- Generates password and sends email to new employee

### Step 4: Attendance Logging Works
- Mobile sends attendance to `/api/attendance/log` with faceId (person.id)
- System inserts into `records` table with enroll_id = person_id
- **Pipeline automatically updates `attendance_summary`**:
  - Checks if employee exists for this person_id
  - Gets their shift start time
  - Creates/updates daily summary
  - Calculates if Late or On Time
  - Sets status as Present

## Database Tables:

### person
- Contains face registrations from mobile
- Has: id, name, embedding_json, image_path, created_at

### employees  
- Contains approved employees only
- Has: person_id (FK to person.id), email, department, role, shift, status, password

### records
- All attendance punches
- Has: enroll_id (= person.id), records_time, name, method, latitude, longitude

### attendance_summary
- Daily attendance summary
- Has: enroll_id (= person.id), date, first_in, last_out, status, late_status, shift_start
- **Automatically updated** when attendance is logged

## Key Points:
- ✅ Person can mark attendance even before becoming employee (stays in records)
- ✅ Once approved as employee, attendance_summary gets updated properly
- ✅ Admin must approve each person manually
- ✅ Email with credentials sent automatically on approval
