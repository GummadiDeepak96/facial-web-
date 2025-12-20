import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { 
  User, 
  Calendar, 
  Clock, 
  Bell, 
  Lock, 
  LogOut,
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import './EmployeeDashboard.css';
import ProfileView from './ProfileView';
import AttendanceView from './AttendanceView';
import HolidaysView from './HolidaysView';
import NotificationsView from './NotificationsView';
import ChangePasswordView from './ChangePasswordView';


const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    late_days: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);


  useEffect(() => {
    fetchAttendanceStats();
    fetchNotifications();
  }, []);

  const fetchAttendanceStats = async () => {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const response = await employeeAPI.getAttendance({
        month: currentMonth,
        year: currentYear
      });
      
      setAttendanceStats(response.data.statistics);
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await employeeAPI.getNotifications({ limit: 5 });
      const notificationsData = response.data?.notifications || response.data || [];
      setNotifications(notificationsData);
      
      const unread = Array.isArray(notificationsData) ? notificationsData.filter(n => !n.is_read).length : 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const handleClockIn = async () => {
    try {
      await employeeAPI.clockIn({
        device_accessed: 'Web Portal',
        access_type: 'password'
      });
      toast.success('Clocked in successfully!');
      fetchAttendanceStats();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to clock in';
      toast.error(message);
    }
  };

  const handleClockOut = async () => {
    try {
      await employeeAPI.clockOut({});
      toast.success('Clocked out successfully!');
      fetchAttendanceStats();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to clock out';
      toast.error(message);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    closeSidebar();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView />;
      case 'attendance':
        return <AttendanceView />;
      case 'holidays':
        return <HolidaysView />;
      case 'notifications':
        return <NotificationsView onNotificationUpdate={fetchNotifications} />;
      case 'changePassword':
        return <ChangePasswordView />;
      default:
        return <ProfileView />;
    }
  };

  return (
<div 
  className={`employee-dashboard 
    ${sidebarOpen ? 'sidebar-open' : ''} 
    ${collapsed ? 'collapsed' : ''}`}
>
      {/* Mobile Menu Toggle */}
      <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <div 
  className={`emp-dash-sidebar 
    ${sidebarOpen ? 'open' : ''} 
    ${collapsed ? 'collapsed' : ''}`}
>

        <div 
  className="emp-dash-sidebar-header logo-area"
  onClick={() => {
    if (window.innerWidth > 768) setCollapsed(!collapsed);
  }}
  style={{ cursor: "pointer" }}
>
  <div className="logo-wrapper">
    <div className="emp-logo-circle"><Menu size={20} /></div>

    {!collapsed && (
      <div className="logo-text">
        <h2>Employee Portal</h2>
        <p>Welcome, {user?.name}</p>
      </div>
    )}
  </div>
</div>


      <nav className="emp-dash-sidebar-nav">
  <ul>
    <li>
      <button
        className={activeTab === 'profile' ? 'active' : ''}
        onClick={() => handleTabChange('profile')}
      >
        <User size={20} />
        {!collapsed && <span>Profile</span>}
      </button>
    </li>
    <li>
      <button
        className={activeTab === 'attendance' ? 'active' : ''}
        onClick={() => handleTabChange('attendance')}
      >
        <Clock size={20} />
        {!collapsed && <span>Attendance</span>}
      </button>
    </li>
    <li>
      <button
        className={activeTab === 'holidays' ? 'active' : ''}
        onClick={() => handleTabChange('holidays')}
      >
        <CalendarDays size={20} />
        {!collapsed && <span>Public Holidays</span>}
      </button>
    </li>
    <li>
      <button
        className={activeTab === 'notifications' ? 'active' : ''}
        onClick={() => handleTabChange('notifications')}
      >
        <Bell size={20} />
        {!collapsed && <span>Notifications</span>}
        {!collapsed && unreadCount > 0 && (
          <span className="emp-notification-badge">{unreadCount}</span>
        )}
      </button>
    </li>
    <li>
      <button
        className={activeTab === 'changePassword' ? 'active' : ''}
        onClick={() => handleTabChange('changePassword')}
      >
        <Lock size={20} />
        {!collapsed && <span>Change Password</span>}
      </button>
    </li>
  </ul>
</nav>


        <div className="emp-dash-sidebar-footer">
          <div className="emp-dash-user-info">
            <p>{user?.name}</p>
            <small>{user?.department}</small>
            <small>{user?.role}</small>
          </div>
          <button className="emp-dash-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="emp-dash-main-content">
        <div className="emp-dashboard-header">
          <h2>Dashboard</h2>
          <div className="emp-quick-stats">
            <div className="emp-quick-stat">
              <div className="emp-stat-icon present">
                <CheckCircle size={20} />
              </div>
              <div className="emp-stat-text">
                <span className="emp-stat-number">{attendanceStats.present_days}</span>
                <span className="emp-stat-label">Present Days</span>
              </div>
            </div>
            <div className="emp-quick-stat">
              <div className="emp-stat-icon absent">
                <XCircle size={20} />
              </div>
              <div className="emp-stat-text">
                <span className="emp-stat-number">{attendanceStats.absent_days}</span>
                <span className="emp-stat-label">Absent Days</span>
              </div>
            </div>
            <div className="emp-quick-stat">
              <div className="emp-stat-icon late">
                <AlertCircle size={20} />
              </div>
              <div className="emp-stat-text">
                <span className="emp-stat-number">{attendanceStats.late_days}</span>
                <span className="emp-stat-label">Late Days</span>
              </div>
            </div>
          </div>
        </div>

        <div className="emp-content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;