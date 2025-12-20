# Face Recognition Server Integration Plan

## Overview
This document outlines the safe integration of face recognition server functionality into the existing Employee Management System. The original implementation used `faces` and `attendance_logs` tables, which have been merged into `persons` and `records` tables respectively.

## Current System Architecture

### Workflow
1. **Face Registration** → `persons` table (initial face capture with embedding)
2. **Admin Approval** → Admin assigns department, role, shift
3. **Employee Creation** → `employees` table (approved persons with job details)
4. **Attendance Tracking** → `records` table (daily attendance logs)

### Database Schema
- **persons table**: Initial face registration data (PRIMARY entry point for face recognition)
  - Existing columns: `id`, `name`, `email`, `phone`, `address`, `photo`
  - Face recognition columns: `embedding_json`, `registered_latitude`, `registered_longitude`, `local_id`, `client_id`, `image_path`, `created_at`, `updated_at`, `approval_status`
  - Status: Pending approval until admin creates employee record
  
- **employees table**: Approved persons with job assignments
  - Links to persons via `person_id` foreign key
  - Contains: `department_id`, `role_id`, `shift_id`, `statusflag`
  - Created by admin after reviewing persons table
  
- **records table**: Attendance logs for both persons and employees
  - Can link to `person_id` (for pre-approval attendance) or via `face_id`
  - Existing columns: `id`, `person_id`, `date`, `checkin`, `checkout`, `status`
  - Face recognition columns: `face_id`, `method`, `image_path`, `latitude`, `longitude`, `log_time`, `created_at`

### Existing API Endpoints
- `/api/admin/*` - Admin operations (employee management, departments, roles)
- `/api/employee/*` - Employee operations (profile, attendance view)
- `/api/manager/*` - Manager operations
- `/api/auth/*` - Authentication
- `/api/php/*` - PHP proxy for biometric device data

## Integration Strategy

### Phase 1: Database Schema Extension (Non-Breaking)
Add new columns to existing tables without removing any existing columns:

**persons table additions:**
```sql
ALTER TABLE persons 
ADD COLUMN IF NOT EXISTS embedding_json TEXT COMMENT 'Face embedding vector (512 floats)',
ADD COLUMN IF NOT EXISTS registered_latitude DECIMAL(10, 8) COMMENT 'Registration location latitude',
ADD COLUMN IF NOT EXISTS registered_longitude DECIMAL(11, 8) COMMENT 'Registration location longitude',
ADD COLUMN IF NOT EXISTS local_id VARCHAR(255) COMMENT 'Local/offline sync ID',
ADD COLUMN IF NOT EXISTS client_id VARCHAR(255) COMMENT 'Client device ID',
ADD COLUMN IF NOT EXISTS image_path VARCHAR(500) COMMENT 'Path to face image',
ADD COLUMN IF NOT EXISTS created_at BIGINT COMMENT 'Timestamp of registration',
ADD COLUMN IF NOT EXISTS updated_at BIGINT COMMENT 'Timestamp of last update',
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Admin approval status',
ADD INDEX idx_approval_status (approval_status),
ADD INDEX idx_local_id (local_id);
```

**records table additions:**
```sql
ALTER TABLE records 
ADD COLUMN IF NOT EXISTS face_id INT,
ADD COLUMN IF NOT EXISTS method VARCHAR(50),
ADD COLUMN IF NOT EXISTS image_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS log_time BIGINT,
ADD COLUMN IF NOT EXISTS created_at BIGINT;
```

### Phase 2: Helper Functions
Add face recognition specific helpers to server.js:
- `stripBase64Prefix()` - Remove data URI prefix from base64 images
- `saveBase64Image()` - Save base64 encoded images to disk
- `cosineSimilarity()` - Calculate similarity between embeddings
- `isDuplicateEmbedding()` - Check for duplicate faces
- `validateEmbedding()` - Validate 512-float embedding arrays

### Phase 3: New API Endpoints
Create new face recognition endpoints that work with existing tables:

#### Face Management APIs
1. **POST /api/faces/upload**
   - Purpose: Upload face data from mobile/offline clients
   - Maps to: `persons` table
   - Fields: localId, personName, faceEmbedding, imageBase64, registeredLatitude, registeredLongitude
   - Returns: serverId (persons.id), localId

2. **GET /api/faces/all**
   - Purpose: Get all registered faces with embeddings
   - Maps to: `persons` table
   - Returns: Array of faces with id, name, embedding, imageBase64, latitude, longitude

3. **GET /api/faces/image/:id**
   - Purpose: Get face image by person ID
   - Maps to: `persons` table
   - Returns: Person's face image in base64

#### Attendance APIs
4. **POST /api/attendance/log**
   - Purpose: Log attendance from face recognition
   - Maps to: `records` table
   - Fields: faceId, name, imageBase64, latitude, longitude, method, timestamp
   - Returns: serverId (records.id), timestamp

5. **GET /api/attendance/recent**
   - Purpose: Get recent attendance logs
   - Maps to: `records` table
   - Query params: limit, withImages
   - Returns: Array of recent attendance logs

### Phase 4: Backward Compatibility
- Existing admin/employee/manager endpoints remain unchanged
- New endpoints use separate route prefix `/api/faces/*` and `/api/attendance/*`
- Database changes are additive only (no columns removed)
- Existing queries continue to work with original columns

## Implementation Checklist

- [ ] Create database migration script (add new columns)
- [ ] Add helper functions to server.js
- [ ] Create face recognition route handlers
- [ ] Add upload directory creation logic
- [ ] Test new endpoints independently
- [ ] Verify existing functionality still works
- [ ] Update API documentation

## Security Considerations

1. **File Upload Security**
   - Validate base64 image data
   - Sanitize filenames
   - Limit file sizes (20MB JSON payload limit)
   - Store images outside web root

2. **Data Validation**
   - Validate embedding array (must be 512 floats)
   - Validate latitude/longitude ranges
   - Sanitize all user inputs
   - Prevent SQL injection via parameterized queries

3. **Duplicate Prevention**
   - Check embedding similarity (0.95 threshold)
   - Check for duplicate timestamps
   - Prevent race conditions with proper DB transactions

## Testing Strategy

1. **Unit Tests**
   - Test helper functions (cosine similarity, base64 handling)
   - Test validation functions

2. **Integration Tests**
   - Test face upload with valid/invalid data
   - Test duplicate detection
   - Test attendance logging
   - Test image retrieval

3. **Backward Compatibility Tests**
   - Verify admin dashboard still works
   - Verify employee portal still works
   - Verify existing attendance queries work
   - Verify department/role management works

## Rollback Plan

If issues occur:
1. Remove new route registrations from server.js
2. Existing functionality continues without interruption
3. New columns can remain (they won't affect existing queries)
4. Re-deploy previous server.js version if needed

## Migration Notes

### For Mobile Clients
- Mobile apps can now use `/api/faces/upload` for face registration
- Use `/api/attendance/log` for attendance marking with face recognition
- Both endpoints support offline sync via localId/timestamp tracking

### For Existing Web Frontend
- No changes required to existing React components
- New face recognition features can be added incrementally
- Existing authentication and authorization unchanged

## Performance Considerations

1. **Embedding Comparison**
   - Duplicate detection scans all stored embeddings
   - Consider indexing or limiting scan scope for large datasets
   - Can add caching layer if needed

2. **Image Storage**
   - Images stored on disk, not in database
   - Paths stored in database for retrieval
   - Consider CDN integration for production scale

3. **Connection Pooling**
   - Existing pool configuration should handle additional load
   - Monitor connection usage under load
   - Adjust `connectionLimit` if needed

## Next Steps

1. Review and approve this plan
2. Create database migration script
3. Implement helper functions
4. Create new route handlers
5. Test thoroughly
6. Deploy to staging
7. Verify production readiness
8. Deploy to production
