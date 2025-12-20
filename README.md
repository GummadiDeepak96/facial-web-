# Employee Management System

A comprehensive employee management system with attendance tracking, biometric integration, and real-time reporting built with React, Node.js, Express, and MySQL.

## Features

### Admin Dashboard
- **Employee Management**: Add, edit, and manage employee profiles with photo uploads
- **Department Management**: Create and manage company departments
- **Role Management**: Define and assign employee roles
- **Attendance Monitoring**: Real-time attendance tracking with late/on-time status
- **Dashboard Analytics**: View total employees, present/absent counts, and late arrivals
- **Multi-device Access Tracking**: Track employee access through facial recognition, biometric, ID barcode, or password

### Employee Portal
- **Personal Profile**: View and manage personal information
- **Attendance History**: View personal attendance records with filtering by month/year
- **Public Holidays**: View company holidays and upcoming events
- **Notifications**: Receive and manage workplace notifications
- **Clock In/Out**: Web-based attendance marking with device tracking
- **Password Management**: Change account password securely

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Separate admin and employee access levels
- **Password Encryption**: Bcrypt password hashing
- **Session Management**: Automatic token expiration and refresh

## Technology Stack

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
- **Multer**: File upload handling
- **Express Validator**: Input validation

### Frontend
- **React**: User interface library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **React Toastify**: Notifications
- **Lucide React**: Icons
- **Date-fns**: Date formatting

## Database Schema

### Tables
1. **employees**: Employee profiles with personal and job information
2. **employee_access**: Track access methods (facial, biometric, ID barcode, password)
3. **employee_attendance**: Daily attendance records with check-in/out times
4. **departments**: Company departments
5. **roles**: Employee roles and positions
6. **admins**: Admin user accounts
7. **public_holidays**: Company holidays
8. **notifications**: Employee notifications

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- Git

### Database Setup

1. **Create MySQL Database**:
   ```sql
   CREATE DATABASE employee_management;
   USE employee_management;
   ```

2. **Run Database Schema**:
   ```bash
   # Execute the SQL file in your MySQL client
   mysql -u root -p employee_management < database/schema.sql
   ```

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Update the `.env` file in the backend directory with your database credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=employee_management
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h
   UPLOAD_PATH=uploads/
   MAX_FILE_SIZE=5MB
   ```

4. **Start the backend server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend development server**:
   ```bash
   npm start
   ```

   The frontend will run on `http://localhost:3000`

## Database Setup

Before logging in, ensure you have:

1. Created the MySQL database `employee_management`
2. Created all required tables (employees, departments, roles, shifts, attendance, etc.)
3. Created an admin user in the employees table with role 'Admin'

### Creating an Admin User

Run this SQL query to create your first admin user:

```sql
-- First, ensure you have an 'Admin' role
INSERT INTO roles (rolename) VALUES ('Admin');

-- Then create the admin employee (password: admin123)
INSERT INTO employees (
  name, 
  mobile, 
  email, 
  password, 
  role_id, 
  statusflag,
  createddate,
  updateddate
) VALUES (
  'Admin User',
  '1234567890',
  'admin@company.com',
  '$2a$10$YourHashedPasswordHere', -- Use bcrypt to hash 'admin123'
  (SELECT id FROM roles WHERE rolename = 'Admin'),
  1,
  NOW(),
  NOW()
);
```

*Note: You'll need to hash the password using bcrypt before inserting. Change the default password after first login.*

### Sample Employee
You can create employee accounts through the admin dashboard after logging in as admin.

## Project Structure

```
FC/
├── frontend/          # React frontend application
│   ├── public/        # Static files
│   ├── src/           # React source code
│   └── package.json   # Frontend dependencies
├── backend/           # Node.js backend application
│   ├── server.js      # Main server file
│   ├── config.js      # Configuration file
│   └── package.json   # Backend dependencies
└── README.md          # This file
```

## Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```

The frontend will run on `http://localhost:3000`

## API Endpoints

- `GET /api/test` - Test endpoint to verify backend connection
- `GET /api/health` - Health check endpoint

## Features

- ✅ React frontend with modern setup
- ✅ Express.js backend server
- ✅ CORS enabled for cross-origin requests
- ✅ Proxy configuration for development
- ✅ Error handling middleware
- ✅ Health check endpoints
- ✅ Modern UI with responsive design

## Development

- The frontend is configured to proxy API requests to the backend during development
- Both servers can run simultaneously on different ports
- The backend includes nodemon for automatic restarts during development

## Next Steps

You can now:
1. Add more API routes to the backend
2. Create additional React components
3. Add a database connection
4. Implement authentication
5. Add more styling and UI components
