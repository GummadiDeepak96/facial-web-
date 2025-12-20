# Face Recognition API Usage Guide

## Workflow Overview

```
┌─────────────────────┐
│  Mobile App         │
│  Face Registration  │
└──────────┬──────────┘
           │ POST /api/faces/upload
           │ (embedding, photo, name)
           ▼
┌─────────────────────┐
│  persons table      │
│  approval_status:   │
│  'pending'          │
└──────────┬──────────┘
           │
           │ Admin Reviews
           ▼
┌─────────────────────┐
│  Admin Dashboard    │
│  GET /api/faces/    │
│      pending        │
└──────────┬──────────┘
           │
           │ POST /api/faces/approve/:id
           │ (dept, role, shift)
           ▼
┌─────────────────────┬─────────────────────┐
│  persons table      │  employees table    │
│  approval_status:   │  person_id: linked  │
│  'approved'         │  dept, role, shift  │
└─────────────────────┴─────────────────────┘
           │
           │ Daily Attendance
           ▼
┌─────────────────────┐
│  records table      │
│  person_id/face_id  │
│  log_time, method   │
└─────────────────────┘
```

## API Endpoints

### 1. Face Registration (Mobile/Device)

#### POST /api/faces/upload
Registers a new person with face embedding.

**Request:**
```json
{
  "localId": "device_12345_user_001",
  "personName": "John Doe",
  "faceEmbedding": [0.123, 0.456, ...], // 512 floats
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "registeredLatitude": 12.9716,
  "registeredLongitude": 77.5946,
  "email": "john.doe@example.com",  // optional
  "phone": "+1234567890"             // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Face registered successfully. Awaiting admin approval.",
  "data": {
    "serverId": "42",
    "localId": "device_12345_user_001",
    "approval_status": "pending"
  }
}
```

**Response (Duplicate):**
```json
{
  "success": false,
  "message": "Duplicate face detected",
  "data": {
    "localId": "device_12345_user_001"
  }
}
```

---

### 2. Admin - Get Pending Approvals

#### GET /api/faces/pending
Returns all pending face registrations awaiting approval.

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": [
      {
        "id": "42",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "hasEmbedding": true,
        "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "created_at": 1702742400000
      }
    ],
    "count": 1
  }
}
```

---

### 3. Admin - Approve Person

#### POST /api/faces/approve/:id
Approves a person and creates an employee record.

**Request:**
```json
{
  "department_id": 3,
  "role_id": 5,
  "shift_id": 1,
  "email": "john.doe@company.com",
  "password": "Welcome@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Person approved and employee created successfully",
  "data": {
    "person_id": "42",
    "employee_id": "156",
    "name": "John Doe",
    "email": "john.doe@company.com"
  }
}
```

---

### 4. Admin - Reject Person

#### POST /api/faces/reject/:id
Rejects a person registration.

**Request:**
```json
{
  "reason": "Unclear photo quality"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Person registration rejected",
  "data": {
    "person_id": "42",
    "reason": "Unclear photo quality"
  }
}
```

---

### 5. Get All Faces

#### GET /api/faces/all
Get all registered faces with optional filtering.

**Query Parameters:**
- `status` - Filter by approval status: `pending`, `approved`, `rejected`
- `withImages` - Include base64 images: `true`, `false`

**Examples:**
- `/api/faces/all` - All faces
- `/api/faces/all?status=approved` - Only approved
- `/api/faces/all?status=pending&withImages=true` - Pending with images

**Response:**
```json
{
  "success": true,
  "data": {
    "faces": [
      {
        "id": "42",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "embedding": [0.123, 0.456, ...],
        "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "approval_status": "approved",
        "created_at": 1702742400000
      }
    ],
    "count": 1
  }
}
```

---

### 6. Get Face Image

#### GET /api/faces/image/:id
Get a specific person's face image.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "name": "John Doe",
    "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
  }
}
```

---

### 7. Log Attendance

#### POST /api/faces/attendance/log
Log attendance via face recognition.

**Request:**
```json
{
  "faceId": 42,
  "name": "John Doe",
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "method": "facial",
  "timestamp": 1702742400000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance logged successfully",
  "data": {
    "serverId": "1234",
    "timestamp": 1702742400000
  }
}
```

---

### 8. Get Recent Attendance

#### GET /api/faces/attendance/recent
Get recent attendance logs.

**Query Parameters:**
- `limit` - Number of records (default: 50, max: 500)
- `withImages` - Include base64 images: `true`, `false`

**Example:**
- `/api/faces/attendance/recent?limit=100&withImages=true`

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "1234",
        "faceId": 42,
        "name": "John Doe",
        "method": "facial",
        "imageBase64": "data:image/jpeg;base64,/9j/4AAQ...",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "logTime": 1702742400000
      }
    ]
  }
}
```

---

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
node migrate-face-recognition.js
```

This will:
- Add face recognition columns to `persons` table
- Add attendance logging columns to `records` table
- Create necessary indexes
- Set up approval workflow

### 2. Start Server

```bash
cd backend
npm start
```

Server will run on `http://localhost:5000` (or configured PORT)

### 3. Test Endpoints

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

**Test Face Upload:**
```bash
curl -X POST http://localhost:5000/api/faces/upload \
  -H "Content-Type: application/json" \
  -d '{
    "localId": "test_001",
    "personName": "Test User",
    "faceEmbedding": [0.1, 0.2, ...],  # 512 floats
    "imageBase64": "data:image/jpeg;base64,..."
  }'
```

---

## Integration with Existing System

### Existing Features (Unchanged)
- ✅ Admin dashboard - `/api/admin/*`
- ✅ Employee portal - `/api/employee/*`
- ✅ Manager dashboard - `/api/manager/*`
- ✅ Authentication - `/api/auth/*`
- ✅ PHP proxy - `/api/php/*`

### New Features
- 🆕 Face registration - `/api/faces/upload`
- 🆕 Pending approvals - `/api/faces/pending`
- 🆕 Approve/reject - `/api/faces/approve/:id`, `/api/faces/reject/:id`
- 🆕 Face attendance - `/api/faces/attendance/log`
- 🆕 Recent logs - `/api/faces/attendance/recent`

---

## Mobile App Integration

### 1. Initial Setup
```javascript
const BASE_URL = 'http://your-server:5000/api';

// Get all approved faces for local matching
async function syncFaces() {
  const response = await fetch(`${BASE_URL}/faces/all?status=approved`);
  const data = await response.json();
  // Store embeddings locally for offline matching
  return data.data.faces;
}
```

### 2. Register New Face
```javascript
async function registerFace(embedding, photo, name, location) {
  const response = await fetch(`${BASE_URL}/faces/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      localId: `${deviceId}_${Date.now()}`,
      personName: name,
      faceEmbedding: embedding, // 512 floats
      imageBase64: photo,
      registeredLatitude: location.lat,
      registeredLongitude: location.lng
    })
  });
  return await response.json();
}
```

### 3. Log Attendance
```javascript
async function logAttendance(faceId, name, photo, location) {
  const response = await fetch(`${BASE_URL}/faces/attendance/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      faceId: faceId,
      name: name,
      imageBase64: photo,
      latitude: location.lat,
      longitude: location.lng,
      method: 'facial',
      timestamp: Date.now()
    })
  });
  return await response.json();
}
```

---

## Admin Dashboard Integration

### Add Pending Approvals View

```javascript
// Fetch pending registrations
async function getPendingApprovals() {
  const response = await fetch('/api/faces/pending');
  const data = await response.json();
  return data.data.pending;
}

// Approve a person
async function approvePerson(personId, deptId, roleId, shiftId, email, password) {
  const response = await fetch(`/api/faces/approve/${personId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      department_id: deptId,
      role_id: roleId,
      shift_id: shiftId,
      email: email,
      password: password
    })
  });
  return await response.json();
}

// Reject a person
async function rejectPerson(personId, reason) {
  const response = await fetch(`/api/faces/reject/${personId}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });
  return await response.json();
}
```

---

## Security Notes

1. **Authentication**: Add authentication middleware to admin endpoints
2. **Rate Limiting**: Implement rate limiting for upload endpoints
3. **File Size**: 20MB JSON payload limit (configurable)
4. **Validation**: All inputs are validated (embedding size, lat/lng ranges, etc.)
5. **Duplicate Detection**: Cosine similarity threshold at 0.95
6. **SQL Injection**: All queries use parameterized statements

---

## Troubleshooting

### Migration Issues
```bash
# Check if columns exist
mysql -u root -p realtime -e "DESCRIBE persons;"
mysql -u root -p realtime -e "DESCRIBE records;"

# Re-run migration (safe to run multiple times)
node backend/migrate-face-recognition.js
```

### Image Upload Issues
```bash
# Check upload directory permissions
ls -la backend/uploads/faces/

# Create directory manually if needed
mkdir -p backend/uploads/faces
```

### Duplicate Detection Not Working
- Verify embeddings are exactly 512 floats
- Check JSON parsing in database
- Adjust similarity threshold in routes/faces.js

---

## Database Schema Reference

### persons table (Face Registration)
```sql
id                    INT AUTO_INCREMENT PRIMARY KEY
name                  VARCHAR(255)
email                 VARCHAR(255)
phone                 VARCHAR(50)
embedding_json        TEXT                    -- 512 float array
image_path            VARCHAR(500)            -- uploads/faces/xxx.jpg
registered_latitude   DECIMAL(10, 8)
registered_longitude  DECIMAL(11, 8)
local_id              VARCHAR(255)            -- offline sync ID
approval_status       ENUM('pending', 'approved', 'rejected')
created_at            BIGINT                  -- timestamp
updated_at            BIGINT                  -- timestamp
```

### employees table (Approved Personnel)
```sql
id                    INT AUTO_INCREMENT PRIMARY KEY
person_id             INT                     -- FK to persons
name                  VARCHAR(255)
email                 VARCHAR(255)
password              VARCHAR(255)
department_id         INT                     -- FK to departments
role_id               INT                     -- FK to roles
shift_id              INT                     -- FK to shifts
statusflag            TINYINT DEFAULT 1
```

### records table (Attendance Logs)
```sql
id                    INT AUTO_INCREMENT PRIMARY KEY
person_id             INT                     -- FK to persons
face_id               INT                     -- person ID for face recognition
name                  VARCHAR(255)
date                  DATE
method                VARCHAR(50)             -- facial/biometric/password
image_path            VARCHAR(500)            -- attendance photo
latitude              DECIMAL(10, 8)
longitude             DECIMAL(11, 8)
log_time              BIGINT                  -- timestamp
created_at            BIGINT
```
