import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  managerLogin: (credentials) => api.post('/auth/manager/login', credentials),
  employeeLogin: (credentials) => api.post('/auth/employee/login', credentials),

  changePassword: (data) => api.post('/auth/employee/change-password', data),

  adminForgotPassword: (data) => api.post('/auth/admin/forgot-password', data),
  managerForgotPassword: (data) => api.post('/auth/manager/forgot-password', data),
  employeeForgotPassword: (data) => api.post('/auth/employee/forgot-password', data),

  adminResetPassword: (data) => api.post('/auth/admin/reset-password', data),
  managerResetPassword: (data) => api.post('/auth/manager/reset-password', data),
  employeeResetPassword: (data) => api.post('/auth/employee/reset-password', data),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),

  getEmployees: () => api.get('/admin/employees'),
  getAttendanceSummary: (type) => api.get(`/admin/attendance/summary/${type}`),
  addEmployee: (employeeData) => {
    const hasFile = Object.keys(employeeData).some((key) => {
      const val = employeeData[key];
      if (!val) return false;
      if (typeof File !== 'undefined' && val instanceof File) return true;
      if (typeof Blob !== 'undefined' && val instanceof Blob) return true;
      if (typeof val === 'object' && val.size !== undefined && val.type !== undefined) return true;
      return false;
    });

    if (hasFile) {
      const formData = new FormData();
      Object.keys(employeeData).forEach(key => {
        if (employeeData[key] !== null && employeeData[key] !== undefined) {
          formData.append(key, employeeData[key]);
        }
      });
      return api.post('/admin/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.post('/admin/employees', employeeData);
  },

  updateEmployee: (id, employeeData) => {
    const hasFile = Object.keys(employeeData).some((key) => {
      const val = employeeData[key];
      if (!val) return false;
      if (typeof File !== 'undefined' && val instanceof File) return true;
      if (typeof Blob !== 'undefined' && val instanceof Blob) return true;
      if (typeof val === 'object' && val.size !== undefined && val.type !== undefined) return true;
      return false;
    });

    if (hasFile) {
      const formData = new FormData();
      Object.keys(employeeData).forEach(key => {
        if (employeeData[key] !== null && employeeData[key] !== undefined) {
          formData.append(key, employeeData[key]);
        }
      });
      return api.put(`/admin/employees/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    return api.put(`/admin/employees/${id}`, employeeData);
  },

  deleteEmployee: (id) => api.delete(`/admin/employees/${id}`),

  resetEmployeePassword: (id, data) => api.post(`/admin/employees/${id}/reset-password`, data),

  bulkUploadEmployees: (formData) =>
    api.post('/admin/employees/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Pending Persons Approval
  getPendingPersons: () => api.get('/admin/pending-persons'),
  approvePerson: (personId, employeeData) => api.post(`/admin/approve-person/${personId}`, employeeData),

  getDepartments: () => api.get('/admin/departments'),
  addDepartment: (data) => api.post('/admin/departments', data),

  // RESTORED OLD FUNCTION
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),

  getRoles: () => api.get('/admin/roles'),
  addRole: (data) => api.post('/admin/roles', data),

  // RESTORED OLD FUNCTION
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),

  getAttendance: (params) => api.get('/admin/attendance', { params }),

  // Shifts API
  getShifts: () => api.get('/admin/shifts'),
  addShift: (data) => api.post('/admin/shifts', data),
  updateShift: (id, data) => api.put(`/admin/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/admin/shifts/${id}`),

  // Notifications
  sendNotification: (data) => api.post('/admin/notifications/send', data),

  // Holidays API
  getHolidays: () => api.get('/admin/holidays'),
  addHoliday: (data) => api.post('/admin/holidays', data),
  deleteHoliday: (id) => api.delete(`/admin/holidays/${id}`),
  saveWeeklyOffs: (data) => api.post('/admin/weekly-offs', data),

  // Attendance Report
  getAttendanceReport: (params) => api.get('/admin/attendance-report', { params }),
  downloadAttendanceReport: (params) =>
    api.get('/admin/attendance-report/download', {
      params,
      responseType: 'blob',
    })
};

// Employee API
export const employeeAPI = {
  getProfile: () => api.get('/employee/profile'),
  getAttendance: (params) => api.get('/employee/attendance', { params }),
  getHolidays: (params) => api.get('/employee/holidays', { params }),
  getNotifications: (params) => api.get('/employee/notifications', { params }),
  markNotificationRead: (id) => api.put(`/employee/notifications/${id}/read`),
  recordAccess: (data) => api.post('/employee/access', data),
  clockIn: (data) => api.post('/employee/clockin', data),
  clockOut: (data) => api.post('/employee/clockout', data),
};

// Manager API
export const managerAPI = {
  getDashboardStats: () => api.get('/manager/dashboard/stats'),
  getAttendanceReport: (startDate, endDate) =>
    api.get('/manager/attendance/report', { params: { startDate, endDate } }),

  getAttendanceReportData: (params) =>
    api.get('/manager/attendance-report', { params }),

  downloadAttendanceReportPDF: (params) =>
    api.get('/manager/attendance-report/download', {
      params,
      responseType: 'blob',
    }),

  getEmployees: () => api.get('/manager/employees'),
  getEmployeeDetails: (id) => api.get(`/manager/employees/${id}`),
  getEmployeeAttendance: (id) => api.get(`/manager/employees/${id}/attendance`),

  updateEmployeeStatus: (employeeId, status) =>
    api.put(`/manager/employees/${employeeId}/status`, { statusflag: status }),

  changePassword: (newPassword) =>
    api.post('/manager/change-password', { newPassword }),
};

export default api;
