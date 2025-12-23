# Code Reference - Key Components

## 1. Login Component Structure

### File: `frontend/src/components/auth/Login.js`

**Key Imports:**
```javascript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Login.css';
```

**State Management:**
```javascript
const [userType, setUserType] = useState('employee'); // employee, manager, admin
const [formData, setFormData] = useState({
  email: '',
  password: ''
});
const [loading, setLoading] = useState(false);
```

**Role Selection Handler:**
```javascript
const handleUserTypeChange = (type) => {
  setUserType(type);
};
```

**Form Input Handler:**
```javascript
const handleChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};
```

**Form Submission Handler:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    let response;
    
    if (userType === 'admin') {
      response = await authAPI.adminLogin(formData);
    } else if (userType === 'manager') {
      response = await authAPI.managerLogin(formData);
    } else {
      response = await authAPI.employeeLogin(formData);
    }

    const { user, token } = response.data;
    login(user, token);
    toast.success('Login successful!');
    
    const dashboardPath = userType === 'admin' ? '/admin/dashboard' : 
                         userType === 'manager' ? '/manager/dashboard' : 
                         '/employee/dashboard';
    
    navigate(dashboardPath, { replace: true });
  } catch (error) {
    const message = error.response?.data?.error || 'Login failed. Please try again.';
    toast.error(message);
  } finally {
    setLoading(false);
  }
};
```

## 2. Login Form JSX

**User Type Selector:**
```jsx
<div className="user-type-selector">
  <label className="user-type-label">LOGIN AS</label>
  <div className="radio-group">
    <label className="radio-option">
      <input
        type="radio"
        name="userType"
        value="employee"
        checked={userType === 'employee'}
        onChange={() => handleUserTypeChange('employee')}
      />
      <span>EMPLOYEE</span>
    </label>
    <label className="radio-option">
      <input
        type="radio"
        name="userType"
        value="manager"
        checked={userType === 'manager'}
        onChange={() => handleUserTypeChange('manager')}
      />
      <span>MANAGER</span>
    </label>
    <label className="radio-option">
      <input
        type="radio"
        name="userType"
        value="admin"
        checked={userType === 'admin'}
        onChange={() => handleUserTypeChange('admin')}
      />
      <span>ADMIN</span>
    </label>
  </div>
</div>
```

**Form Fields:**
```jsx
<form onSubmit={handleSubmit} className="login-form">
  <div className="form-group">
    <label htmlFor="email">EMAIL ADDRESS <span className="required">*</span></label>
    <input
      type="email"
      id="email"
      name="email"
      value={formData.email}
      onChange={handleChange}
      required
      placeholder="Enter your email address"
    />
  </div>

  <div className="form-group">
    <label htmlFor="password">PASSWORD <span className="required">*</span></label>
    <input
      type="password"
      id="password"
      name="password"
      value={formData.password}
      onChange={handleChange}
      required
      placeholder="Enter your password"
    />
  </div>

  <button 
    type="submit" 
    className="login-btn"
    disabled={loading}
  >
    {loading ? 'Signing in...' : 'Login'}
  </button>
</form>
```

## 3. CSS Styling Key Classes

### File: `frontend/src/components/auth/Login.css`

**User Type Selector:**
```css
.user-type-selector {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.user-type-label {
  display: block;
  color: #333;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.radio-group {
  display: flex;
  gap: 15px;
  justify-content: space-between;
}
```

**Radio Button Styling:**
```css
.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
  padding: 10px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-align: center;
}

.radio-option:hover {
  border-color: #667eea;
  background-color: #f8f9ff;
}

.radio-option input[type="radio"] {
  cursor: pointer;
  accent-color: #667eea;
  width: 18px;
  height: 18px;
  margin: 0;
}

.radio-option input[type="radio"]:checked + span {
  color: #667eea;
  font-weight: 600;
}
```

**Required Field Styling:**
```css
.required {
  color: #dc3545;
  margin-left: 2px;
}
```

## 4. App.js Routing Updates

**Import Change:**
```javascript
// Before
import AdminLogin from './components/auth/AdminLogin';
import EmployeeLogin from './components/auth/EmployeeLogin';
import ManagerLogin from './components/manager/ManagerLogin';

// After
import Login from './components/auth/Login';
```

**Route Changes:**
```jsx
// Before
<Route path="/admin/login" element={<PublicRoute><AdminLogin /></PublicRoute>} />
<Route path="/employee/login" element={<PublicRoute><EmployeeLogin /></PublicRoute>} />
<Route path="/manager/login" element={<PublicRoute><ManagerLogin /></PublicRoute>} />

// After
<Route path="/admin/login" element={<PublicRoute><Login /></PublicRoute>} />
<Route path="/employee/login" element={<PublicRoute><Login /></PublicRoute>} />
<Route path="/manager/login" element={<PublicRoute><Login /></PublicRoute>} />
<Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
```

## 5. HomePage.js Updates

**Header Navigation:**
```jsx
// Before
<nav className="main-nav">
  <Link to="/admin/login" className="nav-link">
    <Shield size={20} />
    Admin Login
  </Link>
  <Link to="/manager/login" className="nav-link">
    <BarChart3 size={20} />
    Manager Login
  </Link>
  <Link to="/employee/login" className="nav-link">
    <Users size={20} />
    Employee Login
  </Link>
</nav>

// After
<nav className="main-nav">
  <Link to="/login" className="nav-link">
    <Shield size={20} />
    Login
  </Link>
</nav>
```

**Feature Cards:**
```jsx
// Before
<Link to="/admin/login" className="feature-card">
  <Users size={48} />
  <h3>Employee Management</h3>
  <p>Manage employee data, roles, and departments</p>
</Link>

// After
<Link to="/login" className="feature-card">
  <Users size={48} />
  <h3>Employee Management</h3>
  <p>Manage employee data, roles, and departments</p>
</Link>
```

## 6. API Service Integration

**File**: `frontend/src/services/api.js`

The component uses these existing API methods:
```javascript
authAPI.adminLogin(credentials)      // POST /api/auth/admin/login
authAPI.managerLogin(credentials)    // POST /api/auth/manager/login
authAPI.employeeLogin(credentials)   // POST /api/auth/employee/login
```

**Expected Request Format:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response Format:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "userType": "employee|manager|admin"
  },
  "token": "jwt_token_here"
}
```

## 7. Error Handling Pattern

```javascript
try {
  // Make API call
  const response = await authAPI[userType + 'Login'](formData);
  
  // On success
  login(user, token);
  toast.success('Login successful!');
  navigate(dashboardPath);
  
} catch (error) {
  // On error
  const message = error.response?.data?.error || 'Login failed. Please try again.';
  toast.error(message);
  
} finally {
  // Cleanup
  setLoading(false);
}
```

## 8. Toast Notifications

```javascript
// Success
toast.success('Login successful!');

// Error
toast.error('Login failed. Please try again.');
```

Uses `react-toastify` library configured in App.js:
```jsx
<ToastContainer />
```

## Complete Component Export

```javascript
export default Login;
```

---

## Usage Example

**Direct Route Access:**
```
http://localhost:3000/login
http://localhost:3000/admin/login
http://localhost:3000/manager/login
http://localhost:3000/employee/login
```

All routes above render the same `Login` component.

**Home Page Access:**
1. User clicks "Login" button in navigation
2. Routes to `/login`
3. Shows unified login form

**Programmatic Navigation:**
```javascript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/login');
```

